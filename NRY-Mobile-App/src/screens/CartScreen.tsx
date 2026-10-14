import React from 'react';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CartScreen: React.FC = () => {
  const { cart, updateCartQty, removeFromCart, setScreen } = useApp();

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const gstTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity * ((item.gst_rate || 18) / 100), 0);
  const totalPayable = subtotal + gstTotal;

  // Level qualification estimate (₹2,000 per level)
  const potentialLevels = Math.floor(subtotal / 2000);

  if (cart.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'inline-flex', padding: '20px', background: 'var(--bg-surface)', borderRadius: '50%', marginBottom: '16px' }}>
          <ShoppingBag size={48} color="var(--text-dim)" />
        </div>
        <div className="title-md" style={{ marginBottom: '8px' }}>Your Cart is Empty</div>
        <div className="text-sm" style={{ marginBottom: '24px' }}>
          Discover verified commercial products and start completing Customer Levels.
        </div>
        <button className="btn-primary" onClick={() => setScreen('products')}>
          Explore Marketplace
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div className="title-lg">Shopping Cart ({cart.length})</div>
      </div>

      {/* Cart Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {cart.map(item => (
          <div key={item.item_id} className="card-glass" style={{ padding: '12px', display: 'flex', gap: '12px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '10px', overflow: 'hidden', background: '#1E293B', flexShrink: 0 }}>
              <img
                src={item.images[0] || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=200&q=80'}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.3, maxWidth: '180px' }}>{item.title}</div>
                <button
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  onClick={() => removeFromCart(item.item_id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex-between" style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{(item.unit_price * item.quantity).toLocaleString()}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: '8px' }}>
                  <button
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                    onClick={() => updateCartQty(item.item_id, item.quantity - 1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                  <button
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                    onClick={() => updateCartQty(item.item_id, item.quantity + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reward Progress Preview Banner */}
      <div className="card-glass" style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid var(--border-glow)', padding: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="#00F0FF" />
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#00F0FF' }}>
            Level Allocation Preview: +{potentialLevels} Levels
          </div>
        </div>
        <div className="text-xs" style={{ marginTop: '4px' }}>
          Eligible net subtotal ₹{subtotal.toLocaleString()} will allocate ₹2,000 per level into your immutable ledger.
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Payment Summary</div>

        <div className="flex-between" style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <span>Net Subtotal (Qualifying Base)</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>

        <div className="flex-between" style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <span>Estimated GST (Excluded from Rewards)</span>
          <span>₹{Math.round(gstTotal).toLocaleString()}</span>
        </div>

        <div className="flex-between" style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <span>Standard Delivery Charges</span>
          <span style={{ color: 'var(--accent-emerald)' }}>FREE</span>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '10px 0' }} />

        <div className="flex-between" style={{ fontSize: '16px', fontWeight: 800 }}>
          <span>Total Customer Payable</span>
          <span style={{ color: 'var(--primary)' }}>₹{Math.round(totalPayable).toLocaleString()}</span>
        </div>
      </div>

      {/* Checkout CTA */}
      <button className="btn-primary" onClick={() => setScreen('checkout')}>
        <span>Proceed to Checkout</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
};
