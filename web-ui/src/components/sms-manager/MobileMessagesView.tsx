import React, { useState } from 'react';
import { SmsGroup, SmsLogDocument } from '../../types';
import { GroupIcon } from './GroupIcon';
import { GroupEditModal } from './GroupEditModal';
import { MoveToGroupModal } from './MoveToGroupModal';
import { extractOtpCode } from '../../utils/otpExtractor';
import { Badge, Button, Input } from '../ui/Primitives';
import {
  Search,
  Check,
  Copy,
  Trash2,
  FolderInput,
  FolderPlus,
  Inbox,
  X,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  MailOpen,
  Mail,
  ExternalLink,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

interface MobileMessagesViewProps {
  groups: SmsGroup[];
  messages: SmsLogDocument[];
  filteredMessages: SmsLogDocument[];
  activeGroupId: string;
  setActiveGroupId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  unreadOnly: boolean;
  setUnreadOnly: (u: boolean) => void;
  unreadCounts: Record<string, number>;
  markAsRead: (ids: string[], isRead: boolean) => Promise<void>;
  deleteMessages: (ids: string[]) => Promise<void>;
  moveMessagesToGroup: (ids: string[], group: SmsGroup | null) => Promise<void>;
  createGroup: (data: any) => Promise<any>;
  updateGroup: (id: string, data: any) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
}

export const MobileMessagesView: React.FC<MobileMessagesViewProps> = ({
  groups,
  filteredMessages,
  activeGroupId,
  setActiveGroupId,
  searchQuery,
  setSearchQuery,
  unreadOnly,
  setUnreadOnly,
  unreadCounts,
  markAsRead,
  deleteMessages,
  moveMessagesToGroup,
  createGroup,
  updateGroup,
  deleteGroup
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SmsLogDocument | null>(null);
  const [movingLogIds, setMovingLogIds] = useState<string[] | null>(null);
  const [isEditingGroup, setIsEditingGroup] = useState<SmsGroup | null | boolean>(false);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Format relative time
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleCopyOtp = (e: React.MouseEvent, otp: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(otp);
    setCopiedOtp(otp);
    setTimeout(() => setCopiedOtp(null), 2000);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMessages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMessages.map((m) => m.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} messages?`)) {
      await deleteMessages(selectedIds);
      setSelectedIds([]);
      setSelectionMode(false);
    }
  };

  const handleBatchMarkRead = async (isRead: boolean) => {
    if (selectedIds.length === 0) return;
    await markAsRead(selectedIds, isRead);
    setSelectedIds([]);
    setSelectionMode(false);
  };

  // Find active group metadata
  const currentGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-content-primary pb-24">
      {/* 1. Mobile Top App Bar */}
      <div className="sticky top-0 z-30 bg-surface/95 border-b border-line-subtle backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tight text-content-primary">
              SMS Messages
            </h1>
            {unreadCounts.all > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand text-white">
                {unreadCounts.all} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-xl transition-colors ${
                showSearch || searchQuery ? 'bg-brand-subtle text-brand' : 'text-content-muted hover:text-content-primary'
              }`}
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedIds([]);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                selectionMode
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'border-line-subtle bg-surface text-content-secondary'
              }`}
            >
              {selectionMode ? 'Done' : 'Select'}
            </button>
          </div>
        </div>

        {/* Collapsible Search Input */}
        {showSearch && (
          <div className="mt-2.5 pt-2 border-t border-line-subtle flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search sender, code, text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
                autoFocus
              />
              <Search className="w-3.5 h-3.5 text-content-muted absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-content-muted hover:text-content-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`p-2 rounded-xl border text-xs shrink-0 flex items-center gap-1 font-semibold ${
                unreadOnly
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'border-line-subtle bg-surface text-content-muted'
              }`}
            >
              <span>Unread</span>
              {unreadOnly && <Check className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* 2. Horizontal Category Carousel (Pill Strip) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 pb-1 -mx-4 px-4">
          {/* All */}
          <button
            onClick={() => setActiveGroupId('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 border transition-all ${
              activeGroupId === 'all'
                ? 'bg-brand text-white border-brand shadow-sm'
                : 'bg-surface border-line-subtle text-content-secondary'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All</span>
            {unreadCounts.all > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeGroupId === 'all' ? 'bg-white/20 text-white' : 'bg-brand-subtle text-brand'
              }`}>
                {unreadCounts.all}
              </span>
            )}
          </button>

          {/* Ungrouped */}
          <button
            onClick={() => setActiveGroupId('ungrouped')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 border transition-all ${
              activeGroupId === 'ungrouped'
                ? 'bg-brand text-white border-brand shadow-sm'
                : 'bg-surface border-line-subtle text-content-secondary'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Ungrouped</span>
            {unreadCounts.ungrouped > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeGroupId === 'ungrouped' ? 'bg-white/20 text-white' : 'bg-brand-subtle text-brand'
              }`}>
                {unreadCounts.ungrouped}
              </span>
            )}
          </button>

          {/* User & Default Groups */}
          {groups.map((group) => {
            const isActive = activeGroupId === group.id;
            const unread = unreadCounts[group.id] || 0;
            return (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 border transition-all ${
                  isActive
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-surface border-line-subtle text-content-secondary'
                }`}
              >
                <GroupIcon iconName={group.icon} className="w-3.5 h-3.5" />
                <span>{group.name}</span>
                {unread > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-brand-subtle text-brand'
                  }`}>
                    {unread}
                  </span>
                )}
              </button>
            );
          })}

          {/* Add Group Pill */}
          <button
            onClick={() => setIsEditingGroup(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1 border border-dashed border-line-subtle bg-surface text-content-muted hover:text-content-primary"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {/* 3. Messages List Area */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Active Filter Info & Group Header (if inside specific group) */}
        {currentGroup && (
          <div className="p-3 bg-surface border border-line-subtle rounded-2xl flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                <GroupIcon iconName={currentGroup.icon} className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-content-primary">{currentGroup.name}</h2>
                <p className="text-[10px] text-content-muted line-clamp-1">{currentGroup.description || 'Custom category'}</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditingGroup(currentGroup)}
              className="text-[11px] font-semibold text-brand hover:underline px-2 py-1 rounded-lg hover:bg-brand-subtle"
            >
              Edit Group
            </button>
          </div>
        )}

        {filteredMessages.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-line-subtle text-content-muted flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-content-primary">No messages found</h3>
            <p className="text-xs text-content-muted max-w-xs mx-auto">
              {searchQuery
                ? 'No SMS logs match your query. Try clearing the search.'
                : activeGroupId !== 'all'
                ? 'No messages in this group yet. Incoming SMS will auto-classify, or you can move messages here manually.'
                : 'Waiting for incoming SMS from your Android gateway device.'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isSelected = selectedIds.includes(msg.id);
            const isUnread = !msg.isRead;
            const otpCode = extractOtpCode(msg.body);
            const groupMatch = groups.find((g) => g.id === msg.groupId);

            return (
              <div
                key={msg.id}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelectId(msg.id);
                  } else {
                    setSelectedLog(msg);
                    if (isUnread) {
                      markAsRead([msg.id], true);
                    }
                  }
                }}
                className={`relative p-3.5 rounded-2xl border transition-all active:scale-[0.99] select-none ${
                  isSelected
                    ? 'border-brand bg-brand-subtle/50'
                    : isUnread
                    ? 'border-brand/40 bg-surface shadow-sm'
                    : 'border-line-subtle bg-surface/70 hover:bg-surface'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Selection Checkbox OR Avatar */}
                  {selectionMode ? (
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                          isSelected ? 'bg-brand border-brand text-white' : 'border-line-subtle bg-surface'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  ) : (
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-xl bg-surface-subtle border border-line-subtle flex items-center justify-center font-bold text-xs text-brand">
                        {(msg.sender || '?')[0].toUpperCase()}
                      </div>
                      {isUnread && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-surface" />
                      )}
                    </div>
                  )}

                  {/* Message Card Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-xs truncate ${isUnread ? 'font-black text-content-primary' : 'font-semibold text-content-primary'}`}>
                        {msg.sender}
                      </span>
                      <span className="text-[10px] text-content-muted shrink-0 font-mono">
                        {formatTime(msg.receivedAt)}
                      </span>
                    </div>

                    <p className={`text-xs line-clamp-2 leading-relaxed ${isUnread ? 'text-content-primary font-medium' : 'text-content-secondary'}`}>
                      {msg.body}
                    </p>

                    {/* Metadata strip: Group Badge & OTP Chip */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {groupMatch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-surface border-line-subtle text-content-secondary">
                          <GroupIcon iconName={groupMatch.icon} className="w-3 h-3" />
                          <span>{groupMatch.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-content-muted border border-line-subtle/50 bg-surface">
                          <Inbox className="w-2.5 h-2.5" />
                          <span>Ungrouped</span>
                        </span>
                      )}

                      {/* 1-Tap OTP Chip */}
                      {otpCode && (
                        <button
                          onClick={(e) => handleCopyOtp(e, otpCode)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-status-success-bg border border-status-success-border text-status-success-text active:scale-95 transition-transform"
                        >
                          {copiedOtp === otpCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedOtp === otpCode ? 'Copied!' : otpCode}</span>
                        </button>
                      )}

                      {/* Webhook Status */}
                      {msg.status === 'PROCESSED' && (
                        <span className="text-[10px] text-status-success-text font-mono">✓ Forwarded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Selection Mode Floating Bottom Action Bar */}
      {selectionMode && selectedIds.length > 0 && (
        <div className="fixed bottom-16 inset-x-4 z-40 bg-surface/95 border border-line-subtle rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2 animate-slideUp">
          <span className="text-xs font-bold text-content-primary pl-2">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBatchMarkRead(true)}
              title="Mark as Read"
            >
              <MailOpen className="w-3.5 h-3.5" />
              <span>Read</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMovingLogIds(selectedIds)}
              title="Move to Group"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Move</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBatchDelete}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 5. Message Reader Bottom Sheet */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full bg-surface border-t border-line-subtle rounded-t-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col space-y-4 animate-slideUp overflow-hidden">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-line-subtle rounded-full mx-auto" />

            {/* Header */}
            <div className="flex items-start justify-between border-b border-line-subtle pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center font-bold text-sm">
                  {(selectedLog.sender || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-content-primary">{selectedLog.sender}</h3>
                  <span className="text-[11px] text-content-muted font-mono">
                    {new Date(selectedLog.receivedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-content-muted hover:text-content-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="p-4 bg-surface-subtle border border-line-subtle rounded-2xl select-text">
                <p className="text-sm text-content-primary leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedLog.body}
                </p>
              </div>

              {/* 1-Tap OTP Highlight Card */}
              {extractOtpCode(selectedLog.body) && (
                <div className="p-3 bg-status-success-bg border border-status-success-border rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-status-success-text font-bold block">VERIFICATION CODE DETECTED</span>
                    <span className="text-lg font-mono font-black text-status-success-text">
                      {extractOtpCode(selectedLog.body)}
                    </span>
                  </div>
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={(e) => handleCopyOtp(e, extractOtpCode(selectedLog.body)!)}
                  >
                    {copiedOtp === extractOtpCode(selectedLog.body) ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedOtp === extractOtpCode(selectedLog.body) ? 'Copied!' : 'Copy Code'}</span>
                  </Button>
                </div>
              )}

              {/* Group Assignment Info */}
              <div className="p-3 bg-surface border border-line-subtle rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-content-muted">Current Group:</span>
                  <span className="font-semibold text-content-primary">
                    {selectedLog.groupName || 'Ungrouped'}
                  </span>
                </div>
                <button
                  onClick={() => setMovingLogIds([selectedLog.id])}
                  className="text-brand text-xs font-bold hover:underline flex items-center gap-1"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Change Group</span>
                </button>
              </div>

              {/* Routing Telemetry */}
              {selectedLog.matchedRules && selectedLog.matchedRules.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-content-muted font-bold block uppercase tracking-wider">
                    Routing Webhooks Dispatched ({selectedLog.matchedRules.length})
                  </span>
                  {selectedLog.matchedRules.map((r) => (
                    <div key={r.ruleId} className="p-2.5 bg-surface border border-line-subtle rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-semibold text-content-primary">{r.ruleName}</span>
                        <span className={r.success ? 'text-status-success-text' : 'text-status-danger-text'}>
                          HTTP {r.httpStatus} • {r.latencyMs}ms
                        </span>
                      </div>
                      <span className="text-[10px] text-content-muted block truncate font-mono">
                        {r.targetUrl}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-2 border-t border-line-subtle grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={async () => {
                  const targetState = !selectedLog.isRead;
                  await markAsRead([selectedLog.id], targetState);
                  setSelectedLog({ ...selectedLog, isRead: targetState });
                }}
              >
                {selectedLog.isRead ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                <span>{selectedLog.isRead ? 'Mark Unread' : 'Mark Read'}</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setMovingLogIds([selectedLog.id])}
              >
                <FolderInput className="w-4 h-4" />
                <span>Move</span>
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={async () => {
                  if (confirm('Delete this message?')) {
                    await deleteMessages([selectedLog.id]);
                    setSelectedLog(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Group Modal / Sheet */}
      <MoveToGroupModal
        isOpen={!!movingLogIds}
        onClose={() => setMovingLogIds(null)}
        groups={groups}
        selectedCount={movingLogIds ? movingLogIds.length : 0}
        currentGroupId={
          movingLogIds && movingLogIds.length === 1
            ? filteredMessages.find((m) => m.id === movingLogIds[0])?.groupId
            : null
        }
        onSelectGroup={async (targetGroup) => {
          if (movingLogIds) {
            await moveMessagesToGroup(movingLogIds, targetGroup);
            if (selectedLog && movingLogIds.includes(selectedLog.id)) {
              setSelectedLog({
                ...selectedLog,
                groupId: targetGroup ? targetGroup.id : null,
                groupName: targetGroup ? targetGroup.name : null
              });
            }
          }
        }}
      />

      {/* Group Create / Edit Modal */}
      <GroupEditModal
        isOpen={!!isEditingGroup}
        onClose={() => setIsEditingGroup(false)}
        groupToEdit={typeof isEditingGroup === 'object' ? isEditingGroup : null}
        onSave={async (data) => {
          if (typeof isEditingGroup === 'object' && isEditingGroup) {
            await updateGroup(isEditingGroup.id, data);
          } else {
            await createGroup(data);
          }
        }}
        onDelete={async (id) => {
          await deleteGroup(id);
        }}
      />
    </div>
  );
};
