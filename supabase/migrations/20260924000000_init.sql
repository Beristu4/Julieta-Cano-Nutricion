-- =====================================================================
-- Julieta Cano Nutrición — esquema inicial
-- Consultorios, horarios, bloqueos, tipos de consulta, turnos,
-- productos, perfiles (admin / secretaria) y funciones de reserva.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.rol_usuario  as enum ('admin', 'secretaria');
create type public.estado_turno as enum ('pendiente', 'confirmado', 'cancelado', 'ausente', 'atendido');
create type public.origen_turno as enum ('web', 'secretaria');

-- ---------------------------------------------------------------------
-- Configuración general (una sola fila)
-- ---------------------------------------------------------------------
create table public.configuracion (
  id                               smallint primary key default 1 check (id = 1),
  anticipacion_min_horas           int  not null default 12 check (anticipacion_min_horas >= 0),
  anticipacion_max_dias            int  not null default 30 check (anticipacion_max_dias between 1 and 120),
  max_turnos_futuros_por_telefono  int  not null default 2  check (max_turnos_futuros_por_telefono >= 1),
  zona_horaria                     text not null default 'America/Argentina/Buenos_Aires'
);
insert into public.configuracion (id) values (1);

-- ---------------------------------------------------------------------
-- Consultorios
-- ---------------------------------------------------------------------
create table public.consultorios (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null check (length(trim(nombre)) > 0),
  direccion        text,
  detalle          text,
  link_mapa        text,
  whatsapp_clinica text,                         -- solo si reserva_online = false
  reserva_online   boolean not null default false,
  activo           boolean not null default true,
  orden            int not null default 0,
  creado_en        timestamptz not null default now()
);

-- Plantilla semanal de atención (varios tramos por día permitidos)
create table public.horarios (
  id             uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios(id) on delete cascade,
  dia_semana     smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  desde          time not null,
  hasta          time not null,
  intervalo_min  int  not null default 30 check (intervalo_min between 5 and 240),
  check (desde < hasta)
);
create index horarios_consultorio_dia_idx on public.horarios (consultorio_id, dia_semana);

-- Vacaciones, feriados, ausencias. consultorio_id null = todos.
create table public.bloqueos (
  id             uuid primary key default gen_random_uuid(),
  consultorio_id uuid references public.consultorios(id) on delete cascade,
  desde          timestamptz not null,
  hasta          timestamptz not null,
  motivo         text,
  creado_por     uuid references auth.users(id) on delete set null,
  creado_en      timestamptz not null default now(),
  check (desde < hasta)
);
create index bloqueos_rango_idx on public.bloqueos using gist (tstzrange(desde, hasta));

create table public.tipos_consulta (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null check (length(trim(nombre)) > 0),
  duracion_min int  not null check (duracion_min between 5 and 240),
  activo       boolean not null default true,
  orden        int not null default 0
);

-- ---------------------------------------------------------------------
-- Turnos
-- ---------------------------------------------------------------------
create table public.turnos (
  id                uuid primary key default gen_random_uuid(),
  consultorio_id    uuid not null references public.consultorios(id) on delete restrict,
  tipo_consulta_id  uuid not null references public.tipos_consulta(id) on delete restrict,
  inicio            timestamptz not null,
  fin               timestamptz not null,
  paciente_nombre   text not null check (length(trim(paciente_nombre)) between 2 and 120),
  paciente_telefono text not null check (paciente_telefono ~ '^[0-9]{8,20}$'), -- solo dígitos
  estado            public.estado_turno not null default 'pendiente',
  origen            public.origen_turno not null default 'web',
  notas             text,
  creado_por        uuid references auth.users(id) on delete set null,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  check (fin > inicio),
  -- Nunca dos turnos activos superpuestos en el mismo consultorio
  constraint turnos_sin_superposicion exclude using gist (
    consultorio_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado <> 'cancelado')
);
create index turnos_consultorio_inicio_idx on public.turnos (consultorio_id, inicio);
create index turnos_telefono_idx on public.turnos (paciente_telefono, inicio);

-- ---------------------------------------------------------------------
-- Productos (solo vidriera: sin precio, la venta es por WhatsApp)
-- ---------------------------------------------------------------------
create table public.productos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) > 0),
  descripcion text,
  foto_url    text,
  disponible  boolean not null default true,
  orden       int not null default 0,
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Usuarios del panel
-- ---------------------------------------------------------------------
create table public.perfiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  nombre    text,
  rol       public.rol_usuario not null default 'secretaria',
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.perfil_consultorio (
  perfil_id      uuid not null references public.perfiles(id) on delete cascade,
  consultorio_id uuid not null references public.consultorios(id) on delete cascade,
  primary key (perfil_id, consultorio_id)
);

