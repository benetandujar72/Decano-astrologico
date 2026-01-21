/**
 * MaterialBackground: fondo neutro y estable (sin estética esotérica).
 * Mantiene una identidad "data lab" con un leve degradado sutil.
 */
import React from 'react';

interface MaterialBackgroundProps {
  children: React.ReactNode;
}

const MaterialBackground: React.FC<MaterialBackgroundProps> = ({ children }) => {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 15% 20%, rgba(29, 78, 216, 0.08), transparent 35%), radial-gradient(circle at 85% 15%, rgba(14, 165, 233, 0.07), transparent 30%), #f8fafc',
      }}
    >
      {children}
    </div>
  );
};

export default MaterialBackground;


