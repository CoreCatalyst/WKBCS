"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, PlusCircle, ShoppingBag, User } from "lucide-react";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products", label: "Explore", icon: Compass },
    { href: "/dashboard?tab=add-listing", label: "Add", icon: PlusCircle, isHighlight: true },
    { href: "/orders", label: "Orders", icon: ShoppingBag },
    { href: "/dashboard", label: "Profile", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lifted">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href.includes("tab") && pathname.startsWith("/dashboard"));

          if (item.isHighlight) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-[#113D60] text-white flex items-center justify-center shadow-lg border-2 border-white hover:scale-105 transition">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-[10px] font-bold text-[#113D60] mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition ${
                isActive ? "text-[#113D60] font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-cyan-600 stroke-[2.5]" : "text-slate-400"}`} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
