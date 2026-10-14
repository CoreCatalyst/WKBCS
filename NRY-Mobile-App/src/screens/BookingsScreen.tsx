import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Wrench, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BookingsScreen: React.FC = () => {
  const { setScreen } = useApp();
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/v1/customer/bookings')
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        if (data && data.length) {
          setBookings(data);
        } else {
          setBookings([
            {
              id: 'bk-1',
              booking_number: 'BK-C-20261011-8842',
              service_title: 'Certified Rooftop Solar Energy Audit & Installation',
              total_amount: 5898.82,
              status: 'CONFIRMED',
              created_at: '2026-10-11T10:00:00Z',
              notes: 'Scheduled Date: 2026-10-20'
            }
          ]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('services')}>
          <ArrowLeft size={18} />
        </button>
        <div className="title-md">My Service Bookings ({bookings.length})</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {bookings.map(b => (
          <div key={b.id} className="card-glass" style={{ padding: '14px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800 }}>{b.booking_number}</div>
              <span className="pill-badge pill-emerald">
                <CheckCircle size={12} /> {b.status}
              </span>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
              {b.service_title}
            </div>

            <div className="text-xs" style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
              {b.notes || 'Service site scheduled'}
            </div>

            <div className="flex-between" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '13px' }}>
              <span className="text-xs">Amount:</span>
              <span style={{ fontWeight: 800, color: '#FFFFFF' }}>₹{b.total_amount.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
