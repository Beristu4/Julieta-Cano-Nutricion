import Logo from "./Logo";
import { INSTAGRAM_URL, waLink } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor">
        <div className="logo">
          <Logo alto={56} />
        </div>
        <div className="footer-links">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={waLink()} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </div>
    </footer>
  );
}
