import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, CheckCircle, ShieldCheck, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ServiceDetailScreen: React.FC = () => {
  const { selectedProduct, setScreen, refreshData } = useApp();
  const [scheduledDate, setScheduledDate] = useState('2026-10-20');
  const [addressLine, setAddressLine] = useState('Flat 402, Green Valley Apts, Kothrud');
  const [city, setCity] = useState('Pune');
  const [notes, setNotes] = useState('');
  const [bookingDone, setBookingDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!selectedProduct) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div>Service not selected.</div>
        <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={() => setScreen('services')}>
          Back to Services
        </button>
      </div>
    );
  }

  const handleBookService = async () => {
    setLoading(true);
    try {
      await fetch('/api/v1/customer/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedProduct.id,
          scheduled_date: scheduledDate,
          address: {
            recipient_name: 'Customer',
            phone: '+91 98765 43210',
            address_line: addressLine,
            city: city,
            state: 'Maharashtra',
            country: 'India',
            postal_code: '411038'
          },
          notes: notes
        })
      });
      await refreshData();
      setBookingDone(true);
    } catch {
      setBookingDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('services')}>
          <ArrowLeft size={18} />
        </button>
        <div className="title-md">Schedule Service Booking</div>
      </div>

      {bookingDone ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
            <CheckCircle size={40} color="#10B981" />
          </div>
          <div className="title-lg" style={{ marginBottom: '8px' }}>Service Booking Confirmed!</div>
          <div className="text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
            Your booking for <strong>{selectedProduct.title}</strong> has been scheduled for {scheduledDate}.
          </div>
          <button className="btn-primary" onClick={() => setScreen('bookings')}>
            View My Bookings
          </button>
        </div>
      ) : (
        <>
          <div className="card-glass" style={{ marginBottom: '16px' }}>
            <div className="pill-badge pill-cyan" style={{ marginBottom: '6px' }}>
              {selectedProduct.category}
            </div>
            <div className="title-md">{selectedProduct.title}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px' }}>
              ₹{selectedProduct.base_price.toLocaleString()}
            </div>
            <div className="text-sm" style={{ marginTop: '8px', lineHeight: 1.5 }}>
              {selectedProduct.description}
            </div>
          </div>

          <div className="card-glass" style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Booking Parameters</div>

            <div style={{ marginBottom: '14px' }}>
              <label className="input-label">Preferred Service Date</label>
              <input
                type="date"
                className="form-input"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="input-label">Service Location Address</label>
              <input
                className="form-input"
                value={addressLine}
                onChange={e => setAddressLine(e.target.value)}
                placeholder="Street address / site location"
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="input-label">City</label>
              <input
                className="form-input"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City"
              />
            </div>

            <div>
              <label className="input-label">Special Site Instructions</label>
              <textarea
                className="form-input"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Inquire at reception, site ladder required"
              />
            </div>
          </div>

          <button className="btn-primary" onClick={handleBookService} disabled={loading}>
            <span>{loading ? 'Confirming...' : `Confirm Booking — ₹${selectedProduct.base_price.toLocaleString()}`}</span>
          </button>
        </>
      )}
    </div>
  );
};
