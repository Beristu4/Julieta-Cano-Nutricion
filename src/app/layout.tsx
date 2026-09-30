import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFab from "@/components/WhatsAppFab";
import RevealObserver from "@/components/RevealObserver";
import OcultarEnAdmin from "@/components/OcultarEnAdmin";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Julieta Cano · Nutrición",
    template: "%s · Julieta Cano Nutrición",
  },
  description:
    "Lic. en Nutrición. Acompañamiento nutricional cercano y personalizado: nutrición deportiva, embarazo, preparación para el nacimiento, menopausia y antropometría. Reservá tu turno online.",
  openGraph: {
    title: "Julieta Cano · Nutrición",
    description: "Alimentar tu bienestar, a tu manera. Reservá tu turno online.",
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#B4B57A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <OcultarEnAdmin>
          <Header />
        </OcultarEnAdmin>
        <main>{children}</main>
        <OcultarEnAdmin>
          <Footer />
          <WhatsAppFab />
        </OcultarEnAdmin>
        <RevealObserver />
      </body>
    </html>
  );
}
