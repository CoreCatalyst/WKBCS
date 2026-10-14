import React, { useState } from 'react';
import { User, Copy, Check, ShoppingBag, Settings, HelpCircle, LogOut, MapPin, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProfileScreen: React.FC = () => {
  const { user, setScreen, logout } = useApp();
  const [copied, setCopied] = useState(false);

  const uaid = user?.uaid || 'NRY-C-7K4M9X2P8Q';
  const name = user?.full_name || 'Aditi Deshmukh';
  const email = user?.email || 'aditi.customer@noryvanta.in';
  const phone = user?.phone || '+91 98765 43210';

  const copyUaid = () => {
    navigator.clipboard?.writeText(uaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="title-lg" style={{ marginBottom: '16px' }}>Customer Account</div>

      {/* Profile Header Card */}
      <div className="card-glass" style={{ padding: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', color: '#080C15', flexShrink: 0 }}>
          {name.charAt(0)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 800 }}>{name}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{email}</div>
          <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{phone}</div>
        </div>
      </div>

      {/* Permanent UAID Display Card (Screen 5) */}
      <div className="card-glass card-highlight" style={{ padding: '16px', marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '6px' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>PERMANENT CUSTOMER UAID</span>
          <span className="pill-badge pill-cyan" style={{ fontSize: '10px' }}>Immutable</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.04em' }}>
            {uaid}
          </span>
          <button
            className="btn-secondary"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
            onClick={copyUaid}
          >
            {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="text-xs" style={{ marginTop: '8px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
          Generated cryptographically on the backend. Repeated login or profile changes will never alter this permanent identifier.
        </div>
      </div>

      {/* Navigation List */}
      <div className="card-glass" style={{ padding: '6px 12px', marginBottom: '16px' }}>
        {[
          { icon: <ShoppingBag size={18} color="var(--primary)" />, title: 'Order History & Refunds', screen: 'orders' },
          { icon: <MapPin size={18} color="var(--accent-gold)" />, title: 'Saved Addresses', screen: 'checkout' },
          { icon: <Settings size={18} color="var(--accent-purple)" />, title: 'Settings & Privacy Controls', screen: 'settings' },
          { icon: <HelpCircle size={18} color="var(--accent-emerald)" />, title: 'Support & Commercial Terms', screen: 'support' }
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex-between"
            style={{
              padding: '14px 4px',
              borderBottom: idx < 3 ? '1px solid var(--border-subtle)' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setScreen(item.screen as any)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {item.icon}
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.title}</span>
            </div>
            <ChevronRight size={18} color="var(--text-dim)" />
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        className="btn-secondary"
        style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
        onClick={logout}
      >
        <LogOut size={16} />
        <span>Log Out of Customer Account</span>
      </button>
    </div>
  );
};
