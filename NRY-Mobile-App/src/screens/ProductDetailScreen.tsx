import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus, ShoppingCart, ShieldCheck, Truck, RefreshCw, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProductDetailScreen: React.FC = () => {
  const { selectedProduct, setScreen, addToCart } = useApp();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!selectedProduct) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div>Product not selected.</div>
        <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={() => setScreen('products')}>
          Back to Shop
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(selectedProduct, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const levelContribution = Math.floor((selectedProduct.base_price * qty) / 2000);

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('products')}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Listing Details</span>
        <button className="icon-btn" onClick={() => setScreen('cart')}>
          <ShoppingCart size={18} />
        </button>
      </div>

      {/* Main Image */}
      <div style={{ width: '100%', height: '240px', borderRadius: '16px', overflow: 'hidden', background: '#1E293B', marginBottom: '16px' }}>
        <img
          src={selectedProduct.images[0] || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80'}
          alt={selectedProduct.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Title & Pricing */}
      <div className="card-glass" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <span className="pill-badge pill-cyan" style={{ marginBottom: '6px' }}>
              {selectedProduct.category}
            </span>
            <div className="title-md" style={{ marginTop: '4px' }}>{selectedProduct.title}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary)' }}>
            ₹{selectedProduct.base_price.toLocaleString()}
          </span>
          <span className="text-sm">/ {selectedProduct.unit}</span>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
            GST: {selectedProduct.gst_rate}% (Excluded from reward base)
          </span>
        </div>

        {/* Level Qualification Highlight */}
        <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(0, 240, 255, 0.08)', borderRadius: '10px', border: '1px solid var(--border-glow)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="#00F0FF" />
          <div className="text-xs" style={{ color: '#FFFFFF' }}>
            This purchase allocates to approx. <strong>{levelContribution} Customer Levels</strong> (₹2,000 each) in the reward ledger.
          </div>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="card-glass flex-between" style={{ marginBottom: '14px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>Quantity</div>
          <div className="text-xs">MOQ: {selectedProduct.moq} {selectedProduct.unit}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <button
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
            onClick={() => setQty(Math.max(1, qty - 1))}
          >
            <Minus size={16} />
          </button>
          <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{qty}</span>
          <button
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
            onClick={() => setQty(qty + 1)}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Description & Specifications */}
      <div className="card-glass" style={{ marginBottom: '14px' }}>
        <div className="title-md" style={{ marginBottom: '8px' }}>Product Overview</div>
        <div className="text-sm" style={{ lineHeight: 1.6, marginBottom: '14px' }}>
          {selectedProduct.description}
        </div>

        {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Specifications</div>
            {Object.entries(selectedProduct.specifications).map(([key, val]) => (
              <div key={key} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{key}</span>
                <span style={{ fontWeight: 600 }}>{String(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={handleAddToCart}>
          <ShoppingCart size={18} />
          <span>{added ? 'Added to Cart ✓' : `Add ${qty} to Cart — ₹${(selectedProduct.base_price * qty).toLocaleString()}`}</span>
        </button>
      </div>
    </div>
  );
};
