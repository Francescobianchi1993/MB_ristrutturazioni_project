/**
 * Wrapper "Studio 3D" — accorpa Modelli3D e Crea3D in un'unica sezione,
 * navigabile via tab. Risparmia ~600-800px di scroll tra le due viste.
 *
 * Sync con navbar:
 *   - click "Modelli 3D" (#modelli-3d) → tab Vetrina + scroll
 *   - click "Crea il tuo 3D" (#crea-3d) → tab Crea + scroll
 *
 * Il navbar dispatcha un CustomEvent `sezione3d-tab-change` prima di scrollare,
 * così il tab corretto viene attivato e la sua sezione è già montata quando
 * lo scroll trova l'id target.
 */

import { useEffect, useState } from 'react';
import { Box, Sparkles } from 'lucide-react';
import Modelli3D from './Modelli3D';
import Crea3D from './Crea3D';

type Tab = 'modelli' | 'crea';

export default function Sezione3D() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'modelli';
    return window.location.hash === '#crea-3d' ? 'crea' : 'modelli';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === '#modelli-3d') setTab('modelli');
      else if (detail === '#crea-3d') setTab('crea');
    };
    window.addEventListener('sezione3d-tab-change', handler);
    return () => window.removeEventListener('sezione3d-tab-change', handler);
  }, []);

  // Tab bar bg matches the active child section bg, così sembra parte della sezione
  const barraBg = tab === 'modelli' ? 'bg-[#F8F8F8]' : 'bg-white';

  const switchTab = (next: Tab) => {
    setTab(next);
    const targetId = next === 'modelli' ? '#modelli-3d' : '#crea-3d';
    if (window.history.replaceState) {
      window.history.replaceState(null, '', targetId);
    }
  };

  return (
    <div>
      {/* Tab bar — sticky non, padding minimo per non duplicare le pt delle child */}
      <div className={`${barraBg} pt-8 lg:pt-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="inline-flex bg-white border border-[#E5E5E5] rounded-full p-1 shadow-sm">
            <TabButton
              attivo={tab === 'modelli'}
              onClick={() => switchTab('modelli')}
              icon={Box}
              label="Vetrina dei progetti"
            />
            <TabButton
              attivo={tab === 'crea'}
              onClick={() => switchTab('crea')}
              icon={Sparkles}
              label="Crea il tuo render"
            />
          </div>
        </div>
      </div>

      {/* Vista attiva */}
      {tab === 'modelli' ? <Modelli3D /> : <Crea3D />}
    </div>
  );
}

function TabButton({
  attivo,
  onClick,
  icon: Icon,
  label,
}: {
  attivo: boolean;
  onClick: () => void;
  icon: typeof Box;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-semibold transition ${
        attivo
          ? 'bg-[#F5B800] text-[#1A1A1A] shadow-sm'
          : 'text-[#666] hover:text-[#1A1A1A]'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
    </button>
  );
}
