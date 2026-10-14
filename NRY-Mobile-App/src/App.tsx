import React from 'react';
import { useApp } from './context/AppContext';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Smartphone, Monitor } from 'lucide-react';

// Screens
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { OtpVerificationScreen } from './screens/OtpVerificationScreen';
import { MarketplaceProductsScreen } from './screens/MarketplaceProductsScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { MarketplaceServicesScreen } from './screens/MarketplaceServicesScreen';
import { ServiceDetailScreen } from './screens/ServiceDetailScreen';
import { CartScreen } from './screens/CartScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { PaymentStatusScreen } from './screens/PaymentStatusScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { BookingsScreen } from './screens/BookingsScreen';
import { RewardsDashboardScreen } from './screens/RewardsDashboardScreen';
import { LevelProgressScreen } from './screens/LevelProgressScreen';
import { RankProgressScreen } from './screens/RankProgressScreen';
import { CycleTrackerScreen } from './screens/CycleTrackerScreen';
import { RewardLedgerScreen } from './screens/RewardLedgerScreen';
import { QuarterlyActivityScreen } from './screens/QuarterlyActivityScreen';
import { ReferralShareScreen } from './screens/ReferralShareScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SupportLegalScreen } from './screens/SupportLegalScreen';

export const App: React.FC = () => {
  const { screen, deviceFrame, setDeviceFrame } = useApp();

  const renderActiveScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <OnboardingScreen />;
      case 'login':
        return <AuthScreen />;
      case 'otp':
        return <OtpVerificationScreen />;
      case 'products':
        return <MarketplaceProductsScreen />;
      case 'product_detail':
        return <ProductDetailScreen />;
      case 'services':
        return <MarketplaceServicesScreen />;
      case 'service_detail':
        return <ServiceDetailScreen />;
      case 'cart':
        return <CartScreen />;
      case 'checkout':
        return <CheckoutScreen />;
      case 'payment_status':
        return <PaymentStatusScreen />;
      case 'orders':
        return <OrdersScreen />;
      case 'bookings':
        return <BookingsScreen />;
      case 'rewards':
        return <RewardsDashboardScreen />;
      case 'levels':
        return <LevelProgressScreen />;
      case 'ranks':
        return <RankProgressScreen />;
      case 'cycles':
        return <CycleTrackerScreen />;
      case 'reward_ledger':
        return <RewardLedgerScreen />;
      case 'quarterly':
        return <QuarterlyActivityScreen />;
      case 'referral_share':
        return <ReferralShareScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'support':
        return <SupportLegalScreen />;
      default:
        return <MarketplaceProductsScreen />;
    }
  };

  const showNav = !['onboarding', 'login', 'otp'].includes(screen);

  return (
    <div className="device-viewport-wrapper">
      {/* Top Controls Bar for Desktop inspection */}
      <div className="device-top-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo-icon.png" alt="Noryvanta - Global" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, color: '#FFFFFF' }}>Noryvanta - Global</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
          <span style={{ color: '#00F0FF', fontWeight: 600 }}>Connect. Grow. Thrive.</span>
        </div>
        <button className="toggle-btn" onClick={() => setDeviceFrame(!deviceFrame)}>
          {deviceFrame ? <Monitor size={15} /> : <Smartphone size={15} />}
          <span>{deviceFrame ? 'Expand Fullscreen' : 'Mobile Phone Frame'}</span>
        </button>
      </div>

      {/* Mobile Smartphone Frame Container */}
      <div className={`mobile-phone-frame ${deviceFrame ? '' : 'full-width'}`}>
        {/* Dynamic Island & Status Bar */}
        <div className="phone-island-bar">
          <span>9:41</span>
          <div className="dynamic-island">
            <div className="island-camera-dot" />
          </div>
          <span>5G 100%</span>
        </div>

        {/* Content Area */}
        <main className="mobile-app-content">
          {showNav && <TopBar />}
          {renderActiveScreen()}
        </main>

        {/* Persistent Bottom Tab Navigation */}
        {showNav && <BottomNav />}
      </div>
    </div>
  );
};

export default App;
