import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Prevent browser UI from appearing on mobile when scrolling
// Lock viewport to prevent document-level scrolling that triggers browser UI
if (typeof window !== 'undefined') {
  // Prevent document scrolling - all scrolling should be in app containers
  document.addEventListener('touchmove', (e) => {
    // Only prevent if the touch is on the document/body, not in scrollable containers
    const target = e.target as HTMLElement;
    const isScrollable = target.closest('[class*="overflow"]') || 
                         target.closest('main') ||
                         target.closest('[style*="overflow"]');
    
    if (!isScrollable && (document.documentElement.scrollTop === 0 || 
        document.body.scrollTop === 0)) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Prevent pull-to-refresh
  document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      const touch = e.touches[0];
      // Store initial touch position
      (window as any).__initialTouchY = touch.clientY;
    }
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (window.scrollY === 0) {
      const touch = e.touches[0];
      const initialY = (window as any).__initialTouchY;
      if (initialY && touch.clientY > initialY) {
        // Scrolling down at top - prevent pull-to-refresh
        e.preventDefault();
      }
    }
  }, { passive: false });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('Service Worker registered:', registration);
    }).catch((error) => {
      console.log('Service Worker registration failed:', error);
    });
  });
}