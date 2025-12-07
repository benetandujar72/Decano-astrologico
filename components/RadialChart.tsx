import React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, Tooltip } from 'recharts';

interface RadialChartProps {
  data: { name: string; value: number; fill: string }[];
  title: string;
}

const RadialChart: React.FC<RadialChartProps> = ({ data, title }) => {
  return (
    <div className="w-full h-64 relative">
      <h3 className="absolute top-0 left-0 text-xs font-bold text-gray-500 uppercase tracking-widest">
        {title}
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
            background={{ fill: 'rgba(255,255,255,0.05)' }}
            dataKey="value"
          />
          <Legend 
            iconSize={8} 
            layout="vertical" 
            verticalAlign="middle" 
            wrapperStyle={{ right: 0, top: 0, bottom: 0, fontSize: '11px', fontFamily: 'Inter', opacity: 0.8 }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
            itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
            cursor={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadialChart;