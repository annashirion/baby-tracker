import { useState, useEffect, useRef } from 'react';
import './EmojiPicker.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function EmojiPicker({ currentEmoji, onEmojiChange, userId, size = 'medium', readOnly = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [emojis, setEmojis] = useState([]);
  const [loadingEmojis, setLoadingEmojis] = useState(true);
  const pickerRef = useRef(null);

  // Fetch emojis from server on component mount
  useEffect(() => {
    const fetchEmojis = async () => {
      try {
        const response = await fetch(`${API_URL}/emojis`);
        if (!response.ok) {
          throw new Error('Failed to fetch emojis');
        }
        const data = await response.json();
        setEmojis(data.emojis || []);
      } catch (err) {
        console.error('Error fetching emojis:', err);
        // Fallback to empty array if fetch fails
        setEmojis([]);
      } finally {
        setLoadingEmojis(false);
      }
    };

    fetchEmojis();
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleEmojiSelect = async (emoji) => {
    if (!userId) {
      // If no userId, just call the callback
      onEmojiChange(emoji);
      setIsOpen(false);
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`${API_URL}/users/${userId}/emoji`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update emoji');
      }

      onEmojiChange(emoji);
      setIsOpen(false);
    } catch (err) {
      console.error('Error updating emoji:', err);
      alert(`Failed to update emoji: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const sizeClass = size === 'large' ? 'emoji-large' : 'emoji-medium';

  return (
    <div className="emoji-picker-container" ref={pickerRef}>
      <div 
        className={`emoji-display ${sizeClass} ${readOnly ? 'emoji-readonly' : ''}`}
        onClick={readOnly ? undefined : () => setIsOpen(!isOpen)}
        title={readOnly ? undefined : "Click to change emoji"}
      >
        {currentEmoji || '👤'}
      </div>
      
      {isOpen && (
        <>
          <div 
            className="emoji-picker-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="emoji-picker-popup">
            <div className="emoji-picker-header">
              <h3>Choose an Emoji</h3>
              <button 
                className="emoji-picker-close"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="emoji-picker-grid">
              {loadingEmojis ? (
                <div className="emoji-picker-loading">Loading emojis...</div>
              ) : emojis.length === 0 ? (
                <div className="emoji-picker-loading">No emojis available</div>
              ) : (
                emojis.map((emoji, index) => (
                  <button
                    key={index}
                    className={`emoji-option ${currentEmoji === emoji ? 'selected' : ''}`}
                    onClick={() => handleEmojiSelect(emoji)}
                    disabled={updating}
                  >
                    {emoji}
                  </button>
                ))
              )}
            </div>
            {updating && (
              <div className="emoji-picker-loading">
                Updating...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default EmojiPicker;

