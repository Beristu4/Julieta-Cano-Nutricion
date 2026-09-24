import { ZONA_HORARIA } from "./site";

// Argentina usa UTC-3 fijo (sin horario de verano).
const OFFSET = "-03:00";

export const DOW_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DOW_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const fmtFecha = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_HORARIA, hour: "2-digit", minute: "2-digit", hour12: false });

/** Fecha de hoy en Argentina, "YYYY-MM-DD". */
export function hoyAR(): string {
  return fmtFecha.format(new Date());
}

/** Fecha (en Argentina) de un instante ISO, "YYYY-MM-DD". */
export function fechaAR(iso: string): string {
  return fmtFecha.format(new Date(iso));
}

/** Hora (en Argentina) de un instante ISO, "HH:mm". */
export function horaAR(iso: string): string {
  return fmtHora.format(new Date(iso));
}

/** "YYYY-MM-DD" + "HH:mm" en hora argentina → ISO UTC. */
export function aISO(fecha: string, hora = "00:00"): string {
  return new Date(`${fecha}T${hora}:00${OFFSET}`).toISOString();
}

export function partesFecha(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return { anio: a, mes: m - 1, dia: d, dow };
}

export function sumarDias(fecha: string, n: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return x.toISOString().slice(0, 10);
}

/** Lunes de la semana de esa fecha. */
export function lunesDe(fecha: string): string {
  const { dow } = partesFecha(fecha);
  return sumarDias(fecha, dow === 0 ? -6 : 1 - dow);
}

export function fechaLarga(fecha: string): string {
  const p = partesFecha(fecha);
  return `${DOW_LARGO[p.dow]} ${p.dia} de ${MES_LARGO[p.mes]}`;
}

export function fechaCorta(fecha: string): string {
  const p = partesFecha(fecha);
  return `${DOW_CORTO[p.dow]} ${p.dia} ${MES_CORTO[p.mes]}`;
}

/** Instante ISO → "YYYY-MM-DDTHH:mm" para <input type="datetime-local"> en hora argentina. */
export function aInputLocal(iso: string): string {
  return `${fechaAR(iso)}T${horaAR(iso)}`;
}
