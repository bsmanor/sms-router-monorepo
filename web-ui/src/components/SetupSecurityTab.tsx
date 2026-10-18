import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Lock,
  ExternalLink,
  Info,
  Smartphone,
  Terminal,
  Database,
  AlertCircle,
  X
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input } from './ui/Primitives';

interface SecurityStatusResponse {
  isConfigured: boolean;
  apiKeyMasked: string | null;
  updatedAt: number | null;
}

interface RotateCredentialsResponse {
  success: boolean;
  apiKey: string;
  hmacSecret: string;
  updatedAt: number;
}

export const SetupSecurityTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const [isRotating, setIsRotating] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [oneTimeCreds, setOneTimeCreds] = useState<RotateCredentialsResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Production Cloud Function endpoint URL for sms-router-797c4
  const projectId = 'sms-router-797c4';
  const defaultRegion = 'us-central1';
  const ingestUrl = `https://${defaultRegion}-${projectId}.cloudfunctions.net/ingestSms`;

  const fetchSecurityStatus = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const getStatusFn = httpsCallable<void, SecurityStatusResponse>(
        functions,
        'getGatewaySecurityStatus'
      );
      const res = await getStatusFn();
      setIsConfigured(res.data.isConfigured);
      setApiKeyMasked(res.data.apiKeyMasked);
      setUpdatedAt(res.data.updatedAt);
    } catch (err: any) {
      console.error('Failed to load gateway security status:', err);
      setErrorMessage(err.message || 'Failed to connect to backend security status endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
  }, []);

  const handleRotateCredentials = async () => {
    setIsRotating(true);
    setErrorMessage(null);
    try {
      const rotateFn = httpsCallable<void, RotateCredentialsResponse>(
        functions,
        'rotateGatewayCredentials'
      );
      const res = await rotateFn();
      setOneTimeCreds(res.data);
      setShowRotateConfirm(false);

      // Refresh masked status
      setIsConfigured(true);
      const key = res.data.apiKey;
      const masked = key.length > 8
        ? `${key.substring(0, 6)}••••••••••••••••${key.substring(key.length - 4)}`
        : '••••••••••••';
      setApiKeyMasked(masked);
      setUpdatedAt(res.data.updatedAt);
    } catch (err: any) {
      console.error('Failed to rotate credentials:', err);
      setErrorMessage('Failed to rotate credentials: ' + (err.message || 'Internal error'));
    } finally {
      setIsRotating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const copyAllCredentials = (apiKey: string, hmacSecret: string) => {
    const formatted = [
      `SMS ROUTER GATEWAY CONFIGURATION`,
      `===============================`,
      `Webhook Ingest URL: ${ingestUrl}`,
      `API Key (X-API-Key): ${apiKey}`,
      `HMAC Secret (X-Signature): ${hmacSecret}`,
      `Generated At: ${new Date().toISOString()}`
    ].join('\n');
    copyToClipboard(formatted, 'all');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Security Overview */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-content-primary">
                  Gateway Security & Device Pairing
                </h2>
                <Badge tone="success">HMAC-SHA256 Authenticated</Badge>
                <Badge tone="brand">Zero-Trust Frontend</Badge>
              </div>
              <p className="text-xs text-content-muted mt-0.5">
                Cryptographic keys are write-only. Direct client reads from Firestore are blocked; secrets are verified strictly in backend Cloud Functions.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={() => setShowRotateConfirm(true)}
              disabled={isRotating}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
              <span>Rotate Credentials</span>
            </Button>
          </div>
        </div>
      </Card>

      {errorMessage && (
        <div className="p-4 bg-status-danger-bg border border-status-danger-border rounded-xl text-xs text-status-danger-text font-semibold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="hover:opacity-80 font-bold ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateway Security Status Card */}
        <Card className="space-y-5">
          <CardHeader
            title="Gateway Credentials"
            subtitle="Server-enforced authentication status"
            action={
              <Badge tone={isConfigured ? 'success' : 'warning'}>
                {isConfigured ? 'Active & Configured' : 'Needs Configuration'}
              </Badge>
            }
          />

          {loading ? (
            <div className="p-8 text-center text-content-muted text-xs font-medium flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand" />
              <span>Checking cryptographic gateway status...</span>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Webhook Ingest URL */}
              <div className="space-y-1">
                <label className="text-content-primary font-semibold flex justify-between">
                  <span>Webhook Ingest URL</span>
                  <span className="text-content-muted font-normal">HTTP POST endpoint</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    readOnly
                    value={ingestUrl}
                    className="font-mono text-xs select-all bg-surface"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(ingestUrl, 'url')}
                    title="Copy URL"
                  >
                    {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-status-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* API Key (Masked) */}
              <div className="space-y-1">
                <label className="text-content-primary font-semibold flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-content-muted" />
                    <span>API Key (Client ID)</span>
                  </span>
                  <span className="text-[10px] text-content-muted">Header: X-API-Key</span>
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="text"
                    readOnly
                    value={apiKeyMasked || '••••••••••••••••••••••••••••••••'}
                    className="font-mono text-xs text-brand bg-surface select-none"
                  />
                  <span className="px-2 py-1 bg-surface-subtle border border-line-subtle rounded-lg text-[10px] text-content-muted shrink-0 flex items-center gap-1 font-mono">
                    <Lock className="w-3 h-3" /> Masked
                  </span>
                </div>
                <p className="text-[11px] text-content-muted">
                  Used by Cloud Functions to look up active client routing configurations.
                </p>
              </div>

              {/* HMAC-SHA256 Secret (Write-Only) */}
              <div className="space-y-1">
                <label className="text-content-primary font-semibold flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-content-muted" />
                    <span>HMAC-SHA256 Secret</span>
                  </span>
                  <span className="text-[10px] text-content-muted">Header: X-Signature</span>
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="text"
                    readOnly
                    value="••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                    className="font-mono text-xs text-content-muted bg-surface select-none"
                  />
                  <span className="px-2 py-1 bg-brand-subtle border border-brand-border rounded-lg text-[10px] text-brand font-semibold shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Write-Only
                  </span>
                </div>
                <p className="text-[11px] text-content-muted">
                  256-bit symmetric signing secret. Kept strictly on the backend to prevent credential theft.
                </p>
              </div>

              {/* Metadata */}
              <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-[11px] text-content-muted">
                <span>Last credential update:</span>
                <span className="font-mono font-medium text-content-primary">
                  {updatedAt ? new Date(updatedAt).toLocaleString() : 'Initial Deployment'}
                </span>
              </div>

              {/* Rotation CTA */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowRotateConfirm(true)}
                  className="w-full justify-center"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rotate Gateway Credentials</span>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Android Configuration Guide Card */}
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
                Download the latest signed APK (v2.0.1+) from GitHub Releases and install on your gateway device.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-content-primary block">Paste Gateway Credentials</strong>
                In the Android app under the <strong>Config</strong> tab, enter the Webhook Ingest URL, API Key, and HMAC Secret.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-content-primary block">Grant 4-Layer Permissions</strong>
                Allow <code>RECEIVE_SMS</code>, <code>READ_SMS</code>, <code>POST_NOTIFICATIONS</code>, and enable Notification Listener for RCS & OEM OTPs.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-brand-subtle text-brand border border-brand-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-content-primary block">Disable Battery Optimizations</strong>
                Click &quot;Disable Battery Optimizations&quot; and toggle &quot;Keep-Alive Foreground Engine&quot; to guarantee 24/7 background operation.
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-status-warning-bg border border-status-warning-border rounded-xl space-y-1.5 text-status-warning-text">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <AlertCircle className="w-4 h-4" /> OEM-Specific Requirements (Xiaomi HyperOS / MIUI)
            </div>
            <p className="text-[11px] leading-relaxed">
              On Xiaomi HyperOS / MIUI: open Settings &gt; Apps &gt; SMS Router &gt; tap three dots &gt; <strong>Allow restricted settings</strong>, enable <strong>Autostart</strong>, and set Battery Saver to <strong>No Restrictions</strong>.
            </p>
          </div>
        </Card>
      </div>

      {/* Explanatory Guide: How to Fetch/Retrieve Credentials When Needed */}
      <Card className="space-y-4">
        <CardHeader
          title="Security Architecture: How Credentials Work & How to Retrieve Them"
          subtitle="Understanding the Zero-Trust write-only model and credentials lifecycle"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Card 1: How to Retrieve Creds When Needed */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-line-subtle space-y-3">
            <div className="flex items-center gap-2 font-bold text-content-primary text-sm">
              <Key className="w-4 h-4 text-brand" />
              <span>How to Fetch or Provision Credentials</span>
            </div>
            <div className="space-y-2 text-content-secondary leading-relaxed">
              <p>
                <strong className="text-content-primary">1. Provisioning a New Device / Reset:</strong><br />
                To obtain credentials for a new phone, click <span className="font-semibold text-brand">Rotate Gateway Credentials</span> above. The backend creates a 256-bit cryptographically secure key pair and displays the raw keys <em>once</em> in a secure copy modal.
              </p>
              <p>
                <strong className="text-content-primary">2. Why Keys Are Write-Only (Zero-Trust):</strong><br />
                Following industry standards (like AWS IAM, GitHub tokens, and Stripe webhooks), HMAC signing secrets are write-only. Once set, the server never sends the raw secret to web browsers. This eliminates the risk of browser extensions, XSS vulnerabilities, or compromised devices stealing your signing key.
              </p>
              <p>
                <strong className="text-content-primary">3. Active Gateway Phones:</strong><br />
                Connected Android devices store their paired keys in private hardware-backed sandbox storage. If your gateway is already running, you do not need to retrieve or touch the keys again.
              </p>
              <p>
                <strong className="text-content-primary">4. Admin Direct Inspection (GCP / Firebase Console):</strong><br />
                If you are the Firebase project owner and need to inspect the current secret without rotating, authorized administrators can inspect the document in the Firebase Console:
              </p>
              <div className="p-2.5 bg-surface rounded-lg border border-line-subtle font-mono text-[11px] text-content-primary space-y-1">
                <div className="text-content-muted"># View via Firebase Console:</div>
                <div>Firestore Database &gt; settings &gt; security</div>
                <div className="text-content-muted pt-1"># Or via Google Cloud CLI:</div>
                <div className="text-brand">gcloud firestore documents get settings/security</div>
              </div>
            </div>
          </div>

          {/* Card 2: Cryptographic Verification Mechanics */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-line-subtle space-y-3">
            <div className="flex items-center gap-2 font-bold text-content-primary text-sm">
              <ShieldCheck className="w-4 h-4 text-status-success-text" />
              <span>HMAC-SHA256 Verification Mechanics</span>
            </div>
            <div className="space-y-2 text-content-secondary leading-relaxed">
              <p>
                <strong className="text-content-primary">Constant-Time Timing-Safe Validation:</strong><br />
                When an SMS arrives, the Android app generates an SHA-256 HMAC digest of the JSON body and sends it in the <code>X-Signature</code> header. Cloud Function <code>ingestSms</code> computes the HMAC independently and validates it using <code>crypto.timingSafeEqual</code> in constant time to thwart side-channel timing attacks.
              </p>
              <p>
                <strong className="text-content-primary">Firestore Security Rules Enforcement:</strong><br />
                Direct browser access to <code>/settings/{'{doc}'}</code> is permanently blocked by security rules:
              </p>
              <div className="p-2 bg-surface rounded-lg border border-line-subtle font-mono text-[11px] text-content-primary">
                match /settings/{'{doc}'} &#123; allow read, write: if false; &#125;
              </div>
              <p className="text-[11px] text-content-muted">
                Only privileged Cloud Functions using the Firebase Admin SDK can access the secret key, completely shielding your credentials from client-side exfiltration.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal: Rotate Credentials */}
      {showRotateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface border border-line-subtle rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-status-warning-bg text-status-warning-text border border-status-warning-border flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-content-primary">Rotate Gateway Credentials?</h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Rotating credentials immediately generates a new API Key and HMAC Secret on the server.
                </p>
              </div>
            </div>

            <div className="p-3 bg-status-warning-bg/50 border border-status-warning-border/50 rounded-xl text-[11px] text-status-warning-text leading-relaxed">
              <strong>Notice:</strong> Any active Android phones forwarding SMS will fail signature verification until updated with the new credentials.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowRotateConfirm(false)}
                disabled={isRotating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="brand"
                size="md"
                onClick={handleRotateCredentials}
                disabled={isRotating}
              >
                {isRotating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isRotating ? 'Rotating...' : 'Confirm & Rotate'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Credentials Reveal Modal */}
      {oneTimeCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface border border-line-subtle rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-success-bg text-status-success-text border border-status-success-border flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-content-primary">
                    New Gateway Credentials Generated
                  </h3>
                  <p className="text-xs text-status-warning-text font-medium flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Copy these credentials now. The HMAC Secret will never be displayed again.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOneTimeCreds(null)}
                className="text-content-muted hover:text-content-primary p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* URL */}
              <div className="space-y-1">
                <label className="text-content-muted text-[11px] font-semibold">Webhook Ingest URL</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={ingestUrl}
                    className="font-mono text-xs select-all bg-surface"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(ingestUrl, 'modal_url')}
                  >
                    {copiedField === 'modal_url' ? <Check className="w-3.5 h-3.5 text-status-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="text-content-muted text-[11px] font-semibold">API Key (X-API-Key)</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={oneTimeCreds.apiKey}
                    className="font-mono text-xs text-brand select-all bg-surface"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(oneTimeCreds.apiKey, 'modal_api')}
                  >
                    {copiedField === 'modal_api' ? <Check className="w-3.5 h-3.5 text-status-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* HMAC Secret */}
              <div className="space-y-1">
                <label className="text-content-muted text-[11px] font-semibold">HMAC-SHA256 Secret (X-Signature)</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={oneTimeCreds.hmacSecret}
                    className="font-mono text-xs text-status-success-text select-all bg-surface"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(oneTimeCreds.hmacSecret, 'modal_hmac')}
                  >
                    {copiedField === 'modal_hmac' ? <Check className="w-3.5 h-3.5 text-status-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => copyAllCredentials(oneTimeCreds.apiKey, oneTimeCreds.hmacSecret)}
                className="w-full sm:w-auto"
              >
                {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-status-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'all' ? 'Copied All to Clipboard!' : 'Copy All Credentials'}</span>
              </Button>
              <Button
                type="button"
                variant="brand"
                size="md"
                onClick={() => setOneTimeCreds(null)}
                className="w-full sm:w-auto"
              >
                <span>I Have Saved These Credentials</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
