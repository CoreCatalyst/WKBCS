"use client";

import React from "react";
import Link from "next/link";
import { Shield, Lock, FileText, CheckCircle, Scale } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-primary-container text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-white text-primary font-bold flex items-center justify-center font-headline text-lg">
                N
              </div>
              <span className="font-headline font-bold text-white text-lg tracking-wider">NORYVANTA</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Institutional B2B Commercial Commerce & Escrow Infrastructure. Verified suppliers, GST statutory compliance, and zero counterparty default risk.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-tertiary">
              <Shield className="w-3.5 h-3.5" />
              <span>RBI-Regulated Partner Banking Escrow</span>
            </div>
          </div>

          {/* Platform & Solutions */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Platform & Solutions</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/products" className="hover:text-white transition">Industrial Catalogs</Link></li>
              <li><Link href="/ai-assistant" className="hover:text-white transition">AI Listing Assistant</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition">Vendor Portal</Link></li>
              <li><Link href="/rank-tracker" className="hover:text-white transition">Sovereign Tier Progression</Link></li>
              <li><Link href="/admin/fees" className="hover:text-white transition">Fee Transparency Ledger</Link></li>
            </ul>
          </div>

          {/* Statutory Governance & Rules */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Statutory & Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-tertiary" /> <span>GST E-Invoicing (IRN & QR)</span></li>
              <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-tertiary" /> <span>TDS Section 194-O (1%)</span></li>
              <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-tertiary" /> <span>FDI Marketplace Press Note 2</span></li>
              <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-tertiary" /> <span>DPDP Act 2023 Sovereign Data</span></li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Legal Documents</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/terms" className="hover:text-white transition">B2B Terms & Conditions</Link></li>
              <li><Link href="/policies" className="hover:text-white transition">Escrow & Milestone Policy</Link></li>
              <li><Link href="/policies" className="hover:text-white transition">Dispute & Return Resolution</Link></li>
              <li><Link href="/policies" className="hover:text-white transition">Data Privacy & Security Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Noryvanta Commercial Technologies Pvt Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> 256-Bit TLS Secured</span>
            <span>CIN: U72900MH2026PTC981240</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
