import { useState } from 'react';
import './DiaperAction.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function DiaperAction({ profile, userId, userEmoji, onClose, onSuccess }) {
  const [diaperType, setDiaperType] = useState(null); // 'pee', 'poo', or 'both'
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!diaperType) {
      setError('Please select a diaper type');
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
          actionType: 'diaper',
          details: {
            type: diaperType,
            comments: comments.trim() || null,
          },
          userEmoji: userEmoji || null,
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
                className={`diaper-type-btn ${diaperType === 'pee' ? 'active' : ''}`}
                onClick={() => setDiaperType('pee')}
              >
                💧 Pee
              </button>
              <button
                className={`diaper-type-btn ${diaperType === 'poo' ? 'active' : ''}`}
                onClick={() => setDiaperType('poo')}
              >
                💩 Poo
              </button>
              <button
                className={`diaper-type-btn ${diaperType === 'both' ? 'active' : ''}`}
                onClick={() => setDiaperType('both')}
              >
                💧💩 Both
              </button>
            </div>
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
              disabled={saving || !diaperType}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiaperAction;

