export const WHATSAPP_NUMERO = "5492617081371";
export const WHATSAPP_VISIBLE = "+54 9 2617 08-1371";
export const INSTAGRAM_URL = "https://www.instagram.com/julicanonutricion/";
export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

/** Link de WhatsApp con mensaje opcional. */
export function waLink(texto?: string, numero: string = WHATSAPP_NUMERO): string {
  const base = `https://wa.me/${numero.replace(/\D/g, "")}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/** Acepta un número ("261 555 1234") o un link completo ("https://wa.me/..."). */
export function waClinica(valor: string | null | undefined, nombre: string): string | null {
  if (!valor) return null;
  if (/^https?:\/\//i.test(valor)) return valor;
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length < 8) return null;
  return waLink(`Hola! Quiero pedir un turno con la Lic. Julieta Cano en ${nombre}.`, digitos);
}
