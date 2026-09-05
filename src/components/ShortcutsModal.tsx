/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Keyboard, Touchpad } from 'lucide-react';
import { Language } from '../types';

interface ShortcutsModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  language,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = {
    en: [
      { key: 'G', desc: 'Toggle snap to grid & node alignment' },
      { key: 'Ctrl + Z', desc: 'Undo last change' },
      { key: 'Ctrl + Y', desc: 'Redo previously undone change' },
      { key: 'Delete / Backspace', desc: 'Delete selected shape or edge' },
      { key: 'Tab', desc: 'Accept keyword suggestion in code editor' },
      { key: 'Double Click', desc: 'Edit text of a shape or label of an edge' },
      { key: 'Escape', desc: 'Cancel editing or close dialog' },
    ],
    de: [
      { key: 'G', desc: 'Am Raster & an Symbolen ausrichten umschalten' },
      { key: 'Strg + Z', desc: 'Letzte Änderung rückgängig machen' },
      { key: 'Strg + Y', desc: 'Zuvor rückgängig gemachte Änderung wiederholen' },
      { key: 'Entf / Rücktaste', desc: 'Ausgewähltes Symbol oder Verbindung löschen' },
      { key: 'Tab', desc: 'Schlüsselwort-Vorschlag im Code-Editor übernehmen' },
      { key: 'Doppelklick', desc: 'Text eines Symbols oder Beschriftung einer Kante bearbeiten' },
      { key: 'Escape', desc: 'Bearbeitung abbrechen oder Dialog schließen' },
    ],
    bs: [
      { key: 'G', desc: 'Uključi/isključi poravnanje na raster i blokove' },
      { key: 'Ctrl + Z', desc: 'Poništi posljednju izmjenu' },
      { key: 'Ctrl + Y', desc: 'Vrati poništenu izmjenu' },
      { key: 'Delete / Backspace', desc: 'Obriši odabrani simbol ili vezu' },
      { key: 'Tab', desc: 'Prihvati predloženu ključnu riječ u editoru' },
      { key: 'Dvoklik', desc: 'Uredi tekst simbola ili natpis na strelici' },
      { key: 'Escape', desc: 'Prekini uređivanje ili zatvori prozor' },
    ],
  }[language];

  const gestures = {
    en: [
      { gesture: 'Two-finger Pinch', desc: 'Zoom in and out of the canvas' },
      { gesture: 'One-finger Drag (empty canvas)', desc: 'Pan around the flowchart canvas' },
      { gesture: 'Tap & Drag Shape', desc: 'Move flowchart symbols smoothly' },
      { gesture: 'Tap Edge Handle', desc: 'Adjust orthogonal bends and corridors' },
    ],
    de: [
      { gesture: 'Zwei-Finger-Pinch', desc: 'Zeichenfläche vergrößern und verkleinern' },
      { gesture: 'Ein-Finger-Ziehen (freie Fläche)', desc: 'Zeichenfläche verschieben (Pan)' },
      { gesture: 'Symbol berühren & ziehen', desc: 'Symbole flüssig positionieren' },
      { gesture: 'Kanten-Griff ziehen', desc: 'Rechtwinklige Linienführung anpassen' },
    ],
    bs: [
      { gesture: 'Dva prsta (štipanje)', desc: 'Zumiranje platna (uvećaj / umanji)' },
      { gesture: 'Jedan prst po praznom platnu', desc: 'Pomjeranje (panovanje) po platnu' },
      { gesture: 'Dodir i prevlačenje simbola', desc: 'Pomjeranje oblika po platnu' },
      { gesture: 'Prevlačenje kvadratića veze', desc: 'Podešavanje putanje i uglova strelica' },
    ],
  }[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#0A0A0A] text-[#F5F5F5] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#121212] text-white p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-white" />
            <h2 className="font-black text-sm sm:text-base uppercase tracking-wider">
              {language === 'en' ? 'Shortcuts & Gestures' : language === 'de' ? 'Tastatur & Gesten' : 'Prečice i geste'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs bg-[#0A0A0A]">
          <div>
            <h3 className="font-black text-white/80 uppercase text-[10.5px] tracking-[0.15em] mb-2 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>{language === 'en' ? 'Keyboard Shortcuts' : language === 'de' ? 'Tastenkombinationen' : 'Tastaturne prečice'}</span>
            </h3>
            <div className="space-y-1.5 bg-[#141414] p-3 rounded-xl border border-white/10">
              {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/10 last:border-0">
                  <kbd className="px-2 py-0.5 bg-[#202020] border border-white/20 rounded text-[11px] font-mono font-bold text-white shadow-xs">
                    {s.key}
                  </kbd>
                  <span className="text-white/70 text-[11.5px] text-right">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-black text-white/80 uppercase text-[10.5px] tracking-[0.15em] mb-2 flex items-center gap-1.5">
              <Touchpad className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>{language === 'en' ? 'Touch & Mobile Gestures' : language === 'de' ? 'Touch & Mobile Gesten' : 'Dodir i mobilne geste'}</span>
            </h3>
            <div className="space-y-1.5 bg-[#141414] p-3 rounded-xl border border-white/10">
              {gestures.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/10 last:border-0">
                  <span className="font-bold text-white text-[11px]">{g.gesture}</span>
                  <span className="text-white/70 text-[11.5px] text-right">{g.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#121212] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-wider text-xs rounded-lg transition-colors"
          >
            {language === 'en' ? 'Close' : language === 'de' ? 'Schließen' : 'Zatvori'}
          </button>
        </div>
      </div>
    </div>
  );
};
