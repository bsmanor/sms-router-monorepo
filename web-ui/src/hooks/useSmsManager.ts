import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { SmsGroup, SmsLogDocument } from '../types';

export const DEFAULT_GROUPS_SEED: Array<Omit<SmsGroup, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'deliveries',
    name: 'Deliveries',
    slug: 'deliveries',
    description: 'Package shipments, courier tracking, and food orders',
    icon: 'Package',
    colorTone: 'warning',
    isDefault: true,
    order: 1,
    autoMatchKeywords: [
      'delivery', 'courier', 'package', 'tracking', 'shipment',
      'wolt', 'dhl', 'fedex', 'ups', 'amazon', 'post', 'order', 'parcel',
      'משלוח', 'החבילה', 'שליח', 'הזמנה'
    ]
  },
  {
    id: 'tickets',
    name: 'Tickets',
    slug: 'tickets',
    description: 'Boarding passes, event admissions, cinema, and transit',
    icon: 'Ticket',
    colorTone: 'info',
    isDefault: true,
    order: 2,
    autoMatchKeywords: [
      'ticket', 'boarding', 'flight', 'cinema', 'seat', 'concert',
      'booking', 'gate', 'train', 'movie', 'reservation',
      'כרטיס', 'טיסה', 'רכבת', 'קולנוע', 'הופעה'
    ]
  },
  {
    id: 'confirmations',
    name: 'Confirmations',
    slug: 'confirmations',
    description: 'One-time passwords, verification codes, and security alerts',
    icon: 'CheckCircle2',
    colorTone: 'success',
    isDefault: true,
    order: 3,
    autoMatchKeywords: [
      'otp', 'code', 'verification', 'verify', 'confirmation', 'security code',
      'pin', 'password', 'auth', '2fa', 'passcode',
      'אימות', 'קוד', 'סיסמה', 'אבטחה'
    ]
  }
];

