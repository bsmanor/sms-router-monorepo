import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { LiveLogsTab } from './components/LiveLogsTab';
import { RulesManagerTab } from './components/RulesManagerTab';
import { SimulatorTab } from './components/SimulatorTab';
import { SetupSecurityTab } from './components/SetupSecurityTab';
import {
  Radio,
  Sliders,
  PlaySquare,
  KeyRound,
  LogOut,
  LogIn,
  Shield,
  Smartphone,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

type Tab = 'logs' | 'rules' | 'simulator' | 'security';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState<Tab>('logs');
  const [authError, setAuthError] = useState<string | null>(null);

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Authenticating gateway session...</span>
        </div>
      </div>
    );
  }

  // Authentication Gate Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-sky-950 text-sky-400 border border-sky-800 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-sky-950/50">
            <Radio className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              SMS Router Gateway
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Authenticate with your Google account to access incoming SMS logs, configure routing rules, and manage device pairing keys.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 text-left">
              {authError}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg"
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
          </button>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Protected by Cloud Firestore Security Rules (Auth required)
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Navigation Bar */}
      <header className="bg-slate-950/80 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-950 text-sky-400 border border-sky-800 rounded-xl flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">
                SMS Router Gateway
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Production Dashboard v1.0
              </span>
            </div>
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{user.displayName || user.email}</span>
              <span className="text-[10px] text-emerald-400 font-mono">Authenticated</span>
            </div>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-8 h-8 rounded-full border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400">
                {(user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 border-t border-slate-900/50">
          <button
            onClick={() => setCurrentTab('logs')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              currentTab === 'logs'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Live Logs</span>
          </button>

          <button
            onClick={() => setCurrentTab('rules')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              currentTab === 'rules'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Routing Rules</span>
          </button>

          <button
            onClick={() => setCurrentTab('simulator')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              currentTab === 'simulator'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlaySquare className="w-4 h-4" />
            <span>Rule Simulator</span>
          </button>

          <button
            onClick={() => setCurrentTab('security')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              currentTab === 'security'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Device Setup & Keys</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'logs' && <LiveLogsTab />}
        {currentTab === 'rules' && <RulesManagerTab />}
        {currentTab === 'simulator' && <SimulatorTab />}
        {currentTab === 'security' && <SetupSecurityTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500">
        SMS Router Gateway • Monorepo Architecture with Jetpack Compose & Firebase Functions v2
      </footer>
    </div>
  );
};

export default App;
