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
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-400" />
          <span>Interactive Rule & Webhook Simulator</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Test SMS patterns, debug regular expressions, and preview rendered JSON payloads without deploying an Android build.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 mr-2">Quick Presets:</span>
        <button
          onClick={() =>
            setPreset(
              'PAYPAL-AUTH',
              'PayPal: Your security code is 849201. It expires in 5 minutes.',
              '\\b(\\d{6})\\b'
            )
          }
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs border border-slate-700 font-medium"
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
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs border border-slate-700 font-medium"
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
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs border border-slate-700 font-medium"
        >
          Tracking Number
        </button>
      </div>

      {/* Input Form & Local Regex Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Test SMS Data */}
        <div className="lg:col-span-2 bg-slate-800/60 p-5 rounded-xl border border-slate-700 space-y-4">
          <h3 className="text-sm font-bold text-white">Simulated SMS Message</h3>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold">Originating Sender Address</label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold">SMS Message Body</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={liveDispatch}
                onChange={(e) => setLiveDispatch(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span className="text-xs font-semibold text-amber-400">
                Live Dispatch (Fire real HTTP requests to destination URLs)
              </span>
            </label>

            <button
              disabled={simulating}
              onClick={handleRunSimulation}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-sky-900/40"
            >
              <Play className="w-4 h-4 fill-current" />
              {simulating ? 'Evaluating Rules...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Regex Sandbox */}
        <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span>Browser Regex Tester</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Test regular expressions instantly against the message body on the left.
          </p>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold">Regex Pattern</label>
            <input
              type="text"
              value={testRegex}
              onChange={(e) => setTestRegex(e.target.value)}
              placeholder="e.g. \b(\d{6})\b"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={handleTestRegexLocal}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            Test Expression
          </button>

          {localExtracted !== null && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block font-semibold">Captured Output:</span>
              <div className="text-xs font-mono font-bold text-emerald-400 break-all">
                {localExtracted}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Simulation Results */}
      {results && (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Simulation Results</span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {results.length} Active Rules Evaluated
              </span>
            </h3>
          </div>

          <div className="space-y-4">
            {results.map((res, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-xs space-y-3 ${
                  res.matches
                    ? 'bg-slate-900/90 border-emerald-800/80'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {res.matches ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-bold text-white text-sm">{res.ruleName}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                      res.matches
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {res.matches ? 'MATCHED' : 'DID NOT MATCH'}
                  </span>
                </div>

                {/* Match Evaluation Log */}
                <div className="text-slate-400 space-y-0.5 text-[11px]">
                  {res.matchReasons.map((reason, rIdx) => (
                    <div key={rIdx}>• {reason}</div>
                  ))}
                </div>

                {res.matches && (
                  <>
                    {/* Extracted Variables */}
                    {Object.keys(res.extracted).length > 0 && (
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block mb-1 font-semibold text-[11px]">
                          Extracted Variables:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(res.extracted).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono text-[11px]"
                            >
                              <strong>{k}</strong>: &quot;{v}&quot;
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rendered JSON Payload Preview */}
                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold text-[11px]">
                        Rendered Webhook Payload:
                      </span>
                      <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                        {res.renderedPayload}
                      </pre>
                    </div>

                    {/* Live Dispatch Result (if performed) */}
                    {res.dispatchResult && (
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-slate-400 block font-semibold text-[11px]">
                          Live HTTP Dispatch Result:
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <span
                            className={`font-bold ${
                              res.dispatchResult.success ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            HTTP {res.dispatchResult.status} ({res.dispatchResult.latencyMs}ms)
                          </span>
                        </div>
                        <pre className="text-slate-300 font-mono text-[10px] whitespace-pre-wrap">
                          {res.dispatchResult.body}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
