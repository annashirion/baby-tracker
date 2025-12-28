import { useState } from 'react';
import { useTimeAction } from './useTimeAction';
import TimeInputPicker from './TimeInputPicker';
import LoadingDots from './LoadingDots';
import './ActionModal.css';
import './TimeInput.css';
import './SleepAction.css';
import { ACTION_TYPES } from '../constants/constants';

function SleepAction({ profile, userId, userEmoji, onClose, onSuccess, lastSleepAction }) {
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
          actionType: ACTION_TYPES.SLEEP,
    lastAction: lastSleepAction,
    profile,
    userId,
    userEmoji,
    onSuccess,
    onClose,
      });

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
              <h3>Reset Sleep?</h3>
              <button className="action-modal__close-button" onClick={handleResetCancel}>×</button>
            </div>
            
            <div className="action-modal__content">
              <p className="action-modal__delete-message">
                Are you sure you want to reset this sleep? This will delete the ongoing sleep action.
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
          <h3>{isStarting ? 'Start Sleep' : 'End Sleep'}</h3>
          <button className="action-modal__close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="action-modal__content">
          <div className="action-modal__time-section">
            <label htmlFor="startTime">Start Time:</label>
            <TimeInputPicker
              id="startTime"
              className="time-input--sleep"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              label="Start time"
            />
          </div>

          {!isStarting && (
            <div className="action-modal__time-section">
              <label htmlFor="endTime">End Time:</label>
              <TimeInputPicker
                id="endTime"
                className="time-input--sleep"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                label="End time"
              />
            </div>
          )}

          {error && (
            <div className="action-modal__error">
              {error}
            </div>
          )}

          <div className="action-modal__buttons">
            {isStarting ? (
              <button
                className="action-modal__button action-modal__button-start sleep-action__button-start"
                onClick={() => handleStart()}
                disabled={savingAction || !startTime}
              >
                {savingAction === 'start' ? <LoadingDots size="small" /> : 'Start Sleep'}
              </button>
            ) : (
              <>
                {lastSleepAction && !lastSleepAction.details?.endTime && (
                  <button
                    className="action-modal__button action-modal__button-cancel sleep-action__button-cancel"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={savingAction}
                  >
                    Reset
                  </button>
                )}
                <button
                  className="action-modal__button action-modal__button-end sleep-action__button-end"
                  onClick={() => handleEnd()}
                  disabled={savingAction || !startTime || !endTime}
                >
                  {savingAction === 'end' ? <LoadingDots size="small" /> : 'End Sleep'}
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

export default SleepAction;
