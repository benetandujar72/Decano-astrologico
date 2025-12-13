
import React, { useState } from 'react';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';

interface ControlPanelProps {
  lang: Language;
  onTimeShift: (amount: number, unit: 'minute' | 'hour' | 'day' | 'month' | 'year') => void;
  onAction: (action: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ lang, onTimeShift, onAction }) => {
  const t = TRANSLATIONS[lang];
  const [timeUnit, setTimeUnit] = useState<'minute' | 'hour' | 'day' | 'month' | 'year'>('minute');
  const [timeAmount, setTimeAmount] = useState<number>(1);

  // Estilos de botones para imitar la imagen (Borde azul/morado, texto uppercase)
  const btnBase = "border transition-all text-xs font-bold uppercase tracking-tight px-3 py-2 rounded shadow-sm hover:bg-white/10 active:scale-95 whitespace-nowrap";
  const btnPrimary = `${btnBase} border-blue-600 text-blue-300`;
  const btnSecondary = `${btnBase} border-purple-600 text-purple-300`;
  const btnDanger = `${btnBase} border-red-600 text-red-300`;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 bg-slate-900/50 rounded-xl border border-white/5 backdrop-blur-sm mt-8 space-y-4">
      
      {/* FILA 1: CONTROL DE TIEMPO */}
      <div className="flex flex-wrap gap-2 justify-center items-center">
        <button onClick={() => onTimeShift(-timeAmount, timeUnit)} className={btnPrimary}>
          {t.cmdBack}
        </button>
        
        <div className="flex border border-slate-600 rounded overflow-hidden">
          <input 
            type="number" 
            min="1" 
            value={timeAmount} 
            onChange={(e) => setTimeAmount(parseInt(e.target.value) || 1)}
            className="w-12 bg-slate-800 text-white text-center text-xs font-mono outline-none border-r border-slate-600 py-2"
          />
          <select 
            value={timeUnit} 
            onChange={(e) => setTimeUnit(e.target.value as any)}
            className="bg-slate-800 text-white text-xs font-bold uppercase outline-none px-2 py-2 appearance-none cursor-pointer hover:bg-slate-700"
          >
            <option value="minute">{t.cmdMinute}</option>
            <option value="hour">{t.cmdHour}</option>
            <option value="day">{t.cmdDay}</option>
            <option value="month">{t.cmdMonth}</option>
            <option value="year">{t.cmdYear}</option>
          </select>
        </div>

        <button onClick={() => onTimeShift(timeAmount, timeUnit)} className={btnPrimary}>
          {t.cmdFwd}
        </button>
      </div>

      {/* FILA 2: VISTAS */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => onAction('legend')} className={btnSecondary}>{t.cmdLegend}</button>
        <button onClick={() => onAction('stats')} className={btnSecondary}>{t.cmdStats}</button>
        <button onClick={() => onAction('details')} className={btnSecondary}>{t.cmdDetails}</button>
      </div>

      {/* FILA 3: ACCIONES PRINCIPALES */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => onAction('modify')} className={btnDanger}>{t.cmdModify}</button>
        <button onClick={() => onAction('print')} className={btnDanger}>{t.cmdPrint}</button>
        <button onClick={() => onAction('list')} className={btnDanger}>{t.cmdList}</button>
        <button onClick={() => onAction('add')} className={btnDanger}>{t.cmdAdd}</button>
      </div>

      {/* FILA 4: TIEMPO REAL / PREFS */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => onAction('prefs')} className={btnDanger}>{t.cmdPrefs}</button>
        <button onClick={() => onAction('now')} className={btnDanger}>{t.cmdNow}</button>
      </div>

      {/* FILA 5: TÉCNICAS AVANZADAS */}
      <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-white/5">
        <button onClick={() => onAction('solar')} className={btnDanger}>{t.techSolar}</button>
        <button onClick={() => onAction('transits')} className={btnDanger}>{t.techTransit}</button>
        <button onClick={() => onAction('directions')} className={btnDanger}>{t.techDirect}</button>
        <button onClick={() => onAction('progressions')} className={btnDanger}>{t.techProg}</button>
        <button onClick={() => onAction('synastry')} className={btnDanger}>{t.techSynastry}</button>
        <button onClick={() => onAction('composite')} className={btnDanger}>{t.techComposite}</button>
      </div>

    </div>
  );
};

export default ControlPanel;
