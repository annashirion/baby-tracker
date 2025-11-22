import { useState, useEffect } from 'react';
import './BabyProfileView.css';
import DiaperAction from './DiaperAction';
import OtherAction from './OtherAction';
import SleepAction from './SleepAction';
import FeedAction from './FeedAction';
import Reports from './Reports';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function BabyProfileView({ profile, onClose, userId, userEmoji }) {
  const [showDiaperAction, setShowDiaperAction] = useState(false);
  const [showOtherAction, setShowOtherAction] = useState(false);
  const [showSleepAction, setShowSleepAction] = useState(false);
  const [showFeedAction, setShowFeedAction] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [lastDiaperAction, setLastDiaperAction] = useState(null);
  const [lastOtherAction, setLastOtherAction] = useState(null);
  const [lastSleepAction, setLastSleepAction] = useState(null);
  const [lastFeedAction, setLastFeedAction] = useState(null);
  const [loadingAction, setLoadingAction] = useState(true);
  const [timeKey, setTimeKey] = useState(0); // Force re-render for time updates
  const [timerKey, setTimerKey] = useState(0); // Force re-render for timer updates

  useEffect(() => {
    fetchLastActions();
  }, [profile.id]);

  // Update time display every minute
  useEffect(() => {
    if (lastDiaperAction || lastOtherAction || lastSleepAction || lastFeedAction) {
      const interval = setInterval(() => {
        setTimeKey(prev => prev + 1);
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [lastDiaperAction, lastOtherAction, lastSleepAction, lastFeedAction]);

  // Update timer every second when sleep or feed is in progress
  useEffect(() => {
    if ((lastSleepAction && !lastSleepAction.details?.endTime) || 
        (lastFeedAction && !lastFeedAction.details?.endTime)) {
      const interval = setInterval(() => {
        setTimerKey(prev => prev + 1);
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [lastSleepAction, lastFeedAction]);

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
        // Find the most recent sleep action
        const sleepActions = data.actions.filter(action => action.actionType === 'sleep');
        if (sleepActions.length > 0) {
          setLastSleepAction(sleepActions[0]);
        } else {
          setLastSleepAction(null);
        }
        // Find the most recent feed action
        const feedActions = data.actions.filter(action => action.actionType === 'feed');
        if (feedActions.length > 0) {
          setLastFeedAction(feedActions[0]);
        } else {
          setLastFeedAction(null);
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
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
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

  const formatDuration = (startTime, endTime = null, showSeconds = false) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    const seconds = Math.floor((diffMs % 60000) / 1000);

    // Pad with leading zeros
    const pad = (num) => String(num).padStart(2, '0');

    if (showSeconds) {
      // For live timer always show seconds
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    } else {
      // For completed sessions don't show seconds
      if (hours > 0) {
        return `${hours}:${pad(minutes)}`;
      }
      return `${pad(minutes)}`;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatSleepDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return hours > 0 
      ? `${hours}h ${minutes}m • `
      : `${minutes}m • `;
  };

  const formatFeedDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return hours > 0 
      ? `${hours}h ${minutes}m • `
      : `${minutes}m • `;
  };

  const handleAction = (actionType) => {
    // Prevent action if user is a viewer
    if (profile.role === 'viewer') {
      return;
    }
    
    if (actionType === 'diaper') {
      setShowDiaperAction(true);
    } else if (actionType === 'other') {
      setShowOtherAction(true);
    } else if (actionType === 'sleep') {
      setShowSleepAction(true);
    } else if (actionType === 'feed') {
      setShowFeedAction(true);
    } else {
      console.log(`Action: ${actionType} for profile: ${profile.name}`);
      // TODO: Implement API call to track this action
    }
  };

  const isViewer = profile.role === 'viewer';

  // Show reports view if showReports is true
  if (showReports) {
    return (
      <Reports
        profile={profile}
        onClose={() => setShowReports(false)}
      />
    );
  }

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
      {showSleepAction && (
        <SleepAction
          profile={profile}
          userId={userId}
          userEmoji={userEmoji}
          lastSleepAction={lastSleepAction}
          onClose={() => setShowSleepAction(false)}
          onSuccess={(action) => {
            console.log('Sleep action saved:', action);
            setShowSleepAction(false);
            // Refresh the last actions
            fetchLastActions();
          }}
        />
      )}
      {showFeedAction && (
        <FeedAction
          profile={profile}
          userId={userId}
          userEmoji={userEmoji}
          lastFeedAction={lastFeedAction}
          onClose={() => setShowFeedAction(false)}
          onSuccess={(action) => {
            console.log('Feed action saved:', action);
            setShowFeedAction(false);
            // Refresh the last actions
            fetchLastActions();
          }}
        />
      )}
      <div className="baby-profile-view">
        <div className="baby-profile-view-header">
          <button onClick={onClose} className="btn back-button" title="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>{profile.name}</h2>
          <button 
            className="reports-icon-button btn btn-secondary" 
            title="Reports"
            onClick={() => setShowReports(true)}
          >
            📊
          </button>
        </div>
        <div className="action-buttons-container">
          <button 
            className={`action-button action-button-diaper ${isViewer ? 'disabled' : ''}`}
            onClick={() => handleAction('diaper')}
            disabled={isViewer}
          >
            <div className="action-button-main">
              <span>💩</span> <span>Diaper</span>
              {!loadingAction && lastDiaperAction && (
              <div className="last-action-info">
                <div className="action-details">
                  {getDiaperTypeLabel(lastDiaperAction.details?.type)} • {formatTimeAgo(lastDiaperAction.createdAt)}
                  {lastDiaperAction.userEmoji && <span className="action-emoji"> • {lastDiaperAction.userEmoji}</span>}
                </div>
              </div>
            )}
            </div>
          </button>
          <button 
            className={`action-button action-button-sleep ${isViewer ? 'disabled' : ''}`}
            onClick={() => handleAction('sleep')}
            disabled={isViewer}
          >
            <div className="action-button-main">
              <span>😴</span> <span>Sleep</span>
            {!loadingAction && lastSleepAction && (
              <div className="last-action-info">
                {lastSleepAction.details?.endTime ? (
                    <div className="action-details">
                      {formatSleepDuration(lastSleepAction.details.startTime, lastSleepAction.details.endTime)}
                      {formatTimeAgo(lastSleepAction.details.endTime)}
                      {lastSleepAction.details?.endUserEmoji && <span className="action-emoji"> • {lastSleepAction.details.endUserEmoji}</span>}
                    </div>
                ) : (
                  // Sleep is in progress - show "fall asleep" and time
                    <div className="action-details">
                      Sleeping • {(
                          <span className="sleep-duration">
                            {lastSleepAction.details?.endTime 
                              ? formatDuration(lastSleepAction.details.startTime, lastSleepAction.details.endTime)
                              : formatDuration(lastSleepAction.details?.startTime, null, true)
                            }
                          </span>
                        )}
                      {lastSleepAction.userEmoji && <span className="action-emoji"> • {lastSleepAction.userEmoji}</span>}
                    </div>
                )}
              </div>
            )}
            </div>
          </button>
          <button 
            className={`action-button action-button-feed ${isViewer ? 'disabled' : ''}`}
            onClick={() => handleAction('feed')}
            disabled={isViewer}
          >
            <div className="action-button-main">
              <span>🍼</span> <span>Feed</span>
              {!loadingAction && lastFeedAction && (
                <div className="last-action-info">
                  {lastFeedAction.details?.endTime ? (
                    <div className="action-details">
                      {lastFeedAction.details?.ml 
                        ? `${lastFeedAction.details.ml} ml • ${formatFeedDuration(lastFeedAction.details.startTime, lastFeedAction.details.endTime)}`
                        : formatFeedDuration(lastFeedAction.details.startTime, lastFeedAction.details.endTime)
                      }
                      {formatTimeAgo(lastFeedAction.details.endTime)}
                      {lastFeedAction.details?.endUserEmoji && <span className="action-emoji"> • {lastFeedAction.details.endUserEmoji}</span>}
                    </div>
                  ) : (
                    // Feed is in progress - show "feeding" and time
                    <div className="action-details">
                      Feeding • {(
                        <span className="sleep-duration">
                          {lastFeedAction.details?.endTime 
                            ? formatDuration(lastFeedAction.details.startTime, lastFeedAction.details.endTime)
                            : formatDuration(lastFeedAction.details?.startTime, null, true)
                          }
                        </span>
                      )}
                      {lastFeedAction.userEmoji && <span className="action-emoji"> • {lastFeedAction.userEmoji}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </button>
          <button 
            className={`action-button action-button-other ${isViewer ? 'disabled' : ''}`}
            onClick={() => handleAction('other')}
            disabled={isViewer}
          >
            <div className="action-button-main">
              <span>📝</span> <span>Other</span>
              {!loadingAction && lastOtherAction && (
                <div className="last-action-info">
                  <div className="action-details">
                    {lastOtherAction.details?.title} • {formatTimeAgo(lastOtherAction.createdAt)}
                    {lastOtherAction.userEmoji && <span className="action-emoji"> • {lastOtherAction.userEmoji}</span>}
                  </div>
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

