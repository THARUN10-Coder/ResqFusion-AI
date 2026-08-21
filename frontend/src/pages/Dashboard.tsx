import React, { useEffect, useState, useRef } from 'react';
import { Shield, Activity, BarChart2, FileText, Settings, ChevronDown, Play, Square, Sparkles, Radio, ListOrdered, Clock, ChevronRight, Users, AlertTriangle, Zap, Wifi, WifiOff, UserCheck, Check } from 'lucide-react';
import { Incident, ActivityEvent, DataSourceStatus } from '../types';
import { getIncidents, getIncidentDetail, startSimulator, stopSimulator, getDataSources } from '../services/api';
import { dashboardWS } from '../services/websocket';
import { IncidentMap } from '../components/dashboard/IncidentMap';
import { IncidentDetailDrawer } from '../components/incident/IncidentDetailDrawer';
import { CitizenReportFormModal } from '../components/report/CitizenReportFormModal';
import { AnalyticsPage } from './AnalyticsPage';
import { ReportsPage } from './ReportsPage';
import { SettingsPage } from './SettingsPage';

interface DashboardProps {
  activeTab: 'dashboard' | 'analytics' | 'reports' | 'settings';
  setActiveTab: (t: 'dashboard' | 'analytics' | 'reports' | 'settings') => void;
}

const TICKERS = [
  { text: '★ FIRE DISPATCH: Unit 12', badge: 'HIGH PRIORITY', badgeColor: '#fdba74' },
  { text: '★ RESCUE ALERT: Incident #31941', badge: 'CRITICAL', badgeColor: '#fca5a5' },
  { text: '★ POLICE ACTIVITY: Zone 4', badge: 'MEDIUM', badgeColor: '#fde047' },
  { text: '★ MEDICAL EMERGENCY: Sector B', badge: 'HIGH', badgeColor: '#fdba74' },
  { text: '★ FLOOD WARNING: District 3', badge: 'CRITICAL', badgeColor: '#fca5a5' },
  { text: '★ EVACUATION ORDER: Zone 7', badge: 'CRITICAL', badgeColor: '#fca5a5' },
  { text: '★ UNIT 23 EN ROUTE', badge: 'UPDATE', badgeColor: '#67e8f9' },
  { text: '★ AI FUSION: 3 reports merged', badge: 'FUSED', badgeColor: '#c4b5fd' },
];

const DEMO_ACTIVITIES = [
  { id: '1', type: 'PRIORITY_UPDATED', message: 'Dispatch Unit #11 → Fire Sector A', timestamp: '16:48' },
  { id: '2', type: 'default', message: 'Unit 23 En route to #31942', timestamp: '16:47' },
  { id: '3', type: 'INCIDENT_FUSED', message: 'Incident #31942 — 3 reports merged', timestamp: '16:45' },
  { id: '4', type: 'default', message: 'Rescue alert received — Zone 4', timestamp: '16:43' },
  { id: '5', type: 'CONFLICT_DETECTED', message: 'Conflict flagged on #31940', timestamp: '16:41' },
];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type UserRole = 'admin' | 'responder' | 'citizen';

const ROLES: { id: UserRole; title: string; label: string; desc: string }[] = [
  { id: 'admin', title: 'Admin (EOC)', label: 'EOC Commander', desc: 'Full authority: Triage, Squad Dispatch, Verify & Resolve' },
  { id: 'responder', title: 'Responder', label: 'Field Response (NDRF)', desc: 'Field actions: On-site verification & status updates' },
  { id: 'citizen', title: 'Citizen', label: 'Citizen Reporter', desc: 'Public view: Report emergencies & track alerts' },
];

