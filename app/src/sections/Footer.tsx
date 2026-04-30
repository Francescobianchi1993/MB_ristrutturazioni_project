import { Home, Instagram, Youtube, Phone, Mail } from 'lucide-react';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

const quickLinks = [
  { name: 'Home', href: '#home' },
  { name: 'Chi Siamo', href: '#chi-siamo' },
  { name: 'Servizi', href: '#servizi' },
  { name: 'Modelli 3D', href: '#modelli-3d' },
  { name: 'Preventivo', href: '#preventivo' },
];

const socialLinks = [
  { icon: Instagram, href: 'https://www.instagram.com/mb.ristrutturazioni/', label: 'Instagram' },
  { icon: Youtube, href: 'https://www.youtube.com/@RistrutturaLab', label: 'YouTube' },
  { icon: TikTokIcon, href: 'https://www.tiktok.com/@mb.ristrutturazioni', label: 'TikTok' },
];

export default function Footer() {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#1A1A1A] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main row */}
        <div className="py-6 flex flex-col lg:flex-row items-center justify-between gap-5">

          {/* Logo + social: su mobile logo a sx, social a dx nella stessa riga */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
            <a
              href="#home"
              onClick={(e) => { e.preventDefault(); scrollToSection('#home'); }}
              className="flex items-center gap-2"
            >
              <div className="w-9 h-9 bg-[#F5B800] rounded-lg flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-[#1A1A1A]" />
              </div>
              <span className="font-display font-bold text-base lg:text-xl">
                MB<span className="text-[#F5B800]">Ristrutturazioni</span>
              </span>
            </a>
            <div className="flex flex-row gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-7 h-7 bg-white/10 hover:bg-[#F5B800] rounded-md flex items-center justify-center transition-all hover:scale-110 group"
                >
                  <s.icon className="w-3.5 h-3.5 text-white group-hover:text-[#1A1A1A] transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Nav links: una sola riga su mobile con font ridotto */}
          <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 lg:gap-x-6">
            {quickLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
                className="text-white/60 hover:text-[#F5B800] transition-colors text-xs lg:text-sm"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Contatti */}
          <ul className="flex flex-col items-center lg:items-end gap-3">
            <li>
              <a
                href="tel:+393391268722"
                className="flex items-center gap-2 text-white/60 hover:text-[#F5B800] transition-colors text-sm"
              >
                <Phone className="w-4 h-4 text-[#F5B800] shrink-0" />
                +39 339 126 8722
              </a>
            </li>
            <li>
              <a
                href="mailto:mbristrutturazioniroma@gmail.com"
                className="flex items-center gap-2 text-white/60 hover:text-[#F5B800] transition-colors text-sm"
              >
                <Mail className="w-4 h-4 text-[#F5B800] shrink-0" />
                mbristrutturazioniroma@gmail.com
              </a>
            </li>
          </ul>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-4 flex flex-row flex-wrap justify-between items-center gap-x-4 gap-y-1">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} MB Ristrutturazioni.
          </p>
          <div className="flex gap-4">
            <a href="/privacy-policy" className="text-white/60 hover:text-[#F5B800] text-xs transition-colors">Privacy Policy</a>
            <a href="/cookie-policy" className="text-white/60 hover:text-[#F5B800] text-xs transition-colors">Cookie Policy</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
