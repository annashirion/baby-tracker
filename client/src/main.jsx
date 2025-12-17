import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

if (!GOOGLE_CLIENT_ID) {
  console.error('⚠️ VITE_GOOGLE_CLIENT_ID is not set in .env file');
}

// Set CSS custom property for actual viewport height (accounts for mobile browser UI)
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set initial value
setViewportHeight();

// Update on resize and orientation change
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', () => {
  // Small delay to ensure accurate height after orientation change
  setTimeout(setViewportHeight, 100);
});

// Also update when viewport changes (for mobile browser UI showing/hiding)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setViewportHeight);
}

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  // </StrictMode>,
)
