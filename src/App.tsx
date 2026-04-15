import { Router, Route, Switch } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { Heatmap } from '@/pages/Heatmap';
import { ConstraintLens } from '@/pages/ConstraintLens';
import { Simulator } from '@/pages/Simulator';

function App() {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 flex-1">
          <Router>
            <Switch>
              <Route path="/" component={Heatmap} />
              <Route path="/constraint" component={ConstraintLens} />
              <Route path="/simulator" component={Simulator} />
              <Route>
                <div className="p-8">
                  <h1 className="text-2xl font-bold">Page Not Found</h1>
                </div>
              </Route>
            </Switch>
          </Router>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default App;
