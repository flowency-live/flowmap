import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | 'warning';
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded border',
        variant === 'default' && 'bg-card border-border',
        variant === 'destructive' && 'bg-destructive/5 border-destructive/30',
        variant === 'warning' && 'bg-amber-950/20 border-amber-700/30',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 mb-1.5',
          variant === 'default' && 'text-muted-foreground',
          variant === 'destructive' && 'text-destructive',
          variant === 'warning' && 'text-amber-500'
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-sm font-medium uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div
        className={cn(
          'text-2xl font-semibold',
          variant === 'default' && 'text-foreground',
          variant === 'destructive' && 'text-destructive',
          variant === 'warning' && 'text-amber-400'
        )}
      >
        {value}
      </div>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
