import './Reports.css';
import './DayListView.css';
import ReportsActionItem from './ReportsActionItem';
import ActionEditPopup from './ActionEditPopup';

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
  // Get actions for selected day, sorted by time
  const selectedDayActions = selectedDay ? (() => {
    const dayStart = new Date(selectedDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDay);
    dayEnd.setHours(23, 59, 59, 999);

    const dayActions = actions.filter(action => {
      // For sleep/feed, check if they start or end on this day, or span this day
      if (action.actionType === 'sleep' || action.actionType === 'feed') {
        const startTime = action.details?.startTime ? new Date(action.details.startTime) : new Date(action.createdAt);
        const endTime = action.details?.endTime ? new Date(action.details.endTime) : new Date();
        
        // Check if action overlaps with this day
        return (startTime <= dayEnd && endTime >= dayStart);
      }
      // For other actions (diaper, other), just check createdAt
      const actionDate = new Date(action.createdAt);
      return actionDate >= dayStart && actionDate <= dayEnd;
    });

    return dayActions.sort((a, b) => {
      const timeA = a.actionType === 'sleep' || a.actionType === 'feed'
        ? (a.details?.startTime ? new Date(a.details.startTime) : new Date(a.createdAt))
        : new Date(a.createdAt);
      const timeB = b.actionType === 'sleep' || b.actionType === 'feed'
        ? (b.details?.startTime ? new Date(b.details.startTime) : new Date(b.createdAt))
        : new Date(b.createdAt);
      return timeB - timeA; // Most recent first
    });
  })() : [];

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

        {!loading && !error && selectedDayActions.length === 0 && (
          <div className="reports-empty">
            No actions recorded for this day.
          </div>
        )}

        {!loading && !error && selectedDayActions.length > 0 && (
          <div className="reports-list">
            {selectedDayActions.map((action) => (
              <ReportsActionItem
                key={action.id}
                action={action}
                onClick={(e) => onActionItemClick(action, e)}
              />
            ))}
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

