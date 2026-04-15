import { Link, useLocation } from 'wouter';
import { LayoutDashboard, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Portfolio Heatmap', icon: LayoutDashboard },
  { href: '/constraint', label: 'Constraint Lens', icon: AlertTriangle },
  { href: '/simulator', label: 'Unlock Simulator', icon: Zap },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight font-display">
          FlowMap
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 text-xs text-sidebar-foreground/40 border-t border-sidebar-border">
        Portfolio Flow Intelligence
      </div>
    </div>
  );
}
