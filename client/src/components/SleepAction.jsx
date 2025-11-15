import { useState, useEffect } from 'react';
import './SleepAction.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function SleepAction({ profile, userId, userEmoji, onClose, onSuccess, lastSleepAction }) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Check if there's an ongoing sleep (no end time)
    if (lastSleepAction && !lastSleepAction.details?.endTime) {
      // We're ending a sleep session
      setIsStarting(false);
      const now = new Date();
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 19);
      setEndTime(localDateTime);
      // Set start time from the last action
      if (lastSleepAction.details?.startTime) {
        const startDate = new Date(lastSleepAction.details.startTime);
        const localStartDateTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 19);
        setStartTime(localStartDateTime);
      }
    } else {
      // We're starting a new sleep session
      setIsStarting(true);
      const now = new Date();
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 19);
      setStartTime(localDateTime);
      setEndTime('');
    }
  }, [lastSleepAction]);

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
          actionType: 'sleep',
          details: {
            startTime: new Date(startTime).toISOString(),
            endTime: null,
          },
          userEmoji: userEmoji || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to save sleep action (${response.status})`;
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
      console.error('Error saving sleep action:', err);
      setError(err.message || 'Failed to save sleep action');
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

    try {
      setSaving(true);
      setError(null);

      // If there's an ongoing sleep, we need to update it instead of creating a new one
      if (lastSleepAction && !lastSleepAction.details?.endTime) {
        // Update existing action
        const response = await fetch(`${API_URL}/actions/${lastSleepAction.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            details: {
              startTime: new Date(startTime).toISOString(),
              endTime: new Date(endTime).toISOString(),
              endUserId: userId,
              endUserEmoji: userEmoji || null,
            },
          }),
        });

        if (!response.ok) {
          let errorMessage = `Failed to update sleep action (${response.status})`;
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
            actionType: 'sleep',
            details: {
              startTime: new Date(startTime).toISOString(),
              endTime: new Date(endTime).toISOString(),
              endUserId: userId,
              endUserEmoji: userEmoji || null,
            },
            userEmoji: userEmoji || null,
          }),
        });

        if (!response.ok) {
          let errorMessage = `Failed to save sleep action (${response.status})`;
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
      console.error('Error saving sleep action:', err);
      setError(err.message || 'Failed to save sleep action');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSleep = async () => {
    if (!lastSleepAction || !lastSleepAction.id) {
      setError('No ongoing sleep to cancel');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_URL}/actions/${lastSleepAction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = `Failed to cancel sleep action (${response.status})`;
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
      console.error('Error canceling sleep action:', err);
      setError(err.message || 'Failed to cancel sleep action');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sleep-action-overlay" onClick={onClose}>
      <div className="sleep-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sleep-action-header">
          <h3>{isStarting ? 'Start Sleep' : 'End Sleep'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="sleep-action-content">
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
            <div className="time-section">
              <label htmlFor="endTime">End Time:</label>
              <input
                type="datetime-local"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="sleep-action-buttons">
            {isStarting ? (
              <button
                className="btn btn-start"
                onClick={handleStart}
                disabled={saving || !startTime}
              >
                Start Sleep
              </button>
            ) : (
              <>
                {lastSleepAction && !lastSleepAction.details?.endTime && (
                  <button
                    className="btn btn-cancel-sleep"
                    onClick={handleCancelSleep}
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
                  End Sleep
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SleepAction;

