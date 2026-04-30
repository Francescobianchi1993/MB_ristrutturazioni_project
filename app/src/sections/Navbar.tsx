import { useState, useEffect } from 'react';
import { Menu, X, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { name: 'Home', href: '#home' },
  { name: 'Chi Siamo', href: '#chi-siamo' },
  { name: 'Servizi', href: '#servizi' },
  { name: 'Modelli 3D', href: '#modelli-3d' },
  { name: 'Crea il tuo 3D', href: '#crea-3d' },
  { name: 'Contatti', href: '#contatti' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    // Per i due link della Sezione3D accorpata: dispatch evento e poi scroll dopo il re-render
    const isSezione3D = href === '#modelli-3d' || href === '#crea-3d';
    if (isSezione3D) {
      window.dispatchEvent(new CustomEvent('sezione3d-tab-change', { detail: href }));
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('#home');
            }}
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-[#F5B800] rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
              <Home className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <span className="font-display font-bold text-xl text-[#1A1A1A]">
              MB<span className="text-[#F5B800]">Ristrutturazioni</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.href);
                }}
                className="text-[#1A1A1A] hover:text-[#F5B800] font-medium text-[15px] transition-colors relative group flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5B800]" />
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#F5B800] transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button
              onClick={() => scrollToSection('#preventivo')}
              className="bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold px-6 py-2 rounded-full transition-all hover:scale-105 hover:shadow-lg text-sm"
            >
              Preventivo Immediato
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-[#1A1A1A]" />
            ) : (
              <Menu className="w-6 h-6 text-[#1A1A1A]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg transition-all duration-300 ${
          isMobileMenuOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="px-4 py-6 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(link.href);
              }}
              className="flex items-center gap-2 text-[#1A1A1A] hover:text-[#F5B800] font-medium py-3 px-3 rounded-xl hover:bg-[#F8F8F8] transition-colors min-h-[48px]"
            >
              <span className="w-2 h-2 rounded-full bg-[#F5B800]" />
              {link.name}
            </a>
          ))}
          <Button
            onClick={() => scrollToSection('#preventivo')}
            className="w-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold py-3 rounded-full mt-4"
          >
            Preventivo Immediato
          </Button>
        </div>
      </div>
    </nav>
  );
}
