import { useState, useEffect } from 'react';
import './BabyProfiles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function BabyProfiles({ userId, onViewUsers, onOpenProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    birthDate: '',
    gender: '',
  });
  const [joinCode, setJoinCode] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchProfiles();
    }
  }, [userId]);

  // Helper function to safely parse JSON responses
  const parseJSONResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    if (contentType && contentType.includes('application/json')) {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Failed to parse JSON response: ${text.substring(0, 100)}`);
      }
    } else {
      throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
    }
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/baby-profiles?userId=${userId}`);
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch baby profiles (${response.status})`;
        try {
          const errorData = await parseJSONResponse(response);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await parseJSONResponse(response);
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError(err.message || 'Failed to fetch baby profiles. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);

      const response = await fetch(`${API_URL}/baby-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: createForm.name,
          birthDate: createForm.birthDate || null,
          gender: createForm.gender || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to create baby profile (${response.status})`;
        try {
          const errorData = await parseJSONResponse(response);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await parseJSONResponse(response);
      setProfiles([...profiles, data.profile]);
      setCreateForm({ name: '', birthDate: '', gender: '' });
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating profile:', err);
      setError(err.message || 'Failed to create baby profile');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinProfile = async (e) => {
    e.preventDefault();
    try {
      setJoining(true);
      setError(null);

      const response = await fetch(`${API_URL}/baby-profiles/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          joinCode: joinCode.trim().toUpperCase(),
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to join baby profile (${response.status})`;
        try {
          const errorData = await parseJSONResponse(response);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await parseJSONResponse(response);
      setProfiles([...profiles, data.profile]);
      setJoinCode('');
      setShowJoinForm(false);
    } catch (err) {
      console.error('Error joining profile:', err);
      setError(err.message || 'Failed to join baby profile');
    } finally {
      setJoining(false);
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleCopyJoinCode = async (code, profileId) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(profileId);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (err) {
      console.error('Failed to copy join code:', err);
    }
  };

  if (loading) {
    return <div className="baby-profiles-container">Loading baby profiles...</div>;
  }

  return (
    <div className="baby-profiles-container">
      <div className="baby-profiles-header">
        <div className="baby-profiles-actions">
          <button 
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setShowJoinForm(false);
            }}
            className="btn btn-primary"
          >
            {showCreateForm ? 'Cancel' : '+ Create Profile'}
          </button>
          <button 
            onClick={() => {
              setShowJoinForm(!showJoinForm);
              setShowCreateForm(false);
            }}
            className="btn btn-secondary"
          >
            {showJoinForm ? 'Cancel' : '+ Join Profile'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="form-card">
          <h3>Create New Baby Profile</h3>
          <form onSubmit={handleCreateProfile}>
            <div className="form-group">
              <label htmlFor="name">Baby Name *</label>
              <input
                type="text"
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                placeholder="Enter baby's name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="birthDate">Birth Date</label>
              <input
                type="date"
                id="birthDate"
                value={createForm.birthDate}
                onChange={(e) => setCreateForm({ ...createForm, birthDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                value={createForm.gender}
                onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Profile'}
            </button>
          </form>
        </div>
      )}

      {showJoinForm && (
        <div className="form-card">
          <h3>Join Baby Profile</h3>
          <form onSubmit={handleJoinProfile}>
            <div className="form-group">
              <label htmlFor="joinCode">Join Code *</label>
              <input
                type="text"
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
                placeholder="Enter 6-character join code"
                maxLength="6"
                className="join-code-input"
              />
              <small>Enter the 6-character code shared by the profile owner</small>
            </div>
            <button type="submit" className="btn btn-secondary" disabled={joining}>
              {joining ? 'Joining...' : 'Join Profile'}
            </button>
          </form>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="empty-state">
          <p>No baby profiles yet. Create one or join an existing profile to get started!</p>
        </div>
      ) : (
        <div className="profiles-grid">
          {profiles.map((profile) => (
            <div 
              key={profile.id} 
              className="profile-card profile-card-clickable"
              onClick={() => onOpenProfile && onOpenProfile(profile)}
            >
              <div className="profile-header">
                <h3>{profile.name}</h3>
                <span 
                  className={`role-badge role-badge-${profile.role || 'default'}`}
                >
                  {profile.role}
                </span>
              </div>
              <div className="profile-details">
                <div className="profile-detail">
                  <strong>Birth Date:</strong> {formatDate(profile.birthDate)}
                </div>
                {profile.gender && (
                  <div className="profile-detail">
                    <strong>Gender:</strong> {profile.gender}
                  </div>
                )}
                <div className="profile-detail">
                  <strong>Join Code:</strong> 
                  <code 
                    className="join-code"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyJoinCode(profile.joinCode, profile.id);
                    }}
                    title="Click to copy"
                  >
                    {copiedCodeId === profile.id ? 'Copied!' : profile.joinCode}
                  </code>
                </div>
              </div>
              {profile.role === 'admin' && onViewUsers && (
                <div 
                  className="profile-card-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => onViewUsers(profile.id, profile.name)}
                    className="btn btn-primary"
                  >
                    View Users
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BabyProfiles;

