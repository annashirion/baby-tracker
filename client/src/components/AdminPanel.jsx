import { useState, useEffect } from 'react';
import './AdminPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return <div className="admin-panel">Loading users...</div>;
  }

  if (error) {
    return (
      <div className="admin-panel">
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={fetchUsers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h2>Database Users ({users.length})</h2>
      <button onClick={fetchUsers} style={{ marginBottom: '20px' }}>
        Refresh
      </button>
      {users.length === 0 ? (
        <p>No users in database yet.</p>
      ) : (
        <div className="users-list">
          {users.map((user) => (
            <div key={user.id} className="user-card">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="user-avatar"
                />
              )}
              <div className="user-info">
                <h3>{user.name}</h3>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Google ID:</strong> {user.googleId}</p>
                <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}</p>
                <p><strong>Updated:</strong> {new Date(user.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;

