export type Consultorio = {
  id: string;
  nombre: string;
  direccion: string | null;
  detalle: string | null;
  link_mapa: string | null;
  whatsapp_clinica: string | null;
  reserva_online: boolean;
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
