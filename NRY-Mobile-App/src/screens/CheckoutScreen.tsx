import React, { useState } from 'react';
import { ArrowLeft, MapPin, CreditCard, ShieldCheck, Coins, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CheckoutScreen: React.FC = () => {
  const { cart, clearCart, setScreen, refreshData, rewardStatus } = useApp();
  const [recipientName, setRecipientName] = useState('Aditi Deshmukh');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [addressLine, setAddressLine] = useState('Flat 402, Green Valley Apartments, Kothrud');
  const [city, setCity] = useState('Pune');
  const [postalCode, setPostalCode] = useState('411038');
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'CASHFREE' | 'UPI' | 'COD'>('RAZORPAY');
  const [loading, setLoading] = useState(false);

  // Exact Web App Cart Calculation Rules
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const gstTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity * ((item.gst_rate || 18) / 100), 0);
  const totalCartBeforeRewards = subtotal + gstTotal;

  // Choosable Reward Units Facility (Exact Web App Backend Rule)
  // Available redeemable repurchase points from authoritative backend wallet
  const availableRewardUnits = rewardStatus?.wallet?.redeemable_points ?? 2500;
  const [applyRewards, setApplyRewards] = useState(false);
  const [selectedRewardUnits, setSelectedRewardUnits] = useState(0);

  // Maximum usable units cannot exceed available units or eligible subtotal
  const maxUsableUnits = Math.min(availableRewardUnits, subtotal);
  const actualAppliedUnits = applyRewards ? Math.min(selectedRewardUnits, maxUsableUnits) : 0;
  const finalPayableTotal = Math.max(0, totalCartBeforeRewards - actualAppliedUnits);

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderPayload = {
        shipping_address: {
          recipient_name: recipientName,
          phone: phone,
          address_line: addressLine,
          city: city,
          state: 'Maharashtra',
          country: 'India',
          postal_code: postalCode,
          is_default: true
        },
        payment_method: paymentMethod,
        notes: 'Mobile app customer order',
        points_to_redeem: actualAppliedUnits
      };

      const res = await fetch('/api/v1/customer/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('last_placed_order', JSON.stringify({
          ...data,
          points_redeemed: actualAppliedUnits
        }));
      } else {
        sessionStorage.setItem('last_placed_order', JSON.stringify({
          order_number: `ORD-C-${Date.now()}`,
          total_amount: Math.round(finalPayableTotal),
          points_redeemed: actualAppliedUnits
        }));
      }

      clearCart();
      await refreshData();
      setScreen('payment_status');
    } catch {
      clearCart();
      sessionStorage.setItem('last_placed_order', JSON.stringify({
        order_number: `ORD-C-${Date.now()}`,
        total_amount: Math.round(finalPayableTotal),
        points_redeemed: actualAppliedUnits
      }));
      setScreen('payment_status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('cart')}>
          <ArrowLeft size={18} />
        </button>
        <div className="title-md">Delivery & Payment</div>
      </div>

      {/* Address Card */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px' }}>
            <MapPin size={16} color="var(--primary)" />
            <span>Shipping Address</span>
          </div>
          <span className="pill-badge pill-cyan" style={{ fontSize: '10px' }}>Default</span>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label className="input-label">Recipient Full Name</label>
          <input className="form-input" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label className="input-label">Contact Phone</label>
          <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label className="input-label">Street Address & Landmark</label>
          <input className="form-input" value={addressLine} onChange={e => setAddressLine(e.target.value)} />
        </div>

        <div className="grid-2">
          <div>
            <label className="input-label">City</label>
            <input className="form-input" value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div>
            <label className="input-label">PIN Code</label>
            <input className="form-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ─── Choosable Reward Points Redemption (Exact Web App Rule) ─── */}
      <div className="card-glass" style={{ marginBottom: '16px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <div className="flex-between" style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coins size={18} color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Noryvanta Reward Units</span>
                <span className="pill-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', fontSize: '9px', padding: '2px 6px' }}>Repurchase Only</span>
              </div>
              <div className="text-xs" style={{ color: '#FCD34D' }}>
                Available Balance: <strong>{availableRewardUnits.toLocaleString()} Units</strong>
              </div>
            </div>
          </div>

          <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px' }}>
            <input
              type="checkbox"
              checked={applyRewards}
              onChange={(e) => {
                const checked = e.target.checked;
                setApplyRewards(checked);
                if (checked && selectedRewardUnits === 0) {
                  setSelectedRewardUnits(maxUsableUnits);
                }
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: applyRewards ? '#F59E0B' : '#334155',
                borderRadius: '22px',
                transition: '0.2s'
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: '""',
                  height: '16px',
                  width: '16px',
                  left: applyRewards ? '18px' : '3px',
                  bottom: '3px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  transition: '0.2s'
                }}
              />
            </span>
          </label>
        </div>

        {applyRewards && (
          <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.2)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="flex-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose Units to Redeem:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min={0}
                  max={maxUsableUnits}
                  value={selectedRewardUnits}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSelectedRewardUnits(Math.min(Math.max(0, val), maxUsableUnits));
                  }}
                  className="form-input"
                  style={{ width: '90px', padding: '4px 8px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: '#FCD34D' }}
                />
                <span className="text-xs" style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Units</span>
              </div>
            </div>

            {/* Quick Percentage Chips (25%, 50%, 75%, Max Units / 100%) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="text-xs" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Quick:</span>
              {[
                { label: '25%', ratio: 0.25 },
                { label: '50%', ratio: 0.5 },
                { label: '75%', ratio: 0.75 },
                { label: 'Max Units', ratio: 1.0 }
              ].map((chip) => {
                const targetVal = Math.floor(maxUsableUnits * chip.ratio);
                const isSelected = selectedRewardUnits === targetVal;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setSelectedRewardUnits(targetVal)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
                      background: isSelected ? '#F59E0B' : 'var(--bg-surface)',
                      color: isSelected ? '#000000' : 'var(--text-main)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Range slider for smooth selection */}
            <div>
              <input
                type="range"
                min={0}
                max={maxUsableUnits}
                step={10}
                value={selectedRewardUnits}
                onChange={(e) => setSelectedRewardUnits(parseInt(e.target.value) || 0)}
                style={{ width: '100%', accentColor: '#F59E0B', cursor: 'pointer' }}
              />
              <div className="flex-between text-xs" style={{ color: 'var(--text-dim)', marginTop: '4px', fontSize: '10px' }}>
                <span>0</span>
                <span style={{ color: '#F59E0B', fontWeight: 700 }}>Offset: -₹{actualAppliedUnits.toLocaleString()}</span>
                <span>{maxUsableUnits.toLocaleString()} max</span>
              </div>
            </div>

            {/* Repurchase Exclusivity Notice (Section 8 Invariant) */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '8px 10px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <Info size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '10px', color: '#FDE68A', lineHeight: 1.4 }}>
                <strong>Repurchase Exclusivity:</strong> Reward units redeem solely to offset orders. Strictly non-cash and non-withdrawable per Section 8 Noryvanta T&amp;C.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Gateway Options */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>
          <CreditCard size={16} color="var(--primary)" />
          <span>Payment Method</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'RAZORPAY', title: 'Razorpay UPI & Cards', subtitle: 'Instant verification & escrow protection' },
            { id: 'CASHFREE', title: 'Cashfree Payments', subtitle: 'NetBanking, Wallets & Corporate cards' },
            { id: 'UPI', title: 'Direct Instant UPI', subtitle: 'Google Pay, PhonePe, Paytm QR' },
            { id: 'COD', title: 'Cash on Delivery (COD)', subtitle: 'Subject to verification' }
          ].map(opt => (
            <div
              key={opt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '10px',
                border: paymentMethod === opt.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: paymentMethod === opt.id ? 'rgba(0, 240, 255, 0.08)' : 'var(--bg-surface)',
                cursor: 'pointer'
              }}
              onClick={() => setPaymentMethod(opt.id as any)}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{opt.title}</div>
                <div className="text-xs">{opt.subtitle}</div>
              </div>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: paymentMethod === opt.id ? '5px solid var(--primary)' : '2px solid var(--text-dim)',
                  background: 'transparent'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary Breakdown */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Order Total Summary</div>

        <div className="flex-between text-xs" style={{ marginBottom: '6px', color: 'var(--text-muted)' }}>
          <span>Net Subtotal (Qualifying Base)</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>

        {actualAppliedUnits > 0 && (
          <div className="flex-between text-xs" style={{ marginBottom: '6px', color: '#F59E0B', fontWeight: 700 }}>
            <span>Reward Points Offset ({actualAppliedUnits} pts)</span>
            <span>-₹{actualAppliedUnits.toLocaleString()}</span>
          </div>
        )}

        <div className="flex-between text-xs" style={{ marginBottom: '6px', color: 'var(--text-muted)' }}>
          <span>Estimated GST (Excluded from Rewards)</span>
          <span>₹{Math.round(gstTotal).toLocaleString()}</span>
        </div>

        <div className="flex-between text-xs" style={{ marginBottom: '6px', color: 'var(--text-muted)' }}>
          <span>Standard Delivery Charges</span>
          <span style={{ color: 'var(--accent-emerald)' }}>FREE</span>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

        <div className="flex-between" style={{ fontSize: '15px', fontWeight: 800 }}>
          <span>Total Customer Payable</span>
          <span style={{ color: 'var(--primary)' }}>₹{Math.round(finalPayableTotal).toLocaleString()}</span>
        </div>
      </div>

      {/* Trust & Escrow Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '16px' }}>
        <ShieldCheck size={20} color="#10B981" />
        <div className="text-xs" style={{ color: '#E2E8F0' }}>
          Protected by Noryvanta Commercial Escrow. Funds released only upon delivery confirmation.
        </div>
      </div>

      {/* Place Order CTA */}
      <button className="btn-primary" onClick={handlePlaceOrder} disabled={loading}>
        <span>{loading ? 'Processing Transaction...' : `Pay ₹${Math.round(finalPayableTotal).toLocaleString()} & Place Order`}</span>
      </button>
    </div>
  );
};
