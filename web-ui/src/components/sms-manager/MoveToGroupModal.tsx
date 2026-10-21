import React from 'react';
import { SmsGroup } from '../../types';
import { GroupIcon } from './GroupIcon';
import { Button, Badge } from '../ui/Primitives';
import { FolderInput, X, Check, Inbox } from 'lucide-react';

interface MoveToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: SmsGroup[];
  selectedCount: number;
  currentGroupId?: string | null;
  onSelectGroup: (targetGroup: SmsGroup | null) => Promise<void>;
}

export const MoveToGroupModal: React.FC<MoveToGroupModalProps> = ({
  isOpen,
  onClose,
  groups,
  selectedCount,
  currentGroupId,
  onSelectGroup
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full sm:max-w-md bg-surface border-t sm:border border-line-subtle rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-content-primary">
                Move to Group
              </h3>
              <p className="text-xs text-content-muted">
                Assign {selectedCount === 1 ? '1 message' : `${selectedCount} messages`} to a group
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-content-muted hover:text-content-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Groups List */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto py-1">
          {/* Option: Ungrouped */}
          <button
            onClick={async () => {
              await onSelectGroup(null);
              onClose();
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
              !currentGroupId
                ? 'border-brand bg-brand-subtle text-brand font-bold'
                : 'border-line-subtle bg-surface text-content-primary hover:bg-surface-subtle'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 text-content-muted" />
              <span className="text-xs">Ungrouped / None</span>
            </div>
            {!currentGroupId && <Check className="w-4 h-4 text-brand" />}
          </button>

          {/* User & Default Groups */}
          {groups.map((group) => {
            const isCurrent = currentGroupId === group.id;
            return (
              <button
                key={group.id}
                onClick={async () => {
                  await onSelectGroup(group);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'border-brand bg-brand-subtle text-brand font-bold'
                    : 'border-line-subtle bg-surface text-content-primary hover:bg-surface-subtle'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-surface-subtle border border-line-subtle flex items-center justify-center shrink-0">
                    <GroupIcon iconName={group.icon} className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold block">{group.name}</span>
                    {group.description && (
                      <span className="text-[10px] text-content-muted line-clamp-1">{group.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={group.colorTone} size="sm">{group.name}</Badge>
                  {isCurrent && <Check className="w-4 h-4 text-brand" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
