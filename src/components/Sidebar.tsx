import { Link, useLocation } from 'wouter';
import { LayoutDashboard, AlertTriangle, Zap, Calendar, Settings, Info, Sun, Moon, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const { collapsed, toggleCollapsed } = useSidebarStore();

  return (
    <div
      className={cn(
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 ease-in-out z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo & Toggle */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <h1 className="text-xl font-bold tracking-tight font-display">
            FlowMap
          </h1>
        )}
        <button
          onClick={toggleCollapsed}
          className={cn(
            'p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors',
            collapsed && 'mx-auto'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-2 space-y-1">
        {navItems.map((item) => {
          const active = location === item.href;
          const Icon = item.icon;

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Footer */}
      <div className={cn('p-3 border-t border-sidebar-border', collapsed && 'px-2')}>
        {user && !collapsed && (
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
        {user && collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className="w-full flex justify-center p-1.5 rounded-md text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors mb-2"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Sign out
            </TooltipContent>
          </Tooltip>
        )}
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'justify-between')}>
          {!collapsed && (
            <span className="text-xs text-sidebar-foreground/40">
              Portfolio Flow Intelligence
            </span>
          )}
          <div className={cn('flex items-center', collapsed ? 'flex-col gap-1' : 'gap-1')}>
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </TooltipContent>
              </Tooltip>
            ) : (
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
            )}
            {collapsed ? (
              <Sheet>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <button className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
                        <Info className="h-4 w-4" />
                      </button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    Tech Stack
                  </TooltipContent>
                </Tooltip>
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
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
