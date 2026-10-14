import React from 'react';
import { ArrowLeft, Award, CheckCircle, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const RankProgressScreen: React.FC = () => {
  const { ranks, rewardStatus, setScreen } = useApp();
  const currLevel = rewardStatus?.current_level || 4;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('rewards')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="title-md">12-Rank Progression</div>
          <div className="text-xs">10 Completed Levels = 1 Rank Completed</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ranks.map(r => {
          const isDone = currLevel >= r.completion_level;
          const isCurrent = currLevel >= r.start_level && currLevel <= r.end_level;

          return (
            <div
              key={r.rank_number}
              className={`card-glass ${isCurrent ? 'card-highlight' : ''}`}
              style={{ padding: '14px' }}
            >
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color={isDone ? '#10B981' : (isCurrent ? '#FFB703' : 'var(--text-dim)')} />
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>
                    Rank {r.rank_number}: {r.rank_name}
                  </span>
                </div>

                {isDone ? (
                  <span className="pill-badge pill-emerald"><CheckCircle size={12} /> COMPLETED</span>
                ) : isCurrent ? (
                  <span className="pill-badge pill-cyan">IN PROGRESS</span>
                ) : (
                  <span className="pill-badge pill-amber"><Lock size={12} /> LOCKED</span>
                )}
              </div>

              <div className="grid-3" style={{ fontSize: '12px', marginTop: '6px' }}>
                <div>
                  <div className="text-xs">Level Span</div>
                  <div style={{ fontWeight: 700 }}>Lvl {r.start_level} – {r.end_level}</div>
                </div>

                <div>
                  <div className="text-xs">Reward Rate</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>{r.rate_display}</div>
                </div>

                <div>
                  <div className="text-xs">Multiplier</div>
                  <div style={{ fontWeight: 700 }}>{r.rank_number * (r.rank_number * 10 + 1)}x</div>
                </div>
              </div>

              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Completion: Level {r.completion_level}</span>
                <span>Benchmark Rate: {r.rate_display}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
