import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, Lock, ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LevelProgressScreen: React.FC = () => {
  const { levels, rewardStatus, setScreen } = useApp();
  const [selectedLevel, setSelectedLevel] = useState<number>(rewardStatus?.current_level || 4);

  const currLevel = rewardStatus?.current_level || 4;
  const activeLevelData = levels.find(l => l.level_number === selectedLevel);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('rewards')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="title-md">120-Level Progression</div>
          <div className="text-xs">₹2,000 Qualifying Allocation per Level</div>
        </div>
      </div>

      {/* Selected Level Summary Card */}
      <div className="card-glass card-highlight" style={{ padding: '16px', marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--primary)" />
            <span style={{ fontSize: '15px', fontWeight: 800 }}>Level {selectedLevel} Detail</span>
          </div>
          {selectedLevel <= currLevel ? (
            <span className="pill-badge pill-emerald"><CheckCircle size={12} /> QUALIFIED</span>
          ) : selectedLevel === currLevel + 1 ? (
            <span className="pill-badge pill-cyan"><Clock size={12} /> IN PROGRESS</span>
          ) : (
            <span className="pill-badge pill-amber"><Lock size={12} /> LOCKED</span>
          )}
        </div>

        <div className="grid-2" style={{ marginTop: '10px', fontSize: '12px' }}>
          <div>
            <span className="text-xs">Associated Rank:</span>
            <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
              {activeLevelData?.rank_name || 'Bronze'}
            </div>
          </div>
          <div>
            <span className="text-xs">Allocation Unit:</span>
            <div style={{ fontWeight: 700 }}>₹2,000.00</div>
          </div>
          <div>
            <span className="text-xs">Cumulative Threshold:</span>
            <div style={{ fontWeight: 700 }}>₹{(selectedLevel * 2000).toLocaleString()}.00</div>
          </div>
          <div>
            <span className="text-xs">Ledger Immutability:</span>
            <div style={{ fontWeight: 700, color: '#10B981' }}>Enforced ✓</div>
          </div>
        </div>
      </div>

      {/* 120 Levels Visual Matrix */}
      <div className="card-glass" style={{ padding: '14px', marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Level Matrix (1 to 120)</span>
          <span className="text-xs">{currLevel} of 120 Completed</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          {levels.slice(0, 120).map(lvl => {
            const isDone = lvl.level_number <= currLevel;
            const isCurrent = lvl.level_number === currLevel + 1;
            const isSelected = lvl.level_number === selectedLevel;

            let bg = 'var(--bg-surface)';
            let borderColor = 'var(--border-subtle)';
            let color = 'var(--text-dim)';

            if (isDone) {
              bg = 'rgba(16, 185, 129, 0.15)';
              borderColor = 'rgba(16, 185, 129, 0.4)';
              color = '#10B981';
            } else if (isCurrent) {
              bg = 'rgba(0, 240, 255, 0.15)';
              borderColor = 'var(--primary)';
              color = '#00F0FF';
            }

            if (isSelected) {
              borderColor = '#FFFFFF';
            }

            return (
              <button
                key={lvl.level_number}
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  color: color,
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => setSelectedLevel(lvl.level_number)}
              >
                {lvl.level_number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Critical Double-Counting Rule Notice */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
        <ShieldCheck size={18} color="#00F0FF" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div className="text-xs" style={{ lineHeight: 1.5 }}>
          <strong>Critical Rule:</strong> Each qualifying purchase amount has a unique auditable allocation in the LevelQualificationAllocation table. An ₹8,000 purchase completes exactly 4 levels and cannot be reused.
        </div>
      </div>
    </div>
  );
};
