import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Share2, QrCode, Users, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReferralShareScreen: React.FC = () => {
  const { user, setScreen } = useApp();
  const [copied, setCopied] = useState(false);

  const uaid = user?.uaid || 'NRY-C-7K4M9X2P8Q';
  const shareUrl = `https://noryvanta.in/c/join?ref=${uaid}`;
  const shareMessage = `Join Noryvanta Customer Marketplace using my Customer UAID: ${uaid} and unlock commercial purchase rewards! Register here: ${shareUrl}`;

  const copyCode = () => {
    navigator.clipboard?.writeText(uaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Noryvanta Customer Marketplace',
        text: shareMessage,
        url: shareUrl
      }).catch(() => {});
    } else {
      copyCode();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('rewards')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="title-md">Share Customer Referral</div>
          <div className="text-xs">Invite Peers to Noryvanta Marketplace</div>
        </div>
      </div>

      {/* Share Card with QR Code */}
      <div className="card-glass card-highlight" style={{ textAlign: 'center', padding: '24px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'inline-flex', padding: '16px', background: '#FFFFFF', borderRadius: '16px', marginBottom: '16px' }}>
          {/* Simulated QR Code Canvas */}
          <div style={{ width: '130px', height: '130px', background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: '#FFFFFF' }}>
            <QrCode size={90} color="#00F0FF" />
            <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '4px' }}>SCAN TO JOIN</div>
          </div>
        </div>

        <div className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>YOUR PERMANENT CUSTOMER UAID</div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '12px' }}>
          {uaid}
        </div>

        <button
          className="btn-secondary"
          style={{ width: 'auto', margin: '0 auto', padding: '8px 18px', fontSize: '13px' }}
          onClick={copyCode}
        >
          {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
          <span>{copied ? 'UAID Copied to Clipboard!' : 'Copy UAID'}</span>
        </button>
      </div>

      {/* Social Sharing Actions */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Quick Share Channels</div>

        <button className="btn-primary" style={{ marginBottom: '10px' }} onClick={handleNativeShare}>
          <Share2 size={18} />
          <span>Share via WhatsApp / Messaging</span>
        </button>

        <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          "{shareMessage}"
        </div>
      </div>

      {/* Customer-to-Customer Rules Notice */}
      <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', gap: '8px' }}>
        <ShieldCheck size={18} color="#00F0FF" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div className="text-xs" style={{ lineHeight: 1.5, color: 'var(--text-muted)' }}>
          <strong>Section 5 Policy:</strong> Only genuine Customer UAIDs are accepted for customer referrals. Wholesalers, Distributors, Retailers, and Administrators are strictly excluded.
        </div>
      </div>
    </div>
  );
};
