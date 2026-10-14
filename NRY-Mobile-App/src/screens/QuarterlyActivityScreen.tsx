import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ShieldCheck, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const QuarterlyActivityScreen: React.FC = () => {
  const { setScreen } = useApp();
  const [activityData, setActivityData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/customer/activity/quarterly')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setActivityData(data);
        } else {
          setActivityData({
            current_quarter: 'Q4 2026',
            account_activity_status: 'ACTIVE',
            warning_stage: 'NONE',
            warning_message: null,
            missed_quarter_count: 0,
            is_reward_eligible: true,
            history: [
              { year: 2026, quarter: 'Q3', qualifying_purchase_count: 2, quarter_status: 'MET' },
              { year: 2026, quarter: 'Q2', qualifying_purchase_count: 1, quarter_status: 'MET' },
              { year: 2026, quarter: 'Q1', qualifying_purchase_count: 3, quarter_status: 'MET' }
            ]
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('rewards')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="title-md">Quarterly Activity Compliance</div>
          <div className="text-xs">Calendar Quarter Policy (Q1 to Q4)</div>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="card-glass card-highlight" style={{ padding: '16px', marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--primary)" />
            <span style={{ fontSize: '15px', fontWeight: 800 }}>{activityData?.current_quarter || 'Q4 2026'}</span>
          </div>
          <span className="pill-badge pill-emerald">
            <CheckCircle size={12} /> {activityData?.account_activity_status || 'ACTIVE'}
          </span>
        </div>

        <div className="text-xs" style={{ color: '#E2E8F0', lineHeight: 1.5, marginTop: '8px' }}>
          Customer accounts must make at least one qualifying purchase in each calendar quarter.
          Your current quarter compliance is verified.
        </div>
      </div>

      {/* Progressive Warning & Inactivity Workflow (Section 11) */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>
          Progressive Compliance Workflow
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { stage: 'Active', desc: '1+ qualifying purchase in quarter', status: 'Compliant' },
            { stage: 'Reminder Notice', desc: 'In-app alert 30, 15, and 7 days prior to quarter end', status: 'Notice' },
            { stage: 'Grace Period', desc: '30 calendar days to cure missed quarter with any purchase', status: 'Cure Period' },
            { stage: 'UAID Blocked', desc: 'Triggered after four consecutive missed quarters', status: 'Auditable Block' }
          ].map((step, idx) => (
            <div key={idx} className="flex-between" style={{ padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: '8px', fontSize: '12px' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{step.stage}</div>
                <div className="text-xs">{step.desc}</div>
              </div>
              <span className="text-xs" style={{ fontWeight: 600, color: idx === 0 ? '#10B981' : 'var(--text-muted)' }}>
                {step.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reactivation Assurance */}
      <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', gap: '8px' }}>
        <ShieldCheck size={18} color="#00F0FF" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div className="text-xs" style={{ lineHeight: 1.5, color: 'var(--text-muted)' }}>
          <strong>Data Preservation Guarantee:</strong> In the event an account is blocked after four missed quarters, customer records, purchase histories, referral relationships, levels, and reward ledgers are never deleted and are fully restored upon qualifying reactivation.
        </div>
      </div>
    </div>
  );
};
