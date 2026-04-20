import { Link, useLocation } from 'wouter';
import { LayoutDashboard, AlertTriangle, Zap, Calendar, Settings, Info, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
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
    <div className="space-y-6 text-sm">
      {/* Architecture Overview */}
      <section>
        <h3 className="font-semibold text-foreground mb-2">Architecture</h3>
        <p className="text-muted-foreground leading-relaxed">
          Serverless SPA with real-time sync. No backend servers to manage.
          Data flows: React UI → GraphQL mutations → DynamoDB → WebSocket subscriptions → All connected clients.
        </p>
      </section>

      {/* Frontend */}
      <section>
        <h3 className="font-semibold text-foreground mb-2">Frontend</h3>
        <div className="space-y-1.5 text-muted-foreground">
          <div className="flex justify-between">
            <span>React 19 + TypeScript</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">UI Framework</span>
          </div>
          <div className="flex justify-between">
            <span>Vite</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Build Tool</span>
          </div>
          <div className="flex justify-between">
            <span>Zustand</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">State Management</span>
          </div>
          <div className="flex justify-between">
            <span>Tailwind CSS</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Styling</span>
          </div>
          <div className="flex justify-between">
            <span>Radix UI</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Primitives</span>
          </div>
          <div className="flex justify-between">
            <span>Wouter</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Routing</span>
          </div>
        </div>
      </section>

      {/* Backend */}
      <section>
        <h3 className="font-semibold text-foreground mb-2">Backend (AWS Amplify Gen 2)</h3>
        <div className="space-y-1.5 text-muted-foreground">
          <div className="flex justify-between">
            <span>AppSync GraphQL</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">API Layer</span>
          </div>
          <div className="flex justify-between">
            <span>DynamoDB</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Database</span>
          </div>
          <div className="flex justify-between">
            <span>WebSocket Subscriptions</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Real-time Sync</span>
          </div>
          <div className="flex justify-between">
            <span>CloudFront + S3</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Hosting</span>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section>
        <h3 className="font-semibold text-foreground mb-2">Authentication</h3>
        <div className="space-y-1.5 text-muted-foreground">
          <div className="flex justify-between">
            <span>Lambda Function URL</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Token Validation</span>
          </div>
          <div className="flex justify-between">
            <span>SSM Parameter Store</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Secrets</span>
          </div>
          <div className="flex justify-between">
            <span>JWT</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Session Tokens</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Magic link auth with server-side validation. No API Gateway needed.
        </p>
      </section>

      {/* Data Model */}
      <section>
        <h3 className="font-semibold text-foreground mb-2">Data Model</h3>
        <div className="space-y-1.5 text-muted-foreground text-xs font-mono bg-muted/50 p-3 rounded-md">
          <div><span className="text-primary">Theme</span> → groups initiatives</div>
          <div><span className="text-primary">Initiative</span> → parent/child hierarchy</div>
          <div><span className="text-primary">Team</span> → columns in heatmap</div>
          <div><span className="text-primary">teamStates</span> → JSON map per initiative</div>
          <div><span className="text-primary">teamEfforts</span> → effort estimates (S/M/L/XL)</div>
          <div><span className="text-primary">teamNotes</span> → notes per team/initiative</div>
        </div>
      </section>

      {/* Key Features */}
      <section>
        <h3 className="font-semibold text-foreground mb-2">Key Capabilities</h3>
        <ul className="space-y-1 text-muted-foreground list-disc list-inside">
          <li>Real-time collaboration across sessions</li>
          <li>Flow state tracking (8 states: N/S → Done)</li>
          <li>Constraint team identification</li>
          <li>Rollup aggregation for parent initiatives</li>
          <li>Optimistic UI with server reconciliation</li>
          <li>Hierarchical initiative structure</li>
        </ul>
      </section>

      {/* Infrastructure */}
      <section>
        <h3 className="font-semibold text-foreground mb-2">Infrastructure</h3>
        <div className="space-y-1.5 text-muted-foreground">
          <div className="flex justify-between">
            <span>Amplify Hosting</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">CI/CD + Deploy</span>
          </div>
          <div className="flex justify-between">
            <span>CDK (via Amplify)</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">IaC</span>
          </div>
          <div className="flex justify-between">
            <span>Lambda</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Auth Function</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-2">
          All infrastructure defined in code. Amplify deploys Lambda + DynamoDB + AppSync automatically.
        </p>
      </section>

      {/* Cost Model */}
      <section>
        <h3 className="font-semibold text-foreground mb-2">Cost Model</h3>
        <p className="text-muted-foreground leading-relaxed">
          Pay-per-use serverless. No idle costs. DynamoDB on-demand pricing.
          AppSync charges per request + connection minutes. Scales to zero when unused.
        </p>
      </section>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useThemeStore();

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
      <div className="p-4 border-t border-sidebar-border flex items-center justify-between">
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
  );
}
