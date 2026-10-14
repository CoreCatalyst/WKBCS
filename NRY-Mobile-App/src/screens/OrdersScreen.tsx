import React, { useState } from 'react';
import { ShoppingBag, ArrowLeft, RefreshCw, XCircle, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OrdersScreen: React.FC = () => {
  const { orders, setScreen, refreshData } = useApp();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancellingId(orderId);
      await fetch(`/api/v1/customer/orders/${orderId}/cancel?reason=Customer_Requested`, {
        method: 'POST'
      });
      await refreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="pill-badge pill-emerald"><CheckCircle size={12} /> {status}</span>;
      case 'CANCELLED':
      case 'REFUNDED':
        return <span className="pill-badge pill-rose"><XCircle size={12} /> {status}</span>;
      default:
        return <span className="pill-badge pill-amber"><Clock size={12} /> {status}</span>;
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="icon-btn" onClick={() => setScreen('profile')}>
            <ArrowLeft size={18} />
          </button>
          <div className="title-md">My Orders ({orders.length})</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="text-sm">No order history recorded yet.</div>
          <button className="btn-secondary" style={{ marginTop: '14px' }} onClick={() => setScreen('products')}>
            Shop Products
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {orders.map(order => (
            <div key={order.id} className="card-glass" style={{ padding: '14px' }}>
              <div className="flex-between" style={{ marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>{order.order_number}</div>
                  <div className="text-xs">{new Date(order.created_at).toLocaleDateString()}</div>
                </div>
                {getStatusBadge(order.order_status)}
              </div>

              {/* Items List */}
              <div style={{ padding: '8px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: '10px' }}>
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex-between" style={{ fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{it.quantity}x {it.title}</span>
                    <span style={{ fontWeight: 600 }}>₹{it.line_total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="flex-between">
                <div>
                  <span className="text-xs">Total Payable: </span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{order.total_amount.toLocaleString()}
                  </span>
                </div>

                {order.order_status !== 'CANCELLED' && order.order_status !== 'REFUNDED' && (
                  <button
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.3)' }}
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={cancellingId === order.id}
                  >
                    {cancellingId === order.id ? 'Cancelling...' : 'Cancel & Refund'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
