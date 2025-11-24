import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, Calendar, History } from 'lucide-react';
import { CPIData } from '../types';

interface StatsCardsProps {
  data: CPIData;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ data }) => {
  const isInflationPositive = data.currentInflation >= 0;
  const isYoYPositive = data.yoyInflation >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Current CPI Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">National CPI</h3>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
            <Activity size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">{data.currentCPI.toFixed(2)}</span>
          <span className="text-sm text-slate-400">Points</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Weighted average (SCZ, LPZ, CBB)</p>
      </div>

      {/* Inflation Rate Card (Period) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Inflation (MoM)</h3>
          <div className={`p-2 rounded-full ${isInflationPositive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {isInflationPositive ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${isInflationPositive ? 'text-red-600' : 'text-emerald-600'}`}>
            {data.currentInflation > 0 ? '+' : ''}{data.currentInflation.toFixed(2)}%
          </span>
          <span className="text-sm text-slate-400">vs Previous</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Short-term Change</p>
      </div>

      {/* YoY Inflation Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Inflation (YoY)</h3>
          <div className={`p-2 rounded-full ${isYoYPositive ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <History size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${isYoYPositive ? 'text-orange-600' : 'text-emerald-600'}`}>
            {data.yoyInflation > 0 ? '+' : ''}{data.yoyInflation.toFixed(2)}%
          </span>
          <span className="text-sm text-slate-400">Annual</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Since 1 year ago</p>
      </div>

      {/* Date Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Latest Data</h3>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-full">
            <Calendar size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-slate-900">{data.lastUpdated}</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Live GitHub Feed</p>
      </div>
    </div>
  );
};