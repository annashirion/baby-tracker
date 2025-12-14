import { useState, useEffect } from 'react';
import './Reports.css';
import { API_URL } from '../constants/constants';
import CalendarView from './CalendarView';
import DayListView from './DayListView';
import ActionEditPopup from './ActionEditPopup';

function Reports({ profile, onClose, openToToday = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);
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
    // Start with today minus 1 day (show yesterday, today, and 2 days ahead)
    const today = new Date();
    today.setDate(today.getDate() - 1);
    today.setHours(0, 0, 0, 0);
    return today;
  });

  useEffect(() => {
    fetchActions();
  }, [profile.id]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/actions?babyProfileId=${profile.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch actions');
      }

      const data = await response.json();
      const fetchedActions = data.actions || [];
      setActions(fetchedActions);
      return fetchedActions;
    } catch (err) {
      console.error('Error fetching actions:', err);
      setError(err.message || 'Failed to load reports');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action) => {
    setActionToEdit(action);
  };

  const handleCloseEditPopup = () => {
    setActionToEdit(null);
  };

  const handleDeleteAction = async (actionId) => {
    try {
      const response = await fetch(`${API_URL}/actions/${actionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete action');
      }

      // Refresh actions list
      await fetchActions();
      setActionToEdit(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting action:', err);
      setError(err.message || 'Failed to delete action');
    }
  };

  const handleUpdateAction = async () => {
    const actionId = actionToEdit?.id;
    if (!actionId) return;
    
    // Refresh actions list
    await fetchActions();
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

  const handleNavigateDay = (direction) => {
    if (!selectedDay) return;
    const newDay = new Date(selectedDay);
    newDay.setDate(newDay.getDate() + direction);
    newDay.setHours(0, 0, 0, 0);
    setSelectedDay(newDay);
  };

  const navigatePeriod = (direction) => {
    const newPeriodStart = new Date(currentPeriodStart);
    newPeriodStart.setDate(newPeriodStart.getDate() + direction);
    setCurrentPeriodStart(newPeriodStart);
    setSelectedDay(null);
    setShowDayList(false);
  };

  const goToToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - 1);
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
        onUpdateAction={fetchActions}
      />
    );
  }

  return (
    <div className="reports-view reports-calendar-view">
      <div className="reports-content">
        {loading && (
          <div className="reports-loading">
            Loading reports...
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!loading && !error && (
          <CalendarView
            actions={actions}
            currentPeriodStart={currentPeriodStart}
            onDayClick={handleDayClick}
            onActionClick={handleActionClick}
            onPeriodNavigate={navigatePeriod}
            onGoToToday={goToToday}
            onClose={onClose}
          />
        )}

        {actionToEdit && (
          <ActionEditPopup
            action={actionToEdit}
            onClose={handleCloseEditPopup}
            onDelete={handleDeleteAction}
            onUpdate={handleUpdateAction}
          />
        )}
      </div>
    </div>
  );
}

export default Reports;
