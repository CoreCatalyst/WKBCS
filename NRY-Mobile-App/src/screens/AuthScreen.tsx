import React, { useState } from 'react';
import { Smartphone, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/api';

export const AuthScreen: React.FC = () => {
  const { setScreen, setUser } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('otp');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      setError('Please enter your mobile phone number or email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.requestOtp(identifier.trim());
      // Pass to OTP screen
      sessionStorage.setItem('pending_auth_identifier', identifier.trim());
      sessionStorage.setItem('pending_auth_fullname', fullName.trim());
      sessionStorage.setItem('pending_auth_referral', referralCode.trim());
      sessionStorage.setItem('dev_otp_preview', res.dev_otp_preview || '');
      setScreen('otp');
    } catch (e: any) {
      setError(e.message || 'Failed to dispatch OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!identifier || !password) {
      setError('Please provide your login credentials.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const authData = await apiClient.loginWithPassword(identifier.trim(), password);
      setUser(authData);
      setScreen('products');
    } catch (e: any) {
      setError(e.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginBottom: '14px' }}>
          <img
            src="/logo-icon.png"
            alt="Noryvanta - Global"
            style={{ width: '44px', height: '44px', objectFit: 'contain', marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ fontWeight: 800, fontSize: '20px', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Noryvanta
            </span>
            <span style={{ fontWeight: 500, fontSize: '14px', color: '#94A3B8' }}>
              - Global
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#00F0FF', fontWeight: 600, letterSpacing: '0.04em', marginTop: '3px' }}>
            Connect. Grow. Thrive.
          </div>
        </div>
        <div className="title-lg">{isRegister ? 'Create Customer Account' : 'Welcome Back'}</div>
        <div className="text-sm" style={{ marginTop: '4px' }}>
          {isRegister
            ? 'Sign up for sovereign buyer protection & customer rewards'
            : 'Access your Customer Profile and Reward Network'}
        </div>
      </div>

      {/* Tabs: OTP vs Password */}
      <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '12px', marginBottom: '20px' }}>
        <button
          className="toggle-btn"
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '8px',
            background: authMethod === 'otp' ? 'var(--bg-card)' : 'transparent',
            color: authMethod === 'otp' ? 'var(--primary)' : 'var(--text-muted)'
          }}
          onClick={() => setAuthMethod('otp')}
        >
          <Smartphone size={16} />
          <span>Mobile OTP</span>
        </button>
        <button
          className="toggle-btn"
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '8px',
            background: authMethod === 'password' ? 'var(--bg-card)' : 'transparent',
            color: authMethod === 'password' ? 'var(--primary)' : 'var(--text-muted)'
          }}
          onClick={() => setAuthMethod('password')}
        >
          <Lock size={16} />
          <span>Password</span>
        </button>
      </div>

      <div className="card-glass">
        {isRegister && (
          <div style={{ marginBottom: '14px' }}>
            <label className="input-label">Full Legal Name</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                placeholder="e.g. Aditi Deshmukh"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label className="input-label">
            {authMethod === 'otp' ? 'Mobile Phone Number (+91) or Email' : 'Email or Mobile'}
          </label>
          <input
            className="form-input"
            placeholder={authMethod === 'otp' ? '+91 98765 43210' : 'name@example.com'}
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
          />
        </div>

        {authMethod === 'password' && (
          <div style={{ marginBottom: '14px' }}>
            <label className="input-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        )}

        {isRegister && (
          <div style={{ marginBottom: '14px' }}>
            <label className="input-label">Customer Referral UAID (Optional)</label>
            <input
              className="form-input"
              placeholder="NRY-C-XXXXXXXXXX"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
            />
            <div className="text-xs" style={{ marginTop: '4px' }}>
              Only valid Customer UAIDs are accepted. Business UAIDs are rejected.
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={authMethod === 'otp' ? handleRequestOtp : handlePasswordLogin}
          disabled={loading}
        >
          <span>{loading ? 'Processing...' : (authMethod === 'otp' ? 'Send Mobile OTP' : (isRegister ? 'Register' : 'Log In'))}</span>
          <ArrowRight size={18} />
        </button>

        {/* Role Separation Notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          <ShieldCheck size={18} color="#00F0FF" />
          <div className="text-xs" style={{ lineHeight: 1.4 }}>
            Customer accounts strictly receive Customer permissions. Wholesalers, Distributors, and Retailers use the separate Business Web App.
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
        >
          {isRegister ? 'Already registered? Log in here' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
};
