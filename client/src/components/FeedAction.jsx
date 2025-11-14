import { useState, useEffect } from 'react';
import './FeedAction.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function FeedAction({ profile, userId, userEmoji, onClose, onSuccess, lastFeedAction }) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [ml, setMl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Check if there's an ongoing feed (no end time)
    if (lastFeedAction && !lastFeedAction.details?.endTime) {
      // We're ending a feed session
      setIsStarting(false);
      const now = new Date();
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEndTime(localDateTime);
      // Set start time from the last action
      if (lastFeedAction.details?.startTime) {
        const startDate = new Date(lastFeedAction.details.startTime);
        const localStartDateTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setStartTime(localStartDateTime);
      }
      setMl('');
    } else {
      // We're starting a new feed session
      setIsStarting(true);
      const now = new Date();
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setStartTime(localDateTime);
      setEndTime('');
      setMl('');
    }
  }, [lastFeedAction]);

  const handleStart = async () => {
    if (!startTime) {
      setError('Please set a start time');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_URL}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          babyProfileId: profile.id,
          userId: userId,
          actionType: 'feed',
          details: {
            startTime: new Date(startTime).toISOString(),
            endTime: null,
          },
          userEmoji: userEmoji || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to save feed action (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess(data.action);
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving feed action:', err);
      setError(err.message || 'Failed to save feed action');
    } finally {
      setSaving(false);
    }
  };

  const handleEnd = async () => {
    if (!startTime || !endTime) {
      setError('Please set both start and end times');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      setError('End time must be after start time');
      return;
    }

    // Validate ml if provided
    if (ml && (isNaN(ml) || parseFloat(ml) < 0)) {
      setError('ML must be a positive number');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const details = {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        endUserId: userId,
        endUserEmoji: userEmoji || null,
      };

      // Add ml to details if provided
      if (ml && ml.trim() !== '') {
        details.ml = parseFloat(ml);
      }

      // If there's an ongoing feed, we need to update it instead of creating a new one
      if (lastFeedAction && !lastFeedAction.details?.endTime) {
        // Update existing action
        const response = await fetch(`${API_URL}/actions/${lastFeedAction.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            details: details,
          }),
        });

        if (!response.ok) {
          let errorMessage = `Failed to update feed action (${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If we can't parse the error, use the default message
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (onSuccess) {
          onSuccess(data.action);
        }
      } else {
        // Create new action
        const response = await fetch(`${API_URL}/actions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            babyProfileId: profile.id,
            userId: userId,
            actionType: 'feed',
            details: details,
            userEmoji: userEmoji || null,
          }),
        });

        if (!response.ok) {
          let errorMessage = `Failed to save feed action (${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If we can't parse the error, use the default message
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (onSuccess) {
          onSuccess(data.action);
        }
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving feed action:', err);
      setError(err.message || 'Failed to save feed action');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelFeed = async () => {
    if (!lastFeedAction || !lastFeedAction.id) {
      setError('No ongoing feed to cancel');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_URL}/actions/${lastFeedAction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = `Failed to cancel feed action (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      // Call onSuccess with null to indicate the action was deleted
      if (onSuccess) {
        onSuccess(null);
      }
      
      onClose();
    } catch (err) {
      console.error('Error canceling feed action:', err);
      setError(err.message || 'Failed to cancel feed action');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="feed-action-overlay" onClick={onClose}>
      <div className="feed-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feed-action-header">
          <h3>{isStarting ? 'Start Feed' : 'End Feed'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="feed-action-content">
          <div className="time-section">
            <label htmlFor="startTime">Start Time:</label>
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {!isStarting && (
            <>
              <div className="time-section">
                <label htmlFor="endTime">End Time:</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div className="time-section">
                <label htmlFor="ml">ML (optional):</label>
                <input
                  type="number"
                  id="ml"
                  value={ml}
                  onChange={(e) => setMl(e.target.value)}
                  placeholder="Enter amount in ml"
                  min="0"
                  step="1"
                />
              </div>
            </>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="feed-action-buttons">
            <button
              className="btn btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            {isStarting ? (
              <button
                className="btn btn-start"
                onClick={handleStart}
                disabled={saving || !startTime}
              >
                Start Feed
              </button>
            ) : (
              <>
                {lastFeedAction && !lastFeedAction.details?.endTime && (
                  <button
                    className="btn btn-cancel-feed"
                    onClick={handleCancelFeed}
                    disabled={saving}
                  >
                    Reset
                  </button>
                )}
                <button
                  className="btn btn-end"
                  onClick={handleEnd}
                  disabled={saving || !startTime || !endTime}
                >
                  End Feed
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeedAction;

