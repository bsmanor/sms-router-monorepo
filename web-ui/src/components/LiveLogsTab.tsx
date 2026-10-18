import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { SmsLogDocument } from '../types';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  X,
  ChevronRight,
  Smartphone,
  Radio,
  Layers,
  Activity,
  Filter
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input, Select, MetricTile } from './ui/Primitives';

export const LiveLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SmsLogDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<SmsLogDocument | null>(null);
  const [replayingRuleId, setReplayingRuleId] = useState<string | null>(null);
  const [replayFeedback, setReplayFeedback] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'sms_logs'),
      orderBy('receivedAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: SmsLogDocument[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        } as SmsLogDocument));
        setLogs(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching logs:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleReplay = async (logId: string, ruleId?: string) => {
    setReplayingRuleId(ruleId || logId);
    setReplayFeedback(null);
    try {
      const replayFn = httpsCallable<
        { logId: string; ruleId?: string },
        { success: boolean; httpStatus: number; error: string | null }
      >(functions, 'replayWebhook');
      const response = await replayFn({ logId, ruleId });

      if (response.data.success) {
        setReplayFeedback(`Replayed successfully! HTTP ${response.data.httpStatus}`);
      } else {
        setReplayFeedback(`Replay returned error: ${response.data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setReplayFeedback(`Replay failed: ${err.message}`);
    } finally {
      setReplayingRuleId(null);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      statusFilter === 'ALL' || log.status === statusFilter;
    const matchesSource =
      sourceFilter === 'ALL' || (log as any).source === sourceFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      log.sender.toLowerCase().includes(query) ||
      log.body.toLowerCase().includes(query) ||
      log.deviceId.toLowerCase().includes(query);
    return matchesFilter && matchesSource && matchesSearch;
  });

  // Calculate Metrics
  const totalCount = logs.length;
  const processedCount = logs.filter((l) => l.status === 'PROCESSED').length;
  const partialCount = logs.filter((l) => l.status === 'PARTIAL_FAILURE').length;
  const noMatchCount = logs.filter((l) => l.status === 'NO_MATCH').length;

  const getStatusBadge = (status: SmsLogDocument['status']) => {
    switch (status) {
      case 'PROCESSED':
        return (
          <Badge tone="success">
            <CheckCircle2 className="w-3 h-3" /> PROCESSED
          </Badge>
        );
      case 'PARTIAL_FAILURE':
        return (
          <Badge tone="warning">
            <AlertTriangle className="w-3 h-3" /> PARTIAL
          </Badge>
        );
      case 'NO_MATCH':
        return (
          <Badge tone="neutral">
            <Clock className="w-3 h-3" /> NO MATCH
          </Badge>
        );
      default:
        return (
          <Badge tone="danger">
            <XCircle className="w-3 h-3" /> {status}
          </Badge>
        );
    }
  };

  const getSourceBadge = (source?: string) => {
    const src = source || 'BROADCAST';
    const tones: Record<string, 'brand' | 'info' | 'warning' | 'neutral'> = {
      BROADCAST: 'neutral',
      INBOX_DB: 'info',
      RCS_NOTIF: 'brand',
      TEST: 'warning'
    };
    return (
      <Badge tone={tones[src] || 'neutral'} size="sm">
        {src}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricTile
          label="Total Intercepted"
          value={totalCount}
          subtext="Buffered in Firestore"
          icon={<Radio className="w-4 h-4" />}
          tone="brand"
        />
        <MetricTile
          label="Processed (2xx)"
          value={processedCount}
          subtext="Successfully dispatched"
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="success"
        />
        <MetricTile
          label="Partial / Errors"
          value={partialCount}
          subtext="HTTP 4xx/5xx responses"
          icon={<AlertTriangle className="w-4 h-4" />}
          tone="warning"
        />
        <MetricTile
          label="No Rule Matched"
          value={noMatchCount}
          subtext="Audited but not routed"
          icon={<Clock className="w-4 h-4" />}
          tone="neutral"
        />
      </div>

      {/* Control & Filter Strip */}
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
                <span>Live Ingestion Telemetry</span>
                <span className="w-2 h-2 rounded-full bg-status-success-text animate-pulse" />
              </h2>
              <p className="text-xs text-content-muted">
                Displaying real-time SMS & RCS events streamed from Android device gateways
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search sender, body, device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs py-1.5"
              />
            </div>

            {/* Source Filter */}
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="py-1.5 text-xs"
            >
              <option value="ALL">All Layers</option>
              <option value="BROADCAST">Broadcast</option>
              <option value="INBOX_DB">Inbox DB</option>
              <option value="RCS_NOTIF">RCS / Notif</option>
              <option value="TEST">Test SMS</option>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PROCESSED">Processed</option>
              <option value="PARTIAL_FAILURE">Partial Failure</option>
              <option value="NO_MATCH">No Match</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Logs Table / Empty State */}
      {loading ? (
        <Card className="flex items-center justify-center p-12">
          <RefreshCw className="w-5 h-5 text-brand animate-spin mr-3" />
          <span className="text-xs text-content-muted font-medium">Connecting to Firestore telemetry stream...</span>
        </Card>
      ) : filteredLogs.length === 0 ? (
        <Card className="text-center p-12">
          <Smartphone className="w-10 h-10 text-content-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-content-primary">No matching SMS events found</h3>
          <p className="text-xs text-content-muted mt-1 max-w-sm mx-auto">
            Send a test SMS from the Android app or Simulator tab to observe live events here.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line-subtle bg-surface-subtle text-content-muted font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Layer</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Message Preview</th>
                  <th className="py-3 px-4">Routing Dispatches</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {filteredLogs.map((log) => {
                  const dateStr = new Date(log.receivedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-surface-subtle cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-content-muted font-mono text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getSourceBadge((log as any).source)}
                      </td>
                      <td className="py-3 px-4 font-bold text-content-primary whitespace-nowrap">
                        {log.sender}
                      </td>
                      <td className="py-3 px-4 text-content-secondary max-w-xs truncate font-mono text-[11px]">
                        {log.body}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {log.matchedRules && log.matchedRules.length > 0 ? (
                            log.matchedRules.map((r, idx) => (
                              <Badge
                                key={idx}
                                tone={r.success ? 'brand' : 'danger'}
                                size="sm"
                              >
                                {r.ruleName} ({r.httpStatus || 'ERR'})
                              </Badge>
                            ))
                          ) : (
                            <span className="text-content-muted italic text-[11px]">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="text-brand hover:underline inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform"
                        >
                          Details <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail & Replay Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line-subtle w-full max-w-2xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line-subtle flex items-center justify-between bg-surface-subtle">
              <div>
                <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                  <span>SMS Dispatch Trace</span>
                  {getStatusBadge(selectedLog.status)}
                </h3>
                <p className="text-xs text-content-muted mt-0.5 font-mono">
                  ID: {selectedLog.id} • Device: {selectedLog.deviceId} • Layer: {(selectedLog as any).source || 'BROADCAST'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setReplayFeedback(null);
                }}
                className="text-content-muted hover:text-content-primary p-1 rounded-lg hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Message Details */}
              <div className="bg-surface-subtle p-4 rounded-xl border border-line-subtle space-y-2">
                <div className="flex justify-between text-content-muted">
                  <span>From: <strong className="text-content-primary font-mono">{selectedLog.sender}</strong></span>
                  <span>Received: {new Date(selectedLog.receivedAt).toLocaleString()}</span>
                </div>
                <div>
                  <div className="text-content-muted mb-1 font-semibold">Captured Message Body:</div>
                  <div className="bg-surface-code p-3 rounded-lg border border-line-subtle text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {selectedLog.body}
                  </div>
                </div>
              </div>

              {/* Replay feedback alert */}
              {replayFeedback && (
                <div className="p-3 rounded-xl bg-brand-subtle border border-brand-border text-brand flex items-center justify-between font-semibold">
                  <span>{replayFeedback}</span>
                  <button
                    onClick={() => setReplayFeedback(null)}
                    className="hover:opacity-80 font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Matched Executions */}
              <div className="space-y-4">
                <h4 className="font-bold text-content-primary text-sm">
                  Evaluated Rule Dispatches ({selectedLog.matchedRules?.length || 0})
                </h4>

                {(!selectedLog.matchedRules || selectedLog.matchedRules.length === 0) ? (
                  <p className="text-content-muted italic">No rules matched this incoming SMS payload.</p>
                ) : (
                  selectedLog.matchedRules.map((ruleExec, i) => (
                    <div
                      key={i}
                      className="bg-surface-subtle border border-line-subtle rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-content-primary text-sm">{ruleExec.ruleName}</span>
                          <Badge tone="neutral" size="sm">{ruleExec.httpMethod}</Badge>
                          <Badge tone={ruleExec.success ? 'success' : 'danger'} size="sm">
                            HTTP {ruleExec.httpStatus || '0'} ({ruleExec.latencyMs}ms)
                          </Badge>
                        </div>

                        <Button
                          size="sm"
                          variant="brand"
                          disabled={replayingRuleId === ruleExec.ruleId}
                          onClick={() => handleReplay(selectedLog.id, ruleExec.ruleId)}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{replayingRuleId === ruleExec.ruleId ? 'Replaying...' : 'Replay Webhook'}</span>
                        </Button>
                      </div>

                      <div className="text-content-muted break-all font-mono text-[11px]">
                        Target: <span className="text-content-primary">{ruleExec.targetUrl}</span>
                      </div>

                      {/* Rendered Payload */}
                      <div>
                        <div className="text-content-muted mb-1 font-semibold">Dispatched Webhook Payload:</div>
                        <pre className="bg-surface-code p-2.5 rounded-lg border border-line-subtle text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {ruleExec.dispatchedPayload}
                        </pre>
                      </div>

                      {/* Webhook Response */}
                      <div>
                        <div className="text-content-muted mb-1 font-semibold">Remote Server Response:</div>
                        <pre className="bg-surface-code p-2.5 rounded-lg border border-line-subtle text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {ruleExec.responseBody || (ruleExec.error ? `Error: ${ruleExec.error}` : 'No response body')}
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-line-subtle bg-surface-subtle flex justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSelectedLog(null);
                  setReplayFeedback(null);
                }}
              >
                Close Trace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
