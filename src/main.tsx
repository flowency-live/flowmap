import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { AuthGate } from './components/AuthGate';
import App from './App';
import './index.css';

interface AmplifyConfig {
  custom?: {
    validateTokenUrl?: string;
  };
  [key: string]: unknown;
}

async function init() {
  let authApiUrl = import.meta.env.VITE_AUTH_API_URL as string | undefined;

  // Configure Amplify before rendering
  try {
    const response = await fetch('/amplify_outputs.json');
    if (response.ok) {
      const config: AmplifyConfig = await response.json();
      Amplify.configure(config);
      console.log('Amplify configured successfully');

      // Get auth API URL from Amplify outputs if not set via env var
      if (!authApiUrl && config.custom?.validateTokenUrl) {
        authApiUrl = config.custom.validateTokenUrl;
      }
    } else {
      console.warn('Amplify config not found - data operations will fail');
    }
  } catch (err) {
    console.error('Failed to configure Amplify:', err);
  }

  // Render the app
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  // If no auth API URL is configured, render without auth gate (for local dev)
  if (!authApiUrl) {
    console.warn('No auth API URL configured - auth gate disabled');
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    return;
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AuthGate apiUrl={authApiUrl}>
        <App />
      </AuthGate>
    </StrictMode>
  );
}

init();
