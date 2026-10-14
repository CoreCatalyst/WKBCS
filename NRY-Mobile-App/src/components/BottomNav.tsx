import React from 'react';
import { ShoppingBag, Wrench, Award, ShoppingCart, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScreenId } from '../types';

export const BottomNav: React.FC = () => {
  const { screen, setScreen, cartCount } = useApp();

  const isTabActive = (tabScreen: ScreenId) => {
    if (tabScreen === 'products' && (screen === 'products' || screen === 'product_detail')) return true;
    if (tabScreen === 'services' && (screen === 'services' || screen === 'service_detail' || screen === 'bookings')) return true;
    if (tabScreen === 'rewards' && (screen === 'rewards' || screen === 'levels' || screen === 'ranks' || screen === 'cycles' || screen === 'reward_ledger' || screen === 'quarterly' || screen === 'referral_share')) return true;
    if (tabScreen === 'cart' && (screen === 'cart' || screen === 'checkout' || screen === 'payment_status')) return true;
    if (tabScreen === 'profile' && (screen === 'profile' || screen === 'orders' || screen === 'order_detail' || screen === 'settings' || screen === 'support')) return true;
    return screen === tabScreen;
  };

  return (
    <nav className="bottom-nav-bar">
      <button
        className={`nav-tab-item ${isTabActive('products') ? 'active' : ''}`}
        onClick={() => setScreen('products')}
      >
        <ShoppingBag size={20} />
        <span>Shop</span>
      </button>

      <button
        className={`nav-tab-item ${isTabActive('services') ? 'active' : ''}`}
        onClick={() => setScreen('services')}
      >
        <Wrench size={20} />
        <span>Services</span>
      </button>

      <button
        className={`nav-tab-item ${isTabActive('rewards') ? 'active' : ''}`}
        onClick={() => setScreen('rewards')}
      >
        <Award size={20} />
        <span>Rewards</span>
      </button>

      <button
        className={`nav-tab-item ${isTabActive('cart') ? 'active' : ''}`}
        onClick={() => setScreen('cart')}
      >
        <ShoppingCart size={20} />
        <span>Cart</span>
        {cartCount > 0 && <span className="cart-count-bubble">{cartCount}</span>}
      </button>

      <button
        className={`nav-tab-item ${isTabActive('profile') ? 'active' : ''}`}
        onClick={() => setScreen('profile')}
      >
        <UserIcon size={20} />
        <span>Profile</span>
      </button>
    </nav>
  );
};
