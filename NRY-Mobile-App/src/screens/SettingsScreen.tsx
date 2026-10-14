import React, { useState } from 'react';
import { ArrowLeft, Moon, Bell, Shield, Smartphone, Globe, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsScreen: React.FC = () => {
  const { setScreen, deviceFrame, setDeviceFrame } = useApp();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('profile')}>
          <ArrowLeft size={18} />
        </button>
        <div className="title-md">Account Settings & Privacy</div>
      </div>

      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Display & Viewport Options
        </div>

        <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smartphone size={18} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Mobile Device Frame Mode</div>
              <div className="text-xs">Show smartphone frame container for testing</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={deviceFrame}
            onChange={e => setDeviceFrame(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="flex-between" style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Moon size={18} color="var(--accent-purple)" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Theme Mode</div>
              <div className="text-xs">Sleek Cyber Dark (Default)</div>
            </div>
          </div>
          <span className="pill-badge pill-cyan" style={{ fontSize: '10px' }}>Active</span>
        </div>
      </div>

      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Notifications & Privacy Controls
        </div>

        <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={18} color="var(--accent-gold)" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Quarterly Reminder Push Alerts</div>
              <div className="text-xs">Receive 30d, 15d and 7d inactivity alerts</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={e => setPushEnabled(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="flex-between" style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={18} color="var(--accent-emerald)" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Data Privacy & Anonymity</div>
              <div className="text-xs">Keep UAID identity anonymous in public listings</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={!dataSharing}
            onChange={e => setDataSharing(!e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
          />
        </div>
      </div>
    </div>
  );
};
