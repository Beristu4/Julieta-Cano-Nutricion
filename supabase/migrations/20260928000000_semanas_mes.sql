-- =====================================================================
-- Horarios por semana del mes
-- Ej.: Centro de Diagnóstico solo el primer miércoles de cada mes.
--   semanas = null      → todas las semanas
--   semanas = '{1}'     → solo la 1ª semana (días 1 a 7)
--   semanas = '{1,3}'   → 1ª y 3ª
--   semanas = '{-1}'    → solo la última del mes
-- =====================================================================

alter table public.horarios
  add column if not exists semanas smallint[]
  check (semanas is null or (cardinality(semanas) > 0 and semanas <@ array[1, 2, 3, 4, 5, -1]::smallint[]));

-- ¿El tramo aplica en esa fecha? (n-ésima aparición del día en el mes)
create or replace function public.horario_aplica(p_semanas smallint[], p_fecha date)
returns boolean
language sql
immutable
as $$
  select p_semanas is null
      or ((extract(day from p_fecha)::int - 1) / 7 + 1) = any(p_semanas)
      or (-1 = any(p_semanas) and extract(month from p_fecha + 7) <> extract(month from p_fecha));
$$;

-- Mismas funciones que antes, sumando el filtro de semanas.
create or replace function public.horarios_libres(p_consultorio uuid, p_fecha date, p_tipo uuid)
returns table (hora_inicio timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cfg  public.configuracion;
  v_dur  interval;
  v_hoy  date;
begin
  select * into v_cfg from public.configuracion where id = 1;
  v_hoy := (now() at time zone v_cfg.zona_horaria)::date;

  if p_fecha < v_hoy or p_fecha > v_hoy + v_cfg.anticipacion_max_dias then
    return;
  end if;

  select make_interval(mins => t.duracion_min) into v_dur
  from public.tipos_consulta t
  where t.id = p_tipo and t.activo;
  if v_dur is null then
    return;
  end if;

  if not exists (
    select 1 from public.consultorios c
    where c.id = p_consultorio and c.activo and c.reserva_online
  ) then
    return;
  end if;

  return query
  with candidatos as (
    select distinct (gs at time zone v_cfg.zona_horaria) as ini
    from public.horarios h
    cross join lateral generate_series(
      p_fecha + h.desde,
      p_fecha + h.hasta - v_dur,
      make_interval(mins => h.intervalo_min)
    ) as gs
    where h.consultorio_id = p_consultorio
      and h.dia_semana = extract(dow from p_fecha)::int
      and public.horario_aplica(h.semanas, p_fecha)
  )
  select c.ini
  from candidatos c
  where c.ini >= now() + make_interval(hours => v_cfg.anticipacion_min_horas)
    and not exists (
      select 1 from public.bloqueos b
      where (b.consultorio_id = p_consultorio or b.consultorio_id is null)
        and tstzrange(b.desde, b.hasta) && tstzrange(c.ini, c.ini + v_dur)
    )
    and not exists (
      select 1 from public.turnos t
      where t.consultorio_id = p_consultorio
        and t.estado <> 'cancelado'
        and tstzrange(t.inicio, t.fin) && tstzrange(c.ini, c.ini + v_dur)
    )
  order by c.ini;
end;
$$;

create or replace function public.horarios_libres_staff(
  p_consultorio   uuid,
  p_fecha         date,
  p_tipo          uuid,
  p_excluir_turno uuid default null
)
returns table (hora_inicio timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz  text;
  v_dur interval;
begin
  if not public.puede_gestionar_consultorio(p_consultorio) then
    raise exception 'sin_permiso';
  end if;

  select zona_horaria into v_tz from public.configuracion where id = 1;

  select make_interval(mins => t.duracion_min) into v_dur
  from public.tipos_consulta t
  where t.id = p_tipo;
  if v_dur is null then
    return;
  end if;

  return query
  with candidatos as (
    select distinct (gs at time zone v_tz) as ini
    from public.horarios h
    cross join lateral generate_series(
      p_fecha + h.desde,
      p_fecha + h.hasta - v_dur,
      make_interval(mins => h.intervalo_min)
    ) as gs
    where h.consultorio_id = p_consultorio
      and h.dia_semana = extract(dow from p_fecha)::int
      and public.horario_aplica(h.semanas, p_fecha)
  )
  select c.ini
  from candidatos c
  where not exists (
      select 1 from public.bloqueos b
      where (b.consultorio_id = p_consultorio or b.consultorio_id is null)
        and tstzrange(b.desde, b.hasta) && tstzrange(c.ini, c.ini + v_dur)
    )
    and not exists (
      select 1 from public.turnos t
      where t.consultorio_id = p_consultorio
        and t.estado <> 'cancelado'
        and (p_excluir_turno is null or t.id <> p_excluir_turno)
        and tstzrange(t.inicio, t.fin) && tstzrange(c.ini, c.ini + v_dur)
    )
  order by c.ini;
end;
$$;
