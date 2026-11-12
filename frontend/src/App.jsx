import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AppShell } from './components/layout/AppShell';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { ReviewExtracted } from './pages/ReviewExtracted';
import { Report } from './pages/Report';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';
import { Spinner } from './components/common/Spinner';

export function App() {
  const { isAuthenticated, isRegisteredUser, isGuest, isLoading } = useAuth();

  // Navigation state
  const [currentScreen, setCurrentScreen] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.replace('#', '') || 'home';
    }
    return 'home';
  });

  const [activeScanData, setActiveScanData] = useState(null);
  const [activeReportData, setActiveReportData] = useState(null);
  const [activeReportId, setActiveReportId] = useState(null);

  // Sync with browser hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentScreen(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (screen, params = {}) => {
    if (params.scanData) setActiveScanData(params.scanData);
    if (params.reportData) setActiveReportData(params.reportData);
    if (params.reportId) setActiveReportId(params.reportId);

    setCurrentScreen(screen);
    window.location.hash = screen;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <Spinner size="lg" label="Initializing ScanWise..." />
      </div>
    );
  }

  // If completely unauthenticated, show Welcome or Login screen
  if (!isAuthenticated) {
    if (currentScreen === 'login') {
      return (
        <Login
          onNavigate={(scr) => navigateTo(scr)}
          onLoginSuccess={() => navigateTo('home')}
        />
      );
    }
    return (
      <Welcome
        onNavigate={(scr) => navigateTo(scr)}
      />
    );
  }

  // Active Tab for AppShell (maps scan -> home or special)
  const shellTab = ['home', 'scan', 'history', 'profile'].includes(currentScreen)
    ? currentScreen
    : 'home';

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
      case 'scan':
        return (
          <Home
            onNavigate={(scr) => navigateTo(scr)}
            onStartScanReview={(extracted) => navigateTo('review', { scanData: extracted })}
          />
        );

      case 'review':
        return (
          <ReviewExtracted
            extractedData={activeScanData}
            onNavigate={(scr) => navigateTo(scr)}
            onAnalysisSuccess={(report) => navigateTo('report', { reportData: report })}
          />
        );

      case 'report':
        return (
          <Report
            report={activeReportData}
            reportId={activeReportId}
            onNavigate={(scr) => navigateTo(scr)}
          />
        );

      case 'history':
        return (
          <History
            onNavigate={(scr) => navigateTo(scr)}
            onSelectReport={(id) => navigateTo('report', { reportId: id, reportData: null })}
          />
        );

      case 'profile':
        return (
          <Profile
            onNavigate={(scr) => navigateTo(scr)}
          />
        );

      case 'onboarding':
        return (
          <Onboarding
            onComplete={() => navigateTo('home')}
          />
        );

      default:
        return <NotFound onNavigate={(scr) => navigateTo(scr)} />;
    }
  };

  return (
    <AppShell
      activeTab={shellTab}
      onTabChange={(tabId) => navigateTo(tabId)}
      onLoginClick={() => navigateTo('login')}
    >
      {renderScreen()}
    </AppShell>
  );
}

export default App;

