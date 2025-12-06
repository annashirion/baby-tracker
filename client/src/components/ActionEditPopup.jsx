import { useState, useEffect } from 'react';
import TimeInputPicker from './TimeInputPicker';
import './ActionModal.css';
import './TimeInput.css';
import './DiaperAction.css';
import './FeedAction.css';
import './SleepAction.css';
import './OtherAction.css';
import './ActionEditPopup.css';
import { API_URL, ACTION_TYPES, DIAPER_TYPES } from '../constants/constants';

function ActionEditPopup({ action, onClose, onDelete, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Diaper state
  const [diaperType, setDiaperType] = useState(action.details?.type || null);
  const [diaperTimestamp, setDiaperTimestamp] = useState('');
  const [diaperComments, setDiaperComments] = useState(action.details?.comments || '');

  // Feed state
  const [feedStartTime, setFeedStartTime] = useState('');
  const [feedEndTime, setFeedEndTime] = useState('');
  const [feedMl, setFeedMl] = useState(action.details?.ml?.toString() || '');
  const [feedComments, setFeedComments] = useState(action.details?.comments || '');

  // Sleep state
  const [sleepStartTime, setSleepStartTime] = useState('');
  const [sleepEndTime, setSleepEndTime] = useState('');
  const [sleepComments, setSleepComments] = useState(action.details?.comments || '');

  // Other state
  const [otherTitle, setOtherTitle] = useState(action.details?.title || '');
  const [otherTimestamp, setOtherTimestamp] = useState('');
  const [otherComments, setOtherComments] = useState(action.details?.comments || '');

  const getLocalDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19);
  };

  useEffect(() => {
    if (action.actionType === ACTION_TYPES.DIAPER) {
      const timestamp = action.details?.timestamp || action.createdAt;
      setDiaperTimestamp(getLocalDateTime(timestamp));
    } else if (action.actionType === ACTION_TYPES.FEED) {
      setFeedStartTime(getLocalDateTime(action.details?.startTime || action.createdAt));
      setFeedEndTime(getLocalDateTime(action.details?.endTime || ''));
      setFeedComments(action.details?.comments || '');
    } else if (action.actionType === ACTION_TYPES.SLEEP) {
      setSleepStartTime(getLocalDateTime(action.details?.startTime || action.createdAt));
      setSleepEndTime(getLocalDateTime(action.details?.endTime || ''));
      setSleepComments(action.details?.comments || '');
    } else if (action.actionType === ACTION_TYPES.OTHER) {
      const timestamp = action.details?.timestamp || action.createdAt;
      setOtherTimestamp(getLocalDateTime(timestamp));
    }
  }, [action]);

  const handleUpdate = async () => {
    try {
      setSaving(true);
      setError(null);

      let details = {};

      if (action.actionType === ACTION_TYPES.DIAPER) {
        if (!diaperType) {
          setError('Please select a diaper type');
          return;
        }
        details = {
          type: diaperType,
          comments: diaperComments.trim() || null,
          timestamp: diaperTimestamp ? new Date(diaperTimestamp).toISOString() : null,
        };
      } else if (action.actionType === ACTION_TYPES.FEED) {
        if (!feedStartTime) {
          setError('Start time is required');
          return;
        }
        details = {
          startTime: feedStartTime ? new Date(feedStartTime).toISOString() : null,
          endTime: feedEndTime ? new Date(feedEndTime).toISOString() : null,
          ml: feedMl ? parseFloat(feedMl) : null,
          comments: feedComments.trim() || null,
        };
      } else if (action.actionType === ACTION_TYPES.SLEEP) {
        if (!sleepStartTime) {
          setError('Start time is required');
          return;
        }
        details = {
          startTime: sleepStartTime ? new Date(sleepStartTime).toISOString() : null,
          endTime: sleepEndTime ? new Date(sleepEndTime).toISOString() : null,
          comments: sleepComments.trim() || null,
        };
      } else if (action.actionType === ACTION_TYPES.OTHER) {
        if (!otherTitle.trim()) {
          setError('Title is required');
          return;
        }
        details = {
          title: otherTitle.trim(),
          comments: otherComments.trim() || null,
          timestamp: otherTimestamp ? new Date(otherTimestamp).toISOString() : null,
        };
      }

      const response = await fetch(`${API_URL}/actions/${action.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ details }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to update action (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (onUpdate) {
        onUpdate();
      }
      
      onClose();
    } catch (err) {
      console.error('Error updating action:', err);
      setError(err.message || 'Failed to update action');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      setError(null);
      setShowDeleteConfirm(false);
      await onDelete(action.id);
    } catch (err) {
      setError(err.message || 'Failed to delete action');
    } finally {
      setDeleting(false);
    }
  };

  const getActionTitle = () => {
    switch (action.actionType) {
      case ACTION_TYPES.DIAPER:
        return 'Edit Diaper Change';
      case ACTION_TYPES.FEED:
        return 'Edit Feed';
      case ACTION_TYPES.SLEEP:
        return 'Edit Sleep';
      case ACTION_TYPES.OTHER:
        return 'Edit Action';
      default:
        return 'Edit Action';
    }
  };

  const renderDiaperForm = () => (
    <>
      <div className="diaper-type-selection">
        <label>Type:</label>
        <div className="diaper-type-buttons">
          <button
            className={`diaper-type-btn ${diaperType === DIAPER_TYPES.PEE ? 'active' : ''}`}
            onClick={() => setDiaperType(DIAPER_TYPES.PEE)}
          >
            💧 Pee
          </button>
          <button
            className={`diaper-type-btn ${diaperType === DIAPER_TYPES.POO ? 'active' : ''}`}
            onClick={() => setDiaperType(DIAPER_TYPES.POO)}
          >
            💩 Poo
          </button>
        </div>
      </div>

      <div className="action-modal__time-section">
        <label htmlFor="diaperTime">Time:</label>
        <TimeInputPicker
          id="diaperTime"
          className="time-input--diaper"
          value={diaperTimestamp}
          onChange={(e) => setDiaperTimestamp(e.target.value)}
          label="Time"
        />
      </div>

      <div className="comments-section">
        <label htmlFor="diaperComments">Additional Comments (optional):</label>
        <textarea
          id="diaperComments"
          value={diaperComments}
          onChange={(e) => setDiaperComments(e.target.value)}
          placeholder="Add any additional notes..."
          rows="4"
        />
      </div>
    </>
  );

  const renderFeedForm = () => (
    <>
      <div className="action-modal__time-section">
        <label htmlFor="feedStartTime">Start Time:</label>
        <TimeInputPicker
          id="feedStartTime"
          className="time-input--feed"
          value={feedStartTime}
          onChange={(e) => setFeedStartTime(e.target.value)}
          label="Start time"
        />
      </div>

      <div className="action-modal__time-section">
        <label htmlFor="feedEndTime">End Time:</label>
        <TimeInputPicker
          id="feedEndTime"
          className="time-input--feed"
          value={feedEndTime}
          onChange={(e) => setFeedEndTime(e.target.value)}
          label="End time"
        />
      </div>

      <div className="action-modal__time-section">
        <label htmlFor="feedMl">ML (optional):</label>
        <input
          type="number"
          id="feedMl"
          className="time-input time-input--number"
          value={feedMl}
          onChange={(e) => setFeedMl(e.target.value)}
          placeholder="Enter amount in ml"
          min="0"
          step="1"
        />
      </div>

      <div className="comments-section">
        <label htmlFor="feedComments">Comments (optional):</label>
        <textarea
          id="feedComments"
          value={feedComments}
          onChange={(e) => setFeedComments(e.target.value)}
          placeholder="Add any additional notes..."
          rows="4"
        />
      </div>
    </>
  );

  const renderSleepForm = () => (
    <>
      <div className="action-modal__time-section">
        <label htmlFor="sleepStartTime">Start Time:</label>
        <TimeInputPicker
          id="sleepStartTime"
          className="time-input--sleep"
          value={sleepStartTime}
          onChange={(e) => setSleepStartTime(e.target.value)}
          label="Start time"
        />
      </div>

      <div className="action-modal__time-section">
        <label htmlFor="sleepEndTime">End Time:</label>
        <TimeInputPicker
          id="sleepEndTime"
          className="time-input--sleep"
          value={sleepEndTime}
          onChange={(e) => setSleepEndTime(e.target.value)}
          label="End time"
        />
      </div>

      <div className="comments-section">
        <label htmlFor="sleepComments">Comments (optional):</label>
        <textarea
          id="sleepComments"
          value={sleepComments}
          onChange={(e) => setSleepComments(e.target.value)}
          placeholder="Add any additional notes..."
          rows="4"
        />
      </div>
    </>
  );

  const renderOtherForm = () => (
    <>
      <div className="title-section">
        <label htmlFor="otherTitle">Title *</label>
        <input
          type="text"
          id="otherTitle"
          value={otherTitle}
          onChange={(e) => setOtherTitle(e.target.value)}
          placeholder="Enter a title for this action..."
          maxLength={100}
        />
      </div>

      <div className="action-modal__time-section">
        <label htmlFor="otherTime">Time:</label>
        <TimeInputPicker
          id="otherTime"
          className="time-input--other"
          value={otherTimestamp}
          onChange={(e) => setOtherTimestamp(e.target.value)}
          label="Time"
        />
      </div>

      <div className="comments-section">
        <label htmlFor="otherComments">Comments (optional):</label>
        <textarea
          id="otherComments"
          value={otherComments}
          onChange={(e) => setOtherComments(e.target.value)}
          placeholder="Add any additional notes..."
          rows="4"
        />
      </div>
    </>
  );

  return (
    <>
      {showDeleteConfirm && (
        <div className="action-modal__overlay" onClick={handleDeleteCancel} style={{ zIndex: 2000 }}>
          <div className="action-modal__modal" onClick={(e) => e.stopPropagation()}>
            <div className="action-modal__header">
              <h3>Delete Action?</h3>
              <button className="action-modal__close-button" onClick={handleDeleteCancel}>×</button>
            </div>
            
            <div className="action-modal__content">
              <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
                Are you sure you want to delete this action? This cannot be undone.
              </p>

              <div className="action-modal__buttons">
                <button
                  className="action-modal__button action-modal__button-cancel"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="action-modal__button action-edit-popup__button-delete"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="action-modal__overlay" onClick={onClose}>
        <div className="action-modal__modal" onClick={(e) => e.stopPropagation()} data-action-type={action.actionType}>
          <div className="action-modal__header">
            <h3>{getActionTitle()}</h3>
            <button className="action-modal__close-button" onClick={onClose}>×</button>
          </div>
          
          <div className="action-modal__content">
            {action.actionType === ACTION_TYPES.DIAPER && renderDiaperForm()}
            {action.actionType === ACTION_TYPES.FEED && renderFeedForm()}
            {action.actionType === ACTION_TYPES.SLEEP && renderSleepForm()}
            {action.actionType === ACTION_TYPES.OTHER && renderOtherForm()}

            {error && (
              <div className="action-modal__error">
                {error}
              </div>
            )}

            <div className="action-modal__buttons">
              <button
                className="action-modal__button action-modal__button-cancel action-edit-popup__button-delete"
                onClick={handleDeleteClick}
                disabled={saving || deleting}
              >
                Delete
              </button>
              <button
                className="action-modal__button action-edit-popup__button-save"
                onClick={handleUpdate}
                disabled={saving || deleting || 
                  (action.actionType === ACTION_TYPES.DIAPER && !diaperType) ||
                  (action.actionType === ACTION_TYPES.FEED && !feedStartTime) ||
                  (action.actionType === ACTION_TYPES.SLEEP && !sleepStartTime) ||
                  (action.actionType === ACTION_TYPES.OTHER && !otherTitle.trim())}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ActionEditPopup;
