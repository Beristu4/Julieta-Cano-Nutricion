// Separadores ondulados entre secciones (mismos trazos que el diseño).
const TRAZOS = {
  abajoA: "M0,120 L0,60 C360,130 1080,-10 1440,50 L1440,120 Z",
  abajoB: "M0,120 L0,40 C420,120 1020,0 1440,70 L1440,120 Z",
  arribaA: "M0,0 L1440,0 L1440,70 C1080,-10 360,130 0,50 Z",
} as const;

type Props = {
  trazo: keyof typeof TRAZOS;
  posicion: "arriba" | "abajo";
  color?: string;
};

export default function Onda({ trazo, posicion, color = "var(--crema)" }: Props) {
  return (
    <svg
      className={`onda ${posicion === "arriba" ? "onda-arriba" : "onda-abajo"}`}
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={TRAZOS[trazo]} fill={color} />
    </svg>
  );
}