-- Cada usuario nuevo de Auth recibe un perfil de secretaria INACTIVO.
-- El admin lo activa y le asigna consultorios desde el panel.
-- El primer admin se asigna a mano (ver README).
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, rol, activo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), 'secretaria', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- actualizado_en automático
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger turnos_actualizado_en
  before update on public.turnos
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------------------
-- Helpers de permisos
-- ---------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin' and activo
  );
$$;

create or replace function public.es_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and activo
  );
$$;

create or replace function public.puede_gestionar_consultorio(p_consultorio uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.es_admin() or exists (
    select 1
    from public.perfil_consultorio pc
    join public.perfiles p on p.id = pc.perfil_id
    where pc.perfil_id = auth.uid()
      and pc.consultorio_id = p_consultorio
      and p.activo
  );
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.configuracion      enable row level security;
alter table public.consultorios       enable row level security;
alter table public.horarios           enable row level security;
alter table public.bloqueos           enable row level security;
alter table public.tipos_consulta     enable row level security;
alter table public.turnos             enable row level security;
alter table public.productos          enable row level security;
alter table public.perfiles           enable row level security;
alter table public.perfil_consultorio enable row level security;

-- configuracion: lectura pública, edita admin
create policy configuracion_select on public.configuracion for select using (true);
create policy configuracion_update on public.configuracion for update using (public.es_admin()) with check (public.es_admin());

-- consultorios: el público ve los activos; el staff ve todos; edita admin
create policy consultorios_select on public.consultorios for select using (activo or public.es_staff());
create policy consultorios_insert on public.consultorios for insert with check (public.es_admin());
create policy consultorios_update on public.consultorios for update using (public.es_admin()) with check (public.es_admin());
create policy consultorios_delete on public.consultorios for delete using (public.es_admin());

-- horarios: lectura pública; edita admin
create policy horarios_select on public.horarios for select using (true);
create policy horarios_insert on public.horarios for insert with check (public.es_admin());
create policy horarios_update on public.horarios for update using (public.es_admin()) with check (public.es_admin());
create policy horarios_delete on public.horarios for delete using (public.es_admin());

-- bloqueos: staff; la secretaria solo en sus consultorios, los globales solo admin
create policy bloqueos_select on public.bloqueos for select using (public.es_staff());
create policy bloqueos_insert on public.bloqueos for insert with check (
  case when consultorio_id is null then public.es_admin()
       else public.puede_gestionar_consultorio(consultorio_id) end);
create policy bloqueos_update on public.bloqueos for update
  using (case when consultorio_id is null then public.es_admin()
              else public.puede_gestionar_consultorio(consultorio_id) end)
  with check (case when consultorio_id is null then public.es_admin()
                   else public.puede_gestionar_consultorio(consultorio_id) end);
create policy bloqueos_delete on public.bloqueos for delete using (
  case when consultorio_id is null then public.es_admin()
       else public.puede_gestionar_consultorio(consultorio_id) end);

-- tipos de consulta: el público ve los activos; edita admin
create policy tipos_select on public.tipos_consulta for select using (activo or public.es_staff());
create policy tipos_insert on public.tipos_consulta for insert with check (public.es_admin());
create policy tipos_update on public.tipos_consulta for update using (public.es_admin()) with check (public.es_admin());
create policy tipos_delete on public.tipos_consulta for delete using (public.es_admin());

-- turnos: sin acceso público directo (el público reserva vía reservar_turno)
create policy turnos_select on public.turnos for select using (public.puede_gestionar_consultorio(consultorio_id));
create policy turnos_insert on public.turnos for insert with check (public.puede_gestionar_consultorio(consultorio_id));
create policy turnos_update on public.turnos for update
  using (public.puede_gestionar_consultorio(consultorio_id))
  with check (public.puede_gestionar_consultorio(consultorio_id));
create policy turnos_delete on public.turnos for delete using (public.es_admin());

-- productos: el público ve los disponibles; edita admin
create policy productos_select on public.productos for select using (disponible or public.es_staff());
create policy productos_insert on public.productos for insert with check (public.es_admin());
create policy productos_update on public.productos for update using (public.es_admin()) with check (public.es_admin());
create policy productos_delete on public.productos for delete using (public.es_admin());

-- perfiles: cada uno ve el suyo; admin ve y edita todos
create policy perfiles_select on public.perfiles for select using (id = auth.uid() or public.es_admin());
create policy perfiles_insert on public.perfiles for insert with check (public.es_admin());
create policy perfiles_update on public.perfiles for update using (public.es_admin()) with check (public.es_admin());
create policy perfiles_delete on public.perfiles for delete using (public.es_admin());

create policy perfil_consultorio_select on public.perfil_consultorio for select using (perfil_id = auth.uid() or public.es_admin());
create policy perfil_consultorio_insert on public.perfil_consultorio for insert with check (public.es_admin());
create policy perfil_consultorio_delete on public.perfil_consultorio for delete using (public.es_admin());

-- ---------------------------------------------------------------------
-- Agenda: horarios libres, días disponibles y reserva pública
-- ---------------------------------------------------------------------

-- Horarios libres de un consultorio para una fecha y un tipo de consulta.
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

-- Fechas (dentro de la ventana de reserva) que tienen al menos un horario libre.
create or replace function public.dias_disponibles(p_consultorio uuid, p_tipo uuid)
returns table (fecha date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cfg public.configuracion;
  v_hoy date;
begin
  select * into v_cfg from public.configuracion where id = 1;
  v_hoy := (now() at time zone v_cfg.zona_horaria)::date;

  return query
  select d::date
  from generate_series(v_hoy, v_hoy + v_cfg.anticipacion_max_dias, interval '1 day') as d
  where exists (select 1 from public.horarios_libres(p_consultorio, d::date, p_tipo))
  order by 1;
end;
$$;

-- Reserva pública. Valida disponibilidad, datos y límite por teléfono.
-- Errores posibles (en el mensaje): datos_invalidos, horario_no_disponible, limite_turnos.
create or replace function public.reservar_turno(
  p_consultorio uuid,
  p_tipo        uuid,
  p_inicio      timestamptz,
  p_nombre      text,
  p_telefono    text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_cfg   public.configuracion;
  v_dur   int;
  v_tel   text := regexp_replace(coalesce(p_telefono, ''), '[^0-9]', '', 'g');
  v_nom   text := trim(coalesce(p_nombre, ''));
  v_fecha date;
  v_id    uuid;
begin
  select * into v_cfg from public.configuracion where id = 1;

  if length(v_nom) not between 2 and 120 or length(v_tel) not between 8 and 20 then
    raise exception 'datos_invalidos';
  end if;

  select duracion_min into v_dur from public.tipos_consulta where id = p_tipo and activo;
  if v_dur is null then
    raise exception 'datos_invalidos';
  end if;

  v_fecha := (p_inicio at time zone v_cfg.zona_horaria)::date;
  if not exists (
    select 1 from public.horarios_libres(p_consultorio, v_fecha, p_tipo) hl
    where hl.hora_inicio = p_inicio
  ) then
    raise exception 'horario_no_disponible';
  end if;

  if (
    select count(*) from public.turnos t
    where t.paciente_telefono = v_tel
      and t.estado in ('pendiente', 'confirmado')
      and t.inicio > now()
  ) >= v_cfg.max_turnos_futuros_por_telefono then
    raise exception 'limite_turnos';
  end if;

  begin
    insert into public.turnos (consultorio_id, tipo_consulta_id, inicio, fin,
                               paciente_nombre, paciente_telefono, estado, origen)
    values (p_consultorio, p_tipo, p_inicio, p_inicio + make_interval(mins => v_dur),
            v_nom, v_tel, 'pendiente', 'web')
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'horario_no_disponible';
  end;

  return v_id;
end;
$$;

-- Health check liviano para el ping (mantiene Render y Supabase despiertos)
create or replace function public.ping()
returns text
language sql stable
as $$ select 'ok'::text; $$;

-- ---------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------
revoke execute on function public.horarios_libres(uuid, date, uuid)                        from public;
revoke execute on function public.dias_disponibles(uuid, uuid)                             from public;
revoke execute on function public.reservar_turno(uuid, uuid, timestamptz, text, text)     from public;
revoke execute on function public.crear_perfil_nuevo_usuario()                             from public;

grant execute on function public.horarios_libres(uuid, date, uuid)                    to anon, authenticated;
grant execute on function public.dias_disponibles(uuid, uuid)                         to anon, authenticated;
grant execute on function public.reservar_turno(uuid, uuid, timestamptz, text, text)  to anon, authenticated;
grant execute on function public.ping()                                               to anon, authenticated;
