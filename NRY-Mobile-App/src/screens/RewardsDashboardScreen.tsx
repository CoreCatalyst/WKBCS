import React from 'react';
import { Award, Zap, ShieldCheck, ChevronRight, Share2, Layers, History, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const RewardsDashboardScreen: React.FC = () => {
  const { rewardStatus, setScreen } = useApp();

  const qualifyingTotal = rewardStatus?.qualifying_purchase_total || 8000;
  const threshold = rewardStatus?.reward_entry_threshold || 2000;
  const isEligible = rewardStatus?.is_reward_eligible || false;
  const hasReferral = rewardStatus?.has_valid_referral || false;
  const currLevel = rewardStatus?.current_level || 4;
  const currRank = rewardStatus?.current_rank || 'Bronze';
  const currCycle = rewardStatus?.current_cycle || 1;
  const rewardRate = rewardStatus?.current_reward_rate || 1.10;

  const thresholdPercent = Math.min(100, Math.round((qualifyingTotal / threshold) * 100));

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div>
          <div className="title-lg">Rewards & Cycles</div>
          <div className="text-sm">120-Level Network Progression Engine</div>
        </div>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
          onClick={() => setScreen('referral_share')}
        >
          <Share2 size={14} />
          <span>Share UAID</span>
        </button>
      </div>

      {/* 1. Reward Eligibility Status Card */}
      <div className="card-glass card-highlight" style={{ padding: '18px', marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} color="var(--primary)" />
            <span style={{ fontSize: '15px', fontWeight: 700 }}>Reward System Eligibility</span>
          </div>
          {isEligible ? (
            <span className="pill-badge pill-emerald">
              <CheckCircle size={12} /> Active & Eligible
            </span>
          ) : (
            <span className="pill-badge pill-amber">
              <AlertTriangle size={12} /> Pending Threshold
            </span>
          )}
        </div>

        {/* Threshold Progress Bar */}
        <div style={{ marginBottom: '12px' }}>
          <div className="flex-between" style={{ fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Qualifying Net Purchases:</span>
            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>₹{qualifyingTotal.toLocaleString()} / ₹{threshold.toLocaleString()}</span>
          </div>

          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${thresholdPercent}%`,
                height: '100%',
                background: isEligible ? 'var(--accent-emerald)' : 'var(--primary)',
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>
        </div>

        {/* Requirements Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasReferral ? '#10B981' : '#F59E0B' }}>
            <CheckCircle size={14} />
            <span>Valid Customer Referral (NRY-C-XXXX): <strong>{hasReferral ? 'Established ✓' : 'Required'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: qualifyingTotal >= threshold ? '#10B981' : '#F59E0B' }}>
            <CheckCircle size={14} />
            <span>Minimum ₹2,000 Qualifying Purchases: <strong>{qualifyingTotal >= threshold ? 'Satisfied ✓' : 'In Progress'}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid: Level, Rank, Cycle, Rate */}
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="card-glass" style={{ padding: '14px', cursor: 'pointer' }} onClick={() => setScreen('levels')}>
          <div className="flex-between">
            <span className="text-xs">Current Level</span>
            <Layers size={14} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
            {currLevel} / 120
          </div>
          <div className="text-xs" style={{ marginTop: '2px' }}>₹2,000 per level</div>
        </div>

        <div className="card-glass" style={{ padding: '14px', cursor: 'pointer' }} onClick={() => setScreen('ranks')}>
          <div className="flex-between">
            <span className="text-xs">Current Rank</span>
            <Award size={14} color="var(--accent-gold)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '4px' }}>
            {currRank}
          </div>
          <div className="text-xs" style={{ marginTop: '2px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
            {rewardRate.toFixed(2)}% Rate
          </div>
        </div>

        <div className="card-glass" style={{ padding: '14px', cursor: 'pointer' }} onClick={() => setScreen('cycles')}>
          <div className="flex-between">
            <span className="text-xs">Cycle Progress</span>
            <History size={14} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
            Cycle {currCycle}
          </div>
          <div className="text-xs" style={{ marginTop: '2px' }}>120 Levels per cycle</div>
        </div>

        <div className="card-glass" style={{ padding: '14px', cursor: 'pointer' }} onClick={() => setScreen('quarterly')}>
          <div className="flex-between">
            <span className="text-xs">Quarterly Status</span>
            <Calendar size={14} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
            ACTIVE
          </div>
          <div className="text-xs" style={{ marginTop: '2px' }}>Q4 2026 Satisfied</div>
        </div>
      </div>

      {/* 3. Deep Dive Navigation Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { screen: 'levels', title: '120-Level Qualification Grid', desc: 'Inspect each ₹2,000 level allocation & verification state', icon: <Layers size={18} color="#00F0FF" /> },
          { screen: 'ranks', title: '12-Rank Benchmark Table', desc: 'Authoritative 1.10% – 2.20% reward rate schedule', icon: <Award size={18} color="#FFB703" /> },
          { screen: 'cycles', title: 'Cycle Engine & Carry-Forward', desc: 'Cycle 1 completion & Cycle 2 initialization rules', icon: <History size={18} color="#8B5CF6" /> },
          { screen: 'reward_ledger', title: 'Immutable Reward Ledger', desc: 'One-time rank qualification rewards & auditable history', icon: <ShieldCheck size={18} color="#10B981" /> },
          { screen: 'quarterly', title: 'Quarterly Activity Compliance', desc: 'Calendar quarters Q1–Q4, warnings & reactivation workflow', icon: <Calendar size={18} color="#00F0FF" /> }
        ].map((item, idx) => (
          <div
            key={idx}
            className="card-glass flex-between"
            style={{ padding: '14px 16px', cursor: 'pointer' }}
            onClick={() => setScreen(item.screen as any)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: '10px' }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{item.title}</div>
                <div className="text-xs">{item.desc}</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-dim)" />
          </div>
        ))}
      </div>
    </div>
  );
};
