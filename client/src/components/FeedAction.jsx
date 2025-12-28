import { useState } from 'react';
import { useTimeAction } from './useTimeAction';
import TimeInputPicker from './TimeInputPicker';
import LoadingDots from './LoadingDots';
import './ActionModal.css';
import './TimeInput.css';
import './FeedAction.css';
import { ACTION_TYPES } from '../constants/constants';

function FeedAction({ profile, userId, userEmoji, onClose, onSuccess, lastFeedAction }) {
  const [ml, setMl] = useState('');
  const [mlError, setMlError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const {
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    savingAction,
    error,
    isStarting,
    handleStart,
    handleEnd,
    handleCancel,
  } = useTimeAction({
          actionType: ACTION_TYPES.FEED,
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

  const handleResetCancel = () => {
    setShowResetConfirm(false);
  };

  const handleResetConfirm = async () => {
    setShowResetConfirm(false);
    await handleCancel();
  };

  return (
    <>
      {showResetConfirm && (
        <div className="action-modal__overlay action-modal__overlay--delete-confirm" onClick={handleResetCancel}>
          <div className="action-modal__modal" onClick={(e) => e.stopPropagation()}>
            <div className="action-modal__header">
              <h3>Reset Feed?</h3>
              <button className="action-modal__close-button" onClick={handleResetCancel}>×</button>
            </div>
            
            <div className="action-modal__content">
              <p className="action-modal__delete-message">
                Are you sure you want to reset this feed? This will delete the ongoing feed action.
              </p>

              <div className="action-modal__buttons">
                <button
                  className="action-modal__button action-modal__button-cancel"
                  onClick={handleResetCancel}
                  disabled={savingAction === 'cancel'}
                >
                  Cancel
                </button>
                <button
                  className="action-modal__button action-modal__button-cancel"
                  onClick={handleResetConfirm}
                  disabled={savingAction === 'cancel'}
                >
                  {savingAction === 'cancel' ? <LoadingDots size="small" /> : 'Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="action-modal__overlay" onClick={onClose}>
        <div className="action-modal__modal" onClick={(e) => e.stopPropagation()}>
        <div className="action-modal__header">
          <h3>{isStarting ? 'Start Feed' : 'End Feed'}</h3>
          <button className="action-modal__close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="action-modal__content">
          <div className="action-modal__time-section">
            <label htmlFor="startTime">Start Time:</label>
            <TimeInputPicker
              id="startTime"
              className="time-input--feed"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              label="Start time"
            />
          </div>

          {!isStarting && (
            <>
              <div className="action-modal__time-section">
                <label htmlFor="endTime">End Time:</label>
                <TimeInputPicker
                  id="endTime"
                  className="time-input--feed"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  label="End time"
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
                  <div className="action-modal__error action-modal__error--top-margin">
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
                disabled={savingAction || !startTime}
              >
                {savingAction === 'start' ? <LoadingDots size="small" /> : 'Start Feed'}
              </button>
            ) : (
              <>
                {lastFeedAction && !lastFeedAction.details?.endTime && (
                  <button
                    className="action-modal__button action-modal__button-cancel feed-action__button-cancel"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={savingAction}
                  >
                    Reset
                  </button>
                )}
                <button
                  className="action-modal__button action-modal__button-end feed-action__button-end"
                  onClick={handleEndWithMl}
                  disabled={savingAction || !startTime || !endTime || !!mlError}
                >
                  {savingAction === 'end' ? <LoadingDots size="small" /> : 'End Feed'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default FeedAction;
