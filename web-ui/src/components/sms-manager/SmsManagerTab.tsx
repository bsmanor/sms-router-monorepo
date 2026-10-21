import React from 'react';
import { useSmsManager } from '../../hooks/useSmsManager';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileMessagesView } from './MobileMessagesView';
import { DesktopMessagesView } from './DesktopMessagesView';
import { RefreshCw } from 'lucide-react';

export const SmsManagerTab: React.FC = () => {
  const isMobile = useIsMobile(768);
  const managerState = useSmsManager();

  if (managerState.loading) {
    return (
      <div className="flex items-center justify-center p-16 text-content-muted">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-brand" />
          <span className="text-sm font-semibold">Loading SMS Manager & Groups...</span>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileMessagesView
        groups={managerState.groups}
        messages={managerState.messages}
        filteredMessages={managerState.filteredMessages}
        activeGroupId={managerState.activeGroupId}
        setActiveGroupId={managerState.setActiveGroupId}
        searchQuery={managerState.searchQuery}
        setSearchQuery={managerState.setSearchQuery}
        unreadOnly={managerState.unreadOnly}
        setUnreadOnly={managerState.setUnreadOnly}
        unreadCounts={managerState.unreadCounts}
        messageCounts={managerState.messageCounts}
        latestMessagePerGroup={managerState.latestMessagePerGroup}
        markAsRead={managerState.markAsRead}
        deleteMessages={managerState.deleteMessages}
        moveMessagesToGroup={managerState.moveMessagesToGroup}
        createGroup={managerState.createGroup}
        updateGroup={managerState.updateGroup}
        deleteGroup={managerState.deleteGroup}
      />
    );
  }

  return (
    <DesktopMessagesView
      groups={managerState.groups}
      messages={managerState.messages}
      filteredMessages={managerState.filteredMessages}
      activeGroupId={managerState.activeGroupId}
      setActiveGroupId={managerState.setActiveGroupId}
      searchQuery={managerState.searchQuery}
      setSearchQuery={managerState.setSearchQuery}
      unreadOnly={managerState.unreadOnly}
      setUnreadOnly={managerState.setUnreadOnly}
      unreadCounts={managerState.unreadCounts}
      messageCounts={managerState.messageCounts}
      latestMessagePerGroup={managerState.latestMessagePerGroup}
      selectedMessageId={managerState.selectedMessageId}
      setSelectedMessageId={managerState.setSelectedMessageId}
      selectedMessage={managerState.selectedMessage}
      markAsRead={managerState.markAsRead}
      deleteMessages={managerState.deleteMessages}
      moveMessagesToGroup={managerState.moveMessagesToGroup}
      createGroup={managerState.createGroup}
      updateGroup={managerState.updateGroup}
      deleteGroup={managerState.deleteGroup}
    />
  );
};
