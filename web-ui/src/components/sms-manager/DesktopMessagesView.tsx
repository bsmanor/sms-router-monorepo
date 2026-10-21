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
  ArrowLeft,
  MailOpen,
  Mail,
  Edit2,
  Smartphone,
  ExternalLink,
  Clock
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
  messageCounts: Record<string, number>;
  latestMessagePerGroup: Record<string, SmsLogDocument>;
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
  const [viewMode, setViewMode] = useState<'categories' | 'messages'>('categories');
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

  const openCategory = (groupId: string) => {
    setActiveGroupId(groupId);
    setViewMode('messages');
    setSelectedIds([]);
  };

  const backToCategories = () => {
    setViewMode('categories');
    setSelectedIds([]);
    setSearchQuery('');
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
  if (viewMode === 'categories') {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Hub Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-content-primary tracking-tight">
              SMS Message Categories
            </h1>
            <p className="text-xs text-content-muted mt-0.5">
              Select a category card to open and manage its message feed
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="brand"
              size="md"
              onClick={() => setIsEditingGroup(true)}
              className="gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create New Category</span>
            </Button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative max-w-xl">
          <Input
            type="text"
            placeholder="Search across all messages, senders, or OTPs..."
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

        {/* Direct Jumper if searching */}
        {searchQuery.trim().length > 0 && (
          <div
            onClick={() => openCategory('all')}
            className="p-4 bg-brand-subtle border border-brand-border rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-brand" />
              <div>
                <span className="text-xs font-bold text-brand block">
                  Search across All Messages
                </span>
                <span className="text-xs text-content-secondary">
                  Found {filteredMessages.length} matching messages for &quot;{searchQuery}&quot;
                </span>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              <span>View Search Results</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Category Cards Grid (3 Columns on Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Default and Custom Group Cards */}
          {groups.map((group) => {
            const count = messageCounts[group.id] || 0;
            const unread = unreadCounts[group.id] || 0;
            const latest = latestMessagePerGroup[group.id];

            return (
              <div
                key={group.id}
                onClick={() => openCategory(group.id)}
                className="group p-5 bg-surface border border-line-subtle rounded-2xl shadow-sm hover:border-brand/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Colored Accent Top Border */}
                <div
                  className={`absolute left-0 right-0 top-0 h-1.5 ${
                    group.colorTone === 'warning'
                      ? 'bg-status-warning-text'
                      : group.colorTone === 'info'
                      ? 'bg-status-info-text'
                      : group.colorTone === 'success'
                      ? 'bg-status-success-text'
                      : 'bg-brand'
                  }`}
                />

                <div className="space-y-3 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                          group.colorTone === 'warning'
                            ? 'bg-status-warning-bg border-status-warning-border text-status-warning-text'
                            : group.colorTone === 'info'
                            ? 'bg-status-info-bg border-status-info-border text-status-info-text'
                            : group.colorTone === 'success'
                            ? 'bg-status-success-bg border-status-success-border text-status-success-text'
                            : 'bg-brand-subtle border-brand-border text-brand'
                        }`}
                      >
                        <GroupIcon iconName={group.icon} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-content-primary flex items-center gap-2 group-hover:text-brand transition-colors">
                          <span>{group.name}</span>
                          {group.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-subtle text-content-muted font-normal">
                              System
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-content-muted line-clamp-1 mt-0.5">
                          {group.description || 'Auto-categorized SMS'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingGroup(group);
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-subtle text-content-muted hover:text-content-primary transition-all"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Message Count & Unread Badges */}
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-surface-subtle border border-line-subtle text-content-primary">
                      {count} {count === 1 ? 'Message' : 'Messages'}
                    </span>
                    {unread > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand text-white shadow-sm">
                        {unread} new
                      </span>
                    )}
                  </div>
                </div>

                {/* Latest message snippet */}
                <div className="pt-2 border-t border-line-subtle">
                  {latest ? (
                    <div className="p-2.5 bg-surface-subtle/80 rounded-xl border border-line-subtle text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono text-[10px] text-content-muted">
                        <span className="font-bold text-content-primary truncate">{latest.sender}</span>
                        <span>{formatTime(latest.receivedAt)}</span>
                      </div>
                      <p className="text-content-secondary line-clamp-1 text-[11px]">{latest.body}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-content-muted italic">No messages yet</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Ungrouped Messages Card */}
          <div
            onClick={() => openCategory('ungrouped')}
            className="group p-5 bg-surface border border-line-subtle rounded-2xl shadow-sm hover:border-brand/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-line-subtle text-content-secondary flex items-center justify-center shrink-0">
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-content-primary group-hover:text-brand transition-colors">
                    Ungrouped Messages
                  </h3>
                  <p className="text-xs text-content-muted">SMS not matching any custom rules</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-surface-subtle border border-line-subtle text-content-primary">
                  {messageCounts.ungrouped || 0} Messages
                </span>
                {unreadCounts.ungrouped > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand text-white shadow-sm">
                    {unreadCounts.ungrouped} new
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-xs text-brand font-semibold">
              <span>View Ungrouped Feed</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* All Messages Card */}
          <div
            onClick={() => openCategory('all')}
            className="group p-5 bg-surface border border-line-subtle rounded-2xl shadow-sm hover:border-brand/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand border border-brand-border flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-content-primary group-hover:text-brand transition-colors">
                    All Messages
                  </h3>
                  <p className="text-xs text-content-muted">Complete chronological log of all SMS</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-surface-subtle border border-line-subtle text-content-primary">
                  {messages.length} Total Messages
                </span>
                {unreadCounts.all > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand text-white shadow-sm">
                    {unreadCounts.all} new
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-xs text-brand font-semibold">
              <span>View Master Feed</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* + Create New Category Action Card */}
          <div
            onClick={() => setIsEditingGroup(true)}
            className="p-5 rounded-2xl border-2 border-dashed border-line-subtle bg-surface/50 hover:bg-surface text-content-muted hover:text-content-primary flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all hover:border-brand/50 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderPlus className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-brand">Create New Category</span>
            <span className="text-xs text-content-muted text-center max-w-[200px]">
              Set up auto-matching keywords or manual groups
            </span>
          </div>
        </div>

        {/* Group Edit Modal */}
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
  // VIEW 2: CATEGORY DETAIL WORKBENCH (Inside a specific group)
  // Shows Back button, Message list, and Message reader inspector
  // =========================================================================
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Category Navigation Bar */}
      <div className="flex items-center justify-between bg-surface border border-line-subtle rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={backToCategories}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Categories</span>
          </Button>

          <div className="h-6 w-px bg-line-subtle" />

          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-content-primary">{currentCategoryTitle}</h2>
            <Badge tone="neutral">{filteredMessages.length} messages</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentGroup && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditingGroup(currentGroup)}
              className="gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Category</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className="gap-1.5"
          >
            {unreadOnly && <Check className="w-3.5 h-3.5 text-brand" />}
            <span>Unread Only</span>
          </Button>
        </div>
      </div>

      {/* 2-Pane Message List & Inspector Layout */}
      <div className="flex h-[calc(100vh-16rem)] bg-surface border border-line-subtle rounded-2xl overflow-hidden shadow-sm">
        {/* Left Pane: Message List (450px) */}
        <div className="w-[420px] lg:w-[460px] border-r border-line-subtle flex flex-col shrink-0 bg-surface">
          {/* Search Header */}
          <div className="p-3 border-b border-line-subtle space-y-2">
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

            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === filteredMessages.length}
                  onChange={handleSelectAll}
                  className="rounded text-brand focus:ring-brand"
                />
                <span className="text-[11px] text-content-muted">
                  {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select All'}
                </span>
              </div>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedIds.length > 0 && (
            <div className="bg-brand-subtle border-b border-brand-border px-3 py-2 flex items-center justify-between text-xs animate-fadeIn">
              <span className="font-bold text-brand">{selectedIds.length} selected</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBatchMarkRead(true)}
                  className="h-7 px-2 text-xs"
                >
                  <MailOpen className="w-3.5 h-3.5" />
                  <span>Read</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMovingLogIds(selectedIds)}
                  className="h-7 px-2 text-xs"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Move</span>
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBatchDelete}
                  className="h-7 px-2 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-line-subtle/50">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-content-muted text-xs space-y-2">
                <Inbox className="w-8 h-8 mx-auto text-content-muted/50" />
                <p className="font-semibold text-content-primary">No messages in this category</p>
                <p className="text-[11px]">Messages routed to this group will appear here.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessageId === msg.id;
                const isChecked = selectedIds.includes(msg.id);
                const isUnread = !msg.isRead;
                const otpCode = extractOtpCode(msg.body);

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessageId(msg.id);
                      if (isUnread) {
                        markAsRead([msg.id], true);
                      }
                    }}
                    className={`p-3.5 transition-colors cursor-pointer relative group ${
                      isSelected
                        ? 'bg-brand-subtle/40 border-l-4 border-l-brand'
                        : isUnread
                        ? 'bg-surface font-semibold hover:bg-surface-subtle'
                        : 'bg-surface/60 hover:bg-surface-subtle'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => toggleSelectId(msg.id, e)}
                          onChange={() => {}}
                          className="rounded text-brand focus:ring-brand"
                        />
                      </div>

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
                          {otpCode && (
                            <button
                              onClick={(e) => handleCopyOtp(e, otpCode)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-status-success-bg border border-status-success-border text-status-success-text hover:opacity-80"
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

        {/* Right Pane: Message Detail Inspector */}
        <div className="flex-1 flex flex-col bg-surface overflow-hidden">
          {selectedMessage ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await markAsRead([selectedMessage.id], !selectedMessage.isRead);
                    }}
                  >
                    {selectedMessage.isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                    <span>{selectedMessage.isRead ? 'Mark Unread' : 'Mark Read'}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setMovingLogIds([selectedMessage.id])}
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    <span>Move</span>
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (confirm('Delete this message?')) {
                        await deleteMessages([selectedMessage.id]);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <Card className="space-y-4">
                  <div className="flex items-center justify-between border-b border-line-subtle pb-3">
                    <span className="text-xs font-bold text-content-primary uppercase tracking-wider">
                      Message Content
                    </span>
                    <Badge tone="neutral">{selectedMessage.deviceId || 'Android Gateway'}</Badge>
                  </div>

                  <div className="p-4 bg-surface-subtle border border-line-subtle rounded-xl select-text">
                    <p className="text-sm text-content-primary leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedMessage.body}
                    </p>
                  </div>

                  {selectedOtp && (
                    <div className="p-3 bg-status-success-bg border border-status-success-border rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-status-success-text font-bold block">
                          VERIFICATION CODE DETECTED
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
                        <span>{copiedOtp === selectedOtp ? 'Copied' : 'Copy Code'}</span>
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Routing Telemetry */}
                {selectedMessage.matchedRules && selectedMessage.matchedRules.length > 0 && (
                  <Card className="space-y-3">
                    <h3 className="text-xs font-bold text-content-primary">
                      Routing Execution ({selectedMessage.matchedRules.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedMessage.matchedRules.map((rule) => (
                        <div
                          key={rule.ruleId}
                          className="p-3 bg-surface-subtle border border-line-subtle rounded-xl space-y-1 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-content-primary">{rule.ruleName}</span>
                            <span className={rule.success ? 'text-status-success-text' : 'text-status-danger-text'}>
                              HTTP {rule.httpStatus} • {rule.latencyMs}ms
                            </span>
                          </div>
                          <div className="text-[11px] text-content-muted truncate">
                            {rule.targetUrl}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-content-muted space-y-3">
              <Inbox className="w-10 h-10 mx-auto text-content-muted/50" />
              <h3 className="text-sm font-bold text-content-primary">Select a message</h3>
              <p className="text-xs max-w-xs">
                Click any message in the list to inspect its contents, OTP codes, and routing execution.
              </p>
            </div>
          )}
        </div>
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
            setSelectedIds([]);
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
          backToCategories();
        }}
      />
    </div>
  );
};
