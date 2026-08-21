import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { Incident } from '../../types';
import { Filter, Search, Layers, Compass, X, AlertCircle } from 'lucide-react';

interface IncidentMapProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident) => void;
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const createCustomMarker = (severity: string, isSelected: boolean) => {
    let color = '#38BDF8';
    let ringColor = 'rgba(56, 189, 248, 0.45)';
    if (severity === 'critical') {
      color = '#F43F5E';
      ringColor = 'rgba(244, 63, 94, 0.65)';
    } else if (severity === 'high') {
      color = '#FB923C';
      ringColor = 'rgba(251, 146, 60, 0.55)';
    } else if (severity === 'medium') {
      color = '#FACC15';
      ringColor = 'rgba(250, 204, 21, 0.55)';
    } else if (severity === 'low') {
      color = '#34D399';
      ringColor = 'rgba(52, 211, 153, 0.55)';
    }

    const size = isSelected ? 42 : 34;
    const animatePing = severity === 'critical' || isSelected ? 'radar-ping' : '';

    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div class="${animatePing}" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${ringColor}; pointer-events: none;"></div>
        <div style="width: ${size - 10}px; height: ${size - 10}px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ffffff, ${color}); border: 2px solid rgba(255, 255, 255, 0.9); box-shadow: 0 0 20px ${color}, inset 0 1px 2px rgba(255, 255, 255, 0.8); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 12px;">
          ⚡
        </div>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'custom-leaflet-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [11.1271, 78.6569], // Center of Tamil Nadu
        zoom: 7, // Default view
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | ResQFusion GIS',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;
    }
  }, []);

  // Compute filtered incidents safely
  const filteredIncidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return incidents.filter((inc) => {
      // 1. Severity filter
      if (severityFilter !== 'all' && inc.severity?.toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }

      // 2. Disaster Type filter
      if (typeFilter !== 'all' && inc.disaster_type?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      // 3. Search query matching
      if (q !== '') {
        const idMatch = inc.id?.toLowerCase().includes(q);
        const titleMatch = inc.title?.toLowerCase().includes(q);
        const locMatch = inc.location_name?.toLowerCase().includes(q);
        const typeMatch = inc.disaster_type?.toLowerCase().includes(q);
        const statusMatch = inc.status?.toLowerCase().includes(q);
        const teamMatch = inc.assigned_team?.toLowerCase().includes(q);
        const xaiMatch = inc.xai_explanation?.toLowerCase().includes(q);

        // Check reports text if available
        const reportMatch = inc.reports?.some(r =>
          r.raw_text?.toLowerCase().includes(q) ||
          r.source?.toLowerCase().includes(q)
        );

        if (!idMatch && !titleMatch && !locMatch && !typeMatch && !statusMatch && !teamMatch && !xaiMatch && !reportMatch) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, severityFilter, typeFilter, searchQuery]);

  // Update markers & handle auto-framing
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Re-create markers for filtered items
    filteredIncidents.forEach((inc) => {
      if (typeof inc.latitude !== 'number' || typeof inc.longitude !== 'number' || isNaN(inc.latitude) || isNaN(inc.longitude)) {
        return;
      }

      const isSelected = selectedIncident?.id === inc.id;
      const marker = L.marker([inc.latitude, inc.longitude], {
        icon: createCustomMarker(inc.severity, isSelected),
      }).addTo(map);

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #38BDF8; font-size: 11px; letter-spacing: 0.5px;">${inc.id || 'INC'} • ${(inc.disaster_type || 'EMERGENCY').toUpperCase()}</span>
            <span style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">${inc.status || 'Active'}</span>
          </div>
          <div style="font-weight: 800; color: #F8FAFC; margin-bottom: 4px; font-size: 13px;">${inc.title}</div>
          <div style="color: #cbd5e1; font-size: 11px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            📍 ${inc.location_name || `${inc.latitude.toFixed(2)}, ${inc.longitude.toFixed(2)}`}
          </div>
          <div style="display: flex; gap: 6px; font-size: 11px; margin-bottom: 10px;">
            <span style="background: rgba(245, 158, 11, 0.25); border: 1px solid rgba(245, 158, 11, 0.5); padding: 3px 8px; border-radius: 8px; color: #FBBF24; font-weight: bold;">Priority: ${Math.round(inc.priority || 0)}/100</span>
            <span style="background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(16, 185, 129, 0.5); padding: 3px 8px; border-radius: 8px; color: #34D399; font-weight: bold;">Confidence: ${Math.round((inc.confidence || 0.8) * 100)}%</span>
          </div>
          <button id="btn-select-${inc.id}" style="width: 100%; background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(99, 102, 241, 0.8)); color: white; border: 1px solid rgba(255, 255, 255, 0.3); padding: 7px 12px; border-radius: 10px; cursor: pointer; font-weight: 800; font-size: 11px; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            Inspect AI Rationale ➔
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${inc.id}`);
        if (btn) {
          btn.onclick = () => onSelectIncident(inc);
        }
      });

      marker.on('click', () => {
        onSelectIncident(inc);
      });

      markersRef.current[inc.id] = marker;
    });

    // Auto-focus on selected incident or pan to search results
    if (selectedIncident && markersRef.current[selectedIncident.id]) {
      map.setView([selectedIncident.latitude, selectedIncident.longitude], 13, { animate: true });
      markersRef.current[selectedIncident.id].openPopup();
    } else if (searchQuery.trim() !== '' && filteredIncidents.length > 0) {
      if (filteredIncidents.length === 1) {
        const single = filteredIncidents[0];
        map.setView([single.latitude, single.longitude], 12, { animate: true });
      } else {
        const bounds = L.latLngBounds(filteredIncidents.map(i => [i.latitude, i.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
      }
    }
  }, [filteredIncidents, selectedIncident, searchQuery, onSelectIncident]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '560px',
      borderRadius: '20px',
      overflow: 'hidden',
      background: '#04060A',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
    }}>
      {/* Map Tactical Liquid Glass Filter Bar */}
      <div style={{
        position: 'absolute',
        top: '16px', left: '16px', right: '16px',
        zIndex: 1000,
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: '12px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(0,0,0,0.5)',
          padding: '8px 14px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.12)',
          flex: 1, minWidth: '240px',
          position: 'relative'
        }}>
          <Search size={16} color="#22d3ee" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search location, incident, ID, disaster, or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent', border: 'none', color: '#fff',
              fontSize: '12px', outline: 'none', width: '100%', fontWeight: 500
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              title="Clear search"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
            >
              <X size={14} />
            </button>
          )}
          {searchQuery && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '6px',
              background: filteredIncidents.length > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: filteredIncidents.length > 0 ? '#4ade80' : '#f87171',
              border: `1px solid ${filteredIncidents.length > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {filteredIncidents.length} found
            </span>
          )}
        </div>

        {/* Severity Filter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(0,0,0,0.5)', padding: '8px 12px',
          borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', fontSize: '12px'
        }}>
          <Filter size={14} color="#22d3ee" />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
          >
            <option value="all" style={{ background: '#0f172a' }}>All Severities</option>
            <option value="critical" style={{ background: '#0f172a', color: '#fb7185' }}>Critical</option>
            <option value="high" style={{ background: '#0f172a', color: '#fbbf24' }}>High</option>
            <option value="medium" style={{ background: '#0f172a', color: '#facc15' }}>Medium</option>
            <option value="low" style={{ background: '#0f172a', color: '#34d399' }}>Low</option>
          </select>
        </div>

        {/* Type Filter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(0,0,0,0.5)', padding: '8px 12px',
          borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', fontSize: '12px'
        }}>
          <Layers size={14} color="#818cf8" />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Disaster Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
          >
            <option value="all" style={{ background: '#0f172a' }}>All Types</option>
            <option value="flood" style={{ background: '#0f172a' }}>Flood</option>
            <option value="cyclone" style={{ background: '#0f172a' }}>Cyclone</option>
            <option value="earthquake" style={{ background: '#0f172a' }}>Earthquake</option>
            <option value="fire" style={{ background: '#0f172a' }}>Fire</option>
            <option value="infrastructure" style={{ background: '#0f172a' }}>Infrastructure</option>
          </select>
        </div>
      </div>

      {/* No Results Warning Toast if search yields nothing */}
      {searchQuery.trim() !== '' && filteredIncidents.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fca5a5',
          fontSize: '12px',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          <AlertCircle size={15} color="#ef4444" />
          <span>No incidents match "{searchQuery}". Try a different term or clear the search.</span>
        </div>
      )}

      {/* Tactical Map Glass Legend Overlay */}
      <div style={{
        position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '10px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '16px',
        fontSize: '11px', color: '#e2e8f0', fontWeight: 500
      }}>
        <span style={{ fontWeight: 700, color: '#67e8f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={14} color="#22d3ee" /> Map Heat Markers:
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e', animation: 'radarPing 2.2s cubic-bezier(0,0.2,0.8,1) infinite' }} /> Critical</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} /> High</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#facc15' }} /> Medium</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} /> Low</span>
      </div>

      {/* Leaflet Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
