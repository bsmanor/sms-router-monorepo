import React from 'react';
import {
  Package,
  Ticket,
  CheckCircle2,
  Folder,
  Bell,
  CreditCard,
  Tag,
  Mail,
  Shield,
  Zap,
  ShoppingBag,
  Inbox,
  Layers,
  LucideIcon
} from 'lucide-react';

export const ICON_OPTIONS: Array<{ name: string; icon: LucideIcon; label: string }> = [
  { name: 'Package', icon: Package, label: 'Deliveries & Packages' },
  { name: 'Ticket', icon: Ticket, label: 'Tickets & Travel' },
  { name: 'CheckCircle2', icon: CheckCircle2, label: 'Confirmations & OTP' },
  { name: 'CreditCard', icon: CreditCard, label: 'Banking & Payments' },
  { name: 'ShoppingBag', icon: ShoppingBag, label: 'Shopping & Orders' },
  { name: 'Folder', icon: Folder, label: 'General Folder' },
  { name: 'Bell', icon: Bell, label: 'Alerts & Notifications' },
  { name: 'Shield', icon: Shield, label: 'Security & Auth' },
  { name: 'Tag', icon: Tag, label: 'Special Offers' },
  { name: 'Zap', icon: Zap, label: 'Urgent & Important' }
];

export const TONE_OPTIONS = [
  { tone: 'brand', label: 'Brand Blue', bg: 'bg-brand', border: 'border-brand-border', text: 'text-brand' },
  { tone: 'success', label: 'Emerald Green', bg: 'bg-status-success-bg', border: 'border-status-success-border', text: 'text-status-success-text' },
  { tone: 'warning', label: 'Amber Orange', bg: 'bg-status-warning-bg', border: 'border-status-warning-border', text: 'text-status-warning-text' },
  { tone: 'info', label: 'Cyan Blue', bg: 'bg-status-info-bg', border: 'border-status-info-border', text: 'text-status-info-text' },
  { tone: 'danger', label: 'Crimson Red', bg: 'bg-status-danger-bg', border: 'border-status-danger-border', text: 'text-status-danger-text' },
  { tone: 'neutral', label: 'Muted Slate', bg: 'bg-surface-subtle', border: 'border-line-subtle', text: 'text-content-secondary' }
] as const;

interface GroupIconProps {
  iconName?: string;
  className?: string;
}

export const GroupIcon: React.FC<GroupIconProps> = ({ iconName, className = 'w-4 h-4' }) => {
  switch (iconName) {
    case 'Package':
      return <Package className={className} />;
    case 'Ticket':
      return <Ticket className={className} />;
    case 'CheckCircle2':
      return <CheckCircle2 className={className} />;
    case 'CreditCard':
      return <CreditCard className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Bell':
      return <Bell className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Tag':
      return <Tag className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Inbox':
      return <Inbox className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'Folder':
    default:
      return <Folder className={className} />;
  }
};
