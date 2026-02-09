import { useState, useEffect } from 'react';
import TimeInputPicker from './TimeInputPicker';
import LoadingDots from './LoadingDots';
import './OtherAction.css';
import './TimeInput.css';
import { API_URL, ACTION_TYPES } from '../constants/constants';
import { apiFetch } from '../utils/api';

function OtherAction({ profile, userId, userEmoji, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
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
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await apiFetch(`${API_URL}/baby-profiles/${profile.id}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          actionType: ACTION_TYPES.OTHER,
          details: {
            title: title.trim(),
            comments: comments.trim() || null,
            timestamp: timestamp ? new Date(timestamp).toISOString() : null,
          },
          userEmoji: userEmoji || null,
          timestamp: timestamp ? new Date(timestamp).toISOString() : null,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to save action (${response.status})`;
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
      console.error('Error saving action:', err);
      setError(err.message || 'Failed to save action');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="other-action-overlay" onClick={onClose}>
      <div className="other-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="other-action-header">
          <h3>Other Action</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="other-action-content">
          <div className="title-section">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this action..."
              maxLength={100}
            />
          </div>

          <div className="other-action-time-section">
            <label htmlFor="otherTime">Time:</label>
            <TimeInputPicker
              id="otherTime"
              className="time-input--other"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              label="Time"
            />
          </div>

          <div className="comments-section">
            <label htmlFor="comments">Comments (optional):</label>
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

          <div className="other-action-buttons">
            <button
              className="btn btn-save"
              onClick={handleSave}
              disabled={saving || !title.trim() || !timestamp}
            >
              {saving ? <LoadingDots size="small" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OtherAction;

