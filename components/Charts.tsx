import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { CPIData } from '../types';

interface ChartsProps {
  data: CPIData;
}

const ERROR_DATES = ['2024-12-14', '2025-04-21', '2025-08-17', '2025-10-19'];

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  // Transform data for the multi-line city chart
  const cityComparisonData = data.points.map(point => {
      const item: any = { date: point.date, National: parseFloat(point.cpi.toFixed(2)) };
      if (point.cityBreakdown) {
          Object.entries(point.cityBreakdown).forEach(([city, val]) => {
              item[city] = parseFloat(Number(val).toFixed(2));
          });
      }
      return item;
  });

  // Generate YoY Data Series
  const yoyData = data.points.map(point => {
      const currDate = new Date(point.date);
      const targetDate = new Date(currDate);
      targetDate.setFullYear(currDate.getFullYear() - 1);
      
      // Find closest data point roughly 1 year ago (+/- 15 days)
      // This tolerance accounts for weekends or missing scraping days
      const tolerance = 15 * 24 * 60 * 60 * 1000;
      let closest: any = null;
      let minDiff = Infinity;

      data.points.forEach(p => {
          const d = new Date(p.date);
          const diff = Math.abs(d.getTime() - targetDate.getTime());
          if (diff <= tolerance && diff < minDiff) {
              minDiff = diff;
              closest = p;
          }
      });

      if (closest && closest.cpi > 0) {
          const val = ((point.cpi / closest.cpi) - 1) * 100;
          return {
              date: point.date,
              yoy: parseFloat(val.toFixed(2))
          };
      }
      return null;
  }).filter(p => p !== null);

  const CITY_COLORS: Record<string, string> = {
      'National': '#0f172a', // Slate 900
      'Cochabamba': '#8b5cf6', // Violet
      'La Paz': '#f59e0b', // Amber
      'Santa Cruz': '#10b981' // Emerald
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isErrorDate = ERROR_DATES.includes(label);
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg">
          <p className="text-sm font-bold text-slate-700 mb-2">{label}</p>
          {isErrorDate && (
             <div className="flex items-center gap-1 mb-2 text-red-600 text-xs font-bold bg-red-50 p-1 rounded">
                <span>⚠ Likely Data Error</span>
             </div>
          )}
          {payload.map((p: any) => (
            <p key={p.name} className="text-xs" style={{ color: p.color }}>
              {p.name}: <span className="font-semibold">{p.value}</span>
              {p.name.includes('Inflation') && '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 mb-8">
      {/* National CPI Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">National CPI Trend</h3>
          <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.points}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                  dataKey="date" 
                  tick={{fontSize: 12, fill: '#64748b'}} 
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
              />
              <YAxis 
                  domain={['auto', 'auto']} 
                  tick={{fontSize: 12, fill: '#64748b'}} 
                  tickLine={false}
                  axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {ERROR_DATES.map(date => (
                  <ReferenceLine 
                      key={date} 
                      x={date} 
                      stroke="#ef4444" 
                      strokeDasharray="3 3"
                      label={{ position: 'top', value: '!', fill: '#ef4444', fontSize: 14, fontWeight: 'bold' }}
                  />
              ))}
              <Line 
                  type="monotone" 
                  dataKey="cpi" 
                  stroke="#0f172a" 
                  strokeWidth={3} 
                  dot={{ r: 3, fill: '#0f172a', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="National CPI"
              />
              </LineChart>
          </ResponsiveContainer>
          </div>
      </div>

      {/* City Comparison Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Regional CPI Comparison</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cityComparisonData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: '#64748b'}} 
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                tick={{fontSize: 12, fill: '#64748b'}} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {ERROR_DATES.map(date => (
                    <ReferenceLine 
                        key={date} 
                        x={date} 
                        stroke="#ef4444" 
                        strokeDasharray="3 3"
                    />
               ))}
              <Line type="monotone" dataKey="National" stroke={CITY_COLORS['National']} strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="Cochabamba" stroke={CITY_COLORS['Cochabamba']} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="La Paz" stroke={CITY_COLORS['La Paz']} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Santa Cruz" stroke={CITY_COLORS['Santa Cruz']} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* YoY Inflation Chart */}
      {yoyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Year-over-Year Inflation Trend (%)</h3>
            <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yoyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                />
                <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                />
                <Tooltip content={<CustomTooltip />} />
                {ERROR_DATES.map(date => (
                    <ReferenceLine 
                        key={date} 
                        x={date} 
                        stroke="#ef4444" 
                        strokeDasharray="3 3"
                    />
                ))}
                <Line 
                    type="monotone" 
                    dataKey="yoy" 
                    stroke="#f97316" 
                    strokeWidth={3} 
                    dot={{ r: 3, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                    name="YoY Inflation"
                />
                </LineChart>
            </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
                Calculated by comparing daily CPI to the closest available data point from ~1 year ago.
            </p>
        </div>
      )}
    </div>
  );
};
