import { useState, useEffect } from 'react'
import Login from './components/Login'
import AdminPanel from './components/AdminPanel'
import BabyProfiles from './components/BabyProfiles'
import BabyProfileView from './components/BabyProfileView'
import EmojiPicker from './components/EmojiPicker'
import './App.css'
import { API_URL } from './constants/constants'
const USER_STORAGE_KEY = 'babyTracker_user'
const OPEN_PROFILE_STORAGE_KEY = 'babyTracker_openProfile'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // Start with loading true to check localStorage
  const [error, setError] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [openProfile, setOpenProfile] = useState(null)

  // Load user and restore profile from localStorage on mount
  useEffect(() => {
    const initializeApp = async () => {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY)
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
          
          // Check if there's a stored profile to restore
          const storedProfileId = localStorage.getItem(OPEN_PROFILE_STORAGE_KEY)
          if (storedProfileId) {
            try {
              const response = await fetch(`${API_URL}/baby-profiles?userId=${parsedUser.id}`)
              if (response.ok) {
                const data = await response.json()
                const profile = data.profiles?.find(p => p.id === storedProfileId)
                if (profile) {
                  setOpenProfile(profile)
                } else {
                  // Profile not found, clear stored ID
                  localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
                }
              }
            } catch (err) {
              console.error('Error restoring open profile:', err)
              localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
            }
          }
        } catch (err) {
          console.error('Error parsing stored user:', err)
          localStorage.removeItem(USER_STORAGE_KEY)
        }
      }
      setLoading(false)
    }
    
    initializeApp()
  }, [])

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
    }
  }, [user])

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
        <div className="loading">Just a second...</div>
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

  const handleOpenProfile = (profile) => {
    setOpenProfile(profile)
    localStorage.setItem(OPEN_PROFILE_STORAGE_KEY, profile.id)
  }

  const handleCloseProfile = () => {
    setOpenProfile(null)
    localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
  }

  const handleEmojiChange = (newEmoji) => {
    setUser(prevUser => {
      const updatedUser = { ...prevUser, emoji: newEmoji }
      return updatedUser
    })
  }

  if (openProfile) {
    return (
      <div className="app-container">
        <BabyProfileView 
          profile={openProfile} 
          onClose={handleCloseProfile}
          userId={user.id}
          userEmoji={user.emoji}
        />
      </div>
    )
  }

  if (selectedProfile) {
    return (
      <>
        <div className="users-view-header">
          <button onClick={handleCloseUsers} className="btn btn-back">
            ←
          </button>
          <h2>{selectedProfile.name}</h2>
        </div>
        <div className="users-view-content">
          <AdminPanel 
            userId={user.id} 
            babyProfileId={selectedProfile.id}
            onClose={handleCloseUsers}
          />
        </div>
      </>
    )
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="app-header-user">
          <EmojiPicker
            currentEmoji={user.emoji}
            onEmojiChange={handleEmojiChange}
            userId={user.id}
            size="medium"
          />
          <div>
            <h2 className="app-header-title">Welcome, {user.name}!</h2>
            <p className="app-header-email">{user.email}</p>
          </div>
        </div>
        <div className="app-header-actions">
          <button onClick={() => {
            setUser(null)
            setOpenProfile(null)
            localStorage.removeItem(USER_STORAGE_KEY)
            localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
          }}>Logout</button>
        </div>
      </div>
      {error && <p className="app-error">{error}</p>}
      <BabyProfiles userId={user.id} onViewUsers={handleViewUsers} onOpenProfile={handleOpenProfile} />
    </div>
  )
}

export default App
