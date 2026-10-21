import React from 'react';
import { User } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { Button, Badge } from './ui/Primitives';
import {
  Sun,
  Moon,
  Laptop,
  Smartphone,
  LogOut,
  X,
  ExternalLink,
  GitBranch,
  ShieldCheck,
  Radio,
  Download
} from 'lucide-react';

interface ProfileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSignOut: () => void;
}

export const ProfileMenuModal: React.FC<ProfileMenuModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut
}) => {
  const { theme, setTheme } = useTheme();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full sm:max-w-md bg-surface border-t sm:border border-line-subtle rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Grab bar for mobile */}
        <div className="w-12 h-1 bg-line-subtle rounded-full mx-auto sm:hidden" />

        {/* Header: User Profile Info */}
        <div className="flex items-start justify-between border-b border-line-subtle pb-4">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-12 h-12 rounded-full border border-line-subtle shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-base font-bold shadow-sm">
                {(user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-content-primary">
                  {user.displayName || 'SMS Router User'}
                </h3>
                <Badge tone="success">Active</Badge>
              </div>
              <p className="text-xs text-content-muted font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-subtle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Preference Segmented Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-content-primary flex justify-between">
            <span>Theme Preference</span>
            <span className="text-content-muted font-normal capitalize">{theme} Mode</span>
          </label>
          <div className="grid grid-cols-3 gap-2 bg-surface-subtle border border-line-subtle rounded-xl p-1.5">
            <button
              onClick={() => setTheme('light')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                theme === 'light'
                  ? 'bg-surface text-brand shadow-sm font-bold'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                theme === 'dark'
                  ? 'bg-surface text-brand shadow-sm font-bold'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                theme === 'system'
                  ? 'bg-surface text-brand shadow-sm font-bold'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Android Gateway APK Download Card */}
        <div className="p-3.5 bg-surface-subtle border border-line-subtle rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-content-primary block">Android Gateway APK</span>
              <span className="text-[11px] text-content-muted">v2.0.1 • Permanent keystore signed</span>
            </div>
          </div>
          <a
            href="https://github.com/bsmanor/sms-router-monorepo/releases/latest"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="secondary" size="sm" className="gap-1">
              <Download className="w-3.5 h-3.5" />
              <span>Get APK</span>
            </Button>
          </a>
        </div>

        {/* Project Links & System Info */}
        <div className="space-y-2 pt-1 border-t border-line-subtle text-xs">
          <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider block">
            System & Ecosystem
          </span>
          <div className="space-y-1">
            <a
              href="https://github.com/bsmanor/sms-router-monorepo"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-subtle text-content-secondary hover:text-content-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-content-muted" />
                <span>GitHub Repository</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-content-muted" />
            </a>

            <div className="p-2.5 rounded-xl bg-surface-subtle/50 text-[11px] text-content-muted flex items-center justify-between">
              <span>Firebase Project</span>
              <span className="font-mono text-content-primary">sms-router-797c4 (us-central1)</span>
            </div>
          </div>
        </div>

        {/* Sign Out Action */}
        <div className="pt-2 border-t border-line-subtle">
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
