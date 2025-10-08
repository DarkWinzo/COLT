import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppWrapper } from './AppWrapper';

console.log('Main.jsx is loading...');
console.log('Environment variables:', {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Root element not found!</div>';
} else {
  console.log('Root element found, rendering app...');
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <AppWrapper>
            <App />
          </AppWrapper>
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Failed to render app:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;">
      <h1>Failed to render app</h1>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
  }
}
