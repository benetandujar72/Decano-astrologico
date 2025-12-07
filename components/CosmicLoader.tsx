import React from 'react';
import { Globe } from 'lucide-react';

const CosmicLoader: React.FC = () => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Centro: Tierra */}
      <div className="absolute z-10 text-indigo-500 animate-pulse">
        <Globe size={48} strokeWidth={1} />
      </div>
      
      {/* Centro: Núcleo Brillante */}
      <div className="absolute w-12 h-12 bg-indigo-500/20 rounded-full blur-xl animate-pulse-slow"></div>

      {/* Órbita 1: Sol */}
      <div className="absolute w-full h-full animate-[spin_6s_linear_infinite]">
        <div className="w-full h-full rounded-full border border-yellow-500/10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-amber-400 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center justify-center">
            <div className="w-full h-full bg-yellow-200/50 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>
      </div>

      {/* Órbita 2: Luna (Reverse, más pequeña) */}
      <div className="absolute w-32 h-32 animate-[spinReverse_8s_linear_infinite]">
        <div className="w-full h-full rounded-full border border-indigo-300/10 relative">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-slate-200 rounded-full shadow-[0_0_10px_rgba(226,232,240,0.5)]">
             {/* Craters fake */}
             <div className="absolute top-1 left-1 w-1 h-1 bg-slate-400/30 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Anillos decorativos */}
      <div className="absolute w-40 h-40 border border-dashed border-white/5 rounded-full animate-spin-slow"></div>
    </div>
  );
};

export default CosmicLoader;