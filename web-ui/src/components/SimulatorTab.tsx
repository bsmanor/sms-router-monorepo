import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
  Play,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Terminal,
  Send
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input, Textarea } from './ui/Primitives';

interface SimulationItem {
  ruleId: string;
  ruleName: string;
  matches: boolean;
  matchReasons: string[];
  extracted: Record<string, string>;
  renderedPayload: string;
  dispatchResult?: {
    status: number;
    body: string;
    latencyMs: number;
    success: boolean;
    error: string | null;
  };
}

export const SimulatorTab: React.FC = () => {
  const [sender, setSender] = useState('+1 (555) 321-9876');
  const [body, setBody] = useState(
    'Your verification code for SecurePay is 482910. Valid for 10 minutes. Do not share.'
  );
  const [liveDispatch, setLiveDispatch] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState<SimulationItem[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live in-browser Regex tester state
  const [testRegex, setTestRegex] = useState('\\b(\\d{6})\\b');
  const [localExtracted, setLocalExtracted] = useState<string | null>(null);

  const handleTestRegexLocal = () => {
    try {
      const reg = new RegExp(testRegex, 'i');
      const match = reg.exec(body);
      if (match) {
        setLocalExtracted(match[1] !== undefined ? match[1] : match[0]);
      } else {
        setLocalExtracted('No match found');
      }
    } catch (err: any) {
      setLocalExtracted(`Invalid Regex: ${err.message}`);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setErrorMsg(null);
    setResults(null);

    try {
      const simFn = httpsCallable<
        { sender: string; body: string; liveDispatch?: boolean },
        { success: boolean; results: SimulationItem[] }
      >(functions, 'simulateRules');

      const response = await simFn({
        sender,
        body,
        liveDispatch
      });

      if (response.data.success) {
        setResults(response.data.results);
      }
    } catch (err: any) {
      setErrorMsg(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const setPreset = (presetSender: string, presetBody: string, pattern: string) => {
    setSender(presetSender);
    setBody(presetBody);
    setTestRegex(pattern);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
              <span>Rule & Regex Evaluation Lab</span>
              <Badge tone="brand">Interactive Sandbox</Badge>
            </h2>
            <p className="text-xs text-content-muted">
              Test SMS patterns, debug regular expressions, and preview rendered JSON payloads without deploying an Android build.
            </p>
          </div>
        </div>
      </Card>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-content-muted mr-2 font-medium">Quick Presets:</span>
        <button
          onClick={() =>
            setPreset(
              'PAYPAL-AUTH',
              'PayPal: Your security code is 849201. It expires in 5 minutes.',
              '\\b(\\d{6})\\b'
            )
          }
          className="px-3 py-1 bg-surface border border-line-subtle hover:bg-surface-subtle text-brand rounded-xl text-xs font-semibold transition-colors"
        >
          6-Digit 2FA Code
        </button>
        <button
          onClick={() =>
            setPreset(
              '+1 (800) 555-0199',
              'ALERT: Unusual sign-in attempt from IP 192.168.1.1. Reply NO if this wasn\'t you.',
              'from IP ([0-9.]+)'
            )
          }
          className="px-3 py-1 bg-surface border border-line-subtle hover:bg-surface-subtle text-brand rounded-xl text-xs font-semibold transition-colors"
        >
          Security Alert + IP
        </button>
        <button
          onClick={() =>
            setPreset(
              'DHL-EXPRESS',
              'Your package #DHL99281934 has been dispatched and will arrive tomorrow.',
              '#([A-Z0-9]+)'
            )
          }
          className="px-3 py-1 bg-surface border border-line-subtle hover:bg-surface-subtle text-brand rounded-xl text-xs font-semibold transition-colors"
        >
          Tracking Number
        </button>
      </div>

      {/* Input Form & Local Regex Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Test SMS Data */}
        <Card className="lg:col-span-2 space-y-4">
          <CardHeader
            title="Simulated Inbound Message"
            subtitle="Payload passed to Firebase Cloud Function simulateRules"
          />

          <div className="space-y-1">
            <label className="text-xs text-content-primary font-semibold">Originating Sender Address</label>
            <Input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-content-primary font-semibold">SMS Message Body</label>
            <Textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={liveDispatch}
                onChange={(e) => setLiveDispatch(e.target.checked)}
                className="rounded bg-surface-subtle border-line-subtle text-brand focus:ring-0"
              />
              <span className="text-xs font-semibold text-status-warning-text">
                Live Dispatch (Fire real HTTP requests to destination URLs)
              </span>
            </label>

            <Button
              disabled={simulating}
              variant="brand"
              size="md"
              onClick={handleRunSimulation}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{simulating ? 'Evaluating Rules...' : 'Run Simulation'}</span>
            </Button>
          </div>
        </Card>

        {/* Right Column: Live Regex Sandbox */}
        <Card className="space-y-4">
          <CardHeader
            title="Browser Regex Sandbox"
            subtitle="Test regex patterns locally in real-time"
          />

          <div className="space-y-1">
            <label className="text-xs text-content-primary font-semibold">Regex Pattern</label>
            <Input
              type="text"
              value={testRegex}
              onChange={(e) => setTestRegex(e.target.value)}
              placeholder="e.g. \b(\d{6})\b"
              className="font-mono text-brand text-xs"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestRegexLocal}
            className="w-full"
          >
            Test Expression
          </Button>

          {localExtracted !== null && (
            <div className="bg-surface-code p-3 rounded-xl border border-line-subtle space-y-1">
              <span className="text-[11px] text-slate-400 block font-semibold">Captured Output:</span>
              <div className="text-xs font-mono font-bold text-emerald-400 break-all">
                {localExtracted}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 bg-status-danger-bg border border-status-danger-border rounded-xl text-xs text-status-danger-text font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Simulation Results */}
      {results && (
        <Card className="space-y-4">
          <CardHeader
            title="Simulation Trace Results"
            subtitle={`Evaluated ${results.length} active rules against inbound simulation payload`}
          />

          <div className="space-y-4 mt-4">
            {results.map((res, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-xs space-y-3 ${
                  res.matches
                    ? 'bg-surface-subtle border-status-success-border'
                    : 'bg-surface-subtle border-line-subtle opacity-60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {res.matches ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success-text" />
                    ) : (
                      <XCircle className="w-4 h-4 text-content-muted" />
                    )}
                    <span className="font-bold text-content-primary text-sm">{res.ruleName}</span>
                  </div>

                  <Badge tone={res.matches ? 'success' : 'neutral'}>
                    {res.matches ? 'MATCHED' : 'DID NOT MATCH'}
                  </Badge>
                </div>

                {/* Match Evaluation Log */}
                <div className="text-content-secondary space-y-0.5 text-[11px]">
                  {res.matchReasons.map((reason, rIdx) => (
                    <div key={rIdx}>• {reason}</div>
                  ))}
                </div>

                {res.matches && (
                  <>
                    {/* Extracted Variables */}
                    {Object.keys(res.extracted).length > 0 && (
                      <div className="bg-surface p-2.5 rounded-lg border border-line-subtle">
                        <span className="text-content-muted block mb-1 font-semibold text-[11px]">
                          Extracted Variables:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(res.extracted).map(([k, v]) => (
                            <Badge key={k} tone="brand" size="sm">
                              <strong>{k}</strong>: &quot;{v}&quot;
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rendered JSON Payload Preview */}
                    <div>
                      <span className="text-content-muted block mb-1 font-semibold text-[11px]">
                        Rendered Webhook Payload:
                      </span>
                      <pre className="bg-surface-code p-2.5 rounded-lg border border-line-subtle text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                        {res.renderedPayload}
                      </pre>
                    </div>

                    {/* Live Dispatch Result (if performed) */}
                    {res.dispatchResult && (
                      <div className="bg-surface p-2.5 rounded-lg border border-line-subtle space-y-1">
                        <span className="text-content-muted block font-semibold text-[11px]">
                          Live HTTP Dispatch Result:
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <span
                            className={`font-bold ${
                              res.dispatchResult.success ? 'text-status-success-text' : 'text-status-danger-text'
                            }`}
                          >
                            HTTP {res.dispatchResult.status} ({res.dispatchResult.latencyMs}ms)
                          </span>
                        </div>
                        <pre className="text-content-secondary font-mono text-[10px] whitespace-pre-wrap">
                          {res.dispatchResult.body}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
