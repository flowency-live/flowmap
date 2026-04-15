import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Amplify configuration will be loaded dynamically when available
// This file is auto-generated when running `npx ampx sandbox`
async function configureAmplify() {
  try {
    const { Amplify } = await import('aws-amplify');
    // Use fetch to check if config exists without TypeScript module resolution
    const response = await fetch('/amplify_outputs.json');
    if (response.ok) {
      const config = await response.json();
      Amplify.configure(config);
      console.log('Amplify configured successfully');
    }
  } catch {
    console.log('Amplify not configured - run `npx ampx sandbox` to generate config');
  }
}

// Start app immediately, configure Amplify in background
configureAmplify();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
