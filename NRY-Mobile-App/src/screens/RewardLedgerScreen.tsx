import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { RewardLedgerEntry } from '../types';

export const RewardLedgerScreen: React.FC = () => {
  const { setScreen } = useApp();
  const [ledgerEntries, setLedgerEntries] = useState<RewardLedgerEntry[]>([]);

  useEffect(() => {
    apiClient.getRewardLedger().then(setLedgerEntries);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('rewards')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="title-md">Immutable Reward Ledger</div>
          <div className="text-xs">Append-Only Audit Trail of Qualified Rank Returns</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ledgerEntries.map(entry => (
          <div key={entry.id} className="card-glass" style={{ padding: '14px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <div>
                <span className="pill-badge pill-cyan" style={{ fontSize: '10px' }}>
                  Cycle {entry.cycle_number} • Rank {entry.rank_number}
                </span>
                <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>
                  {entry.rank_name} Rank Completion
                </div>
              </div>
              <span className={`pill-badge ${entry.status === 'REWARDED' ? 'pill-emerald' : 'pill-amber'}`}>
                {entry.status}
              </span>
            </div>

            <div className="grid-3" style={{ fontSize: '12px', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <div>
                <span className="text-xs">Reward Rate</span>
                <div style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>{entry.reward_rate.toFixed(2)}%</div>
              </div>

              <div>
                <span className="text-xs">Disbursed Amount</span>
                <div style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{entry.reward_amount.toFixed(2)}</div>
              </div>

              <div>
                <span className="text-xs">Qualification Lvl</span>
                <div style={{ fontWeight: 700 }}>Level {entry.qualification_level}</div>
              </div>
            </div>

            <div className="text-xs" style={{ marginTop: '8px', color: 'var(--text-dim)', textAlign: 'right' }}>
              Verified: {new Date(entry.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={18} color="#10B981" />
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Enforces Section 10 Rule 5 & 16: Unique (user_id, cycle_number, rank_number, reward_type). Never pays duplicate rewards.
        </div>
      </div>
    </div>
  );
};
