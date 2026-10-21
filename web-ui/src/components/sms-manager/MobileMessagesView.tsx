import React, { useState } from 'react';
import { SmsGroup, SmsLogDocument } from '../../types';
import { GroupIcon } from './GroupIcon';
import { GroupEditModal } from './GroupEditModal';
import { MoveToGroupModal } from './MoveToGroupModal';
import { extractOtpCode } from '../../utils/otpExtractor';
import { Badge, Button, Input, Card } from '../ui/Primitives';
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
  ArrowLeft,
  MailOpen,
  Mail,
  Edit2,
  Sparkles,
  MessageSquare,
  Clock,
  ShieldCheck
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
  messageCounts: Record<string, number>;
  latestMessagePerGroup: Record<string, SmsLogDocument>;
  markAsRead: (ids: string[], isRead: boolean) => Promise<void>;
  deleteMessages: (ids: string[]) => Promise<void>;
  moveMessagesToGroup: (ids: string[], group: SmsGroup | null) => Promise<void>;
  createGroup: (data: any) => Promise<any>;
  updateGroup: (id: string, data: any) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
}

export const MobileMessagesView: React.FC<MobileMessagesViewProps> = ({
  groups,
  messages,
  filteredMessages,
  activeGroupId,
  setActiveGroupId,
  searchQuery,
  setSearchQuery,
  unreadOnly,
  setUnreadOnly,
  unreadCounts,
  messageCounts,
  latestMessagePerGroup,
  markAsRead,
  deleteMessages,
  moveMessagesToGroup,
  createGroup,
  updateGroup,
  deleteGroup
}) => {
  // Navigation State: 'categories' (Main Hub) or 'messages' (Inside a specific group)
  const [currentView, setCurrentView] = useState<'categories' | 'messages'>('categories');
  const [selectedLog, setSelectedLog] = useState<SmsLogDocument | null>(null);
  const [movingLogIds, setMovingLogIds] = useState<string[] | null>(null);
  const [isEditingGroup, setIsEditingGroup] = useState<SmsGroup | null | boolean>(false);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Long-press detection with haptic feedback
  const touchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const isLongPressActiveRef = React.useRef(false);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(60); // 60ms tactile buzz
      } catch (e) {
        // Ignore if unsupported or restricted
      }
    }
  };

  const handleTouchStart = (msgId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressActiveRef.current = false;

    touchTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      triggerHaptic();
      setSelectionMode(true);
      setSelectedIds((prev) => (prev.includes(msgId) ? prev : [...prev, msgId]));
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !touchTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleMouseDown = (msgId: string, e: React.MouseEvent) => {
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    isLongPressActiveRef.current = false;

    touchTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      triggerHaptic();
      setSelectionMode(true);
      setSelectedIds((prev) => (prev.includes(msgId) ? prev : [...prev, msgId]));
    }, 450);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchStartPosRef.current || !touchTimerRef.current) return;
    const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleMouseUp = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

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

  const openCategory = (groupId: string) => {
    setActiveGroupId(groupId);
    setCurrentView('messages');
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const backToCategories = () => {
    setCurrentView('categories');
    setSelectionMode(false);
    setSelectedIds([]);
    setSearchQuery('');
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
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
  const currentCategoryTitle =
    activeGroupId === 'all'
      ? 'All Messages'
      : activeGroupId === 'ungrouped'
      ? 'Ungrouped Messages'
      : currentGroup?.name || 'Category Messages';

  // =========================================================================
  // VIEW 1: CATEGORIES CARDS HUB (Main Page View Body)
  // Shows categories as cards with message counts - NO message list!
  // =========================================================================
  if (currentView === 'categories') {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        {/* Hub Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black text-content-primary tracking-tight">
              SMS Categories
            </h1>
            <p className="text-xs text-content-muted">
              Select a category to view and manage organized messages
            </p>
          </div>
          {unreadCounts.all > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand text-white shadow-sm">
              {unreadCounts.all} unread
            </span>
          )}
        </div>

        {/* Quick Search across categories */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search messages, OTPs, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 text-xs rounded-2xl shadow-sm"
          />
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-3.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-content-muted hover:text-content-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Direct Jumper (if searching) */}
        {searchQuery.trim().length > 0 && (
          <div
            onClick={() => openCategory('all')}
            className="p-3.5 bg-brand-subtle border border-brand-border rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-brand" />
              <div>
                <span className="text-xs font-bold text-brand block">
                  Search across All Messages
                </span>
                <span className="text-[11px] text-content-secondary">
                  Found {filteredMessages.length} matching messages
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-brand" />
          </div>
        )}

        {/* Categories Cards Grid */}
        <div className="grid grid-cols-1 gap-3">
          {/* Smart Group Cards (Deliveries, Tickets, Confirmations, Custom) */}
          {groups.map((group) => {
            const count = messageCounts[group.id] || 0;
            const unread = unreadCounts[group.id] || 0;
            const latest = latestMessagePerGroup[group.id];

            return (
              <div
                key={group.id}
                onClick={() => openCategory(group.id)}
                className="p-4 bg-surface border border-line-subtle rounded-2xl shadow-sm hover:border-brand/40 active:scale-[0.99] transition-all cursor-pointer space-y-3 relative overflow-hidden"
              >
                {/* Accent line on left */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    group.colorTone === 'warning'
                      ? 'bg-status-warning-text'
                      : group.colorTone === 'info'
                      ? 'bg-status-info-text'
                      : group.colorTone === 'success'
                      ? 'bg-status-success-text'
                      : 'bg-brand'
                  }`}
                />

                <div className="flex items-start justify-between gap-3 pl-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        group.colorTone === 'warning'
                          ? 'bg-status-warning-bg border-status-warning-border text-status-warning-text'
                          : group.colorTone === 'info'
                          ? 'bg-status-info-bg border-status-info-border text-status-info-text'
                          : group.colorTone === 'success'
                          ? 'bg-status-success-bg border-status-success-border text-status-success-text'
                          : 'bg-brand-subtle border-brand-border text-brand'
                      }`}
                    >
                      <GroupIcon iconName={group.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-content-primary flex items-center gap-2">
                        <span>{group.name}</span>
                        {group.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-subtle text-content-muted font-normal">
                            System
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-content-muted line-clamp-1 mt-0.5">
                        {group.description || 'Auto-categorized messages'}
                      </p>
                    </div>
                  </div>

                  {/* Message Count & Unread Badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-surface-subtle border border-line-subtle text-content-primary">
                      {count} {count === 1 ? 'msg' : 'msgs'}
                    </span>
                    {unread > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand text-white">
                        {unread} new
                      </span>
                    )}
                  </div>
                </div>

                {/* Latest message snippet if available */}
                {latest ? (
                  <div className="p-2.5 bg-surface-subtle/70 rounded-xl border border-line-subtle text-[11px] flex items-center justify-between gap-2 pl-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-content-primary shrink-0">{latest.sender}:</span>
                      <span className="text-content-secondary truncate">{latest.body}</span>
                    </div>
                    <span className="text-[10px] text-content-muted font-mono shrink-0">
                      {formatTime(latest.receivedAt)}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-content-muted italic pl-1 flex items-center gap-1">
                    <span>No messages yet in this category</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Ungrouped Messages Card */}
          <div
            onClick={() => openCategory('ungrouped')}
            className="p-4 bg-surface border border-line-subtle rounded-2xl shadow-sm hover:border-brand/40 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-surface-subtle border border-line-subtle text-content-secondary flex items-center justify-center shrink-0">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-content-primary">Ungrouped Messages</h3>
                <p className="text-[11px] text-content-muted">SMS not yet assigned to any category</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-surface-subtle border border-line-subtle text-content-primary">
                {messageCounts.ungrouped || 0}
              </span>
              <ChevronRight className="w-4 h-4 text-content-muted" />
            </div>
          </div>

          {/* All Messages Card */}
          <div
            onClick={() => openCategory('all')}
            className="p-4 bg-surface border border-line-subtle rounded-2xl shadow-sm hover:border-brand/40 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-content-primary">All Messages</h3>
                <p className="text-[11px] text-content-muted">Full chronological feed of all SMS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-surface-subtle border border-line-subtle text-content-primary">
                {messages.length}
              </span>
              <ChevronRight className="w-4 h-4 text-content-muted" />
            </div>
          </div>

          {/* + Create New Category Action Card */}
          <button
            onClick={() => setIsEditingGroup(true)}
            className="p-4 rounded-2xl border-2 border-dashed border-line-subtle bg-surface/50 hover:bg-surface text-content-muted hover:text-content-primary flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <FolderPlus className="w-4 h-4 text-brand" />
            <span className="text-xs font-bold text-brand">Create New Category</span>
          </button>
        </div>

        {/* Group Modal */}
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
  }

  // =========================================================================
  // VIEW 2: CATEGORY DETAIL VIEW (When a category card is clicked)
  // Shows back button, category header, and the list of messages in this category
  // =========================================================================
  return (
    <div className="space-y-3 animate-fadeIn pb-16">
      {/* Category Navigation Header */}
      <div className="bg-surface border border-line-subtle rounded-2xl p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          {/* 1-Tap Back Button */}
          <button
            onClick={backToCategories}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-surface-subtle border border-line-subtle text-brand hover:bg-brand-subtle transition-colors active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          <div className="flex items-center gap-2">
            {currentGroup && (
              <button
                onClick={() => setIsEditingGroup(currentGroup)}
                className="p-1.5 rounded-lg border border-line-subtle text-content-muted hover:text-content-primary hover:bg-surface-subtle"
                title="Edit Category"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedIds([]);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors ${
                selectionMode
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'border-line-subtle bg-surface text-content-secondary'
              }`}
            >
              {selectionMode ? 'Done' : 'Select'}
            </button>
          </div>
        </div>

        {/* Category Title Strip */}
        <div className="flex items-center justify-between border-t border-line-subtle pt-2.5">
          <div className="flex items-center gap-2.5">
            {currentGroup ? (
              <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center">
                <GroupIcon iconName={currentGroup.icon} className="w-4 h-4" />
              </div>
            ) : activeGroupId === 'ungrouped' ? (
              <div className="w-8 h-8 rounded-xl bg-surface-subtle text-content-secondary border border-line-subtle flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-content-primary">{currentCategoryTitle}</h2>
              <span className="text-[11px] text-content-muted">
                {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              unreadOnly
                ? 'border-brand bg-brand-subtle text-brand'
                : 'border-line-subtle bg-surface text-content-muted'
            }`}
          >
            <span>Unread</span>
            {unreadOnly && <Check className="w-3 h-3" />}
          </button>
        </div>

        {/* Search Bar inside this category */}
        <div className="relative">
          <Input
            type="text"
            placeholder={`Search in ${currentCategoryTitle}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
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
      </div>

      {/* Messages List Area */}
      <div className="space-y-2.5">
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-line-subtle rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-line-subtle text-content-muted flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-content-primary">No messages in this category</h3>
            <p className="text-xs text-content-muted max-w-xs mx-auto">
              {searchQuery
                ? 'No messages match your search. Try clearing the filter.'
                : 'Messages matching this category keywords will appear here automatically.'}
            </p>
            <Button variant="secondary" size="sm" onClick={backToCategories}>
              ← Back to Categories
            </Button>
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
                onTouchStart={(e) => handleTouchStart(msg.id, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => handleMouseDown(msg.id, e)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={(e) => {
                  // Prevent native context menu on long-press
                  e.preventDefault();
                }}
                onClick={() => {
                  if (isLongPressActiveRef.current) {
                    isLongPressActiveRef.current = false;
                    return;
                  }
                  if (selectionMode) {
                    toggleSelectId(msg.id);
                  } else {
                    setSelectedLog(msg);
                    if (isUnread) {
                      markAsRead([msg.id], true);
                    }
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all active:scale-[0.99] select-none ${
                  isSelected
                    ? 'border-brand bg-brand-subtle/50 ring-2 ring-brand/30'
                    : isUnread
                    ? 'border-brand/40 bg-surface shadow-sm'
                    : 'border-line-subtle bg-surface/80 hover:bg-surface'
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

                  {/* Message Card Body */}
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

                    {/* Metadata & 1-Tap OTP Chip */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {/* OTP Chip */}
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

      {/* Floating Multi-Select Action Bar */}
      {selectionMode && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] inset-x-3 z-[90] bg-surface/98 border border-line-subtle rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2 animate-slideUp">
          <div className="flex items-center gap-2 pl-1">
            <span className="text-xs font-bold text-content-primary">
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'Select Messages'}
            </span>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="text-[10px] text-content-muted hover:text-content-primary underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Move to Category Button */}
            <Button
              variant="brand"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => setMovingLogIds(selectedIds)}
              className="gap-1.5 text-xs font-bold shadow-sm"
              title="Move selected messages to a category"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Move</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => handleBatchMarkRead(true)}
              title="Mark as Read"
              className="px-2.5"
            >
              <MailOpen className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="danger"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={handleBatchDelete}
              title="Delete Selected"
              className="px-2.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>

            <button
              onClick={() => {
                setSelectionMode(false);
                setSelectedIds([]);
              }}
              className="p-1.5 rounded-xl border border-line-subtle bg-surface-subtle text-content-muted hover:text-content-primary"
              title="Exit Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message Reader Bottom Sheet */}
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
                    <span className="text-[10px] text-status-success-text font-bold block">VERIFICATION CODE</span>
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
                  <span className="text-content-muted">Assigned Category:</span>
                  <span className="font-semibold text-content-primary">
                    {selectedLog.groupName || 'Ungrouped'}
                  </span>
                </div>
                <button
                  onClick={() => setMovingLogIds([selectedLog.id])}
                  className="text-brand text-xs font-bold hover:underline flex items-center gap-1"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>
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
                <span>{selectedLog.isRead ? 'Unread' : 'Read'}</span>
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

      {/* Move to Group Modal */}
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
            setSelectedIds([]);
            setSelectionMode(false);
          }
        }}
      />

      {/* Group Modal */}
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
          backToCategories();
        }}
      />
    </div>
  );
};
