'use client';
import { useState, useEffect } from 'react';
import { evaluateTriagePriority } from '@/lib/triage';
import { Button } from './Button';

interface TriageSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TriageSimulatorModal({ isOpen, onClose }: TriageSimulatorModalProps) {
  const [disasterType, setDisasterType] = useState('Trapped');
  const [severity, setSeverity] = useState('Severe');
  const [battery, setBattery] = useState(15);
  const [groupSize, setGroupSize] = useState(3);
  const [environment, setEnvironment] = useState('Night');

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compute MCDM score in real-time using unified triage evaluation
  const { score, rank, reasons } = evaluateTriagePriority(
    disasterType,
    severity,
    battery,
    groupSize,
    environment
  );

  const rankStyles: Record<string, { rankColor: string; scoreColor: string }> = {
    Critical: { rankColor: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/20', scoreColor: 'text-red-400' },
    High: { rankColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40', scoreColor: 'text-orange-400' },
    Medium: { rankColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', scoreColor: 'text-yellow-400' },
    Low: { rankColor: 'bg-slate-700 text-slate-200 border-slate-600', scoreColor: 'text-slate-300' },
  };
  const { rankColor, scoreColor } = rankStyles[rank] || rankStyles.Low;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-surface)] border border-white/10 rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-[slideUp_0.3s_ease] overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <i className="fa-solid fa-brain text-sm"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">MCDM AI Triage Sandbox</h3>
              <p className="text-[10px] text-slate-400">Multi-Criteria Decision Engine Simulator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1 transition"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="space-y-5 text-sm text-slate-300">
          <p className="text-xs text-slate-400">
            Simulate multi-criteria variables to observe how the AI calculates urgency rank, battery decay penalties, and life-safety weights.
          </p>

          {/* Live Score Output Banner */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                Simulated Urgency
              </div>
              <div className={`text-3xl font-black font-mono ${scoreColor}`}>
                {score} <span className="text-sm font-normal text-slate-500">/ 100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1">
                Assigned Rank
              </div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${rankColor}`}
              >
                {rank} Priority
              </span>
            </div>
          </div>

          {/* Sliders and Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Disaster Type */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Hazard Category <span className="text-blue-400 font-mono">(30% Weight)</span>
              </label>
              <select
                value={disasterType}
                onChange={(e) => setDisasterType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
              >
                <option value="Trapped">Trapped / Collapsed Structure</option>
                <option value="Earthquake">Earthquake Aftermath</option>
                <option value="Fire">Active Fire & Smoke</option>
                <option value="Chemical">Chemical / HAZMAT</option>
                <option value="Flood">Rapid Flood Surge</option>
                <option value="Medical">Medical Trauma</option>
              </select>
            </div>

            {/* Injury Severity */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Injury Severity <span className="text-blue-400 font-mono">(20% Weight)</span>
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
              >
                <option value="Severe">Severe (Unconscious / Major Trauma)</option>
                <option value="Moderate">Moderate (Fractures / Immobility)</option>
                <option value="Minor">Minor (Lacerations / Stable)</option>
              </select>
            </div>

            {/* Battery Level Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Device Battery <span className="text-blue-400 font-mono">(25% Weight)</span>
                </label>
                <span
                  className={`text-xs font-mono font-bold ${
                    battery < 15 ? 'text-red-400' : 'text-slate-300'
                  }`}
                >
                  {battery}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={battery}
                onChange={(e) => setBattery(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Group Size Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Group Size <span className="text-blue-400 font-mono">(15% Weight)</span>
                </label>
                <span className="text-xs font-mono font-bold text-slate-300">{groupSize} persons</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={groupSize}
                onChange={(e) => setGroupSize(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Environmental Hazard */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Environmental Condition <span className="text-blue-400 font-mono">(10% Weight)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Normal', label: 'Day / Clear' },
                  { id: 'Night', label: 'Dark Night' },
                  { id: 'Rain', label: 'Heavy Storm' },
                  { id: 'Extreme_Heat', label: 'Heat Wave' },
                ].map((env) => (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => setEnvironment(env.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      environment === env.id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {env.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Explainable AI Reasoning Box */}
          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              Explainable AI Reasoning Log
            </div>
            <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
              {reasons.map((reason, idx) => (
                <li key={idx} className="leading-relaxed">
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close Sandbox
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
