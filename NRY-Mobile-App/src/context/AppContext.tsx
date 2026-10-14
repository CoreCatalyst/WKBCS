import React, { createContext, useContext, useState, useEffect } from 'react';
import { ScreenId, CustomerUser, ProductItem, CartItem, OrderRecord, RewardStatusData, RankProgression, LevelRecord } from '../types';
import { apiClient } from '../services/api';

interface AppContextType {
  screen: ScreenId;
  setScreen: (s: ScreenId) => void;
  user: CustomerUser | null;
  setUser: (u: CustomerUser | null) => void;
  rewardStatus: RewardStatusData | null;
  cart: CartItem[];
  cartCount: number;
  products: ProductItem[];
  services: ProductItem[];
  ranks: RankProgression[];
  levels: LevelRecord[];
  orders: OrderRecord[];
  selectedProduct: ProductItem | null;
  setSelectedProduct: (p: ProductItem | null) => void;
  selectedOrder: OrderRecord | null;
  setSelectedOrder: (o: OrderRecord | null) => void;
  deviceFrame: boolean;
  setDeviceFrame: (b: boolean) => void;
  addToCart: (product: ProductItem, qty?: number) => void;
  updateCartQty: (itemId: string, qty: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  refreshData: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<ScreenId>('products');
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [rewardStatus, setRewardStatus] = useState<RewardStatusData | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [services, setServices] = useState<ProductItem[]>([]);
  const [ranks, setRanks] = useState<RankProgression[]>([]);
  const [levels, setLevels] = useState<LevelRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [deviceFrame, setDeviceFrame] = useState<boolean>(true);

  const refreshData = async () => {
    try {
      const [u, rwd, prods, srvs, rnks, lvls, ords] = await Promise.all([
        apiClient.getProfile(),
        apiClient.getRewardStatus(),
        apiClient.getProducts(),
        apiClient.getServices(),
        apiClient.getRanks(),
        apiClient.getLevels(),
        apiClient.getOrders()
      ]);
      setUser(u);
      setRewardStatus(rwd);
      setProducts(prods);
      setServices(srvs);
      setRanks(rnks);
      setLevels(lvls);
      setOrders(ords);
    } catch (e) {
      console.error('Error refreshing app data:', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addToCart = (product: ProductItem, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + qty, line_total: (item.quantity + qty) * item.unit_price }
            : item
        );
      }
      return [
        ...prev,
        {
          item_id: `cart-${Date.now()}`,
          product_id: product.id,
          title: product.title,
          unit_price: product.base_price,
          gst_rate: product.gst_rate || 18.0,
          quantity: qty,
          line_total: product.base_price * qty,
          images: product.images || []
        }
      ];
    });
  };

  const updateCartQty = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.item_id === itemId
          ? { ...item, quantity: qty, line_total: qty * item.unit_price }
          : item
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.item_id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const logout = () => {
    setUser(null);
    setScreen('login');
  };

  const cartCount = cart.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        screen,
        setScreen,
        user,
        setUser,
        rewardStatus,
        cart,
        cartCount,
        products,
        services,
        ranks,
        levels,
        orders,
        selectedProduct,
        setSelectedProduct,
        selectedOrder,
        setSelectedOrder,
        deviceFrame,
        setDeviceFrame,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        refreshData,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
