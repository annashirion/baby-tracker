import { useState } from 'react'
import Login from './components/Login'
import AdminPanel from './components/AdminPanel'
import BabyProfiles from './components/BabyProfiles'
import EmojiPicker from './components/EmojiPicker'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)

  const handleLoginSuccess = async (tokenResponse) => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if server is reachable first
      const baseUrl = API_URL.replace('/api', '')
      try {
        const healthCheck = await fetch(`${baseUrl}/api/health`)
        if (!healthCheck.ok) {
          throw new Error('Server is not responding')
        }
      } catch (healthErr) {
        throw new Error(
          `Cannot connect to server at ${baseUrl}. ` +
          `Make sure the server is running on port 3001. ` +
          `Run: cd server && npm start`
        )
      }
      
      // Send token to backend to verify and save user
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: tokenResponse.access_token,
        }),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `Server returned status ${response.status}` }
        }
        // Show detailed error message from server
        const errorMessage = errorData.details || errorData.message || errorData.error || 'Failed to authenticate'
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setUser(data.user)
    } catch (err) {
      console.error('Error saving user:', err)
      const errorMessage = err.message || 'Unknown error occurred'
      setError(errorMessage)
      alert(`Failed to save user: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginError = (error) => {
    console.error('Login error:', error)
    setError('Login failed. Please try again.')
    alert('Login failed. Please try again.')
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">Saving user to database...</div>
      </div>
    )
  }

  if (!user) {
    return <Login onSuccess={handleLoginSuccess} onError={handleLoginError} />
  }

  const handleViewUsers = (babyProfileId, profileName) => {
    setSelectedProfile({ id: babyProfileId, name: profileName })
  }

  const handleCloseUsers = () => {
    setSelectedProfile(null)
  }

  const handleEmojiChange = (newEmoji) => {
    setUser(prevUser => ({ ...prevUser, emoji: newEmoji }))
  }

  if (selectedProfile) {
    return (
      <div>
        <div style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
          <button onClick={handleCloseUsers} style={{ marginRight: '1rem' }}>
            ← Back to Profiles
          </button>
          <button onClick={() => setUser(null)}>Logout</button>
        </div>
        <div style={{ padding: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Users for: {selectedProfile.name}</h2>
          <AdminPanel 
            userId={user.id} 
            babyProfileId={selectedProfile.id}
            onClose={handleCloseUsers}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <EmojiPicker
            currentEmoji={user.emoji}
            onEmojiChange={handleEmojiChange}
            userId={user.id}
            size="medium"
          />
          <div>
            <h2 style={{ margin: 0 }}>Welcome, {user.name}!</h2>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{user.email}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setUser(null)}>Logout</button>
        </div>
      </div>
      {error && <p style={{ color: 'red', padding: '0 1rem' }}>{error}</p>}
      <BabyProfiles userId={user.id} onViewUsers={handleViewUsers} />
    </div>
  )
}

export default App
