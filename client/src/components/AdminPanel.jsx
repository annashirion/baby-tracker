import { useState, useEffect } from 'react';
import { API_URL } from '../constants/constants';
import Spinner from './Spinner';
import RefreshButton from './RefreshButton';
import { apiFetch } from '../utils/api';
import './AdminPanel.css';

function AdminPanel({ userId, babyProfileId, onClose, onRefreshReady }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingRoles, setUpdatingRoles] = useState({}); // Track which user's role is being updated
  const [deletingUsers, setDeletingUsers] = useState({}); // Track which user is being deleted
  const [confirmingDeleteUserId, setConfirmingDeleteUserId] = useState(null); // Track which user deletion is being confirmed
  const [blockingUsers, setBlockingUsers] = useState({}); // Track which user is being blocked/unblocked
  const [showBlockedUsers, setShowBlockedUsers] = useState(false); // Track whether to show blocked users list

  const fetchUsers = async (isInitialLoad = true) => {
    if (!userId || !babyProfileId) {
      setError('User ID and Baby Profile ID are required');
      if (isInitialLoad) {
        setLoading(false);
      }
      return;
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      const response = await apiFetch(`${API_URL}/baby-profiles/${babyProfileId}/members`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (userId && babyProfileId) {
      fetchUsers();
    }
  }, [userId, babyProfileId]);

  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(fetchUsers);
    }
  }, [onRefreshReady]);

  const handleRoleChange = async (targetUserId, newRole) => {
    if (!userId || !babyProfileId) {
      setError('User ID and Baby Profile ID are required');
      return;
    }

    setUpdatingRoles(prev => ({ ...prev, [targetUserId]: true }));

    try {
      setError(null);
      const response = await apiFetch(`${API_URL}/baby-profiles/${babyProfileId}/members/${targetUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update user role');
      }

      // Update the user's role in the local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === targetUserId ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      setError(err.message);
      console.error('Error updating user role:', err);
    } finally {
      setUpdatingRoles(prev => {
        const updated = { ...prev };
        delete updated[targetUserId];
        return updated;
      });
    }
  };

  const handleDeleteClick = (targetUserId) => {
    setConfirmingDeleteUserId(targetUserId);
  };

  const handleCancelDelete = () => {
    setConfirmingDeleteUserId(null);
  };

  const handleConfirmBlock = async (targetUserId, shouldBlock) => {
    if (!userId || !babyProfileId) {
      setError('User ID and Baby Profile ID are required');
      return;
    }

    setBlockingUsers(prev => ({ ...prev, [targetUserId]: true }));

    try {
      setError(null);
      const response = await apiFetch(`${API_URL}/baby-profiles/${babyProfileId}/members/${targetUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({ blocked: shouldBlock }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${shouldBlock ? 'block' : 'unblock'} user`);
      }

      // Update the user's blocked status in the local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === targetUserId ? { ...user, blocked: shouldBlock } : user
        )
      );
      setConfirmingDeleteUserId(null);
      
      // If unblocking, redirect to active users list
      if (!shouldBlock) {
        setShowBlockedUsers(false);
      }
    } catch (err) {
      setError(err.message);
      console.error(`Error ${shouldBlock ? 'blocking' : 'unblocking'} user:`, err);
    } finally {
      setBlockingUsers(prev => {
        const updated = { ...prev };
        delete updated[targetUserId];
        return updated;
      });
    }
  };

  const handleConfirmDelete = async (targetUserId) => {
    if (!userId || !babyProfileId) {
      setError('User ID and Baby Profile ID are required');
      return;
    }

    setDeletingUsers(prev => ({ ...prev, [targetUserId]: true }));

    try {
      setError(null);
      const response = await apiFetch(`${API_URL}/baby-profiles/${babyProfileId}/members/${targetUserId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove user');
      }

      // Remove the user from the local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== targetUserId));
      setConfirmingDeleteUserId(null);
    } catch (err) {
      setError(err.message);
      console.error('Error removing user:', err);
    } finally {
      setDeletingUsers(prev => {
        const updated = { ...prev };
        delete updated[targetUserId];
        return updated;
      });
    }
  };


  if (loading) {
    return (
      <div className="admin-panel admin-panel-loading">
        <Spinner size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel">
        <p className="admin-panel-error">Error: {error}</p>
        <button onClick={fetchUsers}>Retry</button>
      </div>
    );
  }


  // Separate users into active and blocked, sorted by joinedAt (most recent first)
  const activeUsers = users
    .filter(user => !user.blocked)
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
  const blockedUsers = users
    .filter(user => user.blocked)
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));

  const renderBlockedUserCard = (user) => {
    return confirmingDeleteUserId === user.id ? (
      <div key={user.id} className="user-card">
        <div className="delete-confirmation-card">
          <h3>Unblock User?</h3>
          <p>Are you sure you want to unblock <strong>{user.name}</strong>?</p>
          <p className="delete-warning">Unblocking will allow them to access this profile again using the join code.</p>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancelDelete}
              disabled={blockingUsers[user.id]}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => handleConfirmBlock(user.id, false)}
              disabled={blockingUsers[user.id]}
            >
              {blockingUsers[user.id] ? 'Unblocking...' : 'Unblock'}
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div key={user.id} className="user-card">
        {user.id !== userId && (
          <button
            onClick={() => handleDeleteClick(user.id)}
            disabled={blockingUsers[user.id] || confirmingDeleteUserId === user.id}
            className="delete-user-btn"
            title="Unblock user"
          >
            {blockingUsers[user.id] ? (
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
        )}
        <div className="user-info">
          <div className="user-info-header">
            <h3>{user.emoji && <span className="user-emoji-small">{user.emoji}</span>} <span className="user-name-text">{user.name}</span></h3>
          </div>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      </div>
    );
  };

  const renderUserCard = (user) => {
    return confirmingDeleteUserId === user.id ? (
      <div key={user.id} className="user-card">
        <div className="delete-confirmation-card">
          <h3>{user.blocked ? 'Unblock User?' : 'Remove User?'}</h3>
          {user.blocked ? (
            <>
              <p>Are you sure you want to unblock <strong>{user.name}</strong>?</p>
              <p className="delete-warning">Unblocking will allow them to access this profile again using the join code.</p>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCancelDelete}
                  disabled={blockingUsers[user.id]}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => handleConfirmBlock(user.id, false)}
                  disabled={blockingUsers[user.id]}
                >
                  {blockingUsers[user.id] ? 'Unblocking...' : 'Unblock'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p>What would you like to do with <strong>{user.name}</strong>?</p>
              <p className="delete-warning">
                <strong>Remove:</strong> Removes their access, but they can rejoin with the join code.<br/>
                <strong>Block:</strong> Removes their access and prevents them from joining even with the join code. They can be unblocked later.
              </p>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCancelDelete}
                  disabled={deletingUsers[user.id] || blockingUsers[user.id]}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary delete-confirm-btn" 
                  onClick={() => handleConfirmDelete(user.id)}
                  disabled={deletingUsers[user.id] || blockingUsers[user.id]}
                >
                  {deletingUsers[user.id] ? 'Removing...' : 'Remove'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => handleConfirmBlock(user.id, true)}
                  disabled={deletingUsers[user.id] || blockingUsers[user.id]}
                >
                  {blockingUsers[user.id] ? 'Blocking...' : 'Block'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    ) : (
      <div key={user.id} className="user-card">
        {user.id !== userId && (
          <button
            onClick={() => handleDeleteClick(user.id)}
            disabled={deletingUsers[user.id] || blockingUsers[user.id] || confirmingDeleteUserId === user.id}
            className="delete-user-btn"
            title={user.blocked ? 'Unblock user' : 'Remove user'}
          >
            {deletingUsers[user.id] || blockingUsers[user.id] ? (
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
        )}
        <div className="user-info">
          <div className="user-info-header">
            <h3>{user.emoji && <span className="user-emoji-small">{user.emoji}</span>} <span className="user-name-text">{user.name}</span> {user.blocked && <span className="blocked-badge">(Blocked)</span>}</h3>
          </div>
          {user.id === userId ? (
            <span className={`role-badge role-badge-${user.role || 'default'}`}>
              {user.role} (You)
            </span>
          ) : (
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(user.id, e.target.value)}
              disabled={updatingRoles[user.id] || user.blocked}
              className={`role-select role-select-${user.role || 'default'}`}
            >
              <option value="admin" className="role-option-admin">admin</option>
              <option value="editor" className="role-option-editor">editor</option>
              <option value="viewer" className="role-option-viewer">viewer</option>
            </select>
          )}
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Joined:</strong> {new Date(user.joinedAt).toLocaleDateString()}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-content">
        {showBlockedUsers ? (
          <>
            {blockedUsers.length === 0 ? (
              <p>No blocked users.</p>
            ) : (
              <div className="users-list">
                {blockedUsers.map((user) => renderBlockedUserCard(user))}
              </div>
            )}
          </>
        ) : (
          <>
            {activeUsers.length === 0 ? (
              <p>No users have joined this baby profile yet.</p>
            ) : (
              <div className="users-list">
                {activeUsers.map((user) => renderUserCard(user))}
              </div>
            )}
          </>
        )}
        <div className="admin-panel-actions">
          {blockedUsers.length > 0 && (
            <button 
              onClick={() => setShowBlockedUsers(!showBlockedUsers)}
              className="btn btn-secondary blocked-users-btn"
            >
              {showBlockedUsers ? '← Back to Active Users' : `Blocked Users (${blockedUsers.length})`}
            </button>
          )}
        </div>
        <RefreshButton 
          onRefresh={() => fetchUsers(false)}
          containerClassName="admin-panel-refresh-container"
        />
      </div>
    </div>
  );
}

export default AdminPanel;

