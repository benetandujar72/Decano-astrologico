import React from 'react';
import { PlanetPosition, Language } from '@/types';
import { TRANSLATIONS } from '@/lib/constants';

interface PlanetaryTableProps {
  positions: PlanetPosition[];
  lang: Language;
}

const PlanetaryTable: React.FC<PlanetaryTableProps> = ({ positions, lang }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-left text-slate-700 font-sans md-table">
        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">{t.tablePoint}</th>
            <th className="px-4 py-3">{t.tableSign}</th>
            <th className="px-4 py-3">{t.tableDeg}</th>
            <th className="px-4 py-3">{t.tableHouse}</th>
            <th className="px-4 py-3">{t.tableElem}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {positions.map((pos) => (
            <tr key={pos.name} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-semibold text-slate-900">
                {pos.name} {pos.retrograde && <span className="text-[10px] text-red-600 align-super">R</span>}
              </td>
              <td className="px-4 py-3">{pos.sign}</td>
              <td className="px-4 py-3 text-slate-500 font-mono">{pos.degree}</td>
              <td className="px-4 py-3 text-slate-500 font-mono">{pos.house}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border
                  ${(pos.element === 'Fuego' || pos.element === 'Fire' || pos.element === 'Sua' || pos.element === 'Foc') ? 'bg-red-50 text-red-800 border-red-100' : ''}
                  ${(pos.element === 'Tierra' || pos.element === 'Earth' || pos.element === 'Lurra' || pos.element === 'Terra') ? 'bg-green-50 text-green-800 border-green-100' : ''}
                  ${(pos.element === 'Aire' || pos.element === 'Air' || pos.element === 'Airea') ? 'bg-blue-50 text-blue-800 border-blue-100' : ''}
                  ${(pos.element === 'Agua' || pos.element === 'Water' || pos.element === 'Ura' || pos.element === 'Aigua') ? 'bg-cyan-50 text-cyan-800 border-cyan-100' : ''}
                `}>
                  {pos.element.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlanetaryTable;
