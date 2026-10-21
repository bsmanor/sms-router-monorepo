import React, { useState } from 'react';
import { SmsGroup, SmsLogDocument } from '../../types';
import { GroupIcon } from './GroupIcon';
import { GroupEditModal } from './GroupEditModal';
import { MoveToGroupModal } from './MoveToGroupModal';
import { extractOtpCode } from '../../utils/otpExtractor';
import { Card, Badge, Button, Input } from '../ui/Primitives';
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
  MailOpen,
  Mail,
  Edit2,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Clock,
  Send
} from 'lucide-react';

interface DesktopMessagesViewProps {
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
  selectedMessageId: string | null;
  setSelectedMessageId: (id: string | null) => void;
  selectedMessage: SmsLogDocument | null;
  markAsRead: (ids: string[], isRead: boolean) => Promise<void>;
  deleteMessages: (ids: string[]) => Promise<void>;
  moveMessagesToGroup: (ids: string[], group: SmsGroup | null) => Promise<void>;
  createGroup: (data: any) => Promise<any>;
  updateGroup: (id: string, data: any) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
}

export const DesktopMessagesView: React.FC<DesktopMessagesViewProps> = ({
  groups,
  filteredMessages,
  activeGroupId,
  setActiveGroupId,
  searchQuery,
  setSearchQuery,
  unreadOnly,
  setUnreadOnly,
  unreadCounts,
  selectedMessageId,
  setSelectedMessageId,
  selectedMessage,
  markAsRead,
  deleteMessages,
  moveMessagesToGroup,
  createGroup,
  updateGroup,
  deleteGroup
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [movingLogIds, setMovingLogIds] = useState<string[] | null>(null);
  const [isEditingGroup, setIsEditingGroup] = useState<SmsGroup | null | boolean>(false);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

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

  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    }
  };

  const handleBatchMarkRead = async (isRead: boolean) => {
    if (selectedIds.length === 0) return;
    await markAsRead(selectedIds, isRead);
    setSelectedIds([]);
  };

  const selectedOtp = selectedMessage ? extractOtpCode(selectedMessage.body) : null;
  const currentGroup = groups.find((g) => g.id === selectedMessage?.groupId);

  return (
    <div className="flex h-[calc(100vh-11rem)] bg-surface border border-line-subtle rounded-2xl overflow-hidden shadow-sm">
      {/* 1. LEFT SIDEBAR: Categories & Groups (260px) */}
      <div className="w-64 border-r border-line-subtle bg-surface-subtle/50 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-line-subtle flex items-center justify-between">
          <span className="text-xs font-bold text-content-primary tracking-tight uppercase">
            Categories
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditingGroup(true)}
            className="h-7 px-2 text-[11px]"
            title="Create New Group"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New</span>
          </Button>
        </div>

        {/* Categories Navigation Tree */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 text-xs">
          {/* All Messages */}
          <button
            onClick={() => setActiveGroupId('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
              activeGroupId === 'all'
                ? 'bg-brand text-white font-bold shadow-sm'
                : 'text-content-secondary hover:bg-surface-subtle hover:text-content-primary'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>All Messages</span>
            </div>
            {unreadCounts.all > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeGroupId === 'all' ? 'bg-white/20 text-white' : 'bg-brand-subtle text-brand font-bold'
              }`}>
                {unreadCounts.all}
              </span>
            )}
          </button>

          {/* Ungrouped */}
          <button
            onClick={() => setActiveGroupId('ungrouped')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
              activeGroupId === 'ungrouped'
                ? 'bg-brand text-white font-bold shadow-sm'
                : 'text-content-secondary hover:bg-surface-subtle hover:text-content-primary'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4" />
              <span>Ungrouped</span>
            </div>
            {unreadCounts.ungrouped > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeGroupId === 'ungrouped' ? 'bg-white/20 text-white' : 'bg-brand-subtle text-brand font-bold'
              }`}>
                {unreadCounts.ungrouped}
              </span>
            )}
          </button>

          <div className="pt-2 pb-1 px-3">
            <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider">
              Smart Groups
            </span>
          </div>

          {/* Groups List */}
          {groups.map((group) => {
            const isActive = activeGroupId === group.id;
            const unread = unreadCounts[group.id] || 0;
            return (
              <div
                key={group.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand text-white font-bold shadow-sm'
                    : 'text-content-secondary hover:bg-surface-subtle hover:text-content-primary'
                }`}
                onClick={() => setActiveGroupId(group.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <GroupIcon iconName={group.icon} className="w-4 h-4 shrink-0" />
                  <span className="truncate">{group.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {unread > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-subtle text-brand font-bold'
                    }`}>
                      {unread}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingGroup(group);
                    }}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-surface text-content-muted'
                    }`}
                    title="Edit Group"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MIDDLE LIST PANE: Message List (400px - flex) */}
      <div className="w-[380px] lg:w-[420px] border-r border-line-subtle flex flex-col shrink-0 bg-surface">
        {/* Search & Filter Header */}
        <div className="p-3 border-b border-line-subtle space-y-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search sender, body text, OTP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
            <Search className="w-3.5 h-3.5 text-content-muted absolute left-2.5 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-content-muted hover:text-content-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && selectedIds.length === filteredMessages.length}
                onChange={handleSelectAll}
                className="rounded text-brand focus:ring-brand"
              />
              <span className="text-[11px] text-content-muted">
                {filteredMessages.length} messages
              </span>
            </div>

            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                unreadOnly
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'border-line-subtle text-content-muted hover:text-content-primary'
              }`}
            >
              <span>Unread Only</span>
              {unreadOnly && <Check className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Bulk Action Toolbar (Appears when items checked) */}
        {selectedIds.length > 0 && (
          <div className="bg-brand-subtle border-b border-brand-border px-3 py-2 flex items-center justify-between animate-fadeIn text-xs">
            <span className="font-bold text-brand">{selectedIds.length} selected</span>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBatchMarkRead(true)}
                className="h-6 px-2 text-[10px]"
              >
                <MailOpen className="w-3 h-3" />
                <span>Read</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMovingLogIds(selectedIds)}
                className="h-6 px-2 text-[10px]"
              >
                <FolderInput className="w-3 h-3" />
                <span>Move</span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBatchDelete}
                className="h-6 px-2 text-[10px]"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-line-subtle/50">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-content-muted text-xs space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-content-muted/50" />
              <p className="font-semibold text-content-primary">No messages in this view</p>
              <p className="text-[11px]">Incoming messages from paired devices will populate here.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSelected = selectedMessageId === msg.id;
              const isChecked = selectedIds.includes(msg.id);
              const isUnread = !msg.isRead;
              const otpCode = extractOtpCode(msg.body);
              const groupMatch = groups.find((g) => g.id === msg.groupId);

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessageId(msg.id);
                    if (isUnread) {
                      markAsRead([msg.id], true);
                    }
                  }}
                  className={`p-3 transition-colors cursor-pointer relative group ${
                    isSelected
                      ? 'bg-brand-subtle/40 border-l-4 border-l-brand'
                      : isUnread
                      ? 'bg-surface font-semibold hover:bg-surface-subtle'
                      : 'bg-surface/60 hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox */}
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => toggleSelectId(msg.id, e)}
                        onChange={() => {}}
                        className="rounded text-brand focus:ring-brand"
                      />
                    </div>

                    {/* Sender & Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate ${isUnread ? 'font-bold text-content-primary' : 'text-content-secondary'}`}>
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-content-muted shrink-0 font-mono">
                          {formatTime(msg.receivedAt)}
                        </span>
                      </div>

                      <p className={`text-xs line-clamp-2 leading-relaxed ${isUnread ? 'text-content-primary font-medium' : 'text-content-muted'}`}>
                        {msg.body}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {groupMatch && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-line-subtle bg-surface text-content-secondary font-mono">
                            <GroupIcon iconName={groupMatch.icon} className="w-2.5 h-2.5" />
                            <span>{groupMatch.name}</span>
                          </span>
                        )}

                        {otpCode && (
                          <button
                            onClick={(e) => handleCopyOtp(e, otpCode)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-status-success-bg border border-status-success-border text-status-success-text hover:opacity-80"
                            title="Click to copy OTP"
                          >
                            {copiedOtp === otpCode ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                            <span>{otpCode}</span>
                          </button>
                        )}

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-brand ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. RIGHT DETAIL INSPECTOR PANE (flex-1) */}
      <div className="flex-1 flex flex-col bg-surface overflow-hidden">
        {selectedMessage ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Inspector Header */}
            <div className="p-4 border-b border-line-subtle flex items-center justify-between bg-surface-subtle/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center font-bold text-sm">
                  {(selectedMessage.sender || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-content-primary">
                    {selectedMessage.sender}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-content-muted font-mono mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(selectedMessage.receivedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await markAsRead([selectedMessage.id], !selectedMessage.isRead);
                  }}
                  title={selectedMessage.isRead ? 'Mark as Unread' : 'Mark as Read'}
                >
                  {selectedMessage.isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                  <span>{selectedMessage.isRead ? 'Mark Unread' : 'Mark Read'}</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMovingLogIds([selectedMessage.id])}
                  title="Move to Group"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>{currentGroup ? currentGroup.name : 'Move Group'}</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (confirm('Delete this message?')) {
                      await deleteMessages([selectedMessage.id]);
                    }
                  }}
                  title="Delete Message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {/* Inspector Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Message Body Card */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-line-subtle pb-3">
                  <span className="text-xs font-bold text-content-primary uppercase tracking-wider">
                    SMS Body
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-content-muted">Device:</span>
                    <Badge tone="neutral">{selectedMessage.deviceId || 'Android Gateway'}</Badge>
                  </div>
                </div>

                <div className="p-4 bg-surface-subtle border border-line-subtle rounded-xl select-text">
                  <p className="text-sm text-content-primary leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedMessage.body}
                  </p>
                </div>

                {/* OTP Highlight Banner */}
                {selectedOtp && (
                  <div className="p-3 bg-status-success-bg border border-status-success-border rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-status-success-text font-bold block">
                        EXTRACTED VERIFICATION CODE
                      </span>
                      <span className="text-xl font-mono font-black text-status-success-text">
                        {selectedOtp}
                      </span>
                    </div>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={(e) => handleCopyOtp(e, selectedOtp)}
                    >
                      {copiedOtp === selectedOtp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedOtp === selectedOtp ? 'Copied to Clipboard' : 'Copy Code'}</span>
                    </Button>
                  </div>
                )}
              </Card>

              {/* Group Metadata & Reclassification */}
              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-content-primary">Categorization</h3>
                    <p className="text-[11px] text-content-muted">
                      {currentGroup ? `Assigned to "${currentGroup.name}" group` : 'Currently ungrouped'}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setMovingLogIds([selectedMessage.id])}
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    <span>Change Group</span>
                  </Button>
                </div>
              </Card>

              {/* Webhook Routing Telemetry */}
              <Card className="space-y-3">
                <h3 className="text-xs font-bold text-content-primary">
                  Routing Rules Execution ({selectedMessage.matchedRules?.length || 0})
                </h3>
                {selectedMessage.matchedRules && selectedMessage.matchedRules.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMessage.matchedRules.map((rule) => (
                      <div
                        key={rule.ruleId}
                        className="p-3 bg-surface-subtle border border-line-subtle rounded-xl space-y-1.5 font-mono text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-content-primary">{rule.ruleName}</span>
                          <span className={rule.success ? 'text-status-success-text' : 'text-status-danger-text'}>
                            HTTP {rule.httpStatus} ({rule.latencyMs}ms)
                          </span>
                        </div>
                        <div className="text-[11px] text-content-muted truncate">
                          URL: {rule.targetUrl}
                        </div>
                        {rule.responseBody && (
                          <div className="text-[10px] text-content-muted bg-surface p-2 rounded border border-line-subtle truncate">
                            Response: {rule.responseBody}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-content-muted">
                    No webhook routing rules matched this SMS payload.
                  </p>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-content-muted space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-line-subtle flex items-center justify-center text-content-muted">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-content-primary">No message selected</h3>
            <p className="text-xs max-w-xs">
              Select an SMS message from the list to view its full contents, OTP codes, and routing execution logs.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
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
          }
        }}
      />

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
