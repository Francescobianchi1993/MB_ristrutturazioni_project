import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import Services from './sections/Services';
import WhyChooseUs from './sections/WhyChooseUs';
import Modelli3D from './sections/Modelli3D';
import PreventivoV2 from './sections/preventivo-v2';
import Crea3D from './sections/Crea3D';
import Contact from './sections/Contact';
import Footer from './sections/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import './App.css';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

function App() {
  useEffect(() => {
    // Configure ScrollTrigger defaults
    ScrollTrigger.defaults({
      toggleActions: 'play none none none',
    });

    // Refresh ScrollTrigger on load
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <WhyChooseUs />
        <Modelli3D />
        <PreventivoV2 />
        <Crea3D />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;
