import { useState } from 'react';
import { useTimeAction } from './useTimeAction';
import './ActionModal.css';
import './TimeInput.css';
import './FeedAction.css';

function FeedAction({ profile, userId, userEmoji, onClose, onSuccess, lastFeedAction }) {
  const [ml, setMl] = useState('');
  const [mlError, setMlError] = useState('');

  const {
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    saving,
    error,
    isStarting,
    handleStart,
    handleEnd,
    handleCancel,
  } = useTimeAction({
          actionType: 'feed',
    lastAction: lastFeedAction,
    profile,
    userId,
    userEmoji,
    onSuccess,
    onClose,
  });

  const validateMl = () => {
    if (ml && ml.trim() !== '') {
      if (isNaN(ml) || parseFloat(ml) < 0) {
        setMlError('ML must be a positive number');
        return false;
      }
      setMlError('');
    }
    return true;
  };

  const handleEndWithMl = () => {
    if (!validateMl()) {
      return;
    }
    const additionalDetails = {};
      if (ml && ml.trim() !== '') {
      additionalDetails.ml = parseFloat(ml);
        }
    handleEnd(additionalDetails);
  };

  return (
    <div className="action-modal__overlay" onClick={onClose}>
      <div className="action-modal__modal" onClick={(e) => e.stopPropagation()}>
        <div className="action-modal__header">
          <h3>{isStarting ? 'Start Feed' : 'End Feed'}</h3>
          <button className="action-modal__close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="action-modal__content">
          <div className="action-modal__time-section">
            <label htmlFor="startTime">Start Time:</label>
            <input
              type="datetime-local"
              id="startTime"
              className="time-input time-input--feed"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {!isStarting && (
            <>
              <div className="action-modal__time-section">
                <label htmlFor="endTime">End Time:</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  className="time-input time-input--feed"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div className="action-modal__time-section">
                <label htmlFor="ml">ML (optional):</label>
                <input
                  type="number"
                  id="ml"
                  className="time-input time-input--number"
                  value={ml}
                  onChange={(e) => {
                    setMl(e.target.value);
                    setMlError('');
                  }}
                  placeholder="Enter amount in ml"
                  min="0"
                  step="1"
                />
                {mlError && (
                  <div className="action-modal__error" style={{ marginTop: '0.5rem' }}>
                    {mlError}
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="action-modal__error">
              {error}
            </div>
          )}

          <div className="action-modal__buttons">
            {isStarting ? (
              <button
                className="action-modal__button action-modal__button-start feed-action__button-start"
                onClick={() => handleStart()}
                disabled={saving || !startTime}
              >
                Start Feed
              </button>
            ) : (
              <>
                {lastFeedAction && !lastFeedAction.details?.endTime && (
                  <button
                    className="action-modal__button action-modal__button-cancel feed-action__button-cancel"
                    onClick={() => handleCancel()}
                    disabled={saving}
                  >
                    Reset
                  </button>
                )}
                <button
                  className="action-modal__button action-modal__button-end feed-action__button-end"
                  onClick={handleEndWithMl}
                  disabled={saving || !startTime || !endTime || !!mlError}
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
