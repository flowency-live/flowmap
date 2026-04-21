import { Link, useLocation } from 'wouter';
import { LayoutDashboard, AlertTriangle, Zap, Calendar, Settings, Info, Sun, Moon, LogOut } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Portfolio Heatmap', icon: LayoutDashboard },
  { href: '/constraint', label: 'Constraint Lens', icon: AlertTriangle },
  { href: '/simulator', label: 'Unlock Simulator', icon: Zap },
  { href: '/timeline', label: 'Timeline', icon: Calendar },
  { href: '/config', label: 'Configuration', icon: Settings },
];

function TechStackContent() {
  return (
    <div className="space-y-5 text-sm">
      {/* Architecture */}
      <section>
        <h3 className="font-semibold text-foreground mb-1.5">Architecture</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Serverless SPA with real-time sync via WebSocket subscriptions.
        </p>
      </section>

      {/* Stack */}
      <section>
        <h3 className="font-semibold text-foreground mb-1.5">Stack</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>React 19 + TypeScript</span>
          <span>Vite + Tailwind</span>
          <span>Zustand</span>
          <span>Radix UI</span>
          <span>AppSync GraphQL</span>
          <span>DynamoDB</span>
          <span>Cognito</span>
          <span>Lambda</span>
        </div>
      </section>

      {/* Auth */}
      <section>
        <h3 className="font-semibold text-foreground mb-1.5">Authentication</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Invitation-based signup via Cognito. Admin sends email invite → user clicks link → sets password → auto-confirmed. No email verification step needed.
        </p>
      </section>

      {/* Data Model */}
      <section>
        <h3 className="font-semibold text-foreground mb-1.5">Data Model</h3>
        <div className="text-xs font-mono text-muted-foreground bg-muted/50 p-2 rounded-md space-y-0.5">
          <div><span className="text-primary">Theme</span> → Initiative → Child initiatives</div>
          <div><span className="text-primary">Team</span> → states, efforts, notes per initiative</div>
          <div><span className="text-primary">Dependency</span> → initiative relationships</div>
        </div>
      </section>

      {/* Capabilities */}
      <section>
        <h3 className="font-semibold text-foreground mb-1.5">Capabilities</h3>
        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
          <li>Real-time collaboration</li>
          <li>8-state flow tracking (N/S → Done)</li>
          <li>Constraint team identification</li>
          <li>Hierarchical rollup aggregation</li>
        </ul>
      </section>

      {/* Infra */}
      <section>
        <h3 className="font-semibold text-foreground mb-1.5">Infrastructure</h3>
        <p className="text-muted-foreground text-xs">
          AWS Amplify Gen 2 with CDK. Pay-per-use, scales to zero.
        </p>
      </section>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();

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
      <div className="p-4 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-sidebar-foreground/60 truncate max-w-35" title={user.email}>
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-sidebar-foreground/40">
            Portfolio Flow Intelligence
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                  title="Tech Stack Info"
                >
                  <Info className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>FlowMap Tech Stack</SheetTitle>
                  <SheetDescription>
                    Full-stack serverless architecture on AWS
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <TechStackContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
