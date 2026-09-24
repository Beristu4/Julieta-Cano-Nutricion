# Julieta Cano · Nutrición

Sitio web de la Lic. Julieta Cano, con reserva de turnos online, consultorios y productos administrables.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage) · Render Free.
Costo: USD 0/mes (ping cada 10 min + backup diario en GitHub Actions).

## Estructura

```
src/
  app/
    page.tsx                  Home
    donde-encontrarme/        Consultorios + modal de reserva
    productos/                Vidriera de productos (o "próximamente")
    api/health/               Ping para mantener Render y Supabase despiertos
    api/admin/usuarios/       Alta de usuarios y cambio de contraseña (service role)
    admin/                    Panel: agenda, bloqueos, horarios, consultorios, productos, ajustes, usuarios
  components/                 Header, Footer, Consultorios, ReservaModal, etc.
  components/admin/           Shell del panel, modales de turnos
  lib/                        Cliente de Supabase, consultas y constantes
supabase/
  migrations/                 Esquema, RLS y funciones de reserva
  seed.sql                    Tipos de consulta, consultorios y horarios de ejemplo
.github/workflows/            Backup diario de la base
render.yaml                   Blueprint de Render
```

## Desarrollo local

Requiere Node 20 o superior.

```bash
npm install
cp .env.example .env.local   # completar con los datos de Supabase
npm run dev                  # http://localhost:3000
```

Sin `.env.local` el sitio funciona igual con datos de respaldo, y los botones de reserva derivan a WhatsApp.

## Puesta en marcha

### 1. Supabase

1. Crear el proyecto en [supabase.com](https://supabase.com) (región **São Paulo**).
2. **SQL Editor** → pegar y correr, en orden:
   1. `supabase/migrations/20260924000000_init.sql`
   2. `supabase/migrations/20260925000000_admin.sql`
3. Pegar y correr `supabase/seed.sql` (una sola vez). Los horarios son **de ejemplo**: se cambian desde el panel.
4. **Authentication → Sign In / Providers** → desactivar **Allow new users to sign up**. Solo el admin crea usuarios.
5. **Project Settings → API** → copiar `Project URL`, la clave `anon public` y la `service_role` a `.env.local` (ver `.env.example`).

### 2. Primer admin (Juli)

1. **Authentication → Users → Add user**, con su email y una contraseña.
2. En el **SQL Editor**:

```sql
update public.perfiles
set rol = 'admin', activo = true, nombre = 'Julieta Cano'
where id = (select id from auth.users where email = 'EMAIL_DE_JULI');
```

Después Juli entra a `/admin` y crea a las secretarias desde **Usuarios** (con contraseña inicial y consultorios asignados).

### 3. Render (workspace propio de Juli)

1. Crear una cuenta o workspace **separado de Stocker** (las 750 h gratis son por workspace).
2. **New → Blueprint** → elegir este repo (usa `render.yaml`).
3. Cargar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
4. **Importante:** las variables `NEXT_PUBLIC_` se incorporan al compilar. Después de cargarlas o cambiarlas: **Manual Deploy → Deploy latest commit**.

### 4. Ping cada 10 minutos

En [cron-job.org](https://cron-job.org) o [UptimeRobot](https://uptimerobot.com): monitor HTTP a `https://<tu-servicio>.onrender.com/api/health` cada **10 minutos**.
Mantiene Render despierto (se duerme a los 15 min) y Supabase activo (se pausa tras 1 semana sin uso).

### 5. Backup diario

1. Supabase → **Connect** → copiar la cadena **Session pooler** (IPv4) con la contraseña de la base.
2. GitHub → repo → **Settings → Secrets and variables → Actions** → nuevo secret `SUPABASE_DB_URL`.
3. **Actions → Backup diario de Supabase → Run workflow** para probarlo.

Los backups quedan como *artifacts* del workflow durante 30 días. Para restaurar:

```bash
pg_restore --no-owner --clean --if-exists -d "$SUPABASE_DB_URL" public-AAAA-MM-DD.dump
```

## Reglas de la agenda

- Los turnos libres se calculan: horarios semanales − bloqueos − turnos activos.
- La base impide dos turnos superpuestos en el mismo consultorio (restricción de exclusión).
- Anticipación: mínimo 12 h, máximo 30 días. Máximo 2 turnos futuros por teléfono. Todo se ajusta en la tabla `configuracion`.
- Los turnos web entran como **pendiente**; la secretaria los confirma.
- Consultorios con `reserva_online = false` (Clínica San Dóna, Hospital Italiano) solo muestran el WhatsApp de la clínica.

## Panel `/admin`

| Sección | Quién | Para qué |
| --- | --- | --- |
| Agenda | Todos | Turnos por día o semana, filtro por consultorio, nuevo turno, confirmar/cancelar/reprogramar, WhatsApp al paciente |
| Bloqueos | Todos | Vacaciones, feriados, ausencias (la secretaria solo en sus consultorios) |
| Horarios | Admin | Plantilla semanal por consultorio |
| Consultorios | Admin | Alta/edición, agenda online sí/no, WhatsApp de la clínica, visible/oculto |
| Productos | Admin | Alta/edición con foto (Supabase Storage), disponible/oculto |
| Ajustes | Admin | Tipos de consulta y duración, reglas de reserva |
| Usuarios | Admin | Crear secretarias, asignar consultorios, activar/desactivar, cambiar contraseña |

## Imágenes

Ver `public/img/LEEME.md`.
