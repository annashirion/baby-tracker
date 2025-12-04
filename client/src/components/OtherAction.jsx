import { useState } from 'react';
import './OtherAction.css';
import { API_URL } from '../constants/constants';

function OtherAction({ profile, userId, userEmoji, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
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
          actionType: 'other',
          details: {
            title: title.trim(),
            comments: comments.trim() || null,
          },
          userEmoji: userEmoji || null,
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
              disabled={saving || !title.trim()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OtherAction;

