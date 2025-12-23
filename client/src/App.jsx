import { useState, useEffect, useRef, useCallback } from 'react'
import Login from './components/Login'
import AdminPanel from './components/AdminPanel'
import BabyProfiles from './components/BabyProfiles'
import BabyProfileView from './components/BabyProfileView'
import EmojiPicker from './components/EmojiPicker'
import Spinner from './components/Spinner'
import { API_URL } from './constants/constants'
import { getAuthToken, setAuthToken, removeAuthToken, apiFetch } from './utils/api'
import './App.css'
import { useSwipeBack } from './utils/useSwipeBack';

const OPEN_PROFILE_STORAGE_KEY = 'babyTracker_openProfile'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // Start with loading true to check auth
  const [error, setError] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [openProfile, setOpenProfile] = useState(null)
  const adminPanelRefreshRef = useRef(null)

  // Define all handlers with useCallback to ensure stable references
  const handleCloseUsers = useCallback(() => {
    setSelectedProfile(null)
  }, [])

  const handleViewUsers = useCallback((babyProfileId, profileName) => {
    setSelectedProfile({ id: babyProfileId, name: profileName })
  }, [])

  const handleOpenProfile = useCallback((profile) => {
    setOpenProfile(profile)
    localStorage.setItem(OPEN_PROFILE_STORAGE_KEY, profile.id)
  }, [])

  const handleCloseProfile = useCallback(() => {
    setOpenProfile(null)
    localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
  }, [])

  const handleEmojiChange = useCallback((newEmoji) => {
    setUser(prevUser => {
      const updatedUser = { ...prevUser, emoji: newEmoji }
      return updatedUser
    })
  }, [])

  // Call ALL hooks before any conditional returns to follow Rules of Hooks
  // Always pass a function (use no-op when selectedProfile is null)
  const containerRef = useSwipeBack(selectedProfile ? handleCloseUsers : () => {});

  // Load user from backend and restore profile from localStorage on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          // No token, user is not authenticated
          localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
          setLoading(false)
          return
        }

        // Check if user is authenticated by fetching from /auth/me
        const response = await apiFetch(`${API_URL}/auth/me`)
        
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          
          // Check if there's a stored profile to restore
          const storedProfileId = localStorage.getItem(OPEN_PROFILE_STORAGE_KEY)
          if (storedProfileId && data.user) {
            try {
              const profileResponse = await apiFetch(`${API_URL}/baby-profiles`)
              if (profileResponse.ok) {
                const profileData = await profileResponse.json()
                const profile = profileData.profiles?.find(p => p.id === storedProfileId)
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
        } else {
          // Token is invalid, clear it and stored profile
          removeAuthToken()
          localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
        }
        } catch (err) {
        console.error('Error checking authentication:', err)
        removeAuthToken()
        localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
      } finally {
      setLoading(false)
      }
    }
    
    initializeApp()
  }, [])

  const handleLoginSuccess = async (tokenResponse) => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if server is reachable first
      try {
        const healthCheck = await fetch(`${API_URL}/health`)
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
        credentials: 'include',
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

      // Get token and user data from response
      const authData = await response.json()
      
      if (!authData.token || !authData.user) {
        throw new Error('Invalid response from server: missing token or user data')
      }

      // Store the token
      setAuthToken(authData.token)
      
      // Set user data
      setUser(authData.user)
    } catch (err) {
      console.error('Error saving user:', err)
      const errorMessage = err.message || 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginError = (error) => {
    console.error('Login error:', error)
    setError('Login failed. Please try again.')
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">
          <Spinner size="medium" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onSuccess={handleLoginSuccess} onError={handleLoginError} />
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
      <div className="users-view-container" ref={containerRef}>
        <div className="users-view-header">
          <button onClick={handleCloseUsers} className="btn back-button" title="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>{selectedProfile.name}</h2>
          <button onClick={() => adminPanelRefreshRef.current?.()} className="btn refresh-icon-button" title="Refresh">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 8v4h4M21 16v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="users-view-content">
          <AdminPanel 
            userId={user.id} 
            babyProfileId={selectedProfile.id}
            onClose={handleCloseUsers}
            onRefreshReady={(refreshFn) => { adminPanelRefreshRef.current = refreshFn; }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <EmojiPicker
          currentEmoji={user.emoji}
          onEmojiChange={handleEmojiChange}
          userId={user.id}
          size="medium"
        />
        <div className="app-header-welcome">
          <h2 className="app-header-title">Welcome,<br />{user.name}!</h2>
          <p className="app-header-email">{user.email}</p>
        </div>
        <button 
          className="logout-btn"
          onClick={async () => {
            try {
              await apiFetch(`${API_URL}/auth/logout`, {
                method: 'POST',
              })
            } catch (err) {
              console.error('Error logging out:', err)
            }
            // Clear token and user data
            removeAuthToken()
            setUser(null)
            setOpenProfile(null)
            localStorage.removeItem(OPEN_PROFILE_STORAGE_KEY)
          }}
          title="Logout"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      {error && <p className="app-error">{error}</p>}
      <BabyProfiles userId={user.id} onViewUsers={handleViewUsers} onOpenProfile={handleOpenProfile} />
    </div>
  )
}

export default App
