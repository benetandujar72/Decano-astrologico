/**
 * Animación de órbitas planetarias mejorada
 */
import React from 'react';
import './PlanetaryOrbit.css';

interface PlanetaryOrbitProps {
  size?: 'small' | 'medium' | 'large';
}

const PlanetaryOrbit: React.FC<PlanetaryOrbitProps> = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-48 h-48',
    medium: 'w-64 h-64',
    large: 'w-96 h-96'
  };

  return (
    <div className={`relative ${sizeClasses[size]} mx-auto`}>
      {/* Sol central */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 border border-blue-200 animate-pulse shadow-sm flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 blur-sm animate-pulse" />
        </div>
      </div>

      {/* Órbitas */}
      {[1, 2, 3, 4].map((orbit) => (
        <div
          key={orbit}
          className="absolute inset-0 border border-slate-200 rounded-full animate-spin-slow"
          style={{
            margin: `${orbit * 16}px`,
            animationDuration: `${orbit * 8}s`,
            animationDirection: orbit % 2 === 0 ? 'reverse' : 'normal'
          }}
        >
          {/* Planeta */}
          <div
            className={`absolute w-${orbit * 2 + 4} h-${orbit * 2 + 4} rounded-full border border-slate-200 bg-white shadow-sm`}
            style={{
              top: '50%',
              left: '-12px',
              transform: 'translateY(-50%)',
            }}
          />
        </div>
      ))}

      {/* Efectos de brillo */}
      <div className="absolute inset-0 bg-radial from-blue-500/5 to-transparent animate-pulse" />
    </div>
  );
};

const getPlanetColor = (orbit: number): string => {
  const colors = [
    'rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0)',    // Rojo (Marte)
    'rgba(96, 165, 250, 0.8), rgba(96, 165, 250, 0)',  // Azul (Neptuno)
    'rgba(251, 191, 36, 0.8), rgba(251, 191, 36, 0)',  // Amarillo (Júpiter)
    'rgba(167, 139, 250, 0.8), rgba(167, 139, 250, 0)' // Violeta (Urano)
  ];
  return colors[orbit - 1] || colors[0];
};

const getPlanetGlow = (orbit: number): string => {
  const glows = [
    'rgba(239, 68, 68, 0.6)',
    'rgba(96, 165, 250, 0.6)',
    'rgba(251, 191, 36, 0.6)',
    'rgba(167, 139, 250, 0.6)'
  ];
  return glows[orbit - 1] || glows[0];
};

export default PlanetaryOrbit;

