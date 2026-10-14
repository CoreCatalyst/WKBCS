import React, { useState } from 'react';
import { Search, SlidersHorizontal, Plus, Star, ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductItem } from '../types';

export const MarketplaceProductsScreen: React.FC = () => {
  const { products, setSelectedProduct, setScreen, addToCart } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Electronics & Smart Tech', 'Industrial & Hardware', 'Home & Commercial Office', 'Organic & Food Essentials'];

  const filtered = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleProductClick = (product: ProductItem) => {
    setSelectedProduct(product);
    setScreen('product_detail');
  };

  return (
    <div>
      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <input
          className="form-input"
          placeholder="Search products, brands, commercial gear..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
        <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button
            key={cat}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              border: selectedCategory === cat ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: selectedCategory === cat ? 'rgba(0, 240, 255, 0.15)' : 'var(--bg-surface)',
              color: selectedCategory === cat ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Banner / Promotion */}
      <div className="card-glass card-highlight" style={{ marginBottom: '18px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="pill-badge pill-cyan" style={{ marginBottom: '6px' }}>
              <Zap size={12} />
              <span>Reward Qualifying</span>
            </span>
            <div className="title-md" style={{ marginTop: '4px' }}>Shop & Qualify Levels</div>
            <div className="text-xs" style={{ marginTop: '2px', color: 'var(--text-muted)' }}>
              Every ₹2,000 qualifying purchase completes 1 Level.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-gold)' }}>1.10% – 2.20%</div>
            <div className="text-xs">Rank Returns</div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {filtered.map(product => (
          <div
            key={product.id}
            className="card-glass"
            style={{ padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => handleProductClick(product)}
          >
            <div>
              <div style={{ width: '100%', height: '120px', borderRadius: '10px', overflow: 'hidden', background: '#1E293B', marginBottom: '10px', position: 'relative' }}>
                <img
                  src={product.images[0] || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=300&q=80'}
                  alt={product.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: '#00F0FF' }}>
                  ₹2k Level
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                {product.category.split('&')[0]}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.3, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {product.title}
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>₹{product.base_price.toLocaleString()}</span>
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>/{product.unit}</span>
              </div>

              <button
                className="btn-secondary"
                style={{ padding: '8px', fontSize: '12px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product);
                }}
              >
                <Plus size={14} />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
