import React from 'react';
import { PlanetPosition, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface PlanetaryTableProps {
  positions: PlanetPosition[];
  lang: Language;
}

const PlanetaryTable: React.FC<PlanetaryTableProps> = ({ positions, lang }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-left text-gray-300 font-mono">
        <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10">
          <tr>
            <th className="px-4 py-3">{t.tablePoint}</th>
            <th className="px-4 py-3">{t.tableSign}</th>
            <th className="px-4 py-3">{t.tableDeg}</th>
            <th className="px-4 py-3">{t.tableHouse}</th>
            <th className="px-4 py-3">{t.tableElem}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {positions.map((pos) => (
            <tr key={pos.name} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-medium text-gem-accent">
                {pos.name} {pos.retrograde && <span className="text-[10px] text-red-400 align-super">R</span>}
              </td>
              <td className="px-4 py-3">{pos.sign}</td>
              <td className="px-4 py-3 opacity-70">{pos.degree}</td>
              <td className="px-4 py-3 opacity-70">{pos.house}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold
                  ${(pos.element === 'Fuego' || pos.element === 'Fire' || pos.element === 'Sua' || pos.element === 'Foc') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
                  ${(pos.element === 'Tierra' || pos.element === 'Earth' || pos.element === 'Lurra') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                  ${(pos.element === 'Aire' || pos.element === 'Air' || pos.element === 'Airea') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''}
                  ${(pos.element === 'Agua' || pos.element === 'Water' || pos.element === 'Ura') ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : ''}
                `}>
                  {pos.element}
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