import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import { AuthGate } from './components/AuthGate';
import { InviteSignup } from './pages/InviteSignup';
import App from './App';
import './index.css';

// Configure Amplify at module load (recommended pattern)
Amplify.configure(outputs);

function init() {

  // Render the app
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  // Check if this is the invite route - render without AuthGate
  const pathname = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  const isInviteRoute = pathname === '/invite';
  console.log('Route check:', { pathname, isInviteRoute, originalPathname: window.location.pathname });

  if (isInviteRoute) {
    createRoot(rootElement).render(
      <StrictMode>
        <InviteSignup />
      </StrictMode>
    );
  } else {
    createRoot(rootElement).render(
      <StrictMode>
        <AuthGate>
          <App />
        </AuthGate>
      </StrictMode>
    );
  }
}

init();
