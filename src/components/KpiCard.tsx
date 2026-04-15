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
        'p-5 rounded-lg shadow-sm border',
        variant === 'default' && 'bg-card border-border',
        variant === 'destructive' && 'bg-destructive/5 border-destructive/20',
        variant === 'warning' && 'bg-amber-50 border-amber-200',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 mb-2',
          variant === 'default' && 'text-muted-foreground',
          variant === 'destructive' && 'text-destructive',
          variant === 'warning' && 'text-amber-600'
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-sm font-medium uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div
        className={cn(
          'text-3xl font-bold font-display',
          variant === 'default' && 'text-foreground',
          variant === 'destructive' && 'text-destructive',
          variant === 'warning' && 'text-amber-700'
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
