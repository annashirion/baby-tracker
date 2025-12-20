import { useState } from 'react';
import LoadingDots from './LoadingDots';
import './RefreshButton.css';

function RefreshButton({ onRefresh, className = '', containerClassName = '' }) {
  const [refreshing, setRefreshing] = useState(false);
  const MIN_LOADING_TIME = 500; // Minimum 500ms display time for loader

  const handleClick = async () => {
    if (refreshing || !onRefresh) return;
    
    setRefreshing(true);
    const startTime = Date.now();
    
    try {
      await onRefresh();
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      
      // Wait for minimum display time if needed
      if (remainingTime > 0) {
        setTimeout(() => {
          setRefreshing(false);
        }, remainingTime);
      } else {
        setRefreshing(false);
      }
    }
  };

  return (
    <div className={`refresh-button-container ${containerClassName}`}>
      <button 
        className={`btn btn-secondary refresh-button ${className}`}
        onClick={handleClick}
        title="Refresh data"
        disabled={refreshing}
      >
        {refreshing ? (
          <LoadingDots size="small" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 8v4h4M21 16v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        Refresh
      </button>
    </div>
  );
}

export default RefreshButton;

