import React from 'react';
import { Radio } from 'lucide-react';
import { ActivityEvent } from '../../types';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

const SEV_BADGE: Record<string, { label: string; color: string }> = {
  INCIDENT_FUSED:    { label: 'FUSED',    color: '#c4b5fd' },
  CONFLICT_DETECTED: { label: 'CONFLICT', color: '#fb923c' },
  PRIORITY_UPDATED:  { label: 'HIGH',     color: '#f87171' },
  INCIDENT_UPDATED:  { label: 'UPDATE',   color: '#4ade80' },
  default:           { label: 'INFO',     color: '#67e8f9' },
};

const DEMO_EVENTS = [
  { id: '1', type: 'PRIORITY_UPDATED', message: 'Dispatch #11 to Fire', timestamp: '16:48' },
  { id: '2', type: 'default', message: 'Unit 23 En route', timestamp: '16:47' },
  { id: '3', type: 'INCIDENT_UPDATED', message: 'Incident #31942 log updated', timestamp: '16:45' },
  { id: '4', type: 'default', message: 'Rescue alert received', timestamp: '16:43' },
];

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  const display = events.length > 0
    ? events.slice(0, 6).map((e) => ({ ...e, timestamp: e.timestamp || '' }))
    : DEMO_EVENTS;

  return (
    <div
      className="liquid-glass-panel rounded-2xl flex flex-col overflow-hidden"
      style={{ flex: '0 0 auto' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 opacity-60" />
            <Radio className="w-3.5 h-3.5 text-cyan-400 relative" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Activity Feed</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">LIVE</span>
      </div>

      {/* Feed Items */}
      <div className="px-3 py-3 space-y-1.5">
        {display.map((evt) => {
          const badge = SEV_BADGE[evt.type] || SEV_BADGE.default;
          return (
            <div
              key={evt.id}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="font-mono text-[10px] text-slate-500 flex-shrink-0">{evt.timestamp}</span>
              <span className="flex-1 text-slate-300 font-medium truncate">{evt.message}</span>
              <span
                className="text-[9px] font-black flex-shrink-0 px-1.5 py-0.5 rounded"
                style={{ color: badge.color, background: `${badge.color}18` }}
              >
                [{badge.label}]
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
