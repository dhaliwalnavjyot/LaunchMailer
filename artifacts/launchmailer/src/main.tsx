import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';

setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ''));
setAuthTokenGetter(() => localStorage.getItem('launchmailer_token'));

// Force dark mode
document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
