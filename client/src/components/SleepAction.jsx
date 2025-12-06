import { useTimeAction } from './useTimeAction';
import TimeInputPicker from './TimeInputPicker';
import './ActionModal.css';
import './TimeInput.css';
import './SleepAction.css';

function SleepAction({ profile, userId, userEmoji, onClose, onSuccess, lastSleepAction }) {
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
          actionType: 'sleep',
    lastAction: lastSleepAction,
    profile,
    userId,
    userEmoji,
    onSuccess,
    onClose,
      });

  return (
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
                disabled={saving || !startTime}
              >
                Start Sleep
              </button>
            ) : (
              <>
                {lastSleepAction && !lastSleepAction.details?.endTime && (
                  <button
                    className="action-modal__button action-modal__button-cancel sleep-action__button-cancel"
                    onClick={() => handleCancel()}
                    disabled={saving}
                  >
                    Reset
                  </button>
                )}
                <button
                  className="action-modal__button action-modal__button-end sleep-action__button-end"
                  onClick={() => handleEnd()}
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
