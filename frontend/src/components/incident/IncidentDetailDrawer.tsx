import React, { useState } from 'react';
import { Incident } from '../../types';
import { 
  X, ShieldAlert, AlertOctagon, CheckCircle2, UserPlus, FileText, 
  Sparkles, Package, MapPin, Users, HeartPulse, Clock, Activity,
  ChevronRight, Shield, Layers, Radio, Check
} from 'lucide-react';
import { verifyIncident, assignTeam, resolveIncident, getIncidentDetail } from '../../services/api';

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  onClose: () => void;
  onRefresh: () => void;
  userRole: 'admin' | 'responder' | 'citizen';
}

const AVAILABLE_SQUADS = [
  'NDRF Battalion 4 (Search & Rescue)',
  'State Disaster Response Force Unit 3',
  '108 Emergency Ambulance Corps',
  'Fire & Rescue Brigade Unit 1',
  'Hazmat Response Team',
  'Coastal Air Wing & SDRF',
  'Canine Search Squad',
  'ASI Structural Survey Squad',
  'TANGEDCO Emergency Grid Unit',
  'Madurai Quick Response Force'
];

export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  incident: initialIncident,
  onClose,
  onRefresh,
  userRole,
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'resources' | 'conflicts'>('evidence');
  const [assignedSquad, setAssignedSquad] = useState<string>('NDRF Battalion 4 (Search & Rescue)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(initialIncident);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Sync state if initialIncident changes
  React.useEffect(() => {
    setCurrentIncident(initialIncident);
    if (initialIncident?.assigned_team) {
      setAssignedSquad(initialIncident.assigned_team);
    }
  }, [initialIncident]);

  const incident = currentIncident;
  if (!incident) return null;

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleVerify = async () => {
    setIsSubmitting(true);
    try {
      const updated = await verifyIncident(incident.id);
      setCurrentIncident((prev) => prev ? { ...prev, ...updated, status: updated.status || 'Verified' } : updated);
      showNotification(`Incident ${incident.id} successfully marked as Verified!`);
      onRefresh();
    } catch (e) {
      console.error('Failed to verify incident', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    setIsSubmitting(true);
    try {
      const updated = await assignTeam(incident.id, assignedSquad);
      setCurrentIncident((prev) => prev ? { ...prev, ...updated, status: updated.status || 'Assigned', assigned_team: updated.assigned_team || assignedSquad } : updated);
      showNotification(`Assigned to "${assignedSquad}"! Status updated to Assigned.`);
      onRefresh();
    } catch (e) {
      console.error('Failed to assign team', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    try {
      const updated = await resolveIncident(incident.id);
      setCurrentIncident((prev) => prev ? { ...prev, ...updated, status: 'Resolved', priority: 0 } : updated);
      showNotification(`Incident ${incident.id} successfully marked as Resolved.`);
      onRefresh();
    } catch (e) {
      console.error('Failed to resolve incident', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUnresolvedConflicts = (incident.conflicts || []).some(
    (c) => c.resolution_status === 'Unverified'
  );

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.4)' };
      case 'high':
        return { bg: 'rgba(249, 115, 22, 0.2)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.4)' };
      case 'medium':
        return { bg: 'rgba(234, 179, 8, 0.2)', text: '#fde047', border: 'rgba(234, 179, 8, 0.4)' };
      default:
        return { bg: 'rgba(34, 197, 94, 0.2)', text: '#86efac', border: 'rgba(34, 197, 94, 0.4)' };
    }
  };

  const sevBadge = getSeverityBadge(incident.severity);

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 49,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Slide-in Drawer Container */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '580px',
        background: 'linear-gradient(180deg, #090e1a 0%, #05070e 100%)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.8)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}>
        {/* Glowing Top Edge */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)'
        }} />

        {/* Feedback banner */}
        {feedbackMsg && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(34,197,94,0.25), rgba(6,182,212,0.25))',
            borderBottom: '1px solid rgba(34,197,94,0.4)',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#86efac',
            fontSize: '12px',
            fontWeight: 700,
            animation: 'fadeIn 0.2s ease'
          }}>
            <Check size={14} color="#86efac" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: sevBadge.bg,
              border: `1px solid ${sevBadge.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
            }}>
              <ShieldAlert size={22} color={sevBadge.text} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {incident.id}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#fff',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {incident.disaster_type}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: sevBadge.bg,
                  color: sevBadge.text,
                  border: `1px solid ${sevBadge.border}`
                }}>
                  {incident.severity}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: incident.status === 'Resolved' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: incident.status === 'Resolved' ? '#4ade80' : '#38bdf8',
                  border: `1px solid ${incident.status === 'Resolved' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                }}>
                  {incident.status}
                </span>
                {incident.assigned_team && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.3)'
                  }}>
                    🛡 {incident.assigned_team}
                  </span>
                )}
              </div>
              <h2 style={{
                margin: '6px 0 4px',
                fontSize: '17px',
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.3
              }}>
                {incident.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                <MapPin size={13} color="#94a3b8" />
                <span>{incident.location_name || `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close Drawer"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '8px',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Key Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '14px',
            border: '1px solid rgba(255, 255, 255, 0.07)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Priority Score
              </span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#fca5a5', fontFamily: 'monospace', marginTop: '2px' }}>
                {Math.round(incident.priority)}<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>/100</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.07)', borderRight: '1px solid rgba(255, 255, 255, 0.07)' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Confidence
              </span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#4ade80', fontFamily: 'monospace', marginTop: '2px' }}>
                {Math.round(incident.confidence * 100)}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                People Trapped
              </span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#fde047', fontFamily: 'monospace', marginTop: '2px' }}>
                {incident.people_affected || 0}
              </div>
            </div>
          </div>

          {/* AI Decision Rationale Card */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.04)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={16} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AI Decision & Fusion Rationale (XAI)
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{incident.xai_explanation || 'Multi-channel reports fused into single incident due to high spatial-temporal overlap and corroborating entities.'}"
            </p>

            {incident.xai_breakdown?.key_factors && (
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {incident.xai_breakdown.key_factors.map((factor: string, idx: number) => (
                  <span key={idx} style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#93c5fd',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    • {factor}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Conflict Warning Banner if active conflicts */}
          {hasUnresolvedConflicts && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertOctagon size={18} color="#f87171" />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fca5a5' }}>
                    Information Conflict Flagged
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Conflicting claims between official and citizen reporting streams.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('conflicts')}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                View Conflicts
              </button>
            </div>
          )}

          {/* Tabs Navigation */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '3px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <button
              onClick={() => setActiveTab('evidence')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'evidence' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: activeTab === 'evidence' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FileText size={14} />
              <span>Evidence ({incident.reports?.length || incident.source_count || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'resources' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: activeTab === 'resources' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Package size={14} />
              <span>Resources ({incident.required_resources?.length || 0})</span>
            </button>

            {incident.conflicts && incident.conflicts.length > 0 && (
              <button
                onClick={() => setActiveTab('conflicts')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'conflicts' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: activeTab === 'conflicts' ? '#fca5a5' : 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <AlertOctagon size={14} color={activeTab === 'conflicts' ? '#f87171' : 'currentColor'} />
                <span>Conflicts ({incident.conflicts.length})</span>
              </button>
            )}
          </div>

          {/* TAB 1: Evidence & Reports Stream */}
          {activeTab === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Render External Signals (USGS, GDACS, NASA FIRMS, SACHET) */}
              {(incident.signals && incident.signals.length > 0) && (
                incident.signals.map((sig) => (
                  <div
                    key={sig.id}
                    style={{
                      background: sig.is_near_real_time ? 'rgba(234, 88, 12, 0.08)' : 'rgba(56, 189, 248, 0.06)',
                      border: `1px solid ${sig.is_near_real_time ? 'rgba(234, 88, 12, 0.35)' : 'rgba(56, 189, 248, 0.25)'}`,
                      borderRadius: '14px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: sig.is_near_real_time ? '#fb923c' : '#38bdf8' }}>
                          ⚡ {sig.source}
                        </span>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#fff'
                        }}>
                          {sig.source_type}
                        </span>
                        {sig.is_near_real_time && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(234, 88, 12, 0.25)',
                            color: '#fdba74',
                            border: '1px solid rgba(234, 88, 12, 0.4)'
                          }}>
                            🛰 NEAR-REAL-TIME
                          </span>
                        )}
                        {sig.is_demo && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(234, 179, 8, 0.2)',
                            color: '#fde047',
                            border: '1px solid rgba(234, 179, 8, 0.4)'
                          }}>
                            DEMO DATA
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace' }}>
                        {new Date(sig.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: '#f1f5f9', lineHeight: 1.4, fontWeight: 500 }}>
                      {sig.description}
                    </p>

                    {sig.metadata_json && Object.keys(sig.metadata_json).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        {Object.entries(sig.metadata_json).map(([k, v]) => (
                          <span key={k} style={{
                            fontSize: '10px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                          }}>
                            {k}: <strong style={{ color: '#fff' }}>{String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Render Citizen Reports */}
              {(incident.reports && incident.reports.length > 0) && (
                incident.reports.map((rep) => (
                  <div
                    key={rep.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '14px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>{rep.source}</span>
                        <span style={{
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          {rep.source_type}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.35)', fontFamily: 'monospace' }}>
                        {new Date(rep.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.4 }}>
                      "{rep.raw_text}"
                    </p>

                    {rep.image_url && (
                      <div style={{
                        marginTop: '4px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        height: '140px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <img src={rep.image_url} alt="Disaster ground report evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                ))
              )}

              {(!incident.reports || incident.reports.length === 0) && (!incident.signals || incident.signals.length === 0) && (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '14px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '13px'
                }}>
                  No direct report payloads attached. Fused from {incident.source_count} external streams.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Required Resources */}
          {activeTab === 'resources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(incident.required_resources && incident.required_resources.length > 0) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {incident.required_resources.map((res, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={16} color="#c084fc" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{res.type}</span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: '#c084fc',
                        background: 'rgba(192, 132, 252, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(192, 132, 252, 0.3)'
                      }}>
                        x{res.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '14px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '13px'
                }}>
                  No specific equipment requested for this incident.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Conflict Details */}
          {activeTab === 'conflicts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(incident.conflicts || []).map((conf) => (
                <div key={conf.id} style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase' }}>
                      ⚡ Conflict Type: {conf.conflict_type}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: conf.resolution_status === 'Resolved' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      color: conf.resolution_status === 'Resolved' ? '#86efac' : '#fca5a5',
                      border: `1px solid ${conf.resolution_status === 'Resolved' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`
                    }}>
                      {conf.resolution_status}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#f1f5f9' }}>
                    <strong style={{ color: '#38bdf8' }}>Claim A:</strong> {conf.claim_a}
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#f1f5f9' }}>
                    <strong style={{ color: '#fb923c' }}>Claim B:</strong> {conf.claim_b}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions (Triage & Dispatch) */}
        {userRole !== 'citizen' && (
          <div style={{
            padding: '20px 24px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={handleVerify}
                disabled={isSubmitting || incident.status === 'Verified'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  background: incident.status === 'Verified' ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(16, 185, 129, 0.8))',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: incident.status === 'Verified' ? 'default' : 'pointer',
                  opacity: incident.status === 'Verified' ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{incident.status === 'Verified' ? 'Verified ✓' : 'Verify Incident'}</span>
              </button>

              <button
                onClick={handleResolve}
                disabled={isSubmitting || incident.status === 'Resolved'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: incident.status === 'Resolved' ? 'default' : 'pointer',
                  opacity: incident.status === 'Resolved' ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{incident.status === 'Resolved' ? 'Resolved ✓' : 'Mark Resolved'}</span>
              </button>
            </div>

            {/* Squad Dispatch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={assignedSquad}
                onChange={(e) => setAssignedSquad(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {AVAILABLE_SQUADS.map((sq) => (
                  <option key={sq} value={sq} style={{ background: '#0f172a', color: '#fff' }}>
                    {sq}
                  </option>
                ))}
              </select>

              <button
                onClick={handleAssign}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                <UserPlus size={15} />
                <span>{isSubmitting ? 'Assigning...' : 'Assign'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
