export interface UnifiedReport {
  id: string;
  source: string;
  source_type: 'official' | 'agency' | 'verified_citizen' | 'unverified_citizen' | 'social' | string;
  timestamp: string;
  latitude: number;
  longitude: number;
  raw_text: string;
  disaster_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  people_affected: number;
  medical_need: boolean;
  resource_requirements: string[];
  image_url?: string;
  extracted_entities?: Record<string, any>;
  confidence: number;
  incident_id?: string;
}

export interface SourceSignalItem {
  id: string;
  external_id: string;
  source: string; // SACHET, GDACS, NASA_FIRMS, USGS, RESQFUSION_CITIZEN
  source_type: string; // official_india_alert, official_global, satellite_fire, earthquake, citizen_report
  event_type: string;
  title: string;
  description: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  severity: string;
  confidence: number;
  people_affected?: number;
  medical_need?: boolean;
  resource_requirements?: string[];
  is_near_real_time?: boolean;
  is_demo?: boolean;
  incident_id?: string;
  metadata_json?: Record<string, any>;
}

export interface DataSourceStatus {
  source: string;
  source_type: string;
  enabled: boolean;
  status: 'CONNECTED' | 'DEGRADED' | 'ERROR' | 'DEMO_FALLBACK' | 'DISABLED' | string;
  last_successful_fetch: string | null;
  last_error: string | null;
  total_signals_ingested: number;
  last_signal_time: string | null;
}

export interface ResourceItem {
  type: string;
  count: number;
  status: 'pending' | 'dispatched' | 'fulfilled';
}

export interface ConflictItem {
  id: string;
  incident_id: string;
  report_a_id: string;
  report_b_id: string;
  claim_a: string;
  claim_b: string;
  conflict_type: string;
  detected_at: string;
  resolution_status: 'Unverified' | 'Resolved' | 'Flagged';
}

export interface XAIExplanation {
  narrative_explanation: string;
  key_factors: string[];
  rank: number;
  priority_score: number;
  confidence_score: number;
  evidence_count?: number;
  evidence_chain?: any[];
  has_unresolved_conflicts?: boolean;
}

export interface Incident {
  id: string;
  title: string;
  disaster_type: string;
  location_name: string;
  latitude: number;
  longitude: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: number; // 0 - 100
  confidence: number; // 0.0 - 1.0
  people_affected: number;
  medical_need: 'urgent' | 'yes' | 'no';
  status: 'New' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved';
  assigned_team?: string;
  required_resources: ResourceItem[];
  source_count: number;
  xai_explanation?: string;
  xai_breakdown?: XAIExplanation;
  created_at: string;
  updated_at: string;
  reports?: UnifiedReport[];
  signals?: SourceSignalItem[];
  conflicts?: ConflictItem[];
}

export interface AnalyticsSummary {
  summary: {
    active_incidents: number;
    critical_incidents: number;
    people_affected: number;
    unverified_reports: number;
    average_confidence: number;
    unresolved_conflicts: number;
  };
  disaster_type_distribution: { type: string; count: number }[];
  severity_distribution: { severity: string; count: number }[];
  status_distribution: { status: string; count: number }[];
  source_distribution: { source_type: string; count: number }[];
  resource_demands: { resource_type: string; total_count: number }[];
  priority_distribution: { range: string; count: number }[];
}

export interface ActivityEvent {
  id: string;
  type: 'NEW_SIGNAL' | 'SIGNAL_FUSED' | 'REPORT_RECEIVED' | 'INCIDENT_FUSED' | 'INCIDENT_CREATED' | 'CONFLICT_DETECTED' | 'PRIORITY_UPDATED' | 'INCIDENT_UPDATED' | 'DATA_SOURCE_STATUS_CHANGED' | 'SIMULATION_STARTED' | 'SIMULATION_COMPLETED' | string;
  message: string;
  timestamp: string;
  source?: string;
  details?: any;
}
