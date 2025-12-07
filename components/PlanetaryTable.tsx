import React from 'react';
import { PlanetPosition } from '../types';

interface PlanetaryTableProps {
  positions: PlanetPosition[];
}

const PlanetaryTable: React.FC<PlanetaryTableProps> = ({ positions }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-left text-gray-400 font-mono">
        <thead className="bg-gem-panel text-gray-200 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">Punto</th>
            <th className="px-4 py-3">Signo</th>
            <th className="px-4 py-3">Grado</th>
            <th className="px-4 py-3">Casa</th>
            <th className="px-4 py-3">Elem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {positions.map((pos) => (
            <tr key={pos.name} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-2 font-medium text-indigo-300">
                {pos.name} {pos.retrograde && <span className="text-[10px] text-red-400 align-super">R</span>}
              </td>
              <td className="px-4 py-2">{pos.sign}</td>
              <td className="px-4 py-2">{pos.degree}</td>
              <td className="px-4 py-2">{pos.house}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] 
                  ${pos.element === 'Fuego' ? 'bg-red-900/30 text-red-400' : ''}
                  ${pos.element === 'Tierra' ? 'bg-emerald-900/30 text-emerald-400' : ''}
                  ${pos.element === 'Aire' ? 'bg-yellow-900/30 text-yellow-400' : ''}
                  ${pos.element === 'Agua' ? 'bg-blue-900/30 text-blue-400' : ''}
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