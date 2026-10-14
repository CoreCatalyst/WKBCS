import React from 'react';
import { ArrowLeft, Shield, FileText, Phone, Mail, HelpCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SupportLegalScreen: React.FC = () => {
  const { setScreen } = useApp();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="icon-btn" onClick={() => setScreen('profile')}>
          <ArrowLeft size={18} />
        </button>
        <div className="title-md">Support & Legal Policies</div>
      </div>

      {/* Support Contacts Card */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Customer Care & Inquiries</div>

        <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={16} color="var(--primary)" />
            <span>Customer Desk</span>
          </div>
          <a href="mailto:support@noryvantaglobal.com" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            support@noryvantaglobal.com
          </a>
        </div>

        <div className="flex-between" style={{ padding: '8px 0', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Phone size={16} color="var(--accent-emerald)" />
            <span>Direct Line</span>
          </div>
          <a href="tel:+917507897697" style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}>
            +91 7507897697
          </a>
        </div>
      </div>

      {/* Platform & Commercial Policies */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Commercial Rules & Guarantees</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div>
            <strong style={{ color: '#FFFFFF' }}>1. Zero Platform Fee for Customers:</strong> Noryvanta charges ZERO platform commission or escrow fees to retail buyers and customers. Fees are category-based and merchant-side only.
          </div>
          <div>
            <strong style={{ color: '#FFFFFF' }}>2. Permanent UAID Identity:</strong> Your customer identifier (NRY-C-XXXXXXXXXX) is cryptographically bound to your account and never changes across cycles.
          </div>
          <div>
            <strong style={{ color: '#FFFFFF' }}>3. Quarterly Activity Requirement:</strong> Customers make at least 1 purchase per calendar quarter (Q1-Q4) to maintain active reward eligibility.
          </div>
          <div>
            <strong style={{ color: '#FFFFFF' }}>4. Auditable Reversal Policy:</strong> Refunds or chargebacks trigger transparent reversal entries in the ledger without deleting transaction history.
          </div>
        </div>
      </div>
    </div>
  );
};
