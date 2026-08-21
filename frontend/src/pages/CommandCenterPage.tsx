import React, { useEffect, useState } from 'react';
import { Incident, ActivityEvent } from '../types';
import { getIncidents, getIncidentDetail } from '../services/api';
import { dashboardWS } from '../services/websocket';
import { StatsCards } from '../components/dashboard/StatsCards';
import { IncidentMap } from '../components/dashboard/IncidentMap';
import { PriorityQueue } from '../components/dashboard/PriorityQueue';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { SimulatorBar } from '../components/simulator/SimulatorBar';
import { IncidentDetailDrawer } from '../components/incident/IncidentDetailDrawer';

interface CommandCenterPageProps {
  userRole: 'admin' | 'responder' | 'citizen';
}

export const CommandCenterPage: React.FC<CommandCenterPageProps> = ({ userRole }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);

  const fetchIncidents = async () => {
    try {
      const data = await getIncidents();
      setIncidents(data);
    } catch (e) {
      console.error('Failed to fetch incidents', e);
    }
  };

  const handleSelectIncident = async (inc: Incident) => {
    try {
      const detail = await getIncidentDetail(inc.id);
      setSelectedIncident(detail);
    } catch (e) {
      setSelectedIncident(inc);
    }
  };

  useEffect(() => {
    fetchIncidents();
    dashboardWS.connect();

    const unsubscribe = dashboardWS.subscribe((event) => {
      setActivityEvents((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          type: event.type,
          message: event.message || 'New intelligence update received',
          timestamp: new Date().toLocaleTimeString(),
          details: event,
        },
        ...prev,
      ]);

      // Auto refresh incidents list on backend changes
      fetchIncidents();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Simulator Control Bar */}
      <SimulatorBar onSimulationTriggered={fetchIncidents} />

      {/* Top Statistics Bar */}
      <StatsCards incidents={incidents} />

      {/* Main Grid: Interactive Map + Ranked Priority Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map Area (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <IncidentMap
            incidents={incidents}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
          />
        </div>

        {/* Live Ranked Priority Queue (1 Column) */}
        <div className="lg:col-span-1">
          <PriorityQueue
            incidents={incidents}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
          />
        </div>
      </div>

      {/* Bottom Section: Real-Time Activity Feed Ticker */}
      <ActivityFeed events={activityEvents} />

      {/* Incident Detail Drawer */}
      <IncidentDetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onRefresh={fetchIncidents}
        userRole={userRole}
      />
    </div>
  );
};
