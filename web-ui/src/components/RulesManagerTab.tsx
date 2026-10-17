import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { RoutingRule, RegexExtractor, ConditionType } from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Code,
  ArrowUpDown,
  Power,
  Layers,
  Settings2
} from 'lucide-react';

const DEFAULT_RULE: Omit<RoutingRule, 'id'> = {
  name: 'New Webhook Rule',
  priority: 1,
  isActive: true,
  stopOnMatch: false,
  senderCondition: {
    type: 'ANY',
    value: ''
  },
  bodyCondition: {
    type: 'CONTAINS',
    value: 'verification'
  },
  regexExtractors: [
    { key: 'otp', pattern: '\\b(\\d{6})\\b' }
  ],
  targetUrl: 'https://webhook.site/test',
  httpMethod: 'POST',
  customHeaders: '{\n  "Authorization": "Bearer YOUR_TOKEN"\n}',
  payloadTemplate: '{\n  "sender": "{{sender}}",\n  "code": "{{extracted.otp}}",\n  "body": "{{body}}",\n  "timestamp": {{timestamp}}\n}'
};

export const RulesManagerTab: React.FC = () => {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'rules'), orderBy('priority', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: RoutingRule[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        } as RoutingRule));
        setRules(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching rules:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleActive = async (rule: RoutingRule) => {
    try {
      await updateDoc(doc(db, 'rules', rule.id), {
        isActive: !rule.isActive
      });
    } catch (err: any) {
      setFeedback(`Failed to toggle rule: ${err.message}`);
    }
  };

  const handleDeleteRule = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete rule "${name}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'rules', id));
      setFeedback(`Rule "${name}" deleted.`);
    } catch (err: any) {
      setFeedback(`Failed to delete rule: ${err.message}`);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRule({
      id: '',
      ...DEFAULT_RULE,
      priority: rules.length + 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: RoutingRule) => {
    setEditingRule({ ...rule });
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const { id, ...dataToSave } = editingRule;
      if (id) {
        await updateDoc(doc(db, 'rules', id), dataToSave);
        setFeedback(`Rule "${editingRule.name}" updated successfully.`);
      } else {
        await addDoc(collection(db, 'rules'), dataToSave);
        setFeedback(`Rule "${editingRule.name}" created successfully.`);
      }
      setIsModalOpen(false);
      setEditingRule(null);
    } catch (err: any) {
      setFeedback(`Failed to save rule: ${err.message}`);
    }
  };

  const addExtractor = () => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      regexExtractors: [
        ...editingRule.regexExtractors,
        { key: `var_${editingRule.regexExtractors.length + 1}`, pattern: '' }
      ]
    });
  };

  const removeExtractor = (index: number) => {
    if (!editingRule) return;
    const updated = [...editingRule.regexExtractors];
    updated.splice(index, 1);
    setEditingRule({ ...editingRule, regexExtractors: updated });
  };

  const insertTemplateToken = (token: string) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      payloadTemplate: editingRule.payloadTemplate + token
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Routing Rules Manager</span>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
              {rules.length} Rules
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Rules are evaluated sequentially by priority (1 = highest). Matching rules dispatch webhooks.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-sky-900/30"
        >
          <Plus className="w-4 h-4" />
          Create New Rule
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-sky-300 flex justify-between items-center">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading routing rules...</div>
      ) : rules.length === 0 ? (
        <div className="p-12 bg-slate-800/40 rounded-xl border border-slate-700/60 text-center">
          <Layers className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-medium text-slate-300">No Routing Rules Configured</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create your first routing rule to forward incoming SMS messages to your target webhook.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-slate-800/70 border rounded-xl p-5 transition-all ${
                rule.isActive ? 'border-slate-700' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-sky-400">
                    #{rule.priority}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{rule.name}</span>
                      {rule.stopOnMatch && (
                        <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">
                          Stop on match
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span className="text-sky-400 font-semibold">{rule.httpMethod}</span>
                      <span className="truncate max-w-sm sm:max-w-md">{rule.targetUrl}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Active Toggle */}
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      rule.isActive
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {rule.isActive ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(rule)}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs"
                    title="Edit Rule"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteRule(rule.id, rule.name)}
                    className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 rounded-lg text-xs"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conditions Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-750 text-xs">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Sender Condition</span>
                  <span className="font-mono text-slate-200">
                    {rule.senderCondition?.type}: <strong className="text-white">{rule.senderCondition?.value || 'ANY'}</strong>
                  </span>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Body Condition</span>
                  <span className="font-mono text-slate-200">
                    {rule.bodyCondition?.type}: <strong className="text-white">{rule.bodyCondition?.value || 'ANY'}</strong>
                  </span>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Regex Extractors</span>
                  <span className="font-mono text-slate-200">
                    {rule.regexExtractors?.length ? (
                      rule.regexExtractors.map((e) => e.key).join(', ')
                    ) : (
                      <em className="text-slate-500">None</em>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl my-8 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <form onSubmit={handleSaveRule}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-sky-400" />
                  <span>{editingRule.id ? 'Edit Routing Rule' : 'Create Routing Rule'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
                {/* General Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-300 font-semibold">Rule Name</label>
                    <input
                      type="text"
                      required
                      value={editingRule.name}
                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      placeholder="e.g. Bank OTP Forwarder"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Priority (Order)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editingRule.priority}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 1 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.isActive}
                      onChange={(e) => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0"
                    />
                    <span className="text-slate-200 font-semibold">Rule Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.stopOnMatch}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, stopOnMatch: e.target.checked })
                      }
                      className="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0"
                    />
                    <span className="text-slate-200 font-semibold">
                      Stop on Match (Halt downstream rules)
                    </span>
                  </label>
                </div>

                {/* Match Conditions */}
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-750 space-y-4">
                  <h4 className="text-white font-bold text-sm">Matching Conditions</h4>

                  {/* Sender Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Sender Condition</label>
                      <select
                        value={editingRule.senderCondition?.type || 'ANY'}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            senderCondition: {
                              ...editingRule.senderCondition,
                              type: e.target.value as ConditionType
                            }
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="ANY">ANY (Match all)</option>
                        <option value="EXACT">EXACT</option>
                        <option value="CONTAINS">CONTAINS</option>
                        <option value="REGEX">REGEX</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">Sender Value / Pattern</label>
                      <input
                        type="text"
                        disabled={editingRule.senderCondition?.type === 'ANY'}
                        value={editingRule.senderCondition?.value || ''}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            senderCondition: {
                              ...editingRule.senderCondition,
                              value: e.target.value
                            }
                          })
                        }
                        placeholder={
                          editingRule.senderCondition?.type === 'ANY'
                            ? 'Matches any sender'
                            : 'e.g. +18005550199 or BANK'
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {/* Body Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Body Condition</label>
                      <select
                        value={editingRule.bodyCondition?.type || 'ANY'}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            bodyCondition: {
                              ...editingRule.bodyCondition,
                              type: e.target.value as ConditionType
                            }
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="ANY">ANY (Match all)</option>
                        <option value="CONTAINS">CONTAINS</option>
                        <option value="REGEX">REGEX</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">Body Substring / Regex</label>
                      <input
                        type="text"
                        disabled={editingRule.bodyCondition?.type === 'ANY'}
                        value={editingRule.bodyCondition?.value || ''}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            bodyCondition: {
                              ...editingRule.bodyCondition,
                              value: e.target.value
                            }
                          })
                        }
                        placeholder={
                          editingRule.bodyCondition?.type === 'ANY'
                            ? 'Matches any body'
                            : 'e.g. verification code or OTP'
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Regex Extractors */}
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-750 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-bold text-sm">Dynamic Regex Extractors</h4>
                      <p className="text-[11px] text-slate-400">
                        Extract variables using regular expressions with capture groups (e.g. \b(\d{6})\b)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addExtractor}
                      className="bg-slate-700 hover:bg-slate-600 text-sky-300 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Extractor
                    </button>
                  </div>

                  {editingRule.regexExtractors.map((ext, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Variable Key (e.g. otp)"
                        value={ext.key}
                        onChange={(e) => {
                          const updated = [...editingRule.regexExtractors];
                          updated[idx].key = e.target.value;
                          setEditingRule({ ...editingRule, regexExtractors: updated });
                        }}
                        className="w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="text"
                        placeholder="Regex Pattern (e.g. \\b(\\d{6})\\b)"
                        value={ext.pattern}
                        onChange={(e) => {
                          const updated = [...editingRule.regexExtractors];
                          updated[idx].pattern = e.target.value;
                          setEditingRule({ ...editingRule, regexExtractors: updated });
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeExtractor(idx)}
                        className="p-1.5 text-rose-400 hover:bg-slate-700 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Target Webhook Config */}
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-750 space-y-4">
                  <h4 className="text-white font-bold text-sm">Target Webhook Dispatch</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">HTTP Method</label>
                      <select
                        value={editingRule.httpMethod}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            httpMethod: e.target.value as 'POST' | 'PUT' | 'GET'
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="GET">GET</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-slate-400 block mb-1">Webhook Target URL</label>
                      <input
                        type="url"
                        required
                        value={editingRule.targetUrl}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, targetUrl: e.target.value })
                        }
                        placeholder="https://api.yourdomain.com/sms/hook"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Custom Headers (JSON)</label>
                    <textarea
                      rows={2}
                      value={editingRule.customHeaders}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, customHeaders: e.target.value })
                      }
                      placeholder='{"Authorization": "Bearer YOUR_SECRET_KEY"}'
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-400 font-semibold">
                        Payload Template (JSON)
                      </label>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-slate-500 text-[10px] self-center mr-1">Insert:</span>
                        <button
                          type="button"
                          onClick={() => insertTemplateToken('{{sender}}')}
                          className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-sky-300 font-mono text-[10px]"
                        >
                          +sender
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTemplateToken('{{body}}')}
                          className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-sky-300 font-mono text-[10px]"
                        >
                          +body
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTemplateToken('{{timestamp}}')}
                          className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-sky-300 font-mono text-[10px]"
                        >
                          +ts
                        </button>
                        {editingRule.regexExtractors.map((ext) => (
                          <button
                            key={ext.key}
                            type="button"
                            onClick={() => insertTemplateToken(`{{extracted.${ext.key}}}`)}
                            className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 hover:bg-indigo-900 font-mono text-[10px]"
                          >
                            +{ext.key}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={5}
                      required
                      value={editingRule.payloadTemplate}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, payloadTemplate: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-emerald-400 font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-lg shadow-sky-900/40"
                >
                  Save Routing Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
