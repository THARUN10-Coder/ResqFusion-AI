import React from 'react';
import { ShieldAlert, Activity, BarChart2, FilePlus, UserCheck, Cpu, Zap, Radio } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'analytics' | 'report';
  setActiveTab: (tab: 'dashboard' | 'analytics' | 'report') => void;
  userRole: 'admin' | 'responder' | 'citizen';
  setUserRole: (role: 'admin' | 'responder' | 'citizen') => void;
  onOpenReportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onOpenReportModal,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/40 backdrop-blur-2xl shadow-2xl">
      {/* Tactical Operational System Ticker */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-950/90 to-indigo-950/70 border-b border-white/10 px-4 py-1.5 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
          </span>
          <span className="font-bold text-cyan-300 tracking-wider text-[11px] uppercase flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> EOC Operational Directive:
          </span>
          <span className="text-slate-300 text-[11px] font-medium hidden md:inline">
            ResQFusion fuses multi-channel citizen distress calls into unified, prioritized disaster incidents.
          </span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400 text-[11px] font-mono">
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-400/30 px-2.5 py-0.5 rounded-full text-cyan-300 backdrop-blur-md">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Fusion AI Matrix Active
          </span>
          <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Pipeline
          </span>
        </div>
      </div>

      {/* Main Glass Navbar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Glossy Tagline */}
        <div className="flex items-center space-x-3.5">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-2xl blur-md opacity-80 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-slate-900/90 p-2.5 rounded-2xl border border-cyan-400/40 flex items-center justify-center shadow-2xl backdrop-blur-xl">
              <ShieldAlert className="w-7 h-7 text-cyan-300 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center font-sans">
                ResQ<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">Fusion</span>
                <span className="ml-1 text-cyan-400 font-black text-xs px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/30">AI</span>
              </h1>
              <span className="hidden sm:inline-block bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-indigo-500/15 text-cyan-200 border border-cyan-400/30 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full tracking-widest shadow-lg backdrop-blur-md">
                EOC Multi-Agency Command
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden lg:block mt-0.5">
              Intelligent Disaster Incident Fusion & Rapid Response Dispatch Platform
            </p>
          </div>
        </div>

        {/* Navigation Glass Tabs */}
        <nav className="flex items-center p-1 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
              activeTab === 'dashboard'
                ? 'liquid-glass-pill-active text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Activity className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-cyan-300' : ''}`} />
            <span>Command Center</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
              activeTab === 'analytics'
                ? 'liquid-glass-pill-active text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart2 className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-cyan-300' : ''}`} />
            <span>Analytics & Intelligence</span>
          </button>
        </nav>

        {/* User Role Switcher & Submit Report Button */}
        <div className="flex items-center space-x-3">
          {/* Submit Emergency Report */}
          <button
            onClick={onOpenReportModal}
            className="flex items-center space-x-2 liquid-glass-danger-button text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all transform active:scale-95 cursor-pointer"
          >
            <FilePlus className="w-4 h-4 text-rose-200 animate-bounce" />
            <span className="tracking-wide">REPORT EMERGENCY</span>
          </button>

          {/* Role selector dropdown */}
          <div className="flex items-center liquid-glass-pill rounded-xl px-3 py-2 text-xs shadow-xl">
            <UserCheck className="w-4 h-4 text-cyan-400 mr-2" />
            <span className="text-slate-400 font-medium mr-1.5 hidden md:inline">Mode:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="admin" className="bg-slate-900 text-white">Admin (EOC Commander)</option>
              <option value="responder" className="bg-slate-900 text-white">Responder (NDRF Field)</option>
              <option value="citizen" className="bg-slate-900 text-white">Citizen Reporter</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

