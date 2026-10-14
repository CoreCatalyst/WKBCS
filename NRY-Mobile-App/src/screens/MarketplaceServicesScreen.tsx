import React, { useState } from 'react';
import { Search, Wrench, Calendar, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductItem } from '../types';

export const MarketplaceServicesScreen: React.FC = () => {
  const { services, setSelectedProduct, setScreen } = useApp();
  const [search, setSearch] = useState('');

  const filtered = services.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleServiceClick = (srv: ProductItem) => {
    setSelectedProduct(srv);
    setScreen('service_detail');
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div>
          <div className="title-lg">Commercial Services</div>
          <div className="text-sm">Certified audits, installations & engineering</div>
        </div>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
          onClick={() => setScreen('bookings')}
        >
          My Bookings
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          className="form-input"
          placeholder="Search commercial services, energy audits..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
        <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
      </div>

      {/* Services List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filtered.map(service => (
          <div
            key={service.id}
            className="card-glass"
            style={{ padding: '14px', display: 'flex', gap: '14px', cursor: 'pointer' }}
            onClick={() => handleServiceClick(service)}
          >
            <div style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', background: '#1E293B', flexShrink: 0 }}>
              <img
                src={service.images[0] || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=300&q=80'}
                alt={service.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span className="pill-badge pill-cyan" style={{ fontSize: '10px', padding: '2px 8px', marginBottom: '4px' }}>
                  {service.category}
                </span>
                <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.3, marginBottom: '4px' }}>
                  {service.title}
                </div>
                <div className="text-xs" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {service.short_description || service.description}
                </div>
              </div>

              <div className="flex-between" style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{service.base_price.toLocaleString()}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Book Service</span>
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
