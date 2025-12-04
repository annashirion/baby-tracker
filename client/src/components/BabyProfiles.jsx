import { useState, useEffect } from 'react';
import './BabyProfiles.css';
import { ALLOWED_JOIN_CODE_CHARS, API_URL } from '../constants/constants';

function BabyProfiles({ userId, onViewUsers, onOpenProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [leaving, setLeaving] = useState({});
  const [confirmingLeaveId, setConfirmingLeaveId] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    birthDate: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    birthDate: '',
  });
  const [joinCode, setJoinCode] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [rateLimitActive, setRateLimitActive] = useState(false); // Simple flag for 3-second wait
  const [togglingJoinCode, setTogglingJoinCode] = useState({}); // Track which profile is being toggled

  useEffect(() => {
    if (userId) {
      fetchProfiles();
    }
  }, [userId]);

  // Simple 3-second timer for rate limit
  useEffect(() => {
    if (!rateLimitActive) {
      return;
    }

    const timer = setTimeout(() => {
      setRateLimitActive(false);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [rateLimitActive]);

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

  // Helper function to sort profiles by joinedAt (most recently joined/created first)
  const sortProfilesByJoinedAt = (profiles) => {
    return [...profiles].sort((a, b) => {
      const dateA = a.joinedAt ? new Date(a.joinedAt) : new Date(0);
      const dateB = b.joinedAt ? new Date(b.joinedAt) : new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });
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
      // Sort profiles by joinedAt (most recently joined/created first)
      setProfiles(sortProfilesByJoinedAt(data.profiles || []));
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
      // Add new profile and sort by joinedAt (most recently joined/created first)
      setProfiles(sortProfilesByJoinedAt([...profiles, data.profile]));
      setCreateForm({ name: '', birthDate: '' });
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
          // Prefer message over error for more detailed feedback (e.g., rate limiting)
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          // Activate 3-second wait for rate limiting (429) or failed attempts (404)
          if (response.status === 429 || response.status === 404) {
            setRateLimitActive(true);
          }
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await parseJSONResponse(response);
      // Add new profile and sort by joinedAt (most recently joined/created first)
      setProfiles(sortProfilesByJoinedAt([...profiles, data.profile]));
      setJoinCode('');
      setShowJoinForm(false);
      setRateLimitActive(false); // Clear rate limit on success
    } catch (err) {
      console.error('Error joining profile:', err);
      setError(err.message || 'Failed to join baby profile');
    } finally {
      setJoining(false);
    }
  };


  const calculateAge = (birthDateString) => {
    if (!birthDateString) return null;
    
    const birthDate = new Date(birthDateString);
    const today = new Date();
    
    // Check if birthdate is invalid
    if (isNaN(birthDate.getTime())) {
      return null;
    }
    
    // Set time to midnight for accurate day calculation
    birthDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // Check if birthdate is in the future
    if (birthDate > today) {
      return null;
    }
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Final check: if years is negative, the birthdate is in the future
    if (years < 0) {
      return null;
    }
    
    return { years, months, days };
  };

  const formatAge = (birthDateString) => {
    const age = calculateAge(birthDateString);
    if (!age) {
      // If birthDateString exists but age is null, it means the date is invalid or in the future
      if (birthDateString) {
        return 'Not born yet';
      }
      return 'Not set';
    }
    
    const parts = [];
    if (age.years > 0) {
      parts.push(`${age.years} ${age.years === 1 ? 'year' : 'years'}`);
    }
    if (age.months > 0) {
      parts.push(`${age.months} ${age.months === 1 ? 'month' : 'months'}`);
    }
    if (age.days > 0 || parts.length === 0) {
      parts.push(`${age.days} ${age.days === 1 ? 'day' : 'days'}`);
    }
    
    return parts.join(', ');
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

  const handleToggleJoinCode = async (profileId, e) => {
    e.stopPropagation();
    try {
      setTogglingJoinCode(prev => ({ ...prev, [profileId]: true }));
      setError(null);

      const response = await fetch(`${API_URL}/baby-profiles/${profileId}/toggle-join-code`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to toggle join code (${response.status})`;
        try {
          const errorData = await parseJSONResponse(response);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await parseJSONResponse(response);
      setProfiles(profiles.map(p => p.id === profileId ? data.profile : p));
    } catch (err) {
      console.error('Error toggling join code:', err);
      setError(err.message || 'Failed to toggle join code');
    } finally {
      setTogglingJoinCode(prev => {
        const updated = { ...prev };
        delete updated[profileId];
        return updated;
      });
    }
  };

  const handleEditProfile = (profile) => {
    setEditForm({
      name: profile.name,
      birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
    });
    setEditingProfileId(profile.id);
    setShowCreateForm(false);
    setShowJoinForm(false);
  };

  const handleCancelEdit = () => {
    setEditingProfileId(null);
    setEditForm({ name: '', birthDate: '' });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editingProfileId) return;

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`${API_URL}/baby-profiles/${editingProfileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: editForm.name,
          birthDate: editForm.birthDate || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to update baby profile (${response.status})`;
        try {
          const errorData = await parseJSONResponse(response);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await parseJSONResponse(response);
      setProfiles(profiles.map(p => p.id === editingProfileId ? data.profile : p));
      setEditingProfileId(null);
      setEditForm({ name: '', birthDate: '' });
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update baby profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (profileId) => {
    setConfirmingDeleteId(profileId);
    setEditingProfileId(null);
  };

  const handleCancelDelete = () => {
    setConfirmingDeleteId(null);
  };

  const handleConfirmDelete = async (profileId) => {
    try {
      setDeleting(prev => ({ ...prev, [profileId]: true }));
      setError(null);

      const response = await fetch(`${API_URL}/baby-profiles/${profileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to delete baby profile (${response.status})`;
        try {
          const errorData = await parseJSONResponse(response);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      setProfiles(profiles.filter(p => p.id !== profileId));
      setConfirmingDeleteId(null);
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError(err.message || 'Failed to delete baby profile');
    } finally {
      setDeleting(prev => {
        const updated = { ...prev };
        delete updated[profileId];
        return updated;
      });
    }
  };

  const handleLeaveClick = (profileId) => {
    setConfirmingLeaveId(profileId);
    setEditingProfileId(null);
  };

  const handleCancelLeave = () => {
    setConfirmingLeaveId(null);
  };

  const handleConfirmLeave = async (profileId) => {
    try {
      setLeaving(prev => ({ ...prev, [profileId]: true }));
      setError(null);

      const response = await fetch(`${API_URL}/baby-profiles/${profileId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to leave baby profile (${response.status})`;
        try {
          const errorData = await parseJSONResponse(response);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMessage);
      }

      setProfiles(profiles.filter(p => p.id !== profileId));
      setConfirmingLeaveId(null);
    } catch (err) {
      console.error('Error leaving profile:', err);
      setError(err.message || 'Failed to leave baby profile');
    } finally {
      setLeaving(prev => {
        const updated = { ...prev };
        delete updated[profileId];
        return updated;
      });
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
              if (showJoinForm) {
                // Clear rate limit when closing the form
                setRateLimitActive(false);
              }
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
                onChange={(e) => {
                  const filtered = e.target.value
                    .toUpperCase()
                    .split('')
                    .filter(char => ALLOWED_JOIN_CODE_CHARS.includes(char))
                    .join('');
                  setJoinCode(filtered);
                }}
                required
                placeholder="------"
                maxLength="6"
                className="join-code-input"
              />
              <small>Enter the 6-character code shared by the profile owner</small>
            </div>
            <button 
              type="submit" 
              className="btn btn-secondary" 
              disabled={joining || joinCode.length !== 6 || rateLimitActive}
            >
              {joining 
                ? 'Joining...' 
                : rateLimitActive
                  ? 'Wait...'
                  : 'Join Profile'}
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
            editingProfileId === profile.id ? (
              <div key={profile.id} className="profile-card">
                <div className="form-card-inline">
                  <h3>Edit Baby Profile</h3>
                  <form onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                      <label htmlFor="editName">Baby Name *</label>
                      <input
                        type="text"
                        id="editName"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                        placeholder="Enter baby's name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="editBirthDate">Birth Date</label>
                      <input
                        type="date"
                        id="editBirthDate"
                        value={editForm.birthDate}
                        onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                      />
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={updating}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={updating}>
                        {updating ? 'Updating...' : 'Update Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : confirmingDeleteId === profile.id ? (
              <div key={profile.id} className="profile-card">
                <div className="delete-confirmation-card">
                  <h3>Delete Profile?</h3>
                  <p>Are you sure you want to delete <strong>{profile.name}</strong>?</p>
                  <p className="delete-warning">This action cannot be undone and will remove all associated data.</p>
                  <div className="form-actions">
                  <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={handleCancelDelete}
                      disabled={deleting[profile.id]}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary delete-confirm-btn" 
                      onClick={() => handleConfirmDelete(profile.id)}
                      disabled={deleting[profile.id]}
                    >
                      {deleting[profile.id] ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ) : confirmingLeaveId === profile.id ? (
              <div key={profile.id} className="profile-card">
                <div className="delete-confirmation-card">
                  <h3>Leave Profile?</h3>
                  <p>Are you sure you want to leave <strong>{profile.name}</strong>?</p>
                  <p className="delete-warning">You will lose access to this profile and all its data. You can rejoin later using the join code.</p>
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={handleCancelLeave}
                      disabled={leaving[profile.id]}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary delete-confirm-btn" 
                      onClick={() => handleConfirmLeave(profile.id)}
                      disabled={leaving[profile.id]}
                    >
                      {leaving[profile.id] ? 'Leaving...' : 'Leave'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                key={profile.id} 
                className="profile-card profile-card-clickable"
                onClick={() => onOpenProfile && onOpenProfile(profile)}
              >
                <div className="profile-header">
                  <div className="profile-header-left">
                  {profile.role === 'admin' && (
                      <div className="profile-card-edit-buttons" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteClick(profile.id)}
                          className="delete-profile-btn"
                          title="Delete profile"
                          disabled={editingProfileId === profile.id || deleting[profile.id] || confirmingDeleteId === profile.id}
                        >
                          {deleting[profile.id] ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416">
                                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                              </circle>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleEditProfile(profile)}
                          className="edit-profile-btn"
                          title="Edit profile"
                          disabled={editingProfileId === profile.id || deleting[profile.id] || confirmingDeleteId === profile.id}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    {profile.role !== 'admin' && (
                      <div className="profile-card-edit-buttons" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleLeaveClick(profile.id)}
                          className="leave-profile-btn"
                          title="Leave profile"
                          disabled={leaving[profile.id] || confirmingLeaveId === profile.id}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    <h3>{profile.name}</h3>
                  </div>
                  <span 
                    className={`role-badge role-badge-${profile.role || 'default'}`}
                  >
                    {profile.role}
                  </span>
                </div>
                <div className="profile-details">
                  <div className="profile-detail">
                    <strong>Age:</strong> {formatAge(profile.birthDate)}
                  </div>
                  <div className="profile-detail join-code-detail">
                    <strong>Join Code:</strong> 
                    <div className="join-code-container">
                      <code 
                        className={`join-code ${profile.joinCodeEnabled === false ? 'join-code-disabled' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (profile.joinCodeEnabled !== false) {
                            handleCopyJoinCode(profile.joinCode, profile.id);
                          }
                        }}
                        title={profile.joinCodeEnabled === false ? 'Join code is disabled' : 'Click to copy'}
                      >
                        {copiedCodeId === profile.id ? 'Copied!' : profile.joinCode}
                      </code>
                      {profile.role === 'admin' && (
                        <label
                          className={`join-code-toggle ${togglingJoinCode[profile.id] ? 'toggle-loading' : ''} ${profile.joinCodeEnabled === false ? 'toggle-off' : 'toggle-on'}`}
                          title={profile.joinCodeEnabled === false ? 'Enable join code' : 'Disable join code'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!togglingJoinCode[profile.id]) {
                              handleToggleJoinCode(profile.id, e);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={profile.joinCodeEnabled !== false}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (!togglingJoinCode[profile.id]) {
                                handleToggleJoinCode(profile.id, e);
                              }
                            }}
                            disabled={togglingJoinCode[profile.id]}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      )}
                    </div>
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
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default BabyProfiles;

