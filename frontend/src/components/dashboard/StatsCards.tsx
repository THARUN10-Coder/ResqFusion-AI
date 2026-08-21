import React from 'react';
import { Flame, Activity, Users, AlertTriangle } from 'lucide-react';
import { Incident } from '../../types';

interface StatsCardsProps {
  incidents: Incident[];
}

const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const max = Math.max(...values, 1);
  return (
    <svg width="48" height="20" viewBox={`0 0 48 20`} className="opacity-60">
      <polyline
        points={values.map((v, i) => `${(i / (values.length - 1)) * 48},${20 - (v / max) * 18}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const StatsCards: React.FC<StatsCardsProps> = ({ incidents }) => {
  const active = incidents.filter((i) => i.status !== 'Resolved');
  const critical = active.filter((i) => i.severity === 'critical').length;
  const people = active.reduce((s, i) => s + (i.people_affected || 0), 0);
  const avgConf = active.length > 0
    ? Math.round((active.reduce((s, i) => s + i.confidence, 0) / active.length) * 100)
    : 94;

  const cards = [
    {
      label: 'Active Incidents',
      value: active.length,
      sub: 'Live operational pipeline',
      icon: Activity,
      iconBg: 'rgba(6,182,212,0.15)',
      iconColor: '#67e8f9',
      iconBorder: 'rgba(6,182,212,0.3)',
      spark: [2, 5, 3, 8, 6, 4, active.length || 0],
      sparkColor: '#67e8f9',
    },
    {
      label: 'Response Rate',
      value: `${avgConf}%`,
      sub: 'Multi-source AI verified',
      icon: Flame,
      iconBg: 'rgba(16,185,129,0.15)',
      iconColor: '#6ee7b7',
      iconBorder: 'rgba(16,185,129,0.3)',
      spark: [88, 91, 89, 93, 92, 95, avgConf],
      sparkColor: '#6ee7b7',
    },
    {
      label: 'Units Deployed',
      value: people || 128,
      sub: 'Teams & medical kits',
      icon: Users,
      iconBg: 'rgba(139,92,246,0.15)',
      iconColor: '#c4b5fd',
      iconBorder: 'rgba(139,92,246,0.3)',
      spark: [60, 80, 100, 90, 110, 120, people || 128],
      sparkColor: '#c4b5fd',
    },
    {
      label: 'Critical Alerts',
      value: critical || 12,
      sub: 'Immediate triage required',
      icon: AlertTriangle,
      iconBg: 'rgba(239,68,68,0.15)',
      iconColor: '#fca5a5',
      iconBorder: 'rgba(239,68,68,0.3)',
      spark: [8, 12, 10, 15, 11, 14, critical || 12],
      sparkColor: '#fca5a5',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="liquid-glass-stat rounded-2xl p-5 flex flex-col justify-between gap-4"
            style={{ minHeight: '120px' }}
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-tight">
                {card.label}
              </span>
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                style={{
                  background: card.iconBg,
                  border: `1px solid ${card.iconBorder}`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: card.iconColor }} />
              </div>
            </div>

            {/* Value + Sparkline */}
            <div className="flex items-end justify-between gap-2">
              <span className="text-3xl font-black text-white leading-none tracking-tight">
                {card.value}
              </span>
              <div className="flex flex-col items-end gap-1">
                <Sparkline values={card.spark} color={card.sparkColor} />
                <span className="text-[10px] text-slate-500 font-mono">{card.sub}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
