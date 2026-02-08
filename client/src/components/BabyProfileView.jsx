import { useState, useEffect } from 'react';
import './BabyProfileView.css';
import DiaperAction from './DiaperAction';
import OtherAction from './OtherAction';
import SleepAction from './SleepAction';
import FeedAction from './FeedAction';
import Reports from './Reports';
import LoadingDots from './LoadingDots';
import RefreshButton from './RefreshButton';
import { API_URL, ACTION_TYPES, DIAPER_TYPES } from '../constants/constants';
import { apiFetch } from '../utils/api';

function BabyProfileView({ profile, onClose, userId, userEmoji }) {
  const [showDiaperAction, setShowDiaperAction] = useState(false);
  const [showOtherAction, setShowOtherAction] = useState(false);
  const [showSleepAction, setShowSleepAction] = useState(false);
  const [showFeedAction, setShowFeedAction] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [openReportsToToday, setOpenReportsToToday] = useState(false);
  const [lastDiaperAction, setLastDiaperAction] = useState(null);
  const [lastOtherAction, setLastOtherAction] = useState(null);
  const [lastSleepAction, setLastSleepAction] = useState(null);
  const [lastFeedAction, setLastFeedAction] = useState(null);
  const [allActions, setAllActions] = useState([]); // Store all fetched actions to pass to Reports
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if this is the first load
  const [loadingActionType, setLoadingActionType] = useState(null); // Track which action type is loading
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

  // Get date range for the calendar view (4 days: 3 days ago to today)
  const getCalendarDateRange = () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);
    startDate.setHours(6, 0, 0, 0); // 6am, 3 days ago
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(5, 59, 59, 999); // 5:59am tomorrow (covers today's calendar)
    
    return { startDate, endDate };
  };

  const fetchLastActions = async (actionType = null) => {
    if (actionType) {
      setLoadingActionType(actionType);
    }
    try {
      // Only fetch last 4 days of actions for the calendar
      const { startDate, endDate } = getCalendarDateRange();
      const params = new URLSearchParams({
        babyProfileId: profile.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await apiFetch(`${API_URL}/actions?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        const fetchedActions = data.actions || [];
        setAllActions(fetchedActions);
        // Find the most recent diaper action
        const diaperActions = fetchedActions.filter(action => action.actionType === ACTION_TYPES.DIAPER);
        setLastDiaperAction(diaperActions.length > 0 ? diaperActions[0] : null);
        // Find the most recent other action
        const otherActions = fetchedActions.filter(action => action.actionType === ACTION_TYPES.OTHER);
        setLastOtherAction(otherActions.length > 0 ? otherActions[0] : null);
        // Find the most recent sleep action
        const sleepActions = fetchedActions.filter(action => action.actionType === ACTION_TYPES.SLEEP);
        setLastSleepAction(sleepActions.length > 0 ? sleepActions[0] : null);
        // Find the most recent feed action
        const feedActions = fetchedActions.filter(action => action.actionType === ACTION_TYPES.FEED);
        setLastFeedAction(feedActions.length > 0 ? feedActions[0] : null);
      }
    } catch (err) {
      console.error('Error fetching last actions:', err);
    } finally {
      setIsInitialLoad(false);
      setLoadingActionType(null);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const actionDate = new Date(dateString);
    const diffMs = now - actionDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    // Use non-breaking space (\u00A0) to prevent wrapping between value and "ago"
    if (diffMins < 1) return 'Just\u00A0now';
    if (diffMins < 60) return `${diffMins}m\u00A0ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (diffHours < 24) return `${diffHours}h ${remainingMins}m\u00A0ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d\u00A0ago`;
  };

  const getDiaperTypeLabel = (type) => {
    switch (type) {
      case DIAPER_TYPES.PEE:
        return 'Pee';
      case DIAPER_TYPES.POO:
        return 'Poo';
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

  const formatActionDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    // Use non-breaking space (\u00A0) to prevent wrapping within duration
    return hours > 0 
      ? `${hours}h\u00A0${minutes}m`
      : `${minutes}m`;
  };

  const handleAction = (actionType) => {
    // Prevent action if user is a viewer
    if (profile.role === 'viewer') {
      return;
    }
    
    if (actionType === ACTION_TYPES.DIAPER) {
      setShowDiaperAction(true);
    } else if (actionType === ACTION_TYPES.OTHER) {
      setShowOtherAction(true);
    } else if (actionType === ACTION_TYPES.SLEEP) {
      setShowSleepAction(true);
    } else if (actionType === ACTION_TYPES.FEED) {
      setShowFeedAction(true);
    }
  };

  const isViewer = profile.role === 'viewer';

  // Handle action changes from Reports (delete/update)
  const handleActionsChange = (updatedActions) => {
    setAllActions(updatedActions);
    // Update last actions based on the new data
    const diaperActions = updatedActions.filter(a => a.actionType === ACTION_TYPES.DIAPER);
    setLastDiaperAction(diaperActions.length > 0 ? diaperActions[0] : null);
    const otherActions = updatedActions.filter(a => a.actionType === ACTION_TYPES.OTHER);
    setLastOtherAction(otherActions.length > 0 ? otherActions[0] : null);
    const sleepActions = updatedActions.filter(a => a.actionType === ACTION_TYPES.SLEEP);
    setLastSleepAction(sleepActions.length > 0 ? sleepActions[0] : null);
    const feedActions = updatedActions.filter(a => a.actionType === ACTION_TYPES.FEED);
    setLastFeedAction(feedActions.length > 0 ? feedActions[0] : null);
  };

  // Show reports view if showReports is true
  if (showReports) {
    return (
      <Reports
        profile={profile}
        onClose={() => {
          setShowReports(false);
          setOpenReportsToToday(false);
        }}
        openToToday={openReportsToToday}
        initialActions={allActions}
        onActionsChange={handleActionsChange}
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
            setShowDiaperAction(false);
            // Refresh the last actions in background
            fetchLastActions(ACTION_TYPES.DIAPER);
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
            setShowOtherAction(false);
            // Refresh the last actions in background
            fetchLastActions(ACTION_TYPES.OTHER);
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
            setShowSleepAction(false);
            // Refresh the last actions in background
            fetchLastActions(ACTION_TYPES.SLEEP);
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
            setShowFeedAction(false);
            // Refresh the last actions in background
            fetchLastActions(ACTION_TYPES.FEED);
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
        </div>
        <div className="action-buttons-container">
          <button 
            className={`action-button action-button-diaper ${isViewer ? 'disabled' : ''}`}
            onClick={() => handleAction(ACTION_TYPES.DIAPER)}
            disabled={isViewer}
          >
            <div className="action-button-main">
              <span>💩</span> <span>Diaper</span>
              {(isInitialLoad || loadingActionType === ACTION_TYPES.DIAPER) ? (
                <div className="last-action-info">
                  <LoadingDots size="small" />
                </div>
              ) : lastDiaperAction && (
              <div className="last-action-info">
                <div className="action-lines">
                  <span className="action-data">{getDiaperTypeLabel(lastDiaperAction.details?.type)}</span>
                  <span className="time-ago">{lastDiaperAction.details?.timestamp ? formatTimeAgo(lastDiaperAction.details.timestamp) : '—'}</span>
                </div>
                {(lastDiaperAction.userEmoji || lastDiaperAction.userId?.emoji) && <span className="action-emoji">{lastDiaperAction.userEmoji || lastDiaperAction.userId?.emoji}</span>}
              </div>
            )}
            </div>
          </button>
          <button 
            className={`action-button action-button-sleep ${isViewer ? 'disabled' : ''}`}
            onClick={() => handleAction(ACTION_TYPES.SLEEP)}
            disabled={isViewer}
          >
            <div className="action-button-main">
              <span>😴</span> <span>Sleep</span>
            {(isInitialLoad || loadingActionType === ACTION_TYPES.SLEEP) ? (
              <div className="last-action-info">
                <LoadingDots size="small" />
              </div>
            ) : lastSleepAction && (
              <div className="last-action-info">
                {lastSleepAction.details?.endTime ? (
                    <>
                      <div className="action-lines">
                        <span className="action-data">{formatActionDuration(lastSleepAction.details.startTime, lastSleepAction.details.endTime)}</span>
                        <span className="time-ago">{formatTimeAgo(lastSleepAction.details.endTime)}</span>
                      </div>
                      {(lastSleepAction.details?.endUserEmoji || lastSleepAction.userId?.emoji) && <span className="action-emoji">{lastSleepAction.details?.endUserEmoji || lastSleepAction.userId?.emoji}</span>}
                    </>
                ) : (
                  // Sleep is in progress - show "sleeping" and duration
                    <>
                      <div className="action-lines">
                        <span className="action-data">Sleeping</span>
                        <span className="sleep-duration">
                          {formatDuration(lastSleepAction.details?.startTime, null, true)}
                        </span>
                      </div>
                      {(lastSleepAction.userEmoji || lastSleepAction.userId?.emoji) && <span className="action-emoji">{lastSleepAction.userEmoji || lastSleepAction.userId?.emoji}</span>}
                    </>
                )}
              </div>
            )}
            </div>
          </button>
          <button 
            className={`action-button action-button-feed ${isViewer ? 'disabled' : ''}`}
            onClick={() => handleAction(ACTION_TYPES.FEED)}
            disabled={isViewer}
          >
            <div className="action-button-main">
              <span>🍼</span> <span>Feed</span>
              {(isInitialLoad || loadingActionType === ACTION_TYPES.FEED) ? (
                <div className="last-action-info">
                  <LoadingDots size="small" />
                </div>
              ) : lastFeedAction && (
                <div className="last-action-info">
                  {lastFeedAction.details?.endTime ? (
                    <>
                      <div className="action-lines">
                        <span className="action-data">
                          {lastFeedAction.details?.ml 
                            ? `${lastFeedAction.details.ml}ml • ${formatActionDuration(lastFeedAction.details.startTime, lastFeedAction.details.endTime)}`
                            : formatActionDuration(lastFeedAction.details.startTime, lastFeedAction.details.endTime)
                          }
                        </span>
                        <span className="time-ago">{formatTimeAgo(lastFeedAction.details.endTime)}</span>
                      </div>
                      {(lastFeedAction.details?.endUserEmoji || lastFeedAction.userId?.emoji) && <span className="action-emoji">{lastFeedAction.details?.endUserEmoji || lastFeedAction.userId?.emoji}</span>}
                    </>
                  ) : (
                    // Feed is in progress - show "feeding" and duration
                    <>
                      <div className="action-lines">
                        <span className="action-data">Feeding</span>
                        <span className="sleep-duration">
                          {formatDuration(lastFeedAction.details?.startTime, null, true)}
                        </span>
                      </div>
                      {(lastFeedAction.userEmoji || lastFeedAction.userId?.emoji) && <span className="action-emoji">{lastFeedAction.userEmoji || lastFeedAction.userId?.emoji}</span>}
                    </>
                  )}
                </div>
              )}
            </div>
          </button>
          <button 
            className={`action-button action-button-other ${isViewer ? 'disabled' : ''}`}
            onClick={() => handleAction(ACTION_TYPES.OTHER)}
            disabled={isViewer}
          >
            <div className="action-button-main">
              <span>📝</span> <span>Other</span>
              {(isInitialLoad || loadingActionType === ACTION_TYPES.OTHER) ? (
                <div className="last-action-info">
                  <LoadingDots size="small" />
                </div>
              ) : lastOtherAction && (
                <div className="last-action-info">
                  <div className="action-lines">
                    <span className="action-data">{lastOtherAction.details?.title?.length > 10 ? lastOtherAction.details.title.slice(0, 10) + '…' : lastOtherAction.details?.title}</span>
                    <span className="time-ago">{lastOtherAction.details?.timestamp ? formatTimeAgo(lastOtherAction.details.timestamp) : '—'}</span>
                  </div>
                  {(lastOtherAction.userEmoji || lastOtherAction.userId?.emoji) && <span className="action-emoji">{lastOtherAction.userEmoji || lastOtherAction.userId?.emoji}</span>}
                </div>
              )}
            </div>
          </button>
        </div>
        <div className="today-button-container">
          <button 
            className="btn btn-secondary today-button"
            onClick={() => {
              setOpenReportsToToday(true);
              setShowReports(true);
            }}
          >
            Today
          </button>
          <button 
            className="btn btn-primary reports-button"
            onClick={() => {
              setOpenReportsToToday(false);
              setShowReports(true);
            }}
          >
            Calendar
          </button>
          <RefreshButton 
            onRefresh={() => fetchLastActions()}
            containerClassName="today-button-container"
          />
        </div>
      </div>
    </>
  );
}

export default BabyProfileView;

