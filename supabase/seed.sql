-- Datos iniciales. Correr una sola vez después de la migración.
-- Los horarios son de ejemplo: reemplazarlos por los reales desde el panel.

insert into public.tipos_consulta (nombre, duracion_min, orden) values
  ('Primera consulta',     60, 1),
  ('Control nutricional',  30, 2),
  ('Antropometría',        30, 3);

insert into public.consultorios (nombre, detalle, reserva_online, orden) values
  ('Sar Salud Integral',   'Dirección y horarios a confirmar.',              true,  1),
  ('Centro de Diagnóstico','Dirección y horarios a confirmar.',              true,  2),
  ('Turnos Online',        'Consulta por videollamada, desde donde estés.', true,  3),
  ('Clínica San Dóna',     'Dirección y horarios a confirmar.',              false, 4),
  ('Hospital Italiano',    'Dirección y horarios a confirmar.',              false, 5);

-- Horarios de EJEMPLO (lunes a viernes). 1 = lunes … 5 = viernes.
insert into public.horarios (consultorio_id, dia_semana, desde, hasta, intervalo_min)
select c.id, d, t.desde, t.hasta, t.intervalo
from public.consultorios c
cross join generate_series(1, 5) as d
join (values
  ('Sar Salud Integral',    time '09:00', time '12:00', 30),
  ('Centro de Diagnóstico', time '16:00', time '18:00', 30),
  ('Turnos Online',         time '17:00', time '21:00', 60)
) as t(nombre, desde, hasta, intervalo) on t.nombre = c.nombre;
