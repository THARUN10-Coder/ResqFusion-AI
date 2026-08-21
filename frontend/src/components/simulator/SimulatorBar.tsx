import React, { useState } from 'react';
import { Play, Square, Sparkles, Radio } from 'lucide-react';
import { startSimulator, stopSimulator } from '../../services/api';

interface SimulatorBarProps {
  onSimulationTriggered: () => void;
}

export const SimulatorBar: React.FC<SimulatorBarProps> = ({ onSimulationTriggered }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Simulating live multi-source distress calls: AI deduplication fusion, spatial merging & contradiction detection active...');

  const handleStart = async () => {
    setIsRunning(true);
    setStatusMsg('🚀 Simulation streaming — AI deduplication fusion & spatial merging active...');
    try {
      await startSimulator();
      onSimulationTriggered();
    } catch (e) {
      console.error(e);
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      await stopSimulator();
      setIsRunning(false);
      setStatusMsg('Simulation halted. Ready for next scenario.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 relative overflow-hidden"
      style={{
        background: 'rgba(10,14,28,0.55)',
        border: '1px solid rgba(6,182,212,0.20)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Top gloss line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.4),transparent)' }}
      />

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className="relative flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
          style={{
            background: 'rgba(6,182,212,0.12)',
            border: '1px solid rgba(6,182,212,0.25)',
          }}
        >
          <Sparkles className={`w-5 h-5 text-cyan-400 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          )}
        </div>

        {/* Text */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">
              Live AI Crisis & Disaster Simulator
            </h3>
            {isRunning && (
              <span
                className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}
              >
                <Radio className="w-2.5 h-2.5" /> LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{statusMsg}</p>
        </div>
      </div>

      {/* Button */}
      {!isRunning ? (
        <button
          onClick={handleStart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))',
            border: '1px solid rgba(6,182,212,0.35)',
            boxShadow: '0 4px 20px rgba(6,182,212,0.2)',
          }}
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          START DISASTER SIMULATION
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(185,28,28,0.3))',
            border: '1px solid rgba(239,68,68,0.35)',
            boxShadow: '0 4px 20px rgba(239,68,68,0.2)',
          }}
        >
          <Square className="w-3.5 h-3.5 fill-white" />
          STOP SIMULATION
        </button>
      )}
    </div>
  );
};
