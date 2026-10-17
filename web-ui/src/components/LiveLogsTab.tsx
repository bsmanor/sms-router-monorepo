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
import { SmsLogDocument, RuleExecutionResult } from '../types';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  X,
  ExternalLink,
  ChevronRight,
  Smartphone
} from 'lucide-react';

export const LiveLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SmsLogDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      log.sender.toLowerCase().includes(query) ||
      log.body.toLowerCase().includes(query) ||
      log.deviceId.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: SmsLogDocument['status']) => {
    switch (status) {
      case 'PROCESSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> PROCESSED
          </span>
        );
      case 'PARTIAL_FAILURE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3" /> PARTIAL
          </span>
        );
      case 'NO_MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3" /> NO MATCH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Live Intercepted SMS Logs</span>
            <span className="text-xs bg-sky-950 text-sky-400 px-2 py-0.5 rounded-full border border-sky-800 animate-pulse">
              LIVE STREAM
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Displaying the latest {logs.length} messages intercepted and forwarded to the gateway
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sender or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PROCESSED">Processed</option>
            <option value="PARTIAL_FAILURE">Partial Failure</option>
            <option value="NO_MATCH">No Match</option>
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-slate-800/40 rounded-xl border border-slate-700/60">
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mr-3" />
          <span className="text-sm text-slate-400">Loading incoming SMS events...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center p-12 bg-slate-800/40 rounded-xl border border-slate-700/60">
          <Smartphone className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-medium text-slate-300">No logs found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Send a test SMS from the Android app or Simulator tab to see events here.
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Message Preview</th>
                  <th className="py-3 px-4">Matched Rules</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
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
                      className="hover:bg-slate-750/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        {log.sender}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {log.body}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {log.matchedRules && log.matchedRules.length > 0 ? (
                            log.matchedRules.map((r, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                                  r.success
                                    ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {r.ruleName} ({r.httpStatus || 'ERR'})
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">None</span>
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
                          className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium group-hover:translate-x-0.5 transition-transform"
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
        </div>
      )}

      {/* Detail & Replay Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>SMS Dispatch Trace</span>
                  {getStatusBadge(selectedLog.status)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Log ID: {selectedLog.id} • Device: {selectedLog.deviceId}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setReplayFeedback(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Message Details */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>From: <strong className="text-white">{selectedLog.sender}</strong></span>
                  <span>Received: {new Date(selectedLog.receivedAt).toLocaleString()}</span>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Original SMS Body:</div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-200 font-mono whitespace-pre-wrap">
                    {selectedLog.body}
                  </div>
                </div>
              </div>

              {/* Replay feedback alert */}
              {replayFeedback && (
                <div className="p-3 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-200 flex items-center justify-between">
                  <span>{replayFeedback}</span>
                  <button
                    onClick={() => setReplayFeedback(null)}
                    className="text-sky-400 hover:text-sky-200 font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Matched Executions */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-300 text-sm">
                  Evaluated Rule Dispatches ({selectedLog.matchedRules?.length || 0})
                </h4>

                {(!selectedLog.matchedRules || selectedLog.matchedRules.length === 0) ? (
                  <p className="text-slate-500 italic">No rules matched this incoming SMS payload.</p>
                ) : (
                  selectedLog.matchedRules.map((ruleExec, i) => (
                    <div
                      key={i}
                      className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{ruleExec.ruleName}</span>
                          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                            {ruleExec.httpMethod}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                              ruleExec.success
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            HTTP {ruleExec.httpStatus || '0'} ({ruleExec.latencyMs}ms)
                          </span>
                        </div>

                        <button
                          disabled={replayingRuleId === ruleExec.ruleId}
                          onClick={() => handleReplay(selectedLog.id, ruleExec.ruleId)}
                          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-3 py-1 rounded-lg flex items-center gap-1 font-medium transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          {replayingRuleId === ruleExec.ruleId ? 'Replaying...' : 'Replay Webhook'}
                        </button>
                      </div>

                      <div className="text-slate-400 break-all font-mono text-[11px]">
                        Target: <span className="text-slate-200">{ruleExec.targetUrl}</span>
                      </div>

                      {/* Rendered Payload */}
                      <div>
                        <div className="text-slate-400 mb-1">Dispatched Webhook Payload:</div>
                        <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {ruleExec.dispatchedPayload}
                        </pre>
                      </div>

                      {/* Webhook Response */}
                      <div>
                        <div className="text-slate-400 mb-1">Remote Server Response:</div>
                        <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {ruleExec.responseBody || (ruleExec.error ? `Error: ${ruleExec.error}` : 'No response body')}
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-700 bg-slate-800/80 flex justify-end">
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setReplayFeedback(null);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
