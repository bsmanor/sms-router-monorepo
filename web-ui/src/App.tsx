import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { ThemeProvider, useTheme, ThemePreference } from './context/ThemeContext';
import { LiveLogsTab } from './components/LiveLogsTab';
import { RulesManagerTab } from './components/RulesManagerTab';
import { SimulatorTab } from './components/SimulatorTab';
import { SetupSecurityTab } from './components/SetupSecurityTab';
import { ArchitectureTab } from './components/ArchitectureTab';
import { SmsManagerTab } from './components/sms-manager/SmsManagerTab';
import { ProfileMenuModal } from './components/ProfileMenuModal';
import { Card, Badge, Button } from './components/ui/Primitives';
import {
  Radio,
  Sliders,
  PlaySquare,
  KeyRound,
  LogOut,
  Smartphone,
  ExternalLink,
  Sun,
  Moon,
  Laptop,
  Layers,
  GitBranch,
  MessageSquare
} from 'lucide-react';

type Tab = 'manager' | 'logs' | 'rules' | 'simulator' | 'security' | 'architecture';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState<Tab>('manager');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign Out error:', err);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-content-muted">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Authenticating gateway session...</span>
        </div>
      </div>
    );
  }

  // Authentication Gate Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        {/* Top bar with theme toggle even on login gate */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center bg-surface border border-line-subtle rounded-xl p-1 gap-1">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                theme === 'light' ? 'bg-surface-subtle text-brand font-bold' : 'text-content-muted hover:text-content-primary'
              }`}
              title="Light Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                theme === 'dark' ? 'bg-surface-subtle text-brand font-bold' : 'text-content-muted hover:text-content-primary'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                theme === 'system' ? 'bg-surface-subtle text-brand font-bold' : 'text-content-muted hover:text-content-primary'
              }`}
              title="System Mode"
            >
              <Laptop className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Card className="max-w-md w-full text-center space-y-6 shadow-xl p-8">
          <div className="w-16 h-16 bg-brand-subtle text-brand border border-brand-border rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Radio className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
              SMS Router Gateway
            </h1>
            <p className="text-xs text-content-muted mt-2 leading-relaxed">
              Authenticate with your Google account to access real-time SMS logs, configure routing rules, and manage device pairing keys.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-status-danger-bg border border-status-danger-border rounded-xl text-xs text-status-danger-text text-left font-semibold">
              {authError}
            </div>
          )}

          <Button
            onClick={handleGoogleSignIn}
            variant="secondary"
            size="lg"
            className="w-full shadow-sm hover:border-line-focus"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign In with Google</span>
          </Button>

          <div className="pt-4 border-t border-line-subtle text-[11px] text-content-muted">
            Protected by Cloud Firestore Security Rules (Auth required)
          </div>
        </Card>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col transition-colors duration-200">
      {/* Desktop Navigation Header */}
      <header className="hidden md:block bg-surface/90 border-b border-line-subtle sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-subtle text-brand border border-brand-border rounded-xl flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-content-primary text-base tracking-tight block">
                  SMS Router Gateway
                </span>
                <Badge tone="brand">v2.0</Badge>
              </div>
              <span className="text-[11px] text-content-muted font-mono">
                Full-Stack Operations & Telemetry Console
              </span>
            </div>
          </div>

          {/* Quick APK Link, Theme Switcher & User Profile */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/bsmanor/sms-router-monorepo/releases"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex"
            >
              <Button variant="secondary" size="sm">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Download APK</span>
              </Button>
            </a>

            {/* Segmented Theme Switcher */}
            <div className="flex items-center bg-surface-subtle border border-line-subtle rounded-xl p-1 gap-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  theme === 'light' ? 'bg-surface text-brand shadow-sm font-bold' : 'text-content-muted hover:text-content-primary'
                }`}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  theme === 'dark' ? 'bg-surface text-brand shadow-sm font-bold' : 'text-content-muted hover:text-content-primary'
                }`}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  theme === 'system' ? 'bg-surface text-brand shadow-sm font-bold' : 'text-content-muted hover:text-content-primary'
                }`}
                title="System Mode"
              >
                <Laptop className="w-4 h-4" />
              </button>
            </div>

            {/* User Profile */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-content-primary">{user.displayName || user.email}</span>
              <span className="text-[10px] text-status-success-text font-mono font-semibold">Active Session</span>
            </div>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-8 h-8 rounded-full border border-line-subtle"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-xs font-bold">
                {(user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation Strip (Desktop/Tablet) */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-x-1 sm:space-x-4 border-t border-line-subtle overflow-x-auto">
          <button
            onClick={() => setCurrentTab('manager')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'manager'
                ? 'border-brand text-brand'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS Manager</span>
          </button>

          <button
            onClick={() => setCurrentTab('logs')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'logs'
                ? 'border-brand text-brand'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Live Telemetry & Logs</span>
          </button>

          <button
            onClick={() => setCurrentTab('rules')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'rules'
                ? 'border-brand text-brand'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Routing Rules</span>
          </button>

          <button
            onClick={() => setCurrentTab('simulator')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'simulator'
                ? 'border-brand text-brand'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <PlaySquare className="w-4 h-4" />
            <span>Rule & Regex Lab</span>
          </button>

          <button
            onClick={() => setCurrentTab('security')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'security'
                ? 'border-brand text-brand'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Device Pairing & Keys</span>
          </button>

          <button
            onClick={() => setCurrentTab('architecture')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'architecture'
                ? 'border-brand text-brand'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architecture & Ecosystem</span>
          </button>
        </div>
      </header>

      {/* Mobile Top Header (Sleek, minimal, uncluttered) */}
      <header className="md:hidden sticky top-0 z-40 bg-surface/95 border-b border-line-subtle backdrop-blur-md px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-subtle text-brand border border-brand-border rounded-xl flex items-center justify-center font-bold">
            <Radio className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm text-content-primary tracking-tight">
            SMS Router
          </span>
          <Badge tone="brand" size="sm">v2.0</Badge>
        </div>

        {/* Profile Avatar Button: Opens Settings & Features Menu */}
        <button
          onClick={() => setShowProfileMenu(true)}
          className="flex items-center gap-2 p-1 rounded-full border border-line-subtle bg-surface hover:bg-surface-subtle transition-all active:scale-95 shadow-sm"
          title="Open Profile & Settings"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Avatar'}
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-brand-subtle text-brand flex items-center justify-center text-xs font-bold">
              {(user.email || 'U')[0].toUpperCase()}
            </div>
          )}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 md:pb-8">
        {currentTab === 'manager' && <SmsManagerTab />}
        {currentTab === 'logs' && <LiveLogsTab />}
        {currentTab === 'rules' && <RulesManagerTab />}
        {currentTab === 'simulator' && <SimulatorTab />}
        {currentTab === 'security' && <SetupSecurityTab />}
        {currentTab === 'architecture' && <ArchitectureTab />}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Bulletproof fixed safe-area positioning) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 border-t border-line-subtle backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)'
        }}
      >
        <div className="flex items-center justify-around px-2 pt-1.5 pb-0.5 h-14">
          <button
            onClick={() => setCurrentTab('manager')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              currentTab === 'manager' ? 'text-brand font-bold' : 'text-content-muted hover:text-content-primary'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Messages</span>
          </button>

          <button
            onClick={() => setCurrentTab('logs')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              currentTab === 'logs' ? 'text-brand font-bold' : 'text-content-muted hover:text-content-primary'
            }`}
          >
            <Radio className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Telemetry</span>
          </button>

          <button
            onClick={() => setCurrentTab('rules')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              currentTab === 'rules' ? 'text-brand font-bold' : 'text-content-muted hover:text-content-primary'
            }`}
          >
            <Sliders className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Rules</span>
          </button>

          <button
            onClick={() => setCurrentTab('security')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              currentTab === 'security' ? 'text-brand font-bold' : 'text-content-muted hover:text-content-primary'
            }`}
          >
            <KeyRound className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Keys</span>
          </button>

          <button
            onClick={() => setCurrentTab('architecture')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              currentTab === 'architecture' ? 'text-brand font-bold' : 'text-content-muted hover:text-content-primary'
            }`}
          >
            <Layers className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Guide</span>
          </button>
        </div>
      </nav>

      {/* Profile & Settings Menu Modal */}
      <ProfileMenuModal
        isOpen={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Footer */}
      <footer className="border-t border-line-subtle bg-surface py-5 text-center text-xs text-content-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>SMS Router Gateway • Monorepo Architecture (Android + Firebase Functions v2 + React)</span>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/bsmanor/sms-router-monorepo"
              target="_blank"
              rel="noreferrer"
              className="hover:text-content-primary inline-flex items-center gap-1"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
            <span>•</span>
            <a
              href="https://sms-router.web.app"
              target="_blank"
              rel="noreferrer"
              className="hover:text-content-primary inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Production Site</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