function timeAgo(ts?: string) {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return '< 1m';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, Icon, accent, sparkVals }: {
  label: string; value: string | number; sub: string;
  Icon: React.ElementType; accent: string; sparkVals: number[];
}) {
  const max = Math.max(...sparkVals, 1);
  return (
    <div
      className="glass glass-hover"
      style={{
        borderRadius: '20px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
        borderColor: `${accent}22`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${accent}0D, inset 0 1px 0 rgba(255,255,255,0.12)`,
      }}
    >
      <div className="shimmer-layer" />
      {/* Accent glow corner */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: '80px', height: '80px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
        filter: 'blur(12px)',
        pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          {label}
        </span>
        <div style={{
          width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
          background: `${accent}1A`,
          border: `1px solid ${accent}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px ${accent}25`,
        }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: `0 0 30px ${accent}40` }}>
          {value}
        </span>

        {/* Sparkline */}
        <svg width="56" height="24" viewBox="0 0 56 24" style={{ opacity: 0.7, flexShrink: 0 }}>
          <defs>
            <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={sparkVals.map((v, i) => `${(i / (sparkVals.length - 1)) * 56},${24 - (v / max) * 20}`).join(' ')}
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Sub */}
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace', marginTop: '-8px' }}>
        {sub}
      </p>
    </div>
  );
}

// ─── Queue Row ──────────────────────────────────────────────────────────────
const SEV_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'CRITICAL', color: '#fca5a5', bg: 'rgba(220,38,38,0.18)', border: 'rgba(220,38,38,0.40)' },
  high:     { label: 'HIGH',     color: '#fdba74', bg: 'rgba(251,146,60,0.18)', border: 'rgba(251,146,60,0.40)' },
  medium:   { label: 'MED',      color: '#fde047', bg: 'rgba(234,179,8,0.18)',  border: 'rgba(234,179,8,0.40)' },
  low:      { label: 'LOW',      color: '#86efac', bg: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.40)' },
};

const EVT_COLORS: Record<string, { color: string; label: string }> = {
  PRIORITY_UPDATED:  { color: '#fca5a5', label: 'HIGH' },
  INCIDENT_FUSED:    { color: '#c4b5fd', label: 'FUSED' },
  CONFLICT_DETECTED: { color: '#fdba74', label: 'CONFLICT' },
  INCIDENT_UPDATED:  { color: '#86efac', label: 'UPDATE' },
  default:           { color: '#67e8f9', label: 'INFO' },
};

// ─── Main Dashboard Component ───────────────────────────────────────────────
export const Dashboard: React.FC<DashboardProps> = ({ activeTab, setActiveTab }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([]);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  
  // User Mode (Admin EOC / Responder / Citizen)
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const fetchIncidents = async () => {
    try { 
      const data = await getIncidents();
      setIncidents(data); 
    } catch (e) { 
      /* ignore */ 
    }
  };

  const fetchDataSources = async () => {
    try {
      const data = await getDataSources();
      setDataSources(data);
    } catch {
      /* ignore */
    }
  };

  const handleSelectIncident = async (inc: Incident) => {
    try { 
      const detail = await getIncidentDetail(inc.id);
      setSelectedIncident(detail); 
    } catch { 
      setSelectedIncident(inc); 
    }
  };

  // Close role dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchDataSources();
    const dsInterval = setInterval(fetchDataSources, 15000);

    dashboardWS.connect();
    const unsubEvents = dashboardWS.subscribe((evt) => {
      setActivityEvents((prev) => [evt, ...prev.slice(0, 49)]);
      // Refresh incident list and sources on any backend event
      fetchIncidents();
      fetchDataSources();
    });
    const unsubStatus = dashboardWS.onStatusChange((connected) => {
      setWsConnected(connected);
    });
    return () => {
      clearInterval(dsInterval);
      unsubEvents();
      unsubStatus();
    };
  }, []);

  const handleStartSim = async () => {
    setIsSimRunning(true);
    setSimError(null);
    try {
      await startSimulator();
    } catch (e: any) {
      setSimError('Simulation endpoint offline or unreachable');
      setIsSimRunning(false);
    }
  };

  const handleStopSim = async () => {
    try {
      await stopSimulator();
      setIsSimRunning(false);
    } catch (e) {
      console.error(e);
    }
  };

  const activeInc = incidents.filter((i) => i.status !== 'Resolved');
  const criticalCount = activeInc.filter((i) => i.severity === 'critical').length;
  const people = activeInc.reduce((s, i) => s + (i.people_affected || 0), 0);
  const avgConf = activeInc.length > 0
    ? Math.round((activeInc.reduce((s, i) => s + i.confidence, 0) / activeInc.length) * 100)
    : 94;

  const sorted = [...activeInc].sort((a, b) => b.priority - a.priority).slice(0, 7);
  const tickerAll = [...TICKERS, ...TICKERS];
  const displayActivities = activityEvents.length > 0
    ? activityEvents.slice(0, 5).map((e) => ({ ...e, timestamp: e.timestamp || '—' }))
    : DEMO_ACTIVITIES;

  const activeRoleObj = ROLES.find(r => r.id === userRole) || ROLES[0];

  // ─── GLASS NAV ──────────────────────────────────────────────────────────
  const glassPanel = {
    background: 'rgba(255,255,255,0.035)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.09)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 48px)' }}>

      {/* ════════════ NAVBAR ════════════ */}
      <nav style={{
        ...glassPanel,
        borderRadius: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Top gloss */}
        <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)',
            boxShadow: '0 4px 20px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'float 4s ease-in-out infinite',
          }}>
            <Shield size={20} color="#fff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>ResQFusion</span>
              <span style={{
                fontSize: '11px', fontWeight: 900, color: '#fff',
                padding: '1px 6px', borderRadius: '6px',
                background: 'linear-gradient(90deg, #dc2626, #7c3aed)',
                boxShadow: '0 2px 10px rgba(220,38,38,0.4)',
              }}>AI</span>
            </div>
          </div>
          {/* Backend connection badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '3px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
            background: wsConnected ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${wsConnected ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'}`,
            color: wsConnected ? '#86efac' : '#fca5a5',
          }}>
            {wsConnected
              ? <><Wifi size={10} /> LIVE</>
              : <><WifiOff size={10} /> OFFLINE</>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '12px',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s ease', fontFamily: 'inherit',
                  border: isActive ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                  background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.50)',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 16px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Right Actions: Report + Interactive Role Selector (EOC) */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          <button
            className="btn-danger"
            onClick={() => setIsReportOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '12px',
              fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.03em',
              cursor: 'pointer'
            }}
          >
            <FileText size={13} />
            Report Emergency
          </button>

          {/* Interactive Role Switcher Dropdown */}
          <div ref={roleDropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="btn-glass"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '12px',
                fontSize: '12px', fontWeight: 700,
                color: userRole === 'admin' ? '#38bdf8' : userRole === 'responder' ? '#c084fc' : '#86efac',
                border: isRoleDropdownOpen ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <UserCheck size={14} />
              <span>{activeRoleObj.title}</span>
              <ChevronDown 
                size={12} 
                style={{ 
                  color: 'rgba(255,255,255,0.6)', 
                  transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            </button>

            {/* Dropdown Menu */}
            {isRoleDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '260px',
                background: 'rgba(10, 14, 28, 0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '16px',
                padding: '8px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 20px rgba(56, 189, 248, 0.15)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                animation: 'fadeIn 0.15s ease-out'
              }}>
                <div style={{ padding: '6px 10px 4px', fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Select Operational Role
                </div>

                {ROLES.map((r) => {
                  const isSelected = userRole === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setUserRole(r.id);
                        setIsRoleDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '2px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isSelected ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        width: '100%'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#38bdf8' : '#fff' }}>
                          {r.title}
                        </span>
                        {isSelected && <Check size={13} color="#38bdf8" />}
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
                        {r.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ════════════ TICKER ════════════ */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
        flexShrink: 0,
        padding: '7px 0',
      }}>
        <div className="ticker-track">
          {tickerAll.map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '32px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{item.text}</span>
              <span style={{
                fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px',
                color: item.badgeColor,
                background: `${item.badgeColor}18`,
                border: `1px solid ${item.badgeColor}35`,
                letterSpacing: '0.05em',
              }}>
                [{item.badge}]
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)', marginLeft: '16px' }}>|</span>
            </span>
          ))}
        </div>
      </div>

      {/* ════════════ PAGE CONTENT ════════════ */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {activeTab === 'dashboard' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── REAL-WORLD DATA FEEDS STREAM STATUS ── */}
            <div style={{
              ...glassPanel,
              borderRadius: '18px',
              padding: '14px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              borderColor: 'rgba(56, 189, 248, 0.20)',
              background: 'rgba(15, 23, 42, 0.70)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={15} color="#38bdf8" style={{ animation: 'pulseRing 2s infinite' }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Real-World Intelligence Connectors (Active Feeds)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', fontFamily: 'monospace' }}>
                    Auto-Sync: 15s
                  </span>
                  <span style={{
                    fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                    background: wsConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                    color: wsConnected ? '#86efac' : '#fde047',
                    border: `1px solid ${wsConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                  }}>
                    {wsConnected ? '● REAL-TIME WEBSOCKET' : '○ POLLING FALLBACK'}
                  </span>
                </div>
              </div>

              {/* Connector Badges Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                {dataSources.length > 0 ? (
                  dataSources.map((ds) => {
                    const isConnected = ds.status === 'CONNECTED';
                    const isDemo = ds.status === 'DEMO_FALLBACK';
                    const isErr = ds.status === 'ERROR';

                    const color = isConnected ? '#86efac' : isDemo ? '#fde047' : isErr ? '#fca5a5' : '#94a3b8';
                    const bg = isConnected ? 'rgba(34, 197, 94, 0.08)' : isDemo ? 'rgba(234, 179, 8, 0.08)' : 'rgba(239, 68, 68, 0.08)';
                    const border = isConnected ? 'rgba(34, 197, 94, 0.25)' : isDemo ? 'rgba(234, 179, 8, 0.25)' : 'rgba(239, 68, 68, 0.25)';

                    return (
                      <div key={ds.source} style={{
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>
                            {ds.source === 'NASA_FIRMS' ? '🛰 NASA FIRMS' : ds.source === 'SACHET' ? '🇮🇳 SACHET / NDMA' : ds.source === 'USGS' ? '🌐 USGS Seismic' : '🌍 GDACS Global'}
                          </span>
                          <span style={{
                            fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px',
                            background: `${color}20`, color: color, border: `1px solid ${color}40`
                          }}>
                            {isConnected ? '● CONNECTED' : isDemo ? 'DEMO MODE' : isErr ? 'SOURCE UNAVAILABLE' : ds.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace' }}>
                          <span>Signals: {ds.total_signals_ingested}</span>
                          <span>{ds.last_successful_fetch ? timeAgo(ds.last_successful_fetch) : 'Syncing...'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'rgba(255,255,255,0.4)', padding: '6px' }}>
                    Initializing data feeds (SACHET, GDACS, NASA FIRMS, USGS)...
                  </div>
                )}
              </div>
            </div>

            {/* ── SIMULATOR BAR ── */}
            <div style={{
              ...glassPanel,
              borderRadius: '18px',
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              borderColor: isSimRunning ? 'rgba(220,38,38,0.30)' : 'rgba(255,255,255,0.09)',
              boxShadow: isSimRunning
                ? '0 8px 32px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,255,255,0.10)'
                : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '14px', flexShrink: 0,
                  background: isSimRunning ? 'rgba(220,38,38,0.20)' : 'rgba(6,182,212,0.12)',
                  border: `1px solid ${isSimRunning ? 'rgba(220,38,38,0.40)' : 'rgba(6,182,212,0.25)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <Sparkles size={20} color={isSimRunning ? '#fca5a5' : '#67e8f9'} style={{ animation: isSimRunning ? 'float 1.5s ease-in-out infinite' : 'none' }} />
                  {isSimRunning && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 8px rgba(239,68,68,0.8)',
                      animation: 'pulseRing 1.2s ease-out infinite',
                    }} />
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                      Live AI Crisis & Disaster Simulator
                    </span>
                    {isSimRunning && (
                      <span style={{
                        fontSize: '9px', fontWeight: 900, padding: '2px 8px', borderRadius: '99px',
                        background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.45)',
                        color: '#fca5a5', letterSpacing: '0.08em',
                        animation: 'glowPulse 1s ease-in-out infinite',
                      }}>
                        ● LIVE STREAMING
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                    {isSimRunning
                      ? '⚡ Streaming simulated distress calls — AI deduplication, fusion, and spatial matching active...'
                      : 'Simulate live multi-source distress calls: automated cross-channel fusion, conflict detection & ranking.'}
                  </p>
                  {simError && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>{simError}</p>}
                </div>
              </div>

              {!isSimRunning ? (
                <button
                  onClick={handleStartSim}
                  className="btn-danger hover-glow-red"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '14px',
                    fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <Play size={13} fill="#fff" />
                  START SIMULATION
                </button>
              ) : (
                <button
                  onClick={handleStopSim}
                  className="btn-glass"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '14px',
                    fontSize: '12px', fontWeight: 800,
                    borderColor: 'rgba(239,68,68,0.4)',
                    color: '#fca5a5',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <Square size={13} fill="#ef4444" />
                  STOP SIMULATION
                </button>
              )}
            </div>

            {/* ── 4 STAT CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <StatCard
                label="ACTIVE INCIDENTS"
                value={activeInc.length}
                sub={`${activeInc.filter(i => i.status === 'In Progress').length} in progress`}
                Icon={Zap}
                accent="#ef4444"
                sparkVals={[4, 7, 9, 12, 11, 14, activeInc.length]}
              />
              <StatCard
                label="CRITICAL PRIORITY"
                value={criticalCount}
                sub="Requires immediate dispatch"
                Icon={AlertTriangle}
                accent="#f97316"
                sparkVals={[1, 3, 2, 4, 3, 5, criticalCount]}
              />
              <StatCard
                label="PEOPLE AT RISK"
                value={people.toLocaleString()}
                sub="Across all active zones"
                Icon={Users}
                accent="#eab308"
                sparkVals={[100, 180, 240, 310, 280, 350, people]}
              />
              <StatCard
                label="AI FUSION CONFIDENCE"
                value={`${avgConf}%`}
                sub="Corroboration reliability"
                Icon={Sparkles}
                accent="#06b6d4"
                sparkVals={[88, 91, 93, 90, 95, 93, avgConf]}
              />
            </div>

            {/* ── MAIN CONTENT GRID ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', flex: 1 }}>

              {/* LEFT: MAP */}
              <div style={{
                ...glassPanel,
                borderRadius: '24px',
                height: '520px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}>
                <IncidentMap
                  incidents={incidents}
                  selectedIncident={selectedIncident}
                  onSelectIncident={handleSelectIncident}
                />
              </div>

              {/* RIGHT: QUEUE + ACTIVITY FEED */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* PRIORITY QUEUE */}
                <div style={{
                  ...glassPanel,
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '270px',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ListOrdered size={15} style={{ color: '#06b6d4' }} />
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Priority Queue
                      </span>
                    </div>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px',
                      background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.30)',
                      color: '#67e8f9', letterSpacing: '0.05em',
                    }}>
                      {sorted.length} Active
                    </span>
                  </div>

                  {/* Rows */}
                  <div style={{ overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    {sorted.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.30)', fontSize: '12px' }}>
                        No active incidents in queue.
                      </div>
                    ) : (
                      sorted.map((inc, idx) => {
                        const sev = SEV_MAP[inc.severity] || SEV_MAP.medium;
                        return (
                          <button
                            key={inc.id}
                            className="queue-row"
                            onClick={() => handleSelectIncident(inc)}
                            style={{
                              width: '100%', textAlign: 'left', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '9px 12px', borderRadius: '12px',
                              background: selectedIncident?.id === inc.id ? 'rgba(6,182,212,0.10)' : 'rgba(255,255,255,0.025)',
                              border: selectedIncident?.id === inc.id ? '1px solid rgba(6,182,212,0.30)' : '1px solid rgba(255,255,255,0.07)',
                              fontFamily: 'inherit',
                            }}
                          >
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace', width: '16px', flexShrink: 0 }}>#{idx + 1}</span>
                            <span style={{
                              fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', flexShrink: 0,
                              background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color, letterSpacing: '0.05em',
                            }}>
                              {sev.label}
                            </span>
                            <span style={{ flex: 1, fontSize: '11px', color: 'rgba(255,255,255,0.80)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {inc.disaster_type}
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={9} /> {timeAgo(inc.created_at)}
                            </span>
                            <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ACTIVITY FEED */}
                <div style={{
                  ...glassPanel,
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative', width: '14px', height: '14px' }}>
                        <Radio size={14} style={{ color: '#22c55e', position: 'relative', zIndex: 1 }} />
                        <span style={{
                          position: 'absolute', inset: '-3px', borderRadius: '50%',
                          border: '2px solid rgba(34,197,94,0.5)',
                          animation: 'pulseRing 1.5s ease-out infinite',
                        }} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Activity Feed
                      </span>
                    </div>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>LIVE</span>
                  </div>

                  {/* Events */}
                  <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {displayActivities.map((evt) => {
                      const ec = EVT_COLORS[evt.type] || EVT_COLORS.default;
                      return (
                        <div key={evt.id} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '8px 10px', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', flexShrink: 0 }}>{evt.timestamp}</span>
                          <span style={{ flex: 1, fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.message}</span>
                          <span style={{
                            fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '5px', flexShrink: 0,
                            color: ec.color, background: `${ec.color}18`, letterSpacing: '0.04em',
                          }}>[{ec.label}]</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>{/* end right col */}
            </div>{/* end main grid */}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ padding: '20px' }}>
            <AnalyticsPage />
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <ReportsPage onSelectIncident={handleSelectIncident} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <SettingsPage />
          </div>
        )}

      </div>

      {/* Drawers & Modals */}
      <IncidentDetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onRefresh={fetchIncidents}
        userRole={userRole}
      />
      <CitizenReportFormModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportSubmitted={() => { setActiveTab('dashboard'); setIsReportOpen(false); }}
      />
    </div>
  );
};
