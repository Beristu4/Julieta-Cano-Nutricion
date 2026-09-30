-- Datos iniciales. Correr UNA sola vez, después de todas las migraciones.
-- Los horarios son de ejemplo: ajustarlos desde el panel (/admin → Horarios).

insert into public.tipos_consulta (nombre, duracion_min, orden) values
  ('Primera consulta',     60, 1),
  ('Control nutricional',  30, 2),
  ('Antropometría',        30, 3);

insert into public.consultorios (nombre, detalle, modalidad, extra_whatsapp, orden) values
  ('Sar Salud Integral',    'Dirección y horarios a confirmar.',                                                 'agenda',   null,                                   1),
  ('Centro de Diagnóstico', 'Primer miércoles de cada mes.',                                                     'agenda',   '¿Necesitás un sobreturno? Escribime',  2),
  ('Turnos Online',         'Consultas por videollamada, por la tarde. Coordinamos día y horario por WhatsApp.', 'whatsapp', null,                                   3),
  ('Clínica San Dóna',      'Dirección y horarios a confirmar.',                                                 'clinica',  null,                                   4),
  ('Hospital Italiano',     'Dirección y horarios a confirmar.',                                                 'clinica',  null,                                   5);

-- Horarios de EJEMPLO.
-- Sar: lunes a viernes 9 a 12 (1 = lunes … 5 = viernes)
insert into public.horarios (consultorio_id, dia_semana, desde, hasta, intervalo_min)
select c.id, d, time '09:00', time '12:00', 30
from public.consultorios c
cross join generate_series(1, 5) as d
where c.nombre = 'Sar Salud Integral';

-- Centro de Diagnóstico: solo el primer miércoles de cada mes (3 = miércoles, semana 1)
insert into public.horarios (consultorio_id, dia_semana, desde, hasta, intervalo_min, semanas)
select c.id, 3, time '09:00', time '13:00', 30, '{1}'
from public.consultorios c
where c.nombre = 'Centro de Diagnóstico';
