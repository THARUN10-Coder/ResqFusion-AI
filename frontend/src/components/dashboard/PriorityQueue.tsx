import React from 'react';
import { ListOrdered, Clock, ChevronRight } from 'lucide-react';
import { Incident } from '../../types';

interface PriorityQueueProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
}

const SEV_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'CRITICAL', color: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)' },
  high:     { label: 'HIGH',     color: '#fb923c', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)' },
  medium:   { label: 'MED',      color: '#facc15', bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.35)' },
  low:      { label: 'LOW',      color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)' },
};

function timeAgo(ts?: string) {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return '< 1m';
  if (diff < 60) return `${diff}m`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  incidents, selectedIncident, onSelectIncident,
}) => {
  const sorted = [...incidents]
    .filter((i) => i.status !== 'Resolved')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);

  return (
    <div
      className="liquid-glass-panel rounded-2xl flex flex-col overflow-hidden"
      style={{ flex: '1 1 auto' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Priority Triage Queue
          </span>
        </div>
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: 'rgba(6,182,212,0.15)',
            border: '1px solid rgba(6,182,212,0.3)',
            color: '#67e8f9',
          }}
        >
          {sorted.length} Active Incidents
        </span>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-slate-500 text-xs">No active disaster incidents in queue.</p>
          </div>
        ) : (
          sorted.map((inc, idx) => {
            const sev = SEV_CONFIG[inc.severity] || SEV_CONFIG.medium;
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <button
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className="w-full text-left liquid-glass-row rounded-xl px-3 py-2.5 flex items-center gap-3 group transition-all"
                style={isSelected ? {
                  background: 'rgba(6,182,212,0.10)',
                  border: '1px solid rgba(6,182,212,0.30)',
                } : {}}
              >
                {/* Rank badge */}
                <span className="text-[10px] font-black text-slate-500 w-4 flex-shrink-0 font-mono">
                  #{idx + 1}
                </span>

                {/* Severity badge */}
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-md flex-shrink-0 tracking-wider"
                  style={{ background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color }}
                >
                  {sev.label}
                </span>

                {/* Incident title */}
                <span className="flex-1 text-xs text-slate-200 font-semibold truncate">
                  INC #{inc.id?.toString().slice(-5) || '00000'}: {inc.disaster_type}
                </span>

                {/* Time */}
                <div className="flex items-center gap-1 flex-shrink-0 text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-mono">{timeAgo(inc.created_at)}</span>
                </div>

                <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-300 transition-colors" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
