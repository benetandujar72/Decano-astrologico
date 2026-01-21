/**
 * Fondo místico animado con partículas y efectos
 */
import React, { useEffect, useRef } from 'react';

interface MysticBackgroundProps {
  children: React.ReactNode;
}

const MysticBackground: React.FC<MysticBackgroundProps> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar tamaño del canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Partículas (estrellas)
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      fadeDirection: number;
    }

    const particles: Particle[] = [];
    const particleCount = 150;

    // Crear partículas
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.8 + 0.2,
        fadeDirection: Math.random() > 0.5 ? 1 : -1
      });
    }

    // Animar
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gradiente de fondo
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 14, 39, 1)');
      gradient.addColorStop(0.5, 'rgba(20, 20, 60, 1)');
      gradient.addColorStop(1, 'rgba(30, 20, 70, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dibujar y actualizar partículas
      particles.forEach(particle => {
        // Dibujar estrella
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();

        // Efecto de brillo
        if (particle.size > 1.5) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(102, 126, 234, ${particle.opacity * 0.3})`;
          ctx.fill();
        }

        // Actualizar posición
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Parpadeo
        particle.opacity += particle.fadeDirection * 0.01;
        if (particle.opacity <= 0.2 || particle.opacity >= 1) {
          particle.fadeDirection *= -1;
        }

        // Wraparound
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Canvas de fondo */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Overlay de gradiente */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent via-[#0a0e27]/50 to-[#0a0e27]" 
           style={{ pointerEvents: 'none' }} />
      
      {/* Contenido */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default MysticBackground;

