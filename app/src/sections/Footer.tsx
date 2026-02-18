import { Home, Instagram, Youtube, Phone, Mail, MapPin } from 'lucide-react';

const quickLinks = [
  { name: 'Home', href: '#home' },
  { name: 'Chi Siamo', href: '#chi-siamo' },
  { name: 'Servizi', href: '#servizi' },
  { name: 'Contatti', href: '#contatti' },
];

const services = [
  'Ristrutturazioni Complete',
  'Consulenza Gratuita',
  'Progettazione 3D',
  'Assistenza Tecnica',
];

const socialLinks = [
  { icon: Instagram, href: 'https://www.instagram.com/mb.ristrutturazioni/', label: 'Instagram' },
  { icon: Youtube, href: 'https://www.youtube.com/@RistrutturaLab', label: 'YouTube' },
];

export default function Footer() {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#1A1A1A] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="#home" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#F5B800] rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-[#1A1A1A]" />
              </div>
              <span className="font-display font-bold text-xl">
                MB<span className="text-[#F5B800]">Ristrutturazioni</span>
              </span>
            </a>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Da 35 anni trasformiamo case in sogni. Qualità, affidabilità e 
              passione artigiana per ogni progetto.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 bg-white/10 hover:bg-[#F5B800] rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                >
                  <social.icon className="w-5 h-5 text-white group-hover:text-[#1A1A1A] transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Link Rapidi</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(link.href);
                    }}
                    className="text-white/60 hover:text-[#F5B800] transition-colors text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Servizi</h4>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <li key={index}>
                  <span className="text-white/60 text-sm">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contatti</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#F5B800] flex-shrink-0 mt-0.5" />
                <span className="text-white/60 text-sm">Roma, Lazio</span>
              </li>
              <li>
                <a
                  href="tel:+393391268722"
                  className="flex items-center gap-3 text-white/60 hover:text-[#F5B800] transition-colors text-sm"
                >
                  <Phone className="w-5 h-5 text-[#F5B800] flex-shrink-0" />
                  +39 339 126 8722
                </a>
              </li>
              <li>
                <a
                  href="mailto:mbristrutturazioni@yahoo.com"
                  className="flex items-center gap-3 text-white/60 hover:text-[#F5B800] transition-colors text-sm"
                >
                  <Mail className="w-5 h-5 text-[#F5B800] flex-shrink-0" />
                  mbristrutturazioni@yahoo.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-sm text-center md:text-left">
              © {new Date().getFullYear()} MB Ristrutturazioni. Tutti i diritti riservati.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-white/40 hover:text-[#F5B800] text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-white/40 hover:text-[#F5B800] text-sm transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
