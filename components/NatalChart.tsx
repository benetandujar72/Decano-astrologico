import React, { useState } from 'react';
import { PlanetPosition, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface NatalChartProps {
  positions: PlanetPosition[];
  lang: Language;
}

const ZODIAC_SYMBOLS: Record<string, string> = {
  'Aries': '♈', 'Tauro': '♉', 'Géminis': '♊', 'Cáncer': '♋', 
  'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Escorpio': '♏', 
  'Sagitario': '♐', 'Capricornio': '♑', 'Acuario': '♒', 'Piscis': '♓'
};

const PLANET_SYMBOLS: Record<string, string> = {
  'Sol': '☉', 'Luna': '☽', 'Mercurio': '☿', 'Venus': '♀', 'Marte': '♂',
  'Júpiter': '♃', 'Saturno': '♄', 'Urano': '♅', 'Neptuno': '♆', 'Plutón': '♇',
  'Ascendente': 'AC', 'Nodo Norte': '☊'
};

const NatalChart: React.FC<NatalChartProps> = ({ positions, lang }) => {
  const [hoveredPlanet, setHoveredPlanet] = useState<PlanetPosition | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const t = TRANSLATIONS[lang];

  const SIZE = 500;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 40;
  const INNER_RADIUS = RADIUS - 60;
  
  // Find Ascendant longitude to rotate chart so ASC is at 9 o'clock (180 degrees visually in SVG)
  const ascendant = positions.find(p => p.name === 'Ascendente');
  const ascLongitude = ascendant ? ascendant.longitude : 0;
  
  // SVG starts at 0 degrees = 3 o'clock. We want ASC at 9 o'clock (Left).
  // Current ASC is at `ascLongitude`. We want to rotate so `ascLongitude` aligns with 180 deg.
  // Rotation = 180 - ascLongitude.
  const rotationOffset = 180 - ascLongitude;

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only update if we have a hovered planet to avoid excessive renders, 
    // or if we want the tooltip to follow the mouse.
    // For smoother performance, we can just position relative to the element or global mouse.
    // Here we use the relative coordinates within the container.
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    });
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const totalAngle = angleInDegrees + rotationOffset; 
    const angleInRadians = (totalAngle) * Math.PI / 180.0;
    // SVG standard: 0 is Right. We want Counter Clockwise.
    return {
      x: centerX + (radius * Math.cos(angleInRadians * -1)),
      y: centerY + (radius * Math.sin(angleInRadians * -1))
    };
  };

  const drawSector = (startDeg: number, endDeg: number, color: string, label: string) => {
    const start = polarToCartesian(CENTER, CENTER, RADIUS, startDeg);
    const end = polarToCartesian(CENTER, CENTER, RADIUS, endDeg);
    const startIn = polarToCartesian(CENTER, CENTER, INNER_RADIUS, startDeg);
    const endIn = polarToCartesian(CENTER, CENTER, INNER_RADIUS, endDeg);

    const largeArcFlag = endDeg - startDeg <= 180 ? "0" : "1";

    const pathData = [
      "M", start.x, start.y, 
      "A", RADIUS, RADIUS, 0, largeArcFlag, 0, end.x, end.y, 
      "L", endIn.x, endIn.y,
      "A", INNER_RADIUS, INNER_RADIUS, 0, largeArcFlag, 1, startIn.x, startIn.y,
      "Z"
    ].join(" ");

    // Label Position
    const midAngle = startDeg + 15;
    const labelPos = polarToCartesian(CENTER, CENTER, RADIUS - 20, midAngle);

    return (
      <g key={label}>
        <path d={pathData} fill="transparent" stroke="#334155" strokeWidth="1" />
        <text x={labelPos.x} y={labelPos.y} fill={color} fontSize="16" textAnchor="middle" dominantBaseline="middle" transform={`rotate(0, ${labelPos.x}, ${labelPos.y})`}>
          {ZODIAC_SYMBOLS[label] || label}
        </text>
      </g>
    );
  };

  // Aspect Lines
  const renderAspects = () => {
    const lines: React.ReactElement[] = [];
    const planetsToMap = positions.filter(p => p.name !== 'Ascendente' && p.name !== 'Nodo Norte');
    
    planetsToMap.forEach((p1, i) => {
      planetsToMap.forEach((p2, j) => {
        if (i <= j) return; // Avoid duplicates
        
        let diff = Math.abs(p1.longitude - p2.longitude);
        if (diff > 180) diff = 360 - diff;

        let color = "";
        if (Math.abs(diff - 180) < 8) color = "#ef4444"; // Opposition (Red)
        else if (Math.abs(diff - 120) < 8) color = "#3b82f6"; // Trine (Blue)
        else if (Math.abs(diff - 90) < 8) color = "#ef4444"; // Square (Red)
        else if (Math.abs(diff - 60) < 6) color = "#3b82f6"; // Sextile (Blue)

        if (color) {
          const c1 = polarToCartesian(CENTER, CENTER, INNER_RADIUS - 40, p1.longitude);
          const c2 = polarToCartesian(CENTER, CENTER, INNER_RADIUS - 40, p2.longitude);
          lines.push(
            <line key={`${p1.name}-${p2.name}`} x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke={color} strokeWidth="1" opacity="0.6" />
          );
        }
      });
    });
    return lines;
  };

  return (
    <div className="relative flex justify-center items-center p-4 w-full h-full" onMouseMove={handleMouseMove}>
       <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-[500px] max-h-[500px] overflow-visible">
          {/* Background */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#334155" />
          
          {/* Zodiac Ring */}
          {Object.keys(ZODIAC_SYMBOLS).map((sign, i) => {
            const start = i * 30;
            const colors = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6']; // Fire, Earth, Air, Water pattern
            return drawSector(start, start + 30, colors[i % 4], sign);
          })}

          {/* House Lines */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
             const realDeg = (deg + ascLongitude) % 360; 
             const start = polarToCartesian(CENTER, CENTER, INNER_RADIUS, realDeg);
             const end = polarToCartesian(CENTER, CENTER, INNER_RADIUS - 30, realDeg); 
             return <line key={deg} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#475569" strokeWidth="1" />
          })}

          {/* Center Hub */}
          <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS - 40} fill="rgba(15, 23, 42, 0.5)" stroke="#334155" />
          <circle cx={CENTER} cy={CENTER} r="20" fill="#f8fafc" />

          {/* Aspect Lines */}
          {renderAspects()}

          {/* Planets */}
          {positions.map((pos) => {
            const r = INNER_RADIUS - 20;
            const coord = polarToCartesian(CENTER, CENTER, r, pos.longitude);
            const lineStart = polarToCartesian(CENTER, CENTER, INNER_RADIUS, pos.longitude);
            const isHovered = hoveredPlanet?.name === pos.name;
            
            return (
              <g 
                key={pos.name} 
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredPlanet(pos)}
                onMouseLeave={() => setHoveredPlanet(null)}
                style={{ opacity: hoveredPlanet && !isHovered ? 0.3 : 1 }}
              >
                {/* Hit area for easier hovering */}
                <circle cx={coord.x} cy={coord.y} r="20" fill="transparent" />

                {/* Line to zodiac */}
                <line x1={CENTER} y1={CENTER} x2={lineStart.x} y2={lineStart.y} stroke={pos.name === 'Ascendente' ? '#ef4444' : '#64748b'} strokeWidth={pos.name === 'Ascendente' ? 2 : 0.5} opacity="0.3" />
                
                {/* Planet Glyph */}
                <circle 
                  cx={coord.x} 
                  cy={coord.y} 
                  r={isHovered ? 14 : 10} 
                  fill={isHovered ? "#1e293b" : "#0f172a"}
                  stroke={pos.element === 'Fuego' ? '#ef4444' : pos.element === 'Agua' ? '#3b82f6' : pos.element === 'Aire' ? '#f59e0b' : '#10b981'} 
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-200"
                />
                <text x={coord.x} y={coord.y} fontSize={isHovered ? "14" : "12"} fill="white" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
                   {PLANET_SYMBOLS[pos.name] || pos.name.charAt(0)}
                </text>
              </g>
            );
          })}
          
          {/* Axis Markings */}
          <text x={10} y={CENTER} fill="#ef4444" fontSize="12" fontWeight="bold">AC</text>
          <text x={SIZE - 20} y={CENTER} fill="#ef4444" fontSize="12" fontWeight="bold">DC</text>
          <text x={CENTER} y={20} fill="#ef4444" fontSize="12" fontWeight="bold">MC</text>
          <text x={CENTER} y={SIZE - 10} fill="#ef4444" fontSize="12" fontWeight="bold">IC</text>

       </svg>

       {/* TOOLTIP OVERLAY */}
       {hoveredPlanet && (
         <div 
           className="absolute z-50 pointer-events-none animate-fade-in"
           style={{ 
             left: cursorPos.x + 20, 
             top: cursorPos.y - 20,
             minWidth: '200px'
           }}
         >
           <div className="glass-panel p-4 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
             <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2">
                <span className="font-serif text-lg text-white font-bold flex items-center gap-2">
                   {PLANET_SYMBOLS[hoveredPlanet.name]} {hoveredPlanet.name}
                </span>
                {hoveredPlanet.retrograde && (
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30">
                    {t.tooltipRetro}
                  </span>
                )}
             </div>
             
             <div className="space-y-1 text-sm font-mono text-gray-300">
               <div className="flex justify-between">
                 <span className="text-gray-500">{t.tooltipSign}:</span>
                 <span className="text-indigo-200">{ZODIAC_SYMBOLS[hoveredPlanet.sign]} {hoveredPlanet.sign}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-500">{t.tooltipHouse}:</span>
                 <span className="text-indigo-200">{hoveredPlanet.house}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-500">{t.tooltipDegree}:</span>
                 <span className="text-indigo-200 font-mono">{hoveredPlanet.degree}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-500">{t.tooltipElement}:</span>
                 <span className={`
                   ${(hoveredPlanet.element === 'Fuego' || hoveredPlanet.element === 'Fire' || hoveredPlanet.element === 'Sua' || hoveredPlanet.element === 'Foc') ? 'text-red-400' : ''}
                   ${(hoveredPlanet.element === 'Tierra' || hoveredPlanet.element === 'Earth' || hoveredPlanet.element === 'Lurra' || hoveredPlanet.element === 'Terra') ? 'text-emerald-400' : ''}
                   ${(hoveredPlanet.element === 'Aire' || hoveredPlanet.element === 'Air' || hoveredPlanet.element === 'Airea') ? 'text-amber-400' : ''}
                   ${(hoveredPlanet.element === 'Agua' || hoveredPlanet.element === 'Water' || hoveredPlanet.element === 'Ura' || hoveredPlanet.element === 'Aigua') ? 'text-blue-400' : ''}
                 `}>
                   {hoveredPlanet.element}
                 </span>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default NatalChart;
