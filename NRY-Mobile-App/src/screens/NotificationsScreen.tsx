import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Zap, Calendar, Info, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NotificationsScreen: React.FC = () => {
  const { setScreen } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/v1/customer/notifications')
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        if (data && data.length) {
          setNotifications(data);
        } else {
          setNotifications([
            {
              id: 'n-1',
              title: 'Customer Reward Program Active',
              message: 'Your Customer UAID has satisfied the ₹2,000 threshold and is actively earning rank rewards.',
              type: 'success',
              date: 'Today'
            },
            {
              id: 'n-2',
              title: 'Quarterly Activity Met (Q4 2026)',
              message: 'Your recent commercial order verified your quarterly compliance.',
              type: 'calendar',
              date: 'Yesterday'
            },
            {
              id: 'n-3',
              title: 'Escrow Protection Active',
              message: 'Your order is backed by zero platform fees for retail buyers.',
              type: 'info',
              date: '3 days ago'
            }
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} color="#10B981" />;
      case 'reward':
        return <Zap size={18} color="#00F0FF" />;
      case 'calendar':
        return <Calendar size={18} color="#FFB703" />;
      default:
        return <Info size={18} color="var(--primary)" />;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('products')}>
          <ArrowLeft size={18} />
        </button>
        <div className="title-md">Notifications & Alerts</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notifications.map(n => (
          <div key={n.id} className="card-glass" style={{ padding: '14px', display: 'flex', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: '10px', height: 'fit-content' }}>
              {getIcon(n.type)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="flex-between">
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{n.title}</span>
                <span className="text-xs">{n.date || 'Recent'}</span>
              </div>
              <div className="text-xs" style={{ marginTop: '4px', lineHeight: 1.5 }}>
                {n.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
