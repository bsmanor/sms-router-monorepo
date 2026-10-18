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
import { RoutingRule, ConditionType } from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Power,
  Layers,
  Settings2,
  Sliders,
  ArrowRight,
  Code2
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input, Select, Textarea } from './ui/Primitives';

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
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
                <span>Routing Rules Pipeline</span>
                <Badge tone="info">{rules.length} Rules Active</Badge>
              </h2>
              <p className="text-xs text-content-muted">
                Rules are evaluated sequentially by priority (1 = highest). Matching rules dispatch webhooks.
              </p>
            </div>
          </div>

          <Button
            variant="brand"
            size="md"
            onClick={handleOpenCreateModal}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Rule</span>
          </Button>
        </div>
      </Card>

      {feedback && (
        <div className="p-3 bg-brand-subtle border border-brand-border rounded-xl text-xs text-brand font-semibold flex justify-between items-center">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <Card className="p-12 text-center text-content-muted text-xs font-medium">
          Loading routing rules pipeline...
        </Card>
      ) : rules.length === 0 ? (
        <Card className="p-12 text-center">
          <Layers className="w-10 h-10 text-content-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-content-primary">No Routing Rules Configured</h3>
          <p className="text-xs text-content-muted mt-1 mb-4 max-w-sm mx-auto">
            Create your first routing rule to forward incoming SMS messages to your target webhook.
          </p>
          <Button
            variant="brand"
            size="md"
            onClick={handleOpenCreateModal}
          >
            <Plus className="w-4 h-4" />
            <span>Add First Rule</span>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className={`transition-all ${
                rule.isActive ? '' : 'opacity-60 bg-surface-subtle'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-surface-subtle border border-line-subtle flex items-center justify-center font-mono font-bold text-xs text-brand">
                    #{rule.priority}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-content-primary flex items-center gap-2">
                      <span>{rule.name}</span>
                      {rule.stopOnMatch && (
                        <Badge tone="warning" size="sm">
                          Stop on match
                        </Badge>
                      )}
                    </h3>
                    <div className="text-xs text-content-muted flex items-center gap-2 mt-0.5 font-mono">
                      <span className="text-brand font-bold">{rule.httpMethod}</span>
                      <span className="truncate max-w-sm sm:max-w-md">{rule.targetUrl}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                      rule.isActive
                        ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                        : 'bg-surface-subtle text-content-muted border-line-subtle'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{rule.isActive ? 'Active' : 'Disabled'}</span>
                  </button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEditModal(rule)}
                    title="Edit Rule"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id, rule.name)}
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Conditions Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-line-subtle text-xs">
                <div className="bg-surface-subtle p-2.5 rounded-xl border border-line-subtle">
                  <span className="text-content-muted block mb-0.5 font-semibold text-[11px]">Sender Condition</span>
                  <span className="font-mono text-content-secondary">
                    {rule.senderCondition?.type}: <strong className="text-content-primary">{rule.senderCondition?.value || 'ANY'}</strong>
                  </span>
                </div>

                <div className="bg-surface-subtle p-2.5 rounded-xl border border-line-subtle">
                  <span className="text-content-muted block mb-0.5 font-semibold text-[11px]">Body Condition</span>
                  <span className="font-mono text-content-secondary">
                    {rule.bodyCondition?.type}: <strong className="text-content-primary">{rule.bodyCondition?.value || 'ANY'}</strong>
                  </span>
                </div>

                <div className="bg-surface-subtle p-2.5 rounded-xl border border-line-subtle">
                  <span className="text-content-muted block mb-0.5 font-semibold text-[11px]">Regex Extractors</span>
                  <span className="font-mono text-content-secondary">
                    {rule.regexExtractors?.length ? (
                      rule.regexExtractors.map((e) => e.key).join(', ')
                    ) : (
                      <em className="text-content-muted">None</em>
                    )}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-surface border border-line-subtle w-full max-w-3xl my-8 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <form onSubmit={handleSaveRule}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-line-subtle flex items-center justify-between bg-surface-subtle">
                <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-brand" />
                  <span>{editingRule.id ? 'Edit Routing Rule' : 'Create Routing Rule'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-content-muted hover:text-content-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
                {/* General Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-content-primary font-semibold">Rule Name</label>
                    <Input
                      type="text"
                      required
                      value={editingRule.name}
                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      placeholder="e.g. Bank OTP Forwarder"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-content-primary font-semibold">Priority (Order)</label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={editingRule.priority}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 1 })
                      }
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.isActive}
                      onChange={(e) => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                      className="rounded bg-surface-subtle border-line-subtle text-brand focus:ring-0"
                    />
                    <span className="text-content-primary font-semibold">Rule Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.stopOnMatch}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, stopOnMatch: e.target.checked })
                      }
                      className="rounded bg-surface-subtle border-line-subtle text-brand focus:ring-0"
                    />
                    <span className="text-content-primary font-semibold">
                      Stop on Match (Halt downstream rules)
                    </span>
                  </label>
                </div>

                {/* Match Conditions */}
                <div className="bg-surface-subtle p-4 rounded-xl border border-line-subtle space-y-4">
                  <h4 className="text-content-primary font-bold text-sm">Matching Conditions</h4>

                  {/* Sender Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-content-muted block mb-1 font-semibold">Sender Condition</label>
                      <Select
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
                        className="w-full"
                      >
                        <option value="ANY">ANY (Match all)</option>
                        <option value="EXACT">EXACT</option>
                        <option value="CONTAINS">CONTAINS</option>
                        <option value="REGEX">REGEX</option>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-content-muted block mb-1 font-semibold">Sender Value / Pattern</label>
                      <Input
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
                        className="font-mono disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {/* Body Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-content-muted block mb-1 font-semibold">Body Condition</label>
                      <Select
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
                        className="w-full"
                      >
                        <option value="ANY">ANY (Match all)</option>
                        <option value="CONTAINS">CONTAINS</option>
                        <option value="REGEX">REGEX</option>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-content-muted block mb-1 font-semibold">Body Substring / Regex</label>
                      <Input
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
                        className="font-mono disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Regex Extractors */}
                <div className="bg-surface-subtle p-4 rounded-xl border border-line-subtle space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-content-primary font-bold text-sm">Dynamic Regex Extractors</h4>
                      <p className="text-[11px] text-content-muted">
                        Extract variables using regular expressions with capture groups (e.g. \b(\d{6})\b)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addExtractor}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Extractor</span>
                    </Button>
                  </div>

                  {editingRule.regexExtractors.map((ext, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Variable Key (e.g. otp)"
                        value={ext.key}
                        onChange={(e) => {
                          const updated = [...editingRule.regexExtractors];
                          updated[idx].key = e.target.value;
                          setEditingRule({ ...editingRule, regexExtractors: updated });
                        }}
                        className="w-1/3 font-mono"
                      />
                      <Input
                        type="text"
                        placeholder="Regex Pattern (e.g. \\b(\\d{6})\\b)"
                        value={ext.pattern}
                        onChange={(e) => {
                          const updated = [...editingRule.regexExtractors];
                          updated[idx].pattern = e.target.value;
                          setEditingRule({ ...editingRule, regexExtractors: updated });
                        }}
                        className="flex-1 font-mono"
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeExtractor(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Target Webhook Config */}
                <div className="bg-surface-subtle p-4 rounded-xl border border-line-subtle space-y-4">
                  <h4 className="text-content-primary font-bold text-sm">Target Webhook Dispatch</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-content-muted block mb-1 font-semibold">HTTP Method</label>
                      <Select
                        value={editingRule.httpMethod}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            httpMethod: e.target.value as 'POST' | 'PUT' | 'GET'
                          })
                        }
                        className="w-full font-mono"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="GET">GET</option>
                      </Select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-content-muted block mb-1 font-semibold">Webhook Target URL</label>
                      <Input
                        type="url"
                        required
                        value={editingRule.targetUrl}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, targetUrl: e.target.value })
                        }
                        placeholder="https://api.yourdomain.com/sms/hook"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-content-muted block mb-1 font-semibold">Custom Headers (JSON)</label>
                    <Textarea
                      rows={2}
                      value={editingRule.customHeaders}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, customHeaders: e.target.value })
                      }
                      placeholder='{"Authorization": "Bearer YOUR_SECRET_KEY"}'
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-content-muted font-semibold">
                        Payload Template (JSON)
                      </label>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-content-muted text-[10px] self-center mr-1">Insert:</span>
                        <button
                          type="button"
                          onClick={() => insertTemplateToken('{{sender}}')}
                          className="px-1.5 py-0.5 rounded bg-surface border border-line-subtle text-brand font-mono text-[10px]"
                        >
                          +sender
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTemplateToken('{{body}}')}
                          className="px-1.5 py-0.5 rounded bg-surface border border-line-subtle text-brand font-mono text-[10px]"
                        >
                          +body
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTemplateToken('{{timestamp}}')}
                          className="px-1.5 py-0.5 rounded bg-surface border border-line-subtle text-brand font-mono text-[10px]"
                        >
                          +ts
                        </button>
                        {editingRule.regexExtractors.map((ext) => (
                          <button
                            key={ext.key}
                            type="button"
                            onClick={() => insertTemplateToken(`{{extracted.${ext.key}}}`)}
                            className="px-1.5 py-0.5 rounded bg-brand-subtle text-brand border border-brand-border font-mono text-[10px]"
                          >
                            +{ext.key}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      rows={5}
                      required
                      value={editingRule.payloadTemplate}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, payloadTemplate: e.target.value })
                      }
                      className="bg-surface-code text-emerald-400 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-line-subtle bg-surface-subtle flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="md"
                >
                  Save Routing Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
