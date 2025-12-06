import './Reports.css';
import './DayListView.css';
import ReportsActionItem from './ReportsActionItem';
import ActionEditPopup from './ActionEditPopup';
import { ACTION_TYPES } from '../constants/constants';

function DayListView({ 
  selectedDay, 
  actions, 
  loading, 
  error, 
  actionToEdit,
  onBack, 
  onNavigateDay,
  onActionItemClick, 
  onCloseEditPopup,
  onDeleteAction,
  onUpdateAction
}) {
  // Get actions for selected day (6 AM to 5:59 AM next day), split into two groups
  const { selectedDayActions, nextDayActions, nextDay } = selectedDay ? (() => {
    // Selected day: from 6:00 AM to 11:59:59 PM
    const selectedDayStart = new Date(selectedDay);
    selectedDayStart.setHours(6, 0, 0, 0);
    const selectedDayEnd = new Date(selectedDay);
    selectedDayEnd.setHours(23, 59, 59, 999);

    // Next day: from 00:00:00 to 5:59:59 AM
    const nextDay = new Date(selectedDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStart = new Date(nextDay);
    nextDayStart.setHours(0, 0, 0, 0);
    const nextDayEnd = new Date(nextDay);
    nextDayEnd.setHours(5, 59, 59, 999);

    const filterActions = (dayStart, dayEnd) => {
      return actions.filter(action => {
        // For sleep/feed, check if they start or end in this time range, or span this range
        if (action.actionType === ACTION_TYPES.SLEEP || action.actionType === ACTION_TYPES.FEED) {
          const startTime = action.details?.startTime ? new Date(action.details.startTime) : new Date(action.createdAt);
          const endTime = action.details?.endTime ? new Date(action.details.endTime) : new Date();
          
          // Check if action overlaps with this time range
          return (startTime <= dayEnd && endTime >= dayStart);
        }
        // For other actions (diaper, other), just check createdAt
        const actionDate = new Date(action.createdAt);
        return actionDate >= dayStart && actionDate <= dayEnd;
      });
    };

    const selectedActions = filterActions(selectedDayStart, selectedDayEnd);
    const nextActions = filterActions(nextDayStart, nextDayEnd);

    const sortActions = (actionList) => {
      return actionList.sort((a, b) => {
        const timeA = a.actionType === ACTION_TYPES.SLEEP || a.actionType === ACTION_TYPES.FEED
          ? (a.details?.startTime ? new Date(a.details.startTime) : new Date(a.createdAt))
          : new Date(a.createdAt);
        const timeB = b.actionType === ACTION_TYPES.SLEEP || b.actionType === ACTION_TYPES.FEED
          ? (b.details?.startTime ? new Date(b.details.startTime) : new Date(b.createdAt))
          : new Date(b.createdAt);
        return timeA - timeB; // Oldest first (chronological order, matching calendar view)
      });
    };

    return {
      selectedDayActions: sortActions(selectedActions),
      nextDayActions: sortActions(nextActions),
      nextDay: nextDay
    };
  })() : { selectedDayActions: [], nextDayActions: [], nextDay: null };

  return (
    <div className="reports-view">
      <div className="reports-header">
        <button onClick={onBack} className="btn back-button" title="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button 
          onClick={() => onNavigateDay(-1)} 
          className="week-nav-btn" 
          title="Previous day"
          aria-label="Previous day"
        >
          ‹
        </button>
        <h2>
          {selectedDay.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </h2>
        <button 
          onClick={() => onNavigateDay(1)} 
          className="week-nav-btn" 
          title="Next day"
          aria-label="Next day"
        >
          ›
        </button>
      </div>
      
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

        {!loading && !error && selectedDayActions.length === 0 && nextDayActions.length === 0 && (
          <div className="reports-empty">
            No actions recorded for this day.
          </div>
        )}

        {!loading && !error && (selectedDayActions.length > 0 || nextDayActions.length > 0) && (
          <div className="reports-list">
            {selectedDayActions.length > 0 && (
              <div className="reports-date-group">
                <div className="reports-date-header">
                  {selectedDay.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} (06:00 - 23:59)
                </div>
                {selectedDayActions.map((action) => (
                  <ReportsActionItem
                    key={action.id}
                    action={action}
                    onClick={(e) => onActionItemClick(action, e)}
                  />
                ))}
              </div>
            )}
            
            {nextDayActions.length > 0 && (
              <div className="reports-date-group">
                <div className="reports-date-header">
                  {nextDay.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} (00:00 - 05:59)
                </div>
                {nextDayActions.map((action) => (
                  <ReportsActionItem
                    key={action.id}
                    action={action}
                    onClick={(e) => onActionItemClick(action, e)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {actionToEdit && (
          <ActionEditPopup
            action={actionToEdit}
            onClose={onCloseEditPopup}
            onDelete={onDeleteAction}
            onUpdate={onUpdateAction}
          />
        )}
      </div>
    </div>
  );
}

export default DayListView;

