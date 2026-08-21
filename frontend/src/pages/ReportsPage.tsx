import React, { useEffect, useState } from 'react';
import { 
  FileText, Search, Filter, Plus, RefreshCw, Download, 
  Sparkles, Clock, MapPin, Users, HeartPulse, Cpu
} from 'lucide-react';
import { UnifiedReport } from '../types';
import { getReports } from '../services/api';
import { CitizenReportFormModal } from '../components/report/CitizenReportFormModal';

interface ReportsPageProps {
  onSelectIncident?: (incident: any) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onSelectIncident }) => {
  const [reports, setReports] = useState<UnifiedReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [disasterFilter, setDisasterFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<UnifiedReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const data = await getReports(0, 100);
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const filteredReports = reports.filter((r) => {
    const matchesSearch = 
      r.raw_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.incident_id && r.incident_id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSource = sourceFilter === 'all' || r.source_type === sourceFilter;
    const matchesSeverity = severityFilter === 'all' || r.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesDisaster = disasterFilter === 'all' || r.disaster_type.toLowerCase() === disasterFilter.toLowerCase();

    return matchesSearch && matchesSource && matchesSeverity && matchesDisaster;
  });

  const exportCSV = () => {
    if (reports.length === 0) return;
    const headers = ['ID', 'Source', 'Type', 'Disaster', 'Severity', 'Confidence', 'People Affected', 'Medical Need', 'Incident ID', 'Timestamp', 'Text'];
    const rows = reports.map(r => [
      r.id,
      `"${r.source.replace(/"/g, '""')}"`,
      r.source_type,
      r.disaster_type,
      r.severity,
      Math.round(r.confidence * 100) + '%',
      r.people_affected,
      r.medical_need ? 'Yes' : 'No',
      r.incident_id || 'Unassigned',
      r.timestamp,
      `"${r.raw_text.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resqfusion_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'official':
        return { label: 'Official Alert', bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
      case 'agency':
        return { label: 'Emergency Agency', bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'verified_citizen':
        return { label: 'Verified Citizen', bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
      case 'social':
        return { label: 'Social Media', bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' };
      default:
        return { label: 'Unverified Citizen', bg: 'rgba(250, 204, 21, 0.15)', text: '#facc15', border: 'rgba(250, 204, 21, 0.3)' };
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' };
      case 'high':
        return { bg: 'rgba(249, 115, 22, 0.2)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.4)' };
      case 'medium':
        return { bg: 'rgba(234, 179, 8, 0.2)', text: '#fde047', border: 'rgba(234, 179, 8, 0.4)' };
      default:
        return { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.4)' };
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        padding: '20px 24px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <FileText size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Multi-Source Ground Reports Feed
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Raw ingestion logs, NLP entity extraction, and automated cross-verification evidence
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchReportsData}
            title="Refresh Feed"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} />
            Submit Emergency Report
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', gridColumn: 'span 2' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }} />
          <input
            type="text"
            placeholder="Search report text, location, source name, or INC ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 38px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Source Filter */}
        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all" style={{ background: '#111827' }}>All Sources</option>
            <option value="official" style={{ background: '#111827' }}>Official Alert (TNSDMA/SACHET)</option>
            <option value="agency" style={{ background: '#111827' }}>Emergency Agency (Police/Fire)</option>
            <option value="verified_citizen" style={{ background: '#111827' }}>Verified Citizen</option>
            <option value="unverified_citizen" style={{ background: '#111827' }}>Unverified Citizen</option>
            <option value="social" style={{ background: '#111827' }}>Social Media Feeds</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all" style={{ background: '#111827' }}>All Severities</option>
            <option value="critical" style={{ background: '#111827' }}>Critical</option>
            <option value="high" style={{ background: '#111827' }}>High</option>
            <option value="medium" style={{ background: '#111827' }}>Medium</option>
            <option value="low" style={{ background: '#111827' }}>Low</option>
          </select>
        </div>

        {/* Disaster Filter */}
        <div>
          <select
            value={disasterFilter}
            onChange={(e) => setDisasterFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all" style={{ background: '#111827' }}>All Disaster Types</option>
            <option value="flood" style={{ background: '#111827' }}>Flood</option>
            <option value="fire" style={{ background: '#111827' }}>Fire / Industrial</option>
            <option value="earthquake" style={{ background: '#111827' }}>Earthquake / Landslide</option>
            <option value="cyclone" style={{ background: '#111827' }}>Cyclone / Storm</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Reports Feed List (Left) + Detailed Inspector (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(350px, 1.4fr) minmax(320px, 1fr)',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Reports Feed Column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: 'calc(100vh - 280px)',
          overflowY: 'auto',
          paddingRight: '6px'
        }}>
          {filteredReports.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
              <FileText size={36} style={{ color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                No reports found matching your criteria.
              </p>
            </div>
          ) : (
            filteredReports.map((report) => {
              const srcBadge = getSourceBadge(report.source_type);
              const sevBadge = getSeverityStyle(report.severity);
              const isSelected = selectedReport?.id === report.id;

              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: isSelected 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(30, 41, 59, 0.7))' 
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected 
                      ? '1px solid rgba(96, 165, 250, 0.5)' 
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 8px 24px rgba(59, 130, 246, 0.15)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#93c5fd',
                        background: 'rgba(59, 130, 246, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {report.id}
                      </span>

                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: srcBadge.bg,
                        color: srcBadge.text,
                        border: `1px solid ${srcBadge.border}`
                      }}>
                        {srcBadge.label}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: sevBadge.bg,
                      color: sevBadge.text,
                      border: `1px solid ${sevBadge.border}`
                    }}>
                      {report.severity}
                    </span>
                  </div>

                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#e2e8f0',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {report.raw_text}
                  </p>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '8px'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {new Date(report.timestamp).toLocaleTimeString()}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </span>

                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: report.incident_id ? '#6ee7b7' : '#94a3b8'
                    }}>
                      <Sparkles size={12} />
                      {report.incident_id ? `Fused → ${report.incident_id}` : 'Direct Report'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Report Evidence & AI Extraction Inspector (Right Column) */}
        {selectedReport ? (
          <div style={{
            position: 'sticky',
            top: '20px',
            padding: '24px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            backdropFilter: 'blur(25px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#60a5fa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Report Intelligence Inspector
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#fff', fontWeight: 800 }}>
                  {selectedReport.id}
                </h3>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Source Reliability</span>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: selectedReport.confidence >= 0.8 ? '#4ade80' : selectedReport.confidence >= 0.6 ? '#facc15' : '#f87171'
                }}>
                  {Math.round(selectedReport.confidence * 100)}% Confidence
                </div>
              </div>
            </div>

            {/* Raw Ingested Text */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>Raw Report Payload:</span>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#f1f5f9', lineHeight: '1.5', fontStyle: 'italic' }}>
                "{selectedReport.raw_text}"
              </p>
            </div>

            {/* AI Extracted Attributes Grid */}
            <div>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, textTransform: 'uppercase' }}>
                AI Synthesized Entities
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px' }}>
                    <Users size={14} /> People Impacted
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                    {selectedReport.people_affected || '0 (None identified)'}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px' }}>
                    <HeartPulse size={14} /> Medical Urgent
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: selectedReport.medical_need ? '#f87171' : '#4ade80', marginTop: '4px' }}>
                    {selectedReport.medical_need ? 'URGENT MEDICAL' : 'No Critical Need'}
                  </div>
                </div>
              </div>
            </div>

            {/* Extracted Resources */}
            <div>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, textTransform: 'uppercase' }}>
                Requested Dispatch Resources
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {selectedReport.resource_requirements && selectedReport.resource_requirements.length > 0 ? (
                  selectedReport.resource_requirements.map((res, i) => (
                    <span key={i} style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#67e8f9',
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      padding: '4px 10px',
                      borderRadius: '8px'
                    }}>
                      {res}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.3)' }}>No specific resources isolated</span>
                )}
              </div>
            </div>

            {/* Fusion & Incident Linking */}
            <div style={{
              padding: '14px',
              borderRadius: '12px',
              background: selectedReport.incident_id ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: selectedReport.incident_id ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Deduplication Status:</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: selectedReport.incident_id ? '#4ade80' : '#facc15'
                }}>
                  {selectedReport.incident_id ? 'FUSED WITH INCIDENT' : 'STANDALONE'}
                </span>
              </div>
              {selectedReport.incident_id && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                  Linked Incident ID: <strong style={{ color: '#fff' }}>{selectedReport.incident_id}</strong>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Citizen Report Form Modal */}
      <CitizenReportFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReportSubmitted={() => {
          setIsModalOpen(false);
          fetchReportsData();
        }}
      />
    </div>
  );
};
