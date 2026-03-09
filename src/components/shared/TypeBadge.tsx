import type { ProjectType } from '../../types';

const badgeConfig: Record<ProjectType, { label: string; bg: string; text: string }> = {
  'mood-board': { label: 'Mood Board', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'storyboard': { label: 'Storyboard', bg: 'bg-green-500/20', text: 'text-green-400' },
  'first-frames': { label: 'First Frames', bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

export function TypeBadge({ type, size = 'sm' }: { type: ProjectType; size?: 'sm' | 'xs' }) {
  const config = badgeConfig[type];
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span className={`${config.bg} ${config.text} ${sizeClass} rounded-full font-medium inline-block`}>
      {config.label}
    </span>
  );
}
