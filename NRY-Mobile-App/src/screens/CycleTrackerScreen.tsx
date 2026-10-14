import React from 'react';
import { ArrowLeft, History, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CycleTrackerScreen: React.FC = () => {
  const { rewardStatus, setScreen } = useApp();

  const currCycle = rewardStatus?.current_cycle || 1;
  const currLevel = rewardStatus?.current_level || 4;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('rewards')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="title-md">Cycle Architecture</div>
          <div className="text-xs">120 Completed Levels per Cycle</div>
        </div>
      </div>

      {/* Current Cycle Status */}
      <div className="card-glass card-highlight" style={{ padding: '18px', marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="var(--primary)" />
            <span style={{ fontSize: '16px', fontWeight: 800 }}>Cycle {currCycle} (Active)</span>
          </div>
          <span className="pill-badge pill-emerald"><CheckCircle size={12} /> Running</span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div className="flex-between" style={{ fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cycle Progress:</span>
            <span style={{ fontWeight: 700 }}>{currLevel} of 120 Levels</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((currLevel / 120) * 100)}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }} />
          </div>
        </div>

        <div className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Upon completing Level 120 in Cycle {currCycle}, the cycle completes, historical ledgers are permanently sealed, and Cycle {currCycle + 1} begins.
        </div>
      </div>

      {/* Cycle Transition Rules (Section 9) */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Cycle Preservation Policy</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <CheckCircle size={14} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>Lifetime qualifying purchases, referral affiliations, and payment histories are never erased.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <CheckCircle size={14} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>Completed rank reward ledger entries are permanently preserved and immutable.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <CheckCircle size={14} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>Carry-forward unallocated volume transitions seamlessly to initialize Cycle {currCycle + 1}.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
