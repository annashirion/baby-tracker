import { useState, useEffect } from 'react';
import './BabyProfileView.css';
import DiaperAction from './DiaperAction';
import OtherAction from './OtherAction';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function BabyProfileView({ profile, onClose, userId, userEmoji }) {
  const [showDiaperAction, setShowDiaperAction] = useState(false);
  const [showOtherAction, setShowOtherAction] = useState(false);
  const [lastDiaperAction, setLastDiaperAction] = useState(null);
  const [lastOtherAction, setLastOtherAction] = useState(null);
  const [loadingAction, setLoadingAction] = useState(true);
  const [timeKey, setTimeKey] = useState(0); // Force re-render for time updates

  useEffect(() => {
    fetchLastActions();
  }, [profile.id]);

  // Update time display every minute
  useEffect(() => {
    if (lastDiaperAction || lastOtherAction) {
      const interval = setInterval(() => {
        setTimeKey(prev => prev + 1);
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [lastDiaperAction, lastOtherAction]);

  const fetchLastActions = async () => {
    try {
      setLoadingAction(true);
      const response = await fetch(`${API_URL}/actions?babyProfileId=${profile.id}`);
      
      if (response.ok) {
        const data = await response.json();
        // Find the most recent diaper action
        const diaperActions = data.actions.filter(action => action.actionType === 'diaper');
        if (diaperActions.length > 0) {
          setLastDiaperAction(diaperActions[0]);
        } else {
          setLastDiaperAction(null);
        }
        // Find the most recent other action
        const otherActions = data.actions.filter(action => action.actionType === 'other');
        if (otherActions.length > 0) {
          setLastOtherAction(otherActions[0]);
        } else {
          setLastOtherAction(null);
        }
      }
    } catch (err) {
      console.error('Error fetching last actions:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const actionDate = new Date(dateString);
    const diffMs = now - actionDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const getDiaperTypeLabel = (type) => {
    switch (type) {
      case 'pee':
        return 'Pee';
      case 'poo':
        return 'Poo';
      case 'both':
        return 'Pee & Poo';
      default:
        return '';
    }
  };

  const handleAction = (actionType) => {
    if (actionType === 'diaper') {
      setShowDiaperAction(true);
    } else if (actionType === 'other') {
      setShowOtherAction(true);
    } else {
      console.log(`Action: ${actionType} for profile: ${profile.name}`);
      // TODO: Implement API call to track this action
    }
  };

  return (
    <>
      {showDiaperAction && (
        <DiaperAction
          profile={profile}
          userId={userId}
          userEmoji={userEmoji}
          onClose={() => setShowDiaperAction(false)}
          onSuccess={(action) => {
            console.log('Diaper action saved:', action);
            setShowDiaperAction(false);
            // Refresh the last actions
            fetchLastActions();
          }}
        />
      )}
      {showOtherAction && (
        <OtherAction
          profile={profile}
          userId={userId}
          userEmoji={userEmoji}
          onClose={() => setShowOtherAction(false)}
          onSuccess={(action) => {
            console.log('Other action saved:', action);
            setShowOtherAction(false);
            // Refresh the last actions
            fetchLastActions();
          }}
        />
      )}
      <div className="baby-profile-view">
        <div className="baby-profile-view-header">
          <button onClick={onClose} className="btn btn-back">
            ← Back to Profiles
          </button>
          <h2>{profile.name}</h2>
        </div>
        
        <div className="action-buttons-container">
          <button 
            className="action-button action-button-diaper"
            onClick={() => handleAction('diaper')}
          >
            <div className="action-button-main">
              <span>🍼</span> <span>Diaper</span>
              {!loadingAction && lastDiaperAction && (
              <div className="last-action-info">
                <span className="action-details">
                  {getDiaperTypeLabel(lastDiaperAction.details?.type)} • {formatTimeAgo(lastDiaperAction.createdAt)}
                </span>
                {lastDiaperAction.userEmoji && <span className="action-emoji">{lastDiaperAction.userEmoji}</span>}
              </div>
            )}
            </div>
          </button>
          <button 
            className="action-button action-button-sleep"
            onClick={() => handleAction('sleep')}
          >
            <div className="action-button-main">
              <span>😴</span> <span>Sleep</span>
            </div>
          </button>
          <button 
            className="action-button action-button-feed"
            onClick={() => handleAction('feed')}
          >
            <div className="action-button-main">
              <span>🍼</span> <span>Feed</span>
            </div>
          </button>
          <button 
            className="action-button action-button-other"
            onClick={() => handleAction('other')}
          >
            <div className="action-button-main">
              <span>📝</span> <span>Other</span>
              {!loadingAction && lastOtherAction && (
                <div className="last-action-info">
                  <span className="action-details">
                    {lastOtherAction.details?.title} • {formatTimeAgo(lastOtherAction.createdAt)}
                  </span>
                  {lastOtherAction.userEmoji && <span className="action-emoji">{lastOtherAction.userEmoji}</span>}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

export default BabyProfileView;

