import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/api';

export const OtpVerificationScreen: React.FC = () => {
  const { setScreen, setUser } = useApp();
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const identifier = sessionStorage.getItem('pending_auth_identifier') || '+91 98765 43210';
  const fullName = sessionStorage.getItem('pending_auth_fullname') || '';
  const referralCode = sessionStorage.getItem('pending_auth_referral') || '';
  const devPreview = sessionStorage.getItem('dev_otp_preview') || '123456';

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.verifyOtp(identifier, otp, referralCode);
      const profile = await apiClient.getProfile();
      setUser({
        ...profile,
        full_name: fullName || profile.full_name,
        uaid: res.uaid || profile.uaid
      });
      setScreen('products');
    } catch (e: any) {
      setError(e.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const autoFillDevOtp = () => {
    setOtp(devPreview);
  };

  return (
    <div style={{ padding: '10px 0' }}>
      <button
        className="icon-btn"
        style={{ marginBottom: '16px' }}
        onClick={() => setScreen('login')}
      >
        <ArrowLeft size={18} />
      </button>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '50%', marginBottom: '12px' }}>
          <Smartphone size={32} color="#00F0FF" />
        </div>
        <div className="title-lg">Enter 6-Digit Code</div>
        <div className="text-sm" style={{ marginTop: '6px' }}>
          Sent to <strong style={{ color: '#FFFFFF' }}>{identifier}</strong>
        </div>
      </div>

      <div className="card-glass">
        {devPreview && (
          <div
            onClick={autoFillDevOtp}
            style={{
              padding: '10px 14px',
              background: 'rgba(0, 240, 255, 0.08)',
              border: '1px dashed var(--primary)',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Dev OTP Preview: <strong>{devPreview}</strong></span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Click to auto-fill</span>
          </div>
        )}

        <div style={{ marginBottom: '18px' }}>
          <label className="input-label">Verification Code</label>
          <input
            className="form-input"
            maxLength={6}
            placeholder="••••••"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            style={{
              fontSize: '24px',
              letterSpacing: '8px',
              textAlign: 'center',
              fontWeight: 700
            }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <button className="btn-primary" onClick={handleVerify} disabled={loading}>
          <span>{loading ? 'Verifying...' : 'Confirm & Enter Marketplace'}</span>
          <CheckCircle size={18} />
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          {timer > 0 ? (
            <span className="text-xs">Resend code in {timer}s</span>
          ) : (
            <button
              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setTimer(60)}
            >
              <RefreshCw size={14} />
              <span>Resend Code</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
