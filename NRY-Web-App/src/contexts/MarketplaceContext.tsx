"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  MarketplaceCategory,
  MARKETPLACE_CATEGORIES,
  BusinessProfile,
  INITIAL_BUSINESSES,
  ListingItem,
  INITIAL_LISTINGS,
  TransactionRecord,
  INITIAL_TRANSACTIONS,
  calculatePlatformFee
} from "@/lib/marketplaceData";

interface MarketplaceContextType {
  categories: MarketplaceCategory[];
  businesses: BusinessProfile[];
  listings: ListingItem[];
  transactions: TransactionRecord[];
  currentBusiness: BusinessProfile;
  addBusiness: (biz: Omit<BusinessProfile, "id" | "joinedYear" | "rating" | "reviewsCount" | "totalTransactions">) => BusinessProfile;
  updateBusiness: (id: string, updates: Partial<BusinessProfile>) => void;
  addListing: (listing: Omit<ListingItem, "id" | "views" | "orders" | "createdAt">) => ListingItem;
  updateListing: (id: string, updates: Partial<ListingItem>) => void;
  deleteListing: (id: string) => void;
  duplicateListing: (id: string) => ListingItem | null;
  togglePublishListing: (id: string) => void;
  createTransaction: (data: {
    orderId: string;
    customerName: string;
    listingId: string;
    grossAmount: number;
    paymentMethod: string;
  }) => TransactionRecord;
  updateListingStatus: (id: string, status: ListingItem["status"]) => void;
  verifyBusiness: (id: string, approve: boolean, notes?: string) => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories] = useState<MarketplaceCategory[]>(MARKETPLACE_CATEGORIES);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>(INITIAL_BUSINESSES);
  const [listings, setListings] = useState<ListingItem[]>(INITIAL_LISTINGS);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);

  // Load from localStorage if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedBiz = localStorage.getItem("noryvanta_businesses");
      const storedListings = localStorage.getItem("noryvanta_listings");
      const storedTxns = localStorage.getItem("noryvanta_transactions");

      if (storedBiz) {
        try { setBusinesses(JSON.parse(storedBiz)); } catch (e) { /* ignore */ }
      }
      if (storedListings) {
        try { setListings(JSON.parse(storedListings)); } catch (e) { /* ignore */ }
      }
      if (storedTxns) {
        try { setTransactions(JSON.parse(storedTxns)); } catch (e) { /* ignore */ }
      }
    }
  }, []);

  // Save to localStorage on change
  const saveBusinesses = (data: BusinessProfile[]) => {
    setBusinesses(data);
    if (typeof window !== "undefined") {
      localStorage.setItem("noryvanta_businesses", JSON.stringify(data));
    }
  };

  const saveListings = (data: ListingItem[]) => {
    setListings(data);
    if (typeof window !== "undefined") {
      localStorage.setItem("noryvanta_listings", JSON.stringify(data));
    }
  };

  const saveTransactions = (data: TransactionRecord[]) => {
    setTransactions(data);
    if (typeof window !== "undefined") {
      localStorage.setItem("noryvanta_transactions", JSON.stringify(data));
    }
  };

  // Currently active business session (defaults to Apex Instruments biz-1)
  const currentBusiness = businesses[0] || INITIAL_BUSINESSES[0];

  const addBusiness = (biz: Omit<BusinessProfile, "id" | "joinedYear" | "rating" | "reviewsCount" | "totalTransactions">) => {
    const newBiz: BusinessProfile = {
      ...biz,
      id: `biz-${Date.now().toString(36)}`,
      joinedYear: new Date().getFullYear(),
      rating: 5.0,
      reviewsCount: 0,
      totalTransactions: 0,
      isVerified: biz.gstStatus === "Registered" && !!biz.gstNumber,
      verificationBadgeGranted: false // strictly ungranted until manual admin verification
    };
    const updated = [newBiz, ...businesses];
    saveBusinesses(updated);
    return newBiz;
  };

  const updateBusiness = (id: string, updates: Partial<BusinessProfile>) => {
    const updated = businesses.map(b => b.id === id ? { ...b, ...updates } : b);
    saveBusinesses(updated);
  };

  const addListing = (listing: Omit<ListingItem, "id" | "views" | "orders" | "createdAt">) => {
    const newListing: ListingItem = {
      ...listing,
      id: `item-${Date.now().toString(36)}`,
      views: 1,
      orders: 0,
      createdAt: new Date().toISOString().split("T")[0]
    };
    const updated = [newListing, ...listings];
    saveListings(updated);
    return newListing;
  };

  const updateListing = (id: string, updates: Partial<ListingItem>) => {
    const updated = listings.map(l => l.id === id ? { ...l, ...updates } : l);
    saveListings(updated);
  };

  const deleteListing = (id: string) => {
    const updated = listings.filter(l => l.id !== id);
    saveListings(updated);
  };

  const duplicateListing = (id: string) => {
    const target = listings.find(l => l.id === id);
    if (!target) return null;
    const duplicated: ListingItem = {
      ...target,
      id: `item-${Date.now().toString(36)}`,
      title: `${target.title} (Copy)`,
      status: "Draft",
      views: 0,
      orders: 0,
      createdAt: new Date().toISOString().split("T")[0]
    };
    const updated = [duplicated, ...listings];
    saveListings(updated);
    return duplicated;
  };

  const togglePublishListing = (id: string) => {
    const updated = listings.map(l => {
      if (l.id === id) {
        return {
          ...l,
          status: l.status === "Published" ? ("Inactive" as const) : ("Published" as const)
        };
      }
      return l;
    });
    saveListings(updated);
  };

  const updateListingStatus = (id: string, status: ListingItem["status"]) => {
    const updated = listings.map(l => l.id === id ? { ...l, status } : l);
    saveListings(updated);
  };

  const createTransaction = (data: {
    orderId: string;
    customerName: string;
    listingId: string;
    grossAmount: number;
    paymentMethod: string;
  }) => {
    const listing = listings.find(l => l.id === data.listingId);
    const targetBusiness = businesses.find(b => b.id === (listing?.businessId || currentBusiness.id)) || currentBusiness;
    const feeCalc = calculatePlatformFee(data.grossAmount, targetBusiness.businessType);

    const newTxn: TransactionRecord = {
      id: `txn-${Date.now().toString(36)}`,
      date: new Date().toISOString().split("T")[0],
      orderId: data.orderId,
      customerName: data.customerName,
      listingId: data.listingId,
      itemTitle: listing?.title || "Marketplace Product/Service",
      businessId: listing?.businessId || targetBusiness.id,
      businessName: listing?.businessName || targetBusiness.name,
      grossAmount: data.grossAmount,
      platformFeeRate: feeCalc.feeRate,
      platformFeeAmount: feeCalc.feeAmount,
      gstOnFeeAmount: feeCalc.gstOnFee,
      otherCharges: 0,
      netSettlement: feeCalc.netSettlement,
      status: "Successful",
      paymentMethod: data.paymentMethod
    };

    const updated = [newTxn, ...transactions];
    saveTransactions(updated);
    return newTxn;
  };

  const verifyBusiness = (id: string, approve: boolean, notes?: string) => {
    const updated = businesses.map(b => {
      if (b.id === id) {
        return {
          ...b,
          isVerified: approve,
          verificationBadgeGranted: approve,
          verificationNotes: notes || (approve ? "Verified by Noryvanta Trust & Safety compliance desk" : "Verification declined due to incomplete documentation"),
          verifiedAt: approve ? new Date().toISOString().split("T")[0] : undefined
        };
      }
      return b;
    });
    saveBusinesses(updated);
  };

  return (
    <MarketplaceContext.Provider
      value={{
        categories,
        businesses,
        listings,
        transactions,
        currentBusiness,
        addBusiness,
        updateBusiness,
        addListing,
        updateListing,
        deleteListing,
        duplicateListing,
        togglePublishListing,
        createTransaction,
        updateListingStatus,
        verifyBusiness
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider");
  }
  return context;
};
