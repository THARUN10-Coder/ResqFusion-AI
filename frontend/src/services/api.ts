import axios from 'axios';
import { Incident, UnifiedReport, AnalyticsSummary, DataSourceStatus } from '../types';

// Use relative URLs so Vite proxy handles routing to http://localhost:8000
const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.code === 'ECONNREFUSED' || err.message === 'Network Error') {
      console.warn('[ResQFusion] Backend offline — frontend running in demo mode');
    }
    return Promise.reject(err);
  }
);

// ─── Incidents ──────────────────────────────────────────────────────────────
export const getIncidents = async (
  status?: string,
  disaster_type?: string
): Promise<Incident[]> => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (disaster_type) params.disaster_type = disaster_type;
  const res = await api.get<Incident[]>('/incidents', { params });
  return res.data;
};

export const getIncidentDetail = async (id: string): Promise<Incident> => {
  const res = await api.get<Incident>(`/incidents/${id}`);
  return res.data;
};

export const getIncidentEvidence = async (id: string): Promise<any[]> => {
  const res = await api.get<any[]>(`/incidents/${id}/evidence`);
  return res.data;
};

export const verifyIncident = async (id: string): Promise<Incident> => {
  const res = await api.post<Incident>(`/incidents/${id}/verify`);
  return res.data;
};

export const assignTeam = async (
  id: string,
  assigned_team: string
): Promise<Incident> => {
  const res = await api.post<Incident>(`/incidents/${id}/assign`, {
    status: 'Assigned',
    assigned_team,
  });
  return res.data;
};

export const resolveIncident = async (id: string): Promise<Incident> => {
  const res = await api.post<Incident>(`/incidents/${id}/resolve`);
  return res.data;
};

// ─── Reports ────────────────────────────────────────────────────────────────
export const getReports = async (skip: number = 0, limit: number = 100): Promise<UnifiedReport[]> => {
  const res = await api.get<UnifiedReport[]>('/reports', { params: { skip, limit } });
  return res.data;
};

export const submitReport = async (
  reportData: Partial<UnifiedReport>
): Promise<UnifiedReport> => {
  const res = await api.post<UnifiedReport>('/reports', reportData);
  return res.data;
};

export const analyzeImageFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/reports/analyze-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── Real-World Data Sources ───────────────────────────────────────────────
export const getDataSources = async (): Promise<DataSourceStatus[]> => {
  const res = await api.get<DataSourceStatus[]>('/data-sources');
  return res.data;
};

// ─── Analytics ──────────────────────────────────────────────────────────────
export const getAnalytics = async (): Promise<AnalyticsSummary> => {
  const res = await api.get<AnalyticsSummary>('/analytics');
  return res.data;
};

// ─── Simulator ──────────────────────────────────────────────────────────────
export const startSimulator = async () => {
  const res = await api.post('/simulator/start');
  return res.data;
};

export const stopSimulator = async () => {
  const res = await api.post('/simulator/stop');
  return res.data;
};

export const getSimulatorStatus = async () => {
  const res = await api.get('/simulator/status');
  return res.data;
};

// ─── Health ─────────────────────────────────────────────────────────────────
export const getHealthStatus = async (): Promise<{
  status: string;
  database: string;
  project: string;
  version: string;
  ai_provider: string;
  ai_key_configured: boolean;
  connectors?: Record<string, string>;
}> => {
  const res = await api.get('/health');
  return res.data;
};
