import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'reports' | 'settings'>('dashboard');

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#06080f',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ========== ANIMATED BLOB BACKGROUND ========== */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

        {/* Blob 1 — large red top-left */}
        <div style={{
          position: 'absolute',
          width: '600px', height: '600px',
          top: '-150px', left: '-150px',
          background: 'radial-gradient(ellipse, rgba(200,20,20,0.65) 0%, rgba(185,15,15,0.30) 40%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob1 20s ease-in-out infinite',
          willChange: 'transform, border-radius',
        }} />

        {/* Blob 2 — orange right */}
        <div style={{
          position: 'absolute',
          width: '520px', height: '520px',
          top: '5%', right: '-100px',
          background: 'radial-gradient(ellipse, rgba(234,88,12,0.60) 0%, rgba(220,70,10,0.28) 40%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'blob2 25s ease-in-out infinite',
          willChange: 'transform, border-radius',
        }} />

        {/* Blob 3 — small red bottom-left */}
        <div style={{
          position: 'absolute',
          width: '380px', height: '380px',
          bottom: '0px', left: '0px',
          background: 'radial-gradient(ellipse, rgba(190,20,20,0.50) 0%, transparent 65%)',
          filter: 'blur(65px)',
          animation: 'blob3 17s ease-in-out infinite',
          willChange: 'transform, border-radius',
        }} />

        {/* Blob 4 — amber bottom-right */}
        <div style={{
          position: 'absolute',
          width: '450px', height: '450px',
          bottom: '-80px', right: '50px',
          background: 'radial-gradient(ellipse, rgba(217,119,6,0.48) 0%, rgba(200,100,0,0.20) 45%, transparent 70%)',
          filter: 'blur(75px)',
          animation: 'blob4 22s ease-in-out infinite',
          willChange: 'transform, border-radius',
        }} />

        {/* Blob 5 — tiny accent top-center */}
        <div style={{
          position: 'absolute',
          width: '220px', height: '220px',
          top: '0px', left: '40%',
          background: 'radial-gradient(ellipse, rgba(220,38,38,0.40) 0%, transparent 65%)',
          filter: 'blur(50px)',
          animation: 'blob2 14s ease-in-out infinite reverse',
          willChange: 'transform, border-radius',
        }} />

        {/* Blob 6 — deep crimson center-left */}
        <div style={{
          position: 'absolute',
          width: '300px', height: '300px',
          top: '40%', left: '20%',
          background: 'radial-gradient(ellipse, rgba(159,18,57,0.35) 0%, transparent 65%)',
          filter: 'blur(55px)',
          animation: 'blob1 30s ease-in-out infinite reverse',
          willChange: 'transform, border-radius',
        }} />
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px',
      }}>
        {/* THE GIANT GLASS CARD */}
        <div style={{
          width: '100%',
          maxWidth: '1500px',
          minHeight: 'calc(100vh - 48px)',
          background: 'rgba(8, 11, 20, 0.45)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: [
            '0 0 0 1px rgba(255,255,255,0.04)',
            '0 40px 120px rgba(0,0,0,0.8)',
            '0 0 80px rgba(200,20,20,0.08)',
            'inset 0 1px 0 rgba(255,255,255,0.18)',
            'inset 0 -1px 0 rgba(255,255,255,0.04)',
          ].join(', '),
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Top-edge gloss line */}
          <div style={{
            position: 'absolute',
            top: 0, left: '10%', right: '10%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
            pointerEvents: 'none',
            zIndex: 10,
          }} />
          {/* Bottom-edge subtle line */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: '20%', right: '20%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            pointerEvents: 'none',
            zIndex: 10,
          }} />

          <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
