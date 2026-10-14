import React, { useState } from 'react';
import { Bell, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const TopBar: React.FC = () => {
  const { user, rewardStatus, setScreen } = useApp();
  const [copied, setCopied] = useState(false);

  const uaid = user?.uaid || 'NRY-C-7K4M9X2P8Q';

  const copyUaid = () => {
    navigator.clipboard?.writeText(uaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mobile-top-header">
      <div className="brand-badge" onClick={() => setScreen('products')}>
        <img
          src="/logo-icon.png"
          alt="Noryvanta - Global"
          className="brand-logo-img"
        />
        <div className="brand-header-text">
          <div className="brand-name-group">
            <span className="brand-name-main">Noryvanta</span>
            <span className="brand-name-sub">- Global</span>
          </div>
          <div className="brand-tagline">Connect. Grow. Thrive.</div>
        </div>
      </div>

      <div className="top-actions">
        {/* Customer UAID Display & Copy Pill */}
        <div
          onClick={copyUaid}
          title="Click to copy permanent Customer UAID"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            padding: '4px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#00F0FF',
            cursor: 'pointer'
          }}
        >
          <span>{uaid}</span>
          {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
        </div>

        {/* Notifications Icon */}
        <button className="icon-btn" onClick={() => setScreen('notifications')} title="Notifications">
          <Bell size={18} />
          <span className="notif-badge" />
        </button>
      </div>
    </div>
  );
};
