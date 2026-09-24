-- =====================================================================
-- Panel admin: horarios libres para el staff, email en perfiles
-- y bucket de fotos de productos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Email visible en perfiles (auth.users no es accesible desde la app)
-- ---------------------------------------------------------------------
alter table public.perfiles add column if not exists email text;

update public.perfiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, email, rol, activo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), new.email, 'secretaria', false)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Horarios libres para secretarias/admin
-- Sin anticipación mínima ni ventana máxima, y pudiendo excluir un turno
-- (para reprogramarlo sin que choque consigo mismo).
-- ---------------------------------------------------------------------
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

revoke execute on function public.horarios_libres_staff(uuid, date, uuid, uuid) from public;
revoke execute on function public.horarios_libres_staff(uuid, date, uuid, uuid) from anon;
grant  execute on function public.horarios_libres_staff(uuid, date, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Storage: fotos de productos (lectura pública, escritura solo admin)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

create policy "productos: lectura publica"
  on storage.objects for select
  using (bucket_id = 'productos');

create policy "productos: admin sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.es_admin());

create policy "productos: admin actualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'productos' and public.es_admin());

create policy "productos: admin borra"
  on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and public.es_admin());
