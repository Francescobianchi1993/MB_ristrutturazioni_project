import emailjs from '@emailjs/browser';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, Phone, Mail, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

gsap.registerPlugin(ScrollTrigger);

const contactInfo = [
  {
    icon: MapPin,
    title: 'Dove Siamo',
    content: 'Roma, Lazio',
    href: '#',
  },
  {
    icon: Phone,
    title: 'Telefono',
    content: '+39 339 126 8722',
    href: 'https://wa.me/393391268722?text=Ciao,%20vorrei%20informazioni%20per%20una%20ristrutturazione',
  },
  {
    icon: Mail,
    title: 'Email',
    content: 'mbristrutturazioniroma@gmail.com',
    href: 'mailto:mbristrutturazioniroma@gmail.com',
  },
];

export default function Contact() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Content animation
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current.children,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      // Form animation
      if (formRef.current) {
        gsap.fromTo(
          formRef.current,
          { opacity: 0, x: 30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    emailjs
      .sendForm(
        'service_rqko90m', // Nuovo Service ID Gmail
        'template_rbj6nxk', // ID del tuo template
        e.target as HTMLFormElement,
        'nipzQBUhrUoZz04UK' // La tua Public Key
      )
      .then(
        (result) => {
          console.log(result.text);
          setIsSubmitted(true);
          setFormData({ name: '', email: '', phone: '', message: '' });
          setTimeout(() => {
            setIsSubmitted(false);
          }, 3000);
        },
        (error) => {
          console.log(error.text);
        }
      );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section
      id="contatti"
      ref={sectionRef}
      className="py-24 lg:py-32 bg-[#F8F8F8]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Content Side */}
          <div ref={contentRef} className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm uppercase tracking-wider mb-4">
                <div className="w-8 h-0.5 bg-[#F5B800]" />
                Contattaci
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
                Pronto a trasformare{' '}
                <span className="text-[#F5B800]">la tua casa?</span>
              </h2>
              <p className="text-[#666666] text-lg">
                Richiedi un preventivo gratuito o contattaci per maggiori informazioni.
                Siamo qui per aiutarti a realizzare i tuoi sogni.
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              {contactInfo.map((info, index) => (
                <a
                  key={index}
                  href={info.href}
                  className="flex items-start gap-4 bg-white p-5 rounded-2xl hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="w-12 h-12 bg-[#F5B800]/10 group-hover:bg-[#F5B800] rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                    <info.icon className="w-6 h-6 text-[#F5B800] group-hover:text-[#1A1A1A] transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1A1A] mb-1">{info.title}</p>
                    <p className="text-[#666666]">{info.content}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Working hours */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 text-white">
              <p className="font-semibold mb-3">Orari di Lavoro</p>
              <div className="space-y-2 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>Lunedì - Venerdì</span>
                  <span>07:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Sabato</span>
                  <span>09:00 - 13:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Domenica</span>
                  <span>Chiuso</span>
                </div>
              </div>
              <p className="text-[#F5B800] text-sm mt-4">
              </p>
            </div>
          </div>

          {/* Form Side */}
          <div ref={formRef}>
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <h3 className="font-display text-2xl font-semibold text-[#1A1A1A] mb-2">
                Richiedi Preventivo
              </h3>
              <p className="text-[#666666] mb-6">
                Compila il form e ti ricontatteremo entro 24 ore.
              </p>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-[#1A1A1A] text-xl mb-2">
                    Richiesta Inviata!
                  </h4>
                  <p className="text-[#666666]">
                    Ti contatteremo presto per discutere il tuo progetto.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-[#1A1A1A] font-medium">
                      Nome e Cognome
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Mario Rossi"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="mt-1.5 h-12 rounded-xl border-[#E5E5E5] focus:border-[#F5B800] focus:ring-[#F5B800]"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-[#1A1A1A] font-medium">
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="mario@email.it"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="mt-1.5 h-12 rounded-xl border-[#E5E5E5] focus:border-[#F5B800] focus:ring-[#F5B800]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-[#1A1A1A] font-medium">
                        Telefono
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+39 123 456 7890"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1.5 h-12 rounded-xl border-[#E5E5E5] focus:border-[#F5B800] focus:ring-[#F5B800]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-[#1A1A1A] font-medium">
                      Messaggio
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Descrivi il tuo progetto..."
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      className="mt-1.5 rounded-xl border-[#E5E5E5] focus:border-[#F5B800] focus:ring-[#F5B800] resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold h-12 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg"
                  >
                    Invia Richiesta
                    <Send className="w-5 h-5 ml-2" />
                  </Button>

                  <p className="text-xs text-[#666666] text-center">
                    Cliccando su "Invia Richiesta" accetti la nostra{' '}
                    <a href="#" className="text-[#F5B800] hover:underline">
                      privacy policy
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
