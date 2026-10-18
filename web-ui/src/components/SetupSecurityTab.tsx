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
  Save,
  Download,
  Lock
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input } from './ui/Primitives';

export const SetupSecurityTab: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [hmacSecret, setHmacSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Production Cloud Function endpoint URL for sms-router-797c4
  const projectId = 'sms-router-797c4';
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
    setFeedback('Generated fresh random credentials. Click "Save Gateway Credentials" to persist.');
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
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
              <span>Device Pairing & Gateway Security</span>
              <Badge tone="success">HMAC-SHA256 Protected</Badge>
            </h2>
            <p className="text-xs text-content-muted">
              Cryptographic keys shared between your Android phone and the Firebase backend for authenticated digest verification.
            </p>
          </div>
        </div>
      </Card>

      {feedback && (
        <div className="p-4 bg-brand-subtle border border-brand-border rounded-xl text-xs text-brand font-semibold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="hover:opacity-80 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings Form */}
        <Card className="space-y-5">
          <CardHeader
            title="Gateway Credentials"
            subtitle="Keys verified by Cloud Functions ingestSms"
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerateKeys}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generate Random Keys</span>
              </Button>
            }
          />

          {loading ? (
            <div className="p-8 text-center text-content-muted text-xs font-medium">Loading credentials...</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-content-primary font-semibold flex justify-between">
                  <span>Webhook Ingest URL</span>
                  <span className="text-content-muted font-normal">Endpoint on Cloud Functions</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={ingestUrl}
                    onChange={(e) => setIngestUrl(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(ingestUrl, 'url')}
                    title="Copy URL"
                  >
                    {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-status-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-content-primary font-semibold flex justify-between">
                  <span>API Key (X-API-Key header)</span>
                  <span className="text-content-muted font-normal">Identifies client device</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="e.g. apk_849201f8..."
                    className="font-mono text-brand text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(apiKey, 'apiKey')}
                    title="Copy API Key"
                  >
                    {copiedKey === 'apiKey' ? <Check className="w-3.5 h-3.5 text-status-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-content-primary font-semibold flex justify-between">
                  <span>HMAC-SHA256 Secret (X-Signature)</span>
                  <span className="text-content-muted font-normal">Sign payload digest</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    required
                    value={hmacSecret}
                    onChange={(e) => setHmacSecret(e.target.value)}
                    placeholder="e.g. a7f8e3b2..."
                    className="font-mono text-status-success-text text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(hmacSecret, 'hmac')}
                    title="Copy HMAC Secret"
                  >
                    {copiedKey === 'hmac' ? <Check className="w-3.5 h-3.5 text-status-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                variant="brand"
                size="md"
                className="w-full"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving to Firestore...' : 'Save Gateway Credentials'}</span>
              </Button>
            </form>
          )}
        </Card>

        {/* Android App Setup Instructions */}
        <Card className="space-y-4">
          <CardHeader
            title="Android App Configuration Guide"
            subtitle="Step-by-step setup for Android device gateway"
          />

          <div className="space-y-3 text-content-secondary text-xs">
            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-content-primary block">Install Signed APK</strong>
                Download the APK signed with the permanent keystore from GitHub Releases and install on your device.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-content-primary block">Paste Gateway Credentials</strong>
                In the Android app, paste the Webhook Ingest URL, X-API-Key, and HMAC Secret from the left form into the Server Configuration card.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-content-primary block">Grant 4-Layer Permissions</strong>
                Allow `RECEIVE_SMS`, `READ_SMS`, `POST_NOTIFICATIONS`, and enable Notification Access for RCS chats & MIUI OTPs.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-content-primary block">Disable Battery Optimizations</strong>
                Click &quot;Disable Battery Optimizations&quot; and toggle &quot;Keep-Alive Foreground Engine&quot; to ensure 24/7 background operation.
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-status-warning-bg border border-status-warning-border rounded-xl space-y-1.5 text-status-warning-text">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <AlertCircle className="w-4 h-4" /> OEM-Specific Requirements (Xiaomi HyperOS / MIUI)
            </div>
            <p className="text-[11px] leading-relaxed">
              On Xiaomi HyperOS / MIUI, open Settings &gt; Apps &gt; SMS Router &gt; tap three dots &gt; <strong>Allow restricted settings</strong>, enable <strong>Autostart</strong>, and set Battery Saver to <strong>No Restrictions</strong>.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
