import React from 'react';
import {
  Crown,
  Flame,
  Zap,
  Ghost,
  Bot,
  Skull,
  Cat,
  Shield,
  User,
  LucideIcon,
} from 'lucide-react';

export interface AvatarMeta {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  border: string;
  iconColor: string;
}

export const AVATAR_PRESETS: AvatarMeta[] = [
  {
    id: 'av-crown',
    label: 'Monarch',
    icon: Crown,
    gradient: 'from-amber-400 to-amber-600',
    border: 'border-amber-300',
    iconColor: 'text-amber-950',
  },
  {
    id: 'av-flame',
    label: 'Blaze',
    icon: Flame,
    gradient: 'from-orange-500 to-rose-600',
    border: 'border-orange-300',
    iconColor: 'text-white',
  },
  {
    id: 'av-zap',
    label: 'Volt',
    icon: Zap,
    gradient: 'from-cyan-400 to-blue-600',
    border: 'border-cyan-300',
    iconColor: 'text-slate-950',
  },
  {
    id: 'av-ghost',
    label: 'Spectre',
    icon: Ghost,
    gradient: 'from-purple-500 to-indigo-600',
    border: 'border-purple-300',
    iconColor: 'text-white',
  },
  {
    id: 'av-bot',
    label: 'Cyborg',
    icon: Bot,
    gradient: 'from-emerald-400 to-teal-600',
    border: 'border-emerald-300',
    iconColor: 'text-slate-950',
  },
  {
    id: 'av-cat',
    label: 'Shadow',
    icon: Cat,
    gradient: 'from-fuchsia-500 to-pink-600',
    border: 'border-fuchsia-300',
    iconColor: 'text-white',
  },
  {
    id: 'av-shield',
    label: 'Knight',
    icon: Shield,
    gradient: 'from-sky-500 to-indigo-700',
    border: 'border-sky-300',
    iconColor: 'text-white',
  },
  {
    id: 'av-skull',
    label: 'Raider',
    icon: Skull,
    gradient: 'from-rose-600 to-red-800',
    border: 'border-rose-300',
    iconColor: 'text-white',
  },
];

export function getAvatarMeta(avatarId: string): AvatarMeta {
  // Direct match
  const found = AVATAR_PRESETS.find((a) => a.id === avatarId);
  if (found) return found;

  // Legacy mappings for av-1 .. av-6
  if (avatarId === 'av-1') return AVATAR_PRESETS[0]; // Monarch
  if (avatarId === 'av-2') return AVATAR_PRESETS[3]; // Spectre
  if (avatarId === 'av-3') return AVATAR_PRESETS[1]; // Blaze
  if (avatarId === 'av-4') return AVATAR_PRESETS[4]; // Cyborg
  if (avatarId === 'av-5') return AVATAR_PRESETS[7]; // Raider
  if (avatarId === 'av-6') return AVATAR_PRESETS[5]; // Shadow

  // AI Bots mapping
  if (avatarId.startsWith('bot-')) {
    return {
      id: avatarId,
      label: 'AI Bot',
      icon: Bot,
      gradient: 'from-slate-700 to-cyan-900',
      border: 'border-cyan-400/50',
      iconColor: 'text-cyan-300',
    };
  }

  // Fallback
  return {
    id: 'default',
    label: 'Player',
    icon: User,
    gradient: 'from-slate-700 to-slate-800',
    border: 'border-slate-600',
    iconColor: 'text-slate-200',
  };
}

interface AvatarProps {
  avatarId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isSelected?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  avatarId,
  size = 'md',
  className = '',
  isSelected = false,
}) => {
  const meta = getAvatarMeta(avatarId);
  const Icon = meta.icon;

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  }[size];

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  }[size];

  return (
    <div
      className={`
        relative rounded-full bg-gradient-to-br ${meta.gradient}
        flex items-center justify-center shadow-md select-none transition-all duration-150
        ${sizeClasses}
        ${
          isSelected
            ? 'ring-2 ring-cyan-400 scale-105 shadow-cyan-500/50'
            : 'border border-white/20'
        }
        ${className}
      `}
    >
      <Icon className={`${iconSizes} ${meta.iconColor} drop-shadow-sm`} />
    </div>
  );
};
