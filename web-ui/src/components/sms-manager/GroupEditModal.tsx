import React, { useState, useEffect } from 'react';
import { SmsGroup } from '../../types';
import { GroupIcon, ICON_OPTIONS, TONE_OPTIONS } from './GroupIcon';
import { Button, Input, Textarea, Badge } from '../ui/Primitives';
import { X, Plus, Trash2, FolderPlus, Edit3 } from 'lucide-react';

interface GroupEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: SmsGroup | null;
  onSave: (data: {
    name: string;
    description: string;
    icon: string;
    colorTone: SmsGroup['colorTone'];
    autoMatchKeywords: string[];
  }) => Promise<void>;
  onDelete?: (groupId: string) => Promise<void>;
}

export const GroupEditModal: React.FC<GroupEditModalProps> = ({
  isOpen,
  onClose,
  groupToEdit,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [colorTone, setColorTone] = useState<SmsGroup['colorTone']>('brand');
  const [keywordsText, setKeywordsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name);
      setDescription(groupToEdit.description || '');
      setIcon(groupToEdit.icon || 'Folder');
      setColorTone(groupToEdit.colorTone || 'brand');
      setKeywordsText((groupToEdit.autoMatchKeywords || []).join(', '));
    } else {
      setName('');
      setDescription('');
      setIcon('Folder');
      setColorTone('brand');
      setKeywordsText('');
    }
    setConfirmDelete(false);
  }, [groupToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const keywords = keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      await onSave({
        name: name.trim(),
        description: description.trim(),
        icon,
        colorTone,
        autoMatchKeywords: keywords
      });
      onClose();
    } catch (err) {
      console.error('Failed to save group:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!groupToEdit || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(groupToEdit.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete group:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-surface border-t sm:border border-line-subtle rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line-subtle pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
              {groupToEdit ? <Edit3 className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-content-primary">
                {groupToEdit ? `Edit Group: ${groupToEdit.name}` : 'Create New SMS Group'}
              </h3>
              <p className="text-xs text-content-muted">
                Messages can be automatically or manually organized into this group.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-subtle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Name & Preview */}
          <div className="space-y-1.5">
            <label className="text-content-primary font-semibold">Group Name</label>
            <Input
              type="text"
              required
              placeholder="e.g. Finance, Two-Factor, Uber"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-content-primary font-semibold">Description (Optional)</label>
            <Input
              type="text"
              placeholder="Brief summary of messages in this category"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <label className="text-content-primary font-semibold">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = icon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? 'border-brand bg-brand-subtle text-brand font-bold shadow-sm'
                        : 'border-line-subtle bg-surface text-content-secondary hover:bg-surface-subtle'
                    }`}
                    title={item.label}
                  >
                    <IconComp className="w-4 h-4 mb-1" />
                    <span className="text-[10px] truncate max-w-full">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Tone Selector */}
          <div className="space-y-1.5">
            <label className="text-content-primary font-semibold">Color Accent</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TONE_OPTIONS.map((t) => {
                const isSelected = colorTone === t.tone;
                return (
                  <button
                    key={t.tone}
                    type="button"
                    onClick={() => setColorTone(t.tone as SmsGroup['colorTone'])}
                    className={`p-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'border-brand ring-2 ring-brand/20 font-bold bg-surface'
                        : 'border-line-subtle bg-surface hover:bg-surface-subtle'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${t.bg} border ${t.border}`} />
                    <span className="text-[11px] text-content-primary capitalize">{t.tone}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-Match Keywords */}
          <div className="space-y-1.5">
            <label className="text-content-primary font-semibold flex justify-between">
              <span>Auto-Match Keywords (Comma separated)</span>
              <span className="text-content-muted font-normal">Incoming SMS matching these will auto-group</span>
            </label>
            <Textarea
              rows={2}
              placeholder="e.g. otp, code, verification, uber, flight"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {/* Preview Badge */}
          <div className="p-3 bg-surface-subtle border border-line-subtle rounded-xl flex items-center justify-between">
            <span className="text-content-muted text-[11px]">Preview:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-surface">
              <GroupIcon iconName={icon} className="w-3.5 h-3.5" />
              <span>{name || 'Group Name'}</span>
              <Badge tone={colorTone} size="sm">Active</Badge>
            </div>
          </div>

          {/* Delete Option (for existing non-default groups) */}
          {groupToEdit && onDelete && !groupToEdit.isDefault && (
            <div className="pt-3 border-t border-line-subtle">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-status-danger-text hover:underline text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete this group</span>
                </button>
              ) : (
                <div className="p-3 bg-status-danger-bg border border-status-danger-border rounded-xl space-y-2">
                  <p className="text-status-danger-text text-xs font-semibold">
                    Are you sure? Messages inside this group will be moved to Ungrouped.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      Confirm Delete
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-line-subtle">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="md"
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving...' : groupToEdit ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
