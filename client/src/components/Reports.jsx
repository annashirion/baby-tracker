import { useState, useEffect } from 'react';
import './Reports.css';
import { API_URL } from '../constants/constants';
import CalendarView from './CalendarView';
import DayListView from './DayListView';
import ActionEditPopup from './ActionEditPopup';

function Reports({ profile, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showDayList, setShowDayList] = useState(false);
  const [actionToEdit, setActionToEdit] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start with current week (Monday as start)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
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
    setSelectedAction(action);
  };

  const handleActionItemClick = (action, e) => {
    e.stopPropagation();
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
      setSelectedAction(null);
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
    const updatedActions = await fetchActions();
    
    // Update selectedAction to the updated action from the new actions array
    if (selectedAction && selectedAction.id === actionId) {
      const updatedAction = updatedActions.find(a => a.id === actionId);
      if (updatedAction) {
        setSelectedAction(updatedAction);
      }
    }
    
    setActionToEdit(null);
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setSelectedAction(null);
    setShowDayList(true);
  };

  const handleBackToCalendar = () => {
    setShowDayList(false);
    setSelectedDay(null);
    setSelectedAction(null);
  };

  const handleNavigateDay = (direction) => {
    if (!selectedDay) return;
    const newDay = new Date(selectedDay);
    newDay.setDate(newDay.getDate() + direction);
    newDay.setHours(0, 0, 0, 0);
    setSelectedDay(newDay);
    setSelectedAction(null);
  };

  const navigateWeek = (direction) => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newWeekStart);
    setSelectedDay(null);
    setSelectedAction(null);
    setShowDayList(false);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const todayWeekStart = new Date(today);
    todayWeekStart.setDate(diff);
    todayWeekStart.setHours(0, 0, 0, 0);
    
    // Check if today's week is already shown
    const currentWeekStartCopy = new Date(currentWeekStart);
    currentWeekStartCopy.setHours(0, 0, 0, 0);
    const currentWeekStartTime = currentWeekStartCopy.getTime();
    const todayWeekStartTime = todayWeekStart.getTime();
    
    if (currentWeekStartTime === todayWeekStartTime) {
      // Today's week is already shown, open today's list
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      setSelectedDay(todayDate);
      setSelectedAction(null);
      setShowDayList(true);
    } else {
      // Navigate to today's week
      setCurrentWeekStart(todayWeekStart);
      setSelectedDay(null);
      setSelectedAction(null);
      setShowDayList(false);
    }
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
        onActionItemClick={handleActionItemClick}
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
            currentWeekStart={currentWeekStart}
            selectedAction={selectedAction}
            onDayClick={handleDayClick}
            onActionClick={handleActionClick}
            onActionItemClick={handleActionItemClick}
            onWeekNavigate={navigateWeek}
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
