import { useState, useEffect } from 'react';
import EmojiPicker from './EmojiPicker';
import './AdminPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function AdminPanel({ userId, babyProfileId, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingRoles, setUpdatingRoles] = useState({}); // Track which user's role is being updated
  const [deletingUsers, setDeletingUsers] = useState({}); // Track which user is being deleted

  const fetchUsers = async () => {
    if (!userId || !babyProfileId) {
      setError('User ID and Baby Profile ID are required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[CLIENT DEBUG] Fetching users for:', userId, babyProfileId);
      const response = await fetch(`${API_URL}/users?userId=${userId}&babyProfileId=${babyProfileId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      const data = await response.json();
      console.log('[CLIENT DEBUG] Received users:', data.users?.length || 0, 'users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && babyProfileId) {
      fetchUsers();
    }
  }, [userId, babyProfileId]);

  const handleRoleChange = async (targetUserId, newRole) => {
    if (!userId || !babyProfileId) {
      setError('User ID and Baby Profile ID are required');
      return;
    }

    setUpdatingRoles(prev => ({ ...prev, [targetUserId]: true }));

    try {
      setError(null);
      const response = await fetch(`${API_URL}/users/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          babyProfileId,
          targetUserId,
          newRole,
        }),
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

  const handleDeleteUser = async (targetUserId, userName) => {
    if (!userId || !babyProfileId) {
      setError('User ID and Baby Profile ID are required');
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to remove ${userName} from this baby profile?`)) {
      return;
    }

    setDeletingUsers(prev => ({ ...prev, [targetUserId]: true }));

    try {
      setError(null);
      const response = await fetch(`${API_URL}/users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          babyProfileId,
          targetUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove user');
      }

      // Remove the user from the local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== targetUserId));
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
    return <div className="admin-panel">Loading users...</div>;
  }

  if (error) {
    return (
      <div className="admin-panel">
        <p className="admin-panel-error">Error: {error}</p>
        <button onClick={fetchUsers}>Retry</button>
      </div>
    );
  }


  return (
    <div className="admin-panel">
      {users.length === 0 ? (
        <p>No users have joined this baby profile yet.</p>
      ) : (
        <div className="users-list">
          {users.map((user) => (
            <div key={user.id} className="user-card">
              {user.id !== userId && (
                <button
                  onClick={() => handleDeleteUser(user.id, user.name)}
                  disabled={deletingUsers[user.id]}
                  className="delete-user-btn"
                  title="Remove user"
                >
                  {deletingUsers[user.id] ? (
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
              <EmojiPicker
                currentEmoji={user.emoji}
                onEmojiChange={() => {}}
                size="large"
                readOnly={true}
              />
              <div className="user-info">
                <div className="user-info-header">
                  <h3>{user.name}</h3>
                  {user.id === userId ? (
                    <span className={`role-badge role-badge-${user.role || 'default'}`}>
                      {user.role} (You)
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updatingRoles[user.id]}
                      className={`role-select role-select-${user.role || 'default'}`}
                    >
                      <option value="admin" className="role-option-admin">admin</option>
                      <option value="editor" className="role-option-editor">editor</option>
                      <option value="viewer" className="role-option-viewer">viewer</option>
                    </select>
                  )}
                </div>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Joined:</strong> {new Date(user.joinedAt).toLocaleString()}</p>
                <p><strong>Account Created:</strong> {new Date(user.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={fetchUsers} className="refresh-button">
        Refresh
      </button>
    </div>
  );
}

export default AdminPanel;

