
import React, { useState } from 'react';
import { TRANSLATIONS } from '@/lib/constants';
import { Language } from '@/types';

interface ControlPanelProps {
  lang: Language;
  onTimeShift: (amount: number, unit: 'minute' | 'hour' | 'day' | 'month' | 'year') => void;
  onAction: (action: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ lang, onTimeShift, onAction }) => {
  const t = TRANSLATIONS[lang];
  const [timeUnit, setTimeUnit] = useState<'minute' | 'hour' | 'day' | 'month' | 'year'>('minute');
  const [timeAmount, setTimeAmount] = useState<number>(1);

  const btnBase = "md-button md-button--secondary text-xs font-semibold uppercase tracking-wide px-3 py-2 whitespace-nowrap";
  const btnPrimary = "md-button text-xs font-semibold uppercase tracking-wide px-3 py-2 whitespace-nowrap";
  const btnDanger = "md-button md-button--danger text-xs font-semibold uppercase tracking-wide px-3 py-2 whitespace-nowrap";
  const sectionTitle = "text-[11px] font-semibold uppercase tracking-wider text-slate-600 text-center";

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md-card mt-8">
      <div className="space-y-4">
        {/* SECCIÓN: CONTROL DE TIEMPO */}
        <div className="space-y-2">
          <div className={sectionTitle}>Control de temps</div>
          <div className="flex flex-wrap gap-2 justify-center items-center">
            <button onClick={() => onTimeShift(-timeAmount, timeUnit)} className={btnPrimary}>
              {t.cmdBack}
            </button>

            <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
              <input
                type="number"
                min="1"
                value={timeAmount}
                onChange={(e) => setTimeAmount(parseInt(e.target.value) || 1)}
                aria-label="Cantidad"
                title="Cantidad"
                className="w-14 text-slate-900 text-center text-xs font-mono outline-none border-r border-slate-200 py-2"
              />
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value as any)}
                aria-label="Unidad"
                title="Unidad"
                className="text-slate-900 text-xs font-semibold uppercase outline-none px-3 py-2 appearance-none cursor-pointer hover:bg-slate-50"
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
        </div>

        {/* SECCIÓN: VISTAS */}
        <div className="space-y-2">
          <div className={sectionTitle}>Vistes</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={() => onAction('legend')} className={`${btnBase} w-full`}>{t.cmdLegend}</button>
            <button onClick={() => onAction('stats')} className={`${btnBase} w-full`}>{t.cmdStats}</button>
            <button onClick={() => onAction('details')} className={`${btnBase} w-full`}>{t.cmdDetails}</button>
          </div>
        </div>

        {/* SECCIÓN: GESTIÓN */}
        <div className="space-y-2">
          <div className={sectionTitle}>Gestió</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button onClick={() => onAction('modify')} className={`${btnDanger} w-full`}>{t.cmdModify}</button>
            <button onClick={() => onAction('print')} className={`${btnDanger} w-full`}>{t.cmdPrint}</button>
            <button onClick={() => onAction('list')} className={`${btnDanger} w-full`}>{t.cmdList}</button>
            <button onClick={() => onAction('add')} className={`${btnDanger} w-full`}>{t.cmdAdd}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={() => onAction('prefs')} className={`${btnDanger} w-full`}>{t.cmdPrefs}</button>
            <button onClick={() => onAction('now')} className={`${btnDanger} w-full`}>{t.cmdNow}</button>
          </div>
        </div>

        {/* SECCIÓN: TÉCNIQUES */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className={sectionTitle}>Tècniques</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <button onClick={() => onAction('solar')} className={`${btnBase} w-full`}>{t.techSolar}</button>
            <button onClick={() => onAction('transits')} className={`${btnBase} w-full`}>{t.techTransit}</button>
            <button onClick={() => onAction('directions')} className={`${btnBase} w-full`}>{t.techDirect}</button>
            <button onClick={() => onAction('progressions')} className={`${btnBase} w-full`}>{t.techProg}</button>
            <button onClick={() => onAction('synastry')} className={`${btnBase} w-full`}>{t.techSynastry}</button>
            <button onClick={() => onAction('composite')} className={`${btnBase} w-full`}>{t.techComposite}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
