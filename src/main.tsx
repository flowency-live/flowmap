import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App';
import './index.css';

async function init() {
  // Configure Amplify before rendering
  try {
    const response = await fetch('/amplify_outputs.json');
    if (response.ok) {
      const config = await response.json();
      Amplify.configure(config);
      console.log('Amplify configured successfully');
    } else {
      console.warn('Amplify config not found - data operations will fail');
    }
  } catch (err) {
    console.error('Failed to configure Amplify:', err);
  }

  // Render the app
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

init();
