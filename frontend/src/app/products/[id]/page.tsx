"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  ShieldCheck,
  CheckCircle2,
  Truck,
  ArrowRight,
  Landmark,
  FileCheck,
  Award
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(10);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${productId}`);
      setProduct(res.data);
      if (res.data.moq) setQuantity(res.data.moq);
    } catch (e) {
      console.warn("Using sample product details", e);
      setProduct({
        id: productId,
        title: "Industrial High-Precision Servo Motor 3KW (IP65 Certified)",
        category: "Industrial Machinery & Automation",
        hsn_code: "850152",
        gst_rate: 18,
        base_price: 24500,
        moq: 5,
        stock_quantity: 350,
        description: "High-torque continuous duty 3KW industrial AC servo motor with closed-loop optical encoder. Engineered for multi-axis CNC machines and precision robotics. Built to withstand continuous industrial manufacturing environments with IP65 dust and moisture resistance.",
        specifications: {
          "Power Output": "3.0 KW",
          "Rated Speed": "3000 RPM",
          "Torque": "15 Nm Continuous",
          "Ingress Protection": "IP65 Waterproof",
          "Encoder": "23-bit Optical Absolute Encoder",
          "Compliance": "CE, RoHS, ISO 9001:2015"
        },
        images: ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"],
        tiered_prices: [
          { min_quantity: 5, max_quantity: 19, unit_price: 24500 },
          { min_quantity: 20, max_quantity: 99, unit_price: 22800 },
          { min_quantity: 100, max_quantity: null, unit_price: 21000 }
        ]
      });
      setQuantity(5);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return <div className="p-10 text-center">Loading product specifications...</div>;

  // Calculate price based on selected quantity
  let unitPrice = product.base_price;
  if (product.tiered_prices) {
    for (const t of product.tiered_prices) {
      if (quantity >= t.min_quantity) {
        if (!t.max_quantity || quantity <= t.max_quantity) {
          unitPrice = t.unit_price;
          break;
        }
      }
    }
  }

  const subtotal = unitPrice * quantity;
  const gstAmount = subtotal * (product.gst_rate / 100.0);
  const totalPayable = subtotal + gstAmount;

  const handleProceedToCheckout = () => {
    router.push(`/checkout?productId=${product.id}&quantity=${quantity}&price=${unitPrice}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb */}
      <div className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-primary">Products</Link>
        <span>/</span>
        <span className="text-primary font-medium truncate max-w-xs">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Media & Specs */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-xl border border-border p-4 shadow-ambient overflow-hidden">
            <img
              src={product.images?.[0]}
              alt={product.title}
              className="w-full h-96 object-cover rounded-lg"
            />
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-ambient space-y-4">
            <h2 className="text-lg font-bold font-headline text-primary">Technical Description</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Specifications Table */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-ambient space-y-4">
            <h2 className="text-lg font-bold font-headline text-primary">Verified Specifications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {Object.entries(product.specifications || {}).map(([k, v]: any) => (
                <div key={k} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                  <span className="text-slate-500 font-medium">{k}</span>
                  <span className="font-semibold text-primary">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Escrow Purchase Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-border p-6 shadow-elevated space-y-6 sticky top-24">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider bg-surface-subtle px-2 py-0.5 rounded">
                  {product.category}
                </span>
                <span className="text-[11px] font-mono text-slate-500">HSN: {product.hsn_code}</span>
              </div>
              <h1 className="text-xl font-bold font-headline text-primary leading-snug">
                {product.title}
              </h1>
            </div>

            {/* Dynamic Wholesale Pricing Display */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Applicable Unit Price</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-primary font-headline">
                  ₹{unitPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-slate-500">/ unit (+{product.gst_rate}% GST)</span>
              </div>
            </div>

            {/* Tiered Discount Table */}
            {product.tiered_prices && product.tiered_prices.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Wholesale Volume Tiers:</span>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden text-xs">
                  {product.tiered_prices.map((t: any, idx: number) => {
                    const isActive = quantity >= t.min_quantity && (!t.max_quantity || quantity <= t.max_quantity);
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 flex justify-between items-center transition ${
                          isActive ? "bg-emerald-50 text-emerald-950 font-semibold" : "bg-white text-slate-600"
                        }`}
                      >
                        <span>{t.min_quantity}{t.max_quantity ? ` - ${t.max_quantity}` : "+"} units</span>
                        <span className="font-mono">₹{t.unit_price.toLocaleString("en-IN")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Order Quantity (Units):</span>
                <span className="text-slate-500">Minimum Order: {product.moq}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={product.moq}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(product.moq, parseInt(e.target.value) || product.moq))}
                  className="w-full px-4 py-2.5 bg-white border border-border-medium rounded-lg text-sm font-semibold font-mono text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({quantity} units):</span>
                <span className="font-mono font-medium">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Statutory GST ({product.gst_rate}%):</span>
                <span className="font-mono font-medium">₹{gstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-primary font-bold text-base pt-2 border-t border-slate-200">
                <span>Total Escrow Amount:</span>
                <span className="font-headline text-secondary">₹{totalPayable.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Escrow Guarantee Pill */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
              <span>
                Funds remain safely locked in Noryvanta Escrow until delivery is verified and the 48-hour inspection period passes.
              </span>
            </div>

            {/* Action CTA */}
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3 bg-primary hover:bg-secondary text-white text-sm font-bold rounded-lg shadow-lifted transition flex items-center justify-center gap-2"
            >
              <span>Order with Escrow Protection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
