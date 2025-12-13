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
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse shadow-[0_0_50px_rgba(251,191,36,0.8)]">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 animate-spin-slow" 
               style={{ animationDuration: '20s' }} />
        </div>
      </div>

      {/* Órbitas */}
      {[1, 2, 3, 4].map((orbit) => (
        <div
          key={orbit}
          className="absolute inset-0 border border-white/10 rounded-full animate-spin-slow"
          style={{
            margin: `${orbit * 16}px`,
            animationDuration: `${orbit * 8}s`,
            animationDirection: orbit % 2 === 0 ? 'reverse' : 'normal'
          }}
        >
          {/* Planeta */}
          <div
            className={`absolute w-${orbit * 2 + 4} h-${orbit * 2 + 4} rounded-full`}
            style={{
              top: '50%',
              left: '-12px',
              transform: 'translateY(-50%)',
              background: `radial-gradient(circle, ${getPlanetColor(orbit)})`,
              boxShadow: `0 0 20px ${getPlanetGlow(orbit)}`
            }}
          />
        </div>
      ))}

      {/* Efectos de brillo */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-indigo-500/5 to-transparent animate-pulse" />
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

