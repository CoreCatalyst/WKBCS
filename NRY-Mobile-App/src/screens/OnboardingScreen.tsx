import React, { useState } from 'react';
import { ArrowRight, Sparkles, Shield, Gift, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/api';

export const OnboardingScreen: React.FC = () => {
  const { setScreen } = useApp();
  const [step, setStep] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [refValid, setRefValid] = useState<boolean | null>(null);
  const [refMsg, setRefMsg] = useState('');

  const slides = [
    {
      icon: (
        <img
          src="/logo-icon.png"
          alt="Noryvanta - Global"
          style={{ width: '56px', height: '56px', objectFit: 'contain' }}
        />
      ),
      title: 'Noryvanta - Global',
      subtitle: 'Connect. Grow. Thrive.',
      desc: 'Discover verified products, commercial equipment, and certified professional services with sovereign buyer protection.'
    },
    {
      icon: <Gift size={40} color="#FFB703" />,
      title: 'Customer Reward Network',
      subtitle: 'Connect. Grow. Thrive.',
      desc: 'Shop qualifying products, progress across 120 levels and 12 ranks, and participate in our transparent, auditable cycle engine.'
    },
    {
      icon: <Shield size={40} color="#10B981" />,
      title: 'Universal Account Identifier',
      subtitle: 'Connect. Grow. Thrive.',
      desc: 'Get your unique cryptographic NRY-C-XXXXXXXXXX identifier. One account, permanent rewards, zero duplicate identities.'
    }
  ];

  const validateCode = async () => {
    if (!referralCode.trim()) return;
    const res = await apiClient.validateReferral(referralCode.trim());
    setRefValid(res.valid);
    setRefMsg(res.message);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '20px 0' }}>
      <div>
        {/* Slide Indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[0, 1, 2].map(idx => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '4px',
                background: idx === step ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Slide Content */}
        <div className="card-glass card-highlight" style={{ textAlign: 'center', padding: '36px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '50%', marginBottom: '20px' }}>
            {slides[step].icon}
          </div>
          <div className="title-lg" style={{ marginBottom: '8px' }}>{slides[step].title}</div>
          <div style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase' }}>
            {slides[step].subtitle}
          </div>
          <div className="text-sm" style={{ lineHeight: 1.6 }}>{slides[step].desc}</div>
        </div>

        {/* Optional Referral Code Entry in Onboarding */}
        {step === 1 && (
          <div className="card-glass">
            <label className="input-label">Have a Customer Referral Code?</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                className="form-input"
                placeholder="e.g. NRY-C-3B9R7T1M4K"
                value={referralCode}
                onChange={e => {
                  setReferralCode(e.target.value.toUpperCase());
                  setRefValid(null);
                }}
              />
              <button
                className="btn-secondary"
                style={{ width: 'auto', padding: '0 16px', whiteSpace: 'nowrap' }}
                onClick={validateCode}
              >
                Verify
              </button>
            </div>
            {refValid === true && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '12px' }}>
                <CheckCircle size={14} />
                <span>{refMsg}</span>
              </div>
            )}
            {refValid === false && (
              <div style={{ color: '#F43F5E', fontSize: '12px' }}>{refMsg}</div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div>
        {step < 2 ? (
          <button className="btn-primary" onClick={() => setStep(step + 1)}>
            <span>Continue</span>
            <ArrowRight size={18} />
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn-primary" onClick={() => setScreen('login')}>
              <span>Get Started</span>
              <ArrowRight size={18} />
            </button>
            <button className="btn-secondary" onClick={() => setScreen('products')}>
              <span>Browse Marketplace as Guest</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
