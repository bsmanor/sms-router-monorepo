import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SecuritySettings } from '../types';
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  AlertCircle,
  ExternalLink,
  Save
} from 'lucide-react';

export const SetupSecurityTab: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [hmacSecret, setHmacSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Suggested Cloud Function endpoint URL
  const projectId = 'sms-router-production';
  const defaultRegion = 'us-central1';
  const [ingestUrl, setIngestUrl] = useState(
    `https://${defaultRegion}-${projectId}.cloudfunctions.net/ingestSms`
  );

  useEffect(() => {
    const fetchSecurity = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'settings', 'security');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as SecuritySettings;
          setApiKey(data.apiKey || '');
          setHmacSecret(data.hmacSecret || '');
        }
      } catch (err: any) {
        console.error('Failed to load security settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurity();
  }, []);

  const generateRandomHex = (length: number) => {
    const chars = '0123456789abcdef';
    let result = '';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  };

  const handleGenerateKeys = () => {
    const newApiKey = 'apk_' + generateRandomHex(32);
    const newHmacSecret = generateRandomHex(64);
    setApiKey(newApiKey);
    setHmacSecret(newHmacSecret);
    setFeedback('Generated fresh random credentials. Click "Save Security Settings" to persist.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !hmacSecret) {
      alert('API Key and HMAC Secret cannot be empty');
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const docRef = doc(db, 'settings', 'security');
      await setDoc(docRef, {
        apiKey: apiKey.trim(),
        hmacSecret: hmacSecret.trim(),
        updatedAt: Date.now()
      });
      setFeedback('Security settings persisted to Firestore! Cloud Functions will verify incoming requests using these keys.');
    } catch (err: any) {
      setFeedback(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sky-400" />
          <span>Device Pairing & Gateway Security</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographic keys shared between your Android phone and the Firebase backend for authenticated HMAC-SHA256 verification.
        </p>
      </div>

      {feedback && (
        <div className="p-4 bg-sky-950/80 border border-sky-800 rounded-xl text-xs text-sky-300 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-sky-400 hover:text-white font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings Form */}
        <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-400" />
              <span>Gateway Credentials</span>
            </h3>
            <button
              type="button"
              onClick={handleGenerateKeys}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generate Random Keys
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading credentials...</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold flex justify-between">
                  <span>Webhook Ingest URL</span>
                  <span className="text-slate-500 font-normal">Endpoint on Cloud Functions</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={ingestUrl}
                    onChange={(e) => setIngestUrl(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ingestUrl, 'url')}
                    className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1"
                    title="Copy URL"
                  >
                    {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold flex justify-between">
                  <span>API Key (X-API-Key header)</span>
                  <span className="text-slate-500 font-normal">Identifies client</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="e.g. apk_849201f8..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sky-300 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(apiKey, 'apiKey')}
                    className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1"
                    title="Copy API Key"
                  >
                    {copiedKey === 'apiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold flex justify-between">
                  <span>HMAC-SHA256 Secret (X-Signature)</span>
                  <span className="text-slate-500 font-normal">Sign payload digest</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={hmacSecret}
                    onChange={(e) => setHmacSecret(e.target.value)}
                    placeholder="e.g. a7f8e3b2..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(hmacSecret, 'hmac')}
                    className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1"
                    title="Copy HMAC Secret"
                  >
                    {copiedKey === 'hmac' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-sky-900/30"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving to Firestore...' : 'Save Security Settings'}
              </button>
            </form>
          )}
        </div>

        {/* Android App Setup Instructions */}
        <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span>Android App Configuration Guide</span>
          </h3>

          <div className="space-y-3 text-slate-300">
            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-white block">Install Debug APK</strong>
                Download the debug APK compiled by GitHub Actions from the workflow artifact tab and install on your device.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-white block">Copy-Paste Gateway Config</strong>
                In the Android app, paste the Webhook Ingest URL, X-API-Key, and HMAC Secret from the left form into the Server Configuration card.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-white block">Grant SMS & Notification Permissions</strong>
                Tap &quot;Request Permissions&quot; to allow `RECEIVE_SMS` and `POST_NOTIFICATIONS`.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-white block">Disable Battery Optimizations</strong>
                Click &quot;Disable Battery Optimizations&quot; and toggle &quot;Keep-Alive Foreground Service&quot; to ensure reliable 24/7 background operation.
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl space-y-1.5 text-amber-200">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-400">
              <AlertCircle className="w-4 h-4" /> OEM-Specific Requirements (Xiaomi / Samsung / Oppo)
            </div>
            <p className="text-[11px] leading-relaxed text-amber-300">
              On Xiaomi HyperOS / MIUI, you must also open Settings &gt; Apps &gt; SMS Router &gt; Enable <strong>Autostart</strong> and set Battery Saver to <strong>No Restrictions</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
