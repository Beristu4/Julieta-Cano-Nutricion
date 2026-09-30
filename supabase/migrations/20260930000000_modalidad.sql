-- =====================================================================
-- Modalidad de cada consultorio
--   agenda   → el paciente reserva online en la web
--   whatsapp → se coordina día y horario por WhatsApp con Julieta
--              (ej.: consultas online, según sus entrenamientos)
--   clinica  → el turno lo da la clínica por su WhatsApp
-- `reserva_online` se mantiene sincronizado automáticamente
-- (= modalidad 'agenda') para no romper lo existente.
--
-- extra_whatsapp: texto de un link secundario al WhatsApp de Julieta
-- en la tarjeta (ej.: "¿Necesitás un sobreturno? Escribime").
-- =====================================================================

alter table public.consultorios add column if not exists modalidad text;
alter table public.consultorios add column if not exists extra_whatsapp text;

update public.consultorios
set modalidad = case when reserva_online then 'agenda' else 'clinica' end
where modalidad is null;

alter table public.consultorios alter column modalidad set not null;
alter table public.consultorios drop constraint if exists consultorios_modalidad_check;
alter table public.consultorios
  add constraint consultorios_modalidad_check check (modalidad in ('agenda', 'whatsapp', 'clinica'));

create or replace function public.sincronizar_modalidad()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.modalidad := coalesce(new.modalidad, case when new.reserva_online then 'agenda' else 'clinica' end);
  elsif new.modalidad is distinct from old.modalidad then
    null; -- manda la modalidad
  elsif new.reserva_online is distinct from old.reserva_online then
    new.modalidad := case
      when new.reserva_online then 'agenda'
      when old.modalidad = 'agenda' then 'clinica'
      else old.modalidad
    end;
  end if;
  new.reserva_online := (new.modalidad = 'agenda');
  return new;
end;
$$;

drop trigger if exists consultorios_modalidad on public.consultorios;
create trigger consultorios_modalidad
  before insert or update on public.consultorios
  for each row execute function public.sincronizar_modalidad();

-- ---------------------------------------------------------------------
-- Datos pedidos por Julieta (solo si los consultorios existen)
-- ---------------------------------------------------------------------

-- Consultas online: por la tarde, se coordinan por WhatsApp
update public.consultorios
set modalidad = 'whatsapp',
    detalle   = 'Consultas por videollamada, por la tarde. Coordinamos día y horario por WhatsApp.'
where nombre = 'Turnos Online';

delete from public.horarios
where consultorio_id in (select id from public.consultorios where modalidad = 'whatsapp');

-- Centro de Diagnóstico: primer miércoles de cada mes + sobreturnos por WhatsApp
update public.consultorios
set detalle        = 'Primer miércoles de cada mes.',
    extra_whatsapp = '¿Necesitás un sobreturno? Escribime'
where nombre = 'Centro de Diagnóstico';

-- Si todavía tiene los horarios de ejemplo (lunes a viernes), pasarlos a
-- miércoles de la 1ª semana. Si ya se configuró desde el panel, no se toca.
do $$
declare
  v_id uuid;
begin
  select id into v_id from public.consultorios where nombre = 'Centro de Diagnóstico';
  if v_id is not null and not exists (
    select 1 from public.horarios where consultorio_id = v_id and (semanas is not null or dia_semana = 3 and desde <> '16:00')
  ) then
    delete from public.horarios where consultorio_id = v_id;
    insert into public.horarios (consultorio_id, dia_semana, desde, hasta, intervalo_min, semanas)
    values (v_id, 3, '09:00', '13:00', 30, '{1}'); -- HORARIO DE EJEMPLO: ajustar desde el panel
  end if;
end;
$$;

-- Con una sola fecha por mes, la ventana de reserva tiene que cubrir más de 30 días
update public.configuracion set anticipacion_max_dias = 60 where id = 1 and anticipacion_max_dias < 60;
