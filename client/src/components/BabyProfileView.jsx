import './BabyProfileView.css';

function BabyProfileView({ profile, onClose }) {
  const handleAction = (actionType) => {
    console.log(`Action: ${actionType} for profile: ${profile.name}`);
    // TODO: Implement API call to track this action
  };

  return (
    <div className="baby-profile-view">
      <div className="baby-profile-view-header">
        <button onClick={onClose} className="btn btn-back">
          ← Back to Profiles
        </button>
        <h2>{profile.name}</h2>
      </div>
      
      <div className="action-buttons-container">
        <button 
          className="action-button action-button-diaper"
          onClick={() => handleAction('diaper')}
        >
          <span>🍼</span> <span>Diaper</span>
        </button>
        <button 
          className="action-button action-button-sleep"
          onClick={() => handleAction('sleep')}
        >
          <span>😴</span> <span>Sleep</span>
        </button>
        <button 
          className="action-button action-button-feed"
          onClick={() => handleAction('feed')}
        >
          <span>🍼</span> <span>Feed</span>
        </button>
        <button 
          className="action-button action-button-other"
          onClick={() => handleAction('other')}
        >
          <span>📝</span> <span>Other</span>
        </button>
      </div>
    </div>
  );
}

export default BabyProfileView;

