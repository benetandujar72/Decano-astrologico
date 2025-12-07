import React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, Tooltip } from 'recharts';

interface RadialChartProps {
  data: { name: string; value: number; fill: string }[];
}

const RadialChart: React.FC<RadialChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64 relative">
      <h3 className="absolute top-0 left-0 text-xs font-mono text-gray-400 uppercase tracking-widest">
        Balance Elemental
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="30%" 
          outerRadius="100%" 
          barSize={20} 
          data={data}
          startAngle={180} 
          endAngle={0}
        >
          <RadialBar
            label={{ position: 'insideStart', fill: '#fff', fontSize: 10, fontWeight: 'bold' }}
            background={{ fill: '#1f2937' }}
            dataKey="value"
          />
          <Legend 
            iconSize={10} 
            layout="vertical" 
            verticalAlign="middle" 
            wrapperStyle={{ right: 0, top: 0, bottom: 0, fontSize: '12px', fontFamily: 'JetBrains Mono' }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '4px' }}
            itemStyle={{ color: '#e5e7eb', fontSize: '12px' }}
            cursor={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadialChart;