import { useState, useEffect } from 'react';
import './Reports.css';
import { API_URL } from '../constants/constants';
import { apiFetch } from '../utils/api';
import CalendarView from './CalendarView';
import DayListView from './DayListView';
import ActionEditPopup from './ActionEditPopup';
import Spinner from './Spinner';
import RefreshButton from './RefreshButton';

function Reports({ profile, onClose, openToToday = false, initialActions = [], onActionsChange }) {
  // Only show loading if we don't have initial data
  const [loading, setLoading] = useState(initialActions.length === 0);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState(initialActions);
  // Track which date ranges we've already fetched to avoid duplicate requests
  const [fetchedRanges, setFetchedRanges] = useState([]);
  const [selectedDay, setSelectedDay] = useState(() => {
    // If openToToday is true, set selectedDay to today
    if (openToToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
    return null;
  });
  const [showDayList, setShowDayList] = useState(openToToday);
  const [hasShownCalendar, setHasShownCalendar] = useState(!openToToday);
  const [actionToEdit, setActionToEdit] = useState(null);
  const [currentPeriodStart, setCurrentPeriodStart] = useState(() => {
    // Start with today minus 3 days (show 3 days ago, 2 days ago, yesterday, today)
    // Today will be on the rightmost (4th) position
    const today = new Date();
    today.setDate(today.getDate() - 3);
    today.setHours(0, 0, 0, 0);
    return today;
  });

  useEffect(() => {
    // Always fetch current period on mount
    // Show loader only if we don't have initial data
    fetchActionsForPeriod(currentPeriodStart, initialActions.length === 0);
  }, [profile.id]);

  // Fetch actions for a specific 4-day period
  const fetchActionsForPeriod = async (periodStart, showLoading = false) => {
    const rangeKey = periodStart.toDateString();
    
    // Skip if we've already fetched this range
    if (fetchedRanges.includes(rangeKey)) {
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Calculate date range for the 4-day period (including next day for 6am-5:59am coverage)
      const startDate = new Date(periodStart);
      startDate.setHours(6, 0, 0, 0);
      
      const endDate = new Date(periodStart);
      endDate.setDate(endDate.getDate() + 4); // +3 days + 1 for next day early morning
      endDate.setHours(5, 59, 59, 999);

      const params = new URLSearchParams({
        babyProfileId: profile.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await apiFetch(`${API_URL}/actions?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch actions');
      }

      const data = await response.json();
      const fetchedActions = data.actions || [];
      
      // Merge new actions with existing ones, avoiding duplicates
      setActions(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newActions = fetchedActions.filter(a => !existingIds.has(a.id));
        // Sort by createdAt descending after merging
        return [...prev, ...newActions].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      });
      
      // Mark this range as fetched
      setFetchedRanges(prev => [...prev, rangeKey]);
      
      return fetchedActions;
    } catch (err) {
      console.error('Error fetching actions:', err);
      setError(err.message || 'Failed to load reports');
      return [];
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Refresh current period by re-fetching it
  const refreshActions = async () => {
    const rangeKey = currentPeriodStart.toDateString();
    // Remove from fetched ranges to allow re-fetching
    setFetchedRanges(prev => prev.filter(r => r !== rangeKey));
    // Small delay to ensure state is updated
    await new Promise(resolve => setTimeout(resolve, 0));
    await fetchActionsForPeriod(currentPeriodStart, false);
  };

  const handleActionClick = (action) => {
    setActionToEdit(action);
  };

  const handleCloseEditPopup = () => {
    setActionToEdit(null);
  };

  const handleDeleteAction = async (actionId) => {
    try {
      const response = await apiFetch(`${API_URL}/actions/${actionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete action');
      }

      // Remove action from local state immediately (no refetch needed)
      setActions(prev => {
        const updated = prev.filter(a => a.id !== actionId);
        // Notify parent of the change
        if (onActionsChange) {
          onActionsChange(updated);
        }
        return updated;
      });
      setActionToEdit(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting action:', err);
      setError(err.message || 'Failed to delete action');
    }
  };

  const handleUpdateAction = async (updatedAction) => {
    // Update action in local state immediately
    if (updatedAction) {
      setActions(prev => {
        const updated = prev.map(a => a.id === updatedAction.id ? updatedAction : a);
        // Notify parent of the change
        if (onActionsChange) {
          onActionsChange(updated);
        }
        return updated;
      });
    }
    setActionToEdit(null);
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setShowDayList(true);
    setHasShownCalendar(true); // Mark that we've shown calendar (user navigated from calendar)
  };

  const handleBackToCalendar = () => {
    // If we opened directly to today's list and haven't shown calendar, go back to BabyProfileView
    if (openToToday && !hasShownCalendar) {
      onClose();
    } else {
      setShowDayList(false);
      setSelectedDay(null);
    }
  };

  // Check if a day is within any fetched range
  const isDayInFetchedRange = (day) => {
    const dayTime = day.getTime();
    return fetchedRanges.some(rangeKey => {
      const periodStart = new Date(rangeKey);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 4);
      periodEnd.setHours(0, 0, 0, 0);
      return dayTime >= periodStart.getTime() && dayTime < periodEnd.getTime();
    });
  };

  const handleNavigateDay = (direction) => {
    if (!selectedDay) return;
    const newDay = new Date(selectedDay);
    newDay.setDate(newDay.getDate() + direction);
    newDay.setHours(0, 0, 0, 0);
    setSelectedDay(newDay);
    
    // Check if we need to fetch data for the new day
    if (!isDayInFetchedRange(newDay)) {
      // Calculate which 4-day period should include this day
      // We want the day to be one of the 4 days in the period
      // For forward navigation (direction > 0), make it the first day
      // For backward navigation (direction < 0), make it the last day
      let periodStart;
      if (direction > 0) {
        // Forward: make newDay the first day of the period
        periodStart = new Date(newDay);
      } else {
        // Backward: make newDay the last (4th) day of the period
        periodStart = new Date(newDay);
        periodStart.setDate(periodStart.getDate() - 3);
      }
      periodStart.setHours(0, 0, 0, 0);
      
      // Fetch data for the new period with loader
      fetchActionsForPeriod(periodStart, true);
    }
  };

  const navigatePeriod = (direction) => {
    const newPeriodStart = new Date(currentPeriodStart);
    newPeriodStart.setDate(newPeriodStart.getDate() + direction);
    setCurrentPeriodStart(newPeriodStart);
    setSelectedDay(null);
    setShowDayList(false);
    
    // Fetch data for the new period in background (no loader)
    fetchActionsForPeriod(newPeriodStart, false);
  };

  const goToToday = () => {
    // Today on the rightmost (4th) position means starting 3 days ago
    const today = new Date();
    today.setDate(today.getDate() - 3);
    today.setHours(0, 0, 0, 0);
    setCurrentPeriodStart(today);
    setSelectedDay(null);
    setShowDayList(false);
  };

  // Show day list view when a day is selected
  if (showDayList && selectedDay) {
    return (
      <DayListView
        selectedDay={selectedDay}
        actions={actions}
        loading={loading}
        error={error}
        actionToEdit={actionToEdit}
        onBack={handleBackToCalendar}
        onNavigateDay={handleNavigateDay}
        onActionItemClick={handleActionClick}
        onCloseEditPopup={handleCloseEditPopup}
        onDeleteAction={handleDeleteAction}
        onUpdateAction={handleUpdateAction}
        onRefresh={refreshActions}
      />
    );
  }

  return (
    <div className="reports-view reports-calendar-view">
      <div className="reports-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <CalendarView
          actions={actions}
          currentPeriodStart={currentPeriodStart}
          onDayClick={handleDayClick}
          onActionClick={handleActionClick}
          onPeriodNavigate={navigatePeriod}
          onGoToToday={goToToday}
          onClose={onClose}
          loading={loading}
        />

        {actionToEdit && (
          <ActionEditPopup
            action={actionToEdit}
            onClose={handleCloseEditPopup}
            onDelete={handleDeleteAction}
            onUpdate={handleUpdateAction}
          />
        )}
      </div>
      <RefreshButton 
        onRefresh={refreshActions}
        containerClassName="reports-refresh-container"
      />
    </div>
  );
}

export default Reports;