export function useSmsManager() {
  const [groups, setGroups] = useState<SmsGroup[]>([]);
  const [messages, setMessages] = useState<SmsLogDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // 1. Subscribe to SMS Groups
  useEffect(() => {
    const q = query(collection(db, 'sms_groups'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // Auto-seed default groups if collection is empty
          seedDefaultGroupsLocally();
          return;
        }

        const loadedGroups: SmsGroup[] = [];
        snapshot.forEach((d) => {
          loadedGroups.push({ id: d.id, ...d.data() } as SmsGroup);
        });
        setGroups(loadedGroups);
      },
      (err) => {
        console.error('Failed to subscribe to sms_groups:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to SMS Messages (Logs)
  useEffect(() => {
    const q = query(
      collection(db, 'sms_logs'),
      orderBy('receivedAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMessages: SmsLogDocument[] = [];
        snapshot.forEach((d) => {
          loadedMessages.push({ id: d.id, ...d.data() } as SmsLogDocument);
        });
        setMessages(loadedMessages);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to sms_logs:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Seed default groups into Firestore if not present
  const seedDefaultGroupsLocally = async () => {
    const now = Date.now();
    try {
      for (const g of DEFAULT_GROUPS_SEED) {
        await setDoc(doc(db, 'sms_groups', g.id), {
          ...g,
          createdAt: now,
          updatedAt: now
        });
      }
    } catch (e) {
      console.warn('Auto-seed default groups error:', e);
    }
  };

  // Compute Total Message Counts and Latest Message per Group
  const { messageCounts, latestMessagePerGroup } = useMemo(() => {
    const counts: Record<string, number> = {
      all: messages.length,
      ungrouped: 0
    };
    const latest: Record<string, SmsLogDocument> = {};

    groups.forEach((g) => {
      counts[g.id] = 0;
    });

    messages.forEach((m) => {
      const gId = m.groupId || 'ungrouped';
      counts[gId] = (counts[gId] || 0) + 1;

      if (!latest[gId]) {
        latest[gId] = m;
      }
      if (!latest.all) {
        latest.all = m;
      }
    });

    return { messageCounts: counts, latestMessagePerGroup: latest };
  }, [groups, messages]);

  // Compute Unread Counts
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      ungrouped: 0
    };

    groups.forEach((g) => {
      counts[g.id] = 0;
    });

    messages.forEach((m) => {
      if (!m.isRead) {
        counts.all = (counts.all || 0) + 1;
        if (!m.groupId) {
          counts.ungrouped = (counts.ungrouped || 0) + 1;
        } else if (counts[m.groupId] !== undefined) {
          counts[m.groupId] = counts[m.groupId] + 1;
        }
      }
    });

    return counts;
  }, [groups, messages]);

  // Compute Filtered Messages
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      // Group filter
      if (activeGroupId === 'ungrouped') {
        if (m.groupId) return false;
      } else if (activeGroupId !== 'all') {
        if (m.groupId !== activeGroupId) return false;
      }

      // Unread only filter
      if (unreadOnly && m.isRead) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const senderMatch = m.sender?.toLowerCase().includes(q);
        const bodyMatch = m.body?.toLowerCase().includes(q);
        const groupMatch = m.groupName?.toLowerCase().includes(q);
        if (!senderMatch && !bodyMatch && !groupMatch) {
          return false;
        }
      }

      return true;
    });
  }, [messages, activeGroupId, unreadOnly, searchQuery]);

  // Auto-select first message if current selection is invalid
  const selectedMessage = useMemo(() => {
    if (!selectedMessageId) {
      return filteredMessages[0] || null;
    }
    return messages.find((m) => m.id === selectedMessageId) || filteredMessages[0] || null;
  }, [selectedMessageId, filteredMessages, messages]);

  // Mark single or multiple messages as read/unread
  const markAsRead = useCallback(async (logIds: string[], isRead: boolean) => {
    if (logIds.length === 0) return;
    const batch = writeBatch(db);
    logIds.forEach((id) => {
      batch.update(doc(db, 'sms_logs', id), { isRead });
    });
    await batch.commit();
  }, []);

  // Delete messages
  const deleteMessages = useCallback(async (logIds: string[]) => {
    if (logIds.length === 0) return;
    const batch = writeBatch(db);
    logIds.forEach((id) => {
      batch.delete(doc(db, 'sms_logs', id));
    });
    await batch.commit();
    if (selectedMessageId && logIds.includes(selectedMessageId)) {
      setSelectedMessageId(null);
    }
  }, [selectedMessageId]);

  // Move messages to a group
  const moveMessagesToGroup = useCallback(async (logIds: string[], targetGroup: SmsGroup | null) => {
    if (logIds.length === 0) return;
    const batch = writeBatch(db);
    logIds.forEach((id) => {
      batch.update(doc(db, 'sms_logs', id), {
        groupId: targetGroup ? targetGroup.id : null,
        groupName: targetGroup ? targetGroup.name : null
      });
    });
    await batch.commit();
  }, []);

  // Group CRUD: Create
  const createGroup = useCallback(async (data: {
    name: string;
    description?: string;
    icon?: string;
    colorTone?: SmsGroup['colorTone'];
    autoMatchKeywords?: string[];
  }) => {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newId = slug || 'group-' + Date.now();
    const newGroup: SmsGroup = {
      id: newId,
      name: data.name.trim(),
      slug: newId,
      description: data.description?.trim() || '',
      icon: data.icon || 'Folder',
      colorTone: data.colorTone || 'brand',
      isDefault: false,
      order: groups.length + 1,
      autoMatchKeywords: data.autoMatchKeywords || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(doc(db, 'sms_groups', newId), newGroup);
    return newGroup;
  }, [groups.length]);

  // Group CRUD: Update
  const updateGroup = useCallback(async (groupId: string, data: Partial<SmsGroup>) => {
    await updateDoc(doc(db, 'sms_groups', groupId), {
      ...data,
      updatedAt: Date.now()
    });

    // If name changed, update cached groupName across existing messages
    if (data.name) {
      const messagesToUpdate = messages.filter((m) => m.groupId === groupId);
      if (messagesToUpdate.length > 0) {
        const batch = writeBatch(db);
        messagesToUpdate.forEach((m) => {
          batch.update(doc(db, 'sms_logs', m.id), {
            groupName: data.name
          });
        });
        await batch.commit();
      }
    }
  }, [messages]);

  // Group CRUD: Delete
  const deleteGroup = useCallback(async (groupId: string) => {
    // 1. Unlink any messages that belonged to this group
    const messagesToUnlink = messages.filter((m) => m.groupId === groupId);
    if (messagesToUnlink.length > 0) {
      const batch = writeBatch(db);
      messagesToUnlink.forEach((m) => {
        batch.update(doc(db, 'sms_logs', m.id), {
          groupId: null,
          groupName: null
        });
      });
      await batch.commit();
    }

    // 2. Delete the group doc
    await deleteDoc(doc(db, 'sms_groups', groupId));

    // Reset active view if we were inside the deleted group
    if (activeGroupId === groupId) {
      setActiveGroupId('all');
    }
  }, [messages, activeGroupId]);

  return {
    groups,
    messages,
    loading,
    activeGroupId,
    setActiveGroupId,
    searchQuery,
    setSearchQuery,
    unreadOnly,
    setUnreadOnly,
    selectedMessageId,
    setSelectedMessageId,
    selectedMessage,
    filteredMessages,
    unreadCounts,
    messageCounts,
    latestMessagePerGroup,
    markAsRead,
    deleteMessages,
    moveMessagesToGroup,
    createGroup,
    updateGroup,
    deleteGroup
  };
}
