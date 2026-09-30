export type Consultorio = {
  id: string;
  nombre: string;
  direccion: string | null;
  detalle: string | null;
  link_mapa: string | null;
  whatsapp_clinica: string | null;
  reserva_online: boolean;
  /** agenda = reserva web · whatsapp = se coordina con Julieta · clinica = turno por la clínica */
  modalidad: "agenda" | "whatsapp" | "clinica";
  /** Texto de un link secundario al WhatsApp de Julieta (ej. sobreturnos). */
  extra_whatsapp: string | null;
  orden: number;
};

export type TipoConsulta = {
  id: string;
  nombre: string;
  duracion_min: number;
  orden: number;
};

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  orden: number;
};
