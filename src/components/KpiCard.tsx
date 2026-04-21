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
        'p-3 rounded border bg-card border-border',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 mb-1',
          'text-muted-foreground'
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-xs font-medium uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div
        className={cn(
          'text-xl font-semibold',
          variant === 'default' && 'text-foreground',
          variant === 'destructive' && 'text-red-400',
          variant === 'warning' && 'text-amber-400'
        )}
      >
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
