import React, { useState } from 'react';
import {
  Layers,
  Smartphone,
  Server,
  Globe,
  GitBranch,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Database,
  Terminal,
  Cpu,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, CodeBlock } from './ui/Primitives';

export const ArchitectureTab: React.FC = () => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const projectResources = [
    {
      title: 'GitHub Monorepo Repository',
      desc: 'Complete source code for /android-app, /functions, /web-ui, and CI/CD pipelines.',
      url: 'https://github.com/bsmanor/sms-router-monorepo',
      badge: 'Public Source'
    },
    {
      title: 'GitHub APK Releases (Auto-Updater)',
      desc: 'Versioned APK releases signed with persistent PKCS12 keystore for in-place app updates.',
      url: 'https://github.com/bsmanor/sms-router-monorepo/releases',
      badge: 'Release Center'
    },
    {
      title: 'Firebase Project Console',
      desc: 'Project: sms-router-797c4 (us-central1). Houses Cloud Functions v2, Firestore, and Hosting.',
      url: 'https://console.firebase.google.com/project/sms-router-797c4/overview',
      badge: 'GCP / Firebase'
    },
    {
      title: 'Firebase Hosting Endpoint',
      desc: 'Production Web UI deployed globally on CDN with Google Authentication gate.',
      url: 'https://sms-router.web.app',
      badge: 'Live Dashboard'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <Card className="border-line-subtle bg-gradient-to-br from-surface to-surface-subtle">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone="brand">System Blueprint</Badge>
              <Badge tone="info">Monorepo v2.0</Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-content-primary">
              SMS Router Gateway Architecture & Ecosystem
            </h2>
            <p className="text-sm text-content-secondary max-w-2xl leading-relaxed">
              SMS Router Gateway transforms an Android physical device into an ultra-reliable, cryptographically signed cellular & RCS webhook dispatch hub. Below is how the monorepo, capture engine, serverless backend, and web operations console interconnect.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <a
              href="https://github.com/bsmanor/sms-router-monorepo"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" size="md">
                <GitBranch className="w-4 h-4" />
                <span>GitHub Repo</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Button>
            </a>
            <a
              href="https://github.com/bsmanor/sms-router-monorepo/releases"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="brand" size="md">
                <Smartphone className="w-4 h-4" />
                <span>Latest APK</span>
              </Button>
            </a>
          </div>
        </div>
      </Card>

      {/* 5-Stage Data Flow Pipeline */}
      <Card>
        <CardHeader
          title="End-to-End Ingestion & Dispatch Pipeline"
          subtitle="How cellular and IP messages flow securely from SIM card to remote webhooks with millisecond latency"
        />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          {/* Stage 1 */}
          <div className="bg-surface-subtle border border-line-subtle rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-surface border border-line-subtle flex items-center justify-center text-brand font-bold text-xs">
                01
              </div>
              <h4 className="font-bold text-sm text-content-primary">Incoming SMS / RCS</h4>
              <p className="text-xs text-content-muted leading-relaxed">
                Cellular SMS, HyperOS-protected OTP, or Google Messages RCS Chat arrives on the phone.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] font-mono text-content-secondary">
              Layer: Baseband / IP
            </div>
          </div>

          {/* Stage 2 */}
          <div className="bg-surface-subtle border border-line-subtle rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-surface border border-line-subtle flex items-center justify-center text-brand font-bold text-xs">
                02
              </div>
              <h4 className="font-bold text-sm text-content-primary">4-Layer Interceptor</h4>
              <p className="text-xs text-content-muted leading-relaxed">
                Broadcast Receiver, ContentObserver, 4s Inbox Poller, or NotificationListener intercepts the event with 60s deduplication.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] font-mono text-content-secondary">
              Layer: Kotlin / Android
            </div>
          </div>

          {/* Stage 3 */}
          <div className="bg-surface-subtle border border-line-subtle rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-surface border border-line-subtle flex items-center justify-center text-brand font-bold text-xs">
                03
              </div>
              <h4 className="font-bold text-sm text-content-primary">HMAC-SHA256 Signing</h4>
              <p className="text-xs text-content-muted leading-relaxed">
                Direct OkHttp POST signs the payload digest with cryptographic secret and injects X-Signature + X-API-Key headers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] font-mono text-content-secondary">
              Layer: Direct HTTP / TLS
            </div>
          </div>

          {/* Stage 4 */}
          <div className="bg-surface-subtle border border-line-subtle rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-surface border border-line-subtle flex items-center justify-center text-brand font-bold text-xs">
                04
              </div>
              <h4 className="font-bold text-sm text-content-primary">Cloud Function v2</h4>
              <p className="text-xs text-content-muted leading-relaxed">
                Node.js 20 ingestSms function verifies HMAC signature in constant time and evaluates sequential priority rules.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] font-mono text-content-secondary">
              Layer: Cloud Functions v2
            </div>
          </div>

          {/* Stage 5 */}
          <div className="bg-surface-subtle border border-line-subtle rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-surface border border-line-subtle flex items-center justify-center text-brand font-bold text-xs">
                05
              </div>
              <h4 className="font-bold text-sm text-content-primary">Webhook & Audit Log</h4>
              <p className="text-xs text-content-muted leading-relaxed">
                Extracts regex tokens, renders custom JSON payload, dispatches to destination URLs, and records full trace in Firestore.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] font-mono text-content-secondary">
              Layer: Firestore & Webhooks
            </div>
          </div>
        </div>
      </Card>

      {/* Monorepo Directory Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-content-primary text-base">/android-app</h3>
            </div>
            <p className="text-xs text-content-secondary mb-4 leading-relaxed">
              Native Android application built with Kotlin, Jetpack Compose, Material 3, and WorkManager.
            </p>
            <div className="space-y-1.5 text-xs font-mono text-content-muted">
              <div>• SmsIngestCoordinator (Multi-layer SSOT)</div>
              <div>• KeepAliveService (Dynamic Foreground Engine)</div>
              <div>• SmsNotificationListener (RCS & OTP)</div>
              <div>• UpdateManager (In-place self updater)</div>
              <div>• Persistent PKCS12 signing keystore</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] text-content-muted">
            Target SDK: 34 • Min SDK: 26 • Java 17
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-content-primary text-base">/functions</h3>
            </div>
            <p className="text-xs text-content-secondary mb-4 leading-relaxed">
              Google Cloud Functions v2 serverless microservices backend running on Node.js 20 in us-central1.
            </p>
            <div className="space-y-1.5 text-xs font-mono text-content-muted">
              <div>• ingestSms (High-throughput HTTP endpoint)</div>
              <div>• simulateRules (Callable rule evaluation lab)</div>
              <div>• replayWebhook (1-click past log replayer)</div>
              <div>• Constant-time HMAC-SHA256 verification</div>
              <div>• Mustache-style payload template renderer</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] text-content-muted">
            Node.js 20 • TypeScript • Cloud Functions v2
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-content-primary text-base">/web-ui</h3>
            </div>
            <p className="text-xs text-content-secondary mb-4 leading-relaxed">
              Full-featured operations & telemetry console built with React 18, Vite, and Tailwind CSS.
            </p>
            <div className="space-y-1.5 text-xs font-mono text-content-muted">
              <div>• Real-time Firestore snapshot listeners</div>
              <div>• Unified SSOT theme (Light / Dark / System)</div>
              <div>• Visual rule & regex pipeline editor</div>
              <div>• Device pairing key generator & manager</div>
              <div>• Google Identity OAuth authentication gate</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] text-content-muted">
            React 18 • Vite 5 • Tailwind CSS • Firebase Web v10
          </div>
        </Card>
      </div>

      {/* Infrastructure & Ecosystem Resources */}
      <Card>
        <CardHeader
          title="Monorepo Infrastructure & Ecosystem Directory"
          subtitle="Quick access to live endpoints, source repositories, and deployment consoles"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {projectResources.map((res, idx) => (
            <div
              key={idx}
              className="bg-surface-subtle border border-line-subtle rounded-xl p-4 flex flex-col justify-between hover:border-line-focus transition-colors"
            >
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-sm text-content-primary">{res.title}</span>
                  <Badge tone="info">{res.badge}</Badge>
                </div>
                <p className="text-xs text-content-muted leading-relaxed mb-3">
                  {res.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-line-subtle">
                <span className="text-[11px] font-mono text-content-secondary truncate max-w-[240px]">
                  {res.url}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(res.url, res.title)}
                    title="Copy URL"
                  >
                    {copiedLink === res.title ? (
                      <Check className="w-3.5 h-3.5 text-status-success-text" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <a href={res.url} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm">
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
