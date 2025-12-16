import { useState, useEffect } from 'react';
import TimeInputPicker from './TimeInputPicker';
import LoadingDots from './LoadingDots';
import './DiaperAction.css';
import './TimeInput.css';
import { API_URL, ACTION_TYPES, DIAPER_TYPES } from '../constants/constants';
import { apiFetch } from '../utils/api';

function DiaperAction({ profile, userId, userEmoji, onClose, onSuccess }) {
  const [diaperType, setDiaperType] = useState(DIAPER_TYPES.PEE);
  const [comments, setComments] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const getLocalDateTime = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19);
  };

  useEffect(() => {
    setTimestamp(getLocalDateTime());
  }, []);

  const handleSave = async () => {
    if (!diaperType) {
      setError('Please select a diaper type');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await apiFetch(`${API_URL}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          babyProfileId: profile.id,
          actionType: ACTION_TYPES.DIAPER,
          details: {
            type: diaperType,
            comments: comments.trim() || null,
            timestamp: timestamp ? new Date(timestamp).toISOString() : null,
          },
          userEmoji: userEmoji || null,
          timestamp: timestamp ? new Date(timestamp).toISOString() : null,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to save diaper action (${response.status})`;
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
      
      // Close the component
      onClose();
    } catch (err) {
      console.error('Error saving diaper action:', err);
      setError(err.message || 'Failed to save diaper action');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="diaper-action-overlay" onClick={onClose}>
      <div className="diaper-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="diaper-action-header">
          <h3>Diaper Change</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="diaper-action-content">
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

          <div className="diaper-action-time-section">
            <label htmlFor="diaperTime">Time:</label>
            <TimeInputPicker
              id="diaperTime"
              className="time-input--diaper"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              label="Time"
            />
          </div>

          <div className="comments-section">
            <label htmlFor="comments">Additional Comments (optional):</label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any additional notes..."
              rows="4"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="diaper-action-buttons">
            <button
              className="btn btn-save"
              onClick={handleSave}
              disabled={saving || !diaperType || !timestamp}
            >
              {saving ? <LoadingDots size="small" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiaperAction;

