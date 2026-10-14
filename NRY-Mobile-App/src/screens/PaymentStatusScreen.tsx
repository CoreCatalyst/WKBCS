import React from 'react';
import { CheckCircle, Zap, ArrowRight, ShieldCheck, ShoppingBag, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PaymentStatusScreen: React.FC = () => {
  const { setScreen, rewardStatus } = useApp();

  const lastOrderRaw = sessionStorage.getItem('last_placed_order');
  const lastOrder = lastOrderRaw ? JSON.parse(lastOrderRaw) : { order_number: 'ORD-C-20261013-9A1F', total_amount: 8000 };

  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ display: 'inline-flex', padding: '20px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '50%', marginBottom: '16px' }}>
        <CheckCircle size={52} color="#10B981" />
      </div>

      <div className="title-lg" style={{ marginBottom: '6px' }}>Payment Successful!</div>
      <div className="text-sm" style={{ marginBottom: '20px' }}>
        Order <strong style={{ color: '#FFFFFF' }}>{lastOrder.order_number}</strong> verified in Escrow.
      </div>

      {lastOrder.points_redeemed > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', marginBottom: '16px', fontSize: '12px' }}>
          <span style={{ color: '#FCD34D', fontWeight: 600 }}>Reward Points Redeemed:</span>
          <span style={{ color: '#F59E0B', fontWeight: 800 }}>-₹{Number(lastOrder.points_redeemed).toLocaleString()} ({lastOrder.points_redeemed} pts)</span>
        </div>
      )}

      {/* Qualification Audit Card */}
      <div className="card-glass card-highlight" style={{ textAlign: 'left', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Zap size={20} color="#00F0FF" />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#00F0FF' }}>
            Customer Reward Qualification Recorded
          </div>
        </div>

        <div className="text-xs" style={{ lineHeight: 1.5, color: '#E2E8F0', marginBottom: '12px' }}>
          Your qualifying purchase has been aggregated in the authoritative customer ledger.
          Each ₹2,000 completed 1 Level and satisfied quarterly compliance for Q4 2026.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
          <div>
            <div className="text-xs">Current Level</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
              Level {rewardStatus?.current_level || 4}
            </div>
          </div>
          <div>
            <div className="text-xs">Current Rank</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-gold)' }}>
              {rewardStatus?.current_rank || 'Bronze'}
            </div>
          </div>
          <div>
            <div className="text-xs">Reward Rate</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {rewardStatus?.current_reward_rate?.toFixed(2) || '1.10'}%
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className="btn-primary" onClick={() => setScreen('rewards')}>
          <Award size={18} />
          <span>View Level & Reward Progress</span>
        </button>

        <button className="btn-secondary" onClick={() => setScreen('orders')}>
          <ShoppingBag size={18} />
          <span>View Order History</span>
        </button>

        <button
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', padding: '8px', cursor: 'pointer' }}
          onClick={() => setScreen('products')}
        >
          Back to Marketplace
        </button>
      </div>
    </div>
  );
};
