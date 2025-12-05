import './ReportsActionItem.css';
import { getActionDetails } from '../utils/actionHelpers';

function ReportsActionItem({ action, onClick }) {
  const formatTime = (dateString) => {
    if (!dateString) return '';
    // Use the same conversion logic as ActionEditPopup.getLocalDateTime
    // to ensure consistent time display
    const date = new Date(dateString);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    const localTimeString = localDate.toISOString().slice(11, 16); // Extract HH:MM
    return localTimeString;
  };

  const getActionTypeLabel = (type) => {
    switch (type) {
      case 'diaper':
        return 'Diaper';
      case 'feed':
        return 'Feed';
      case 'sleep':
        return 'Sleep';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const diaperType = action.actionType === 'diaper' ? action.details?.type : null;
  
  // Get start and end times based on action type
  const getTimeRange = () => {
    if (action.actionType === 'sleep' || action.actionType === 'feed') {
      const startTime = action.details?.startTime || action.createdAt;
      const endTime = action.details?.endTime;
      
      if (endTime) {
        return `${formatTime(startTime)} - ${formatTime(endTime)}`;
      }
      return formatTime(startTime);
    } else {
      // For diaper and other actions, just show the timestamp
      const actionTime = action.details?.timestamp || action.createdAt;
      return formatTime(actionTime);
    }
  };

  return (
    <div 
      className={`reports-action-item ${onClick ? 'reports-action-item-clickable' : ''}`}
      data-type={action.actionType}
      data-diaper-type={diaperType || undefined}
      onClick={onClick}
    >
      <div className="reports-action-type">
        {getActionTypeLabel(action.actionType)}
      </div>
      <div className="reports-action-details">
        {getActionDetails(action)}
      </div>
      <div className="reports-action-time">
        {getTimeRange()}
        {action.userEmoji && (
          <span className="reports-action-emoji"> • {action.userEmoji}</span>
        )}
      </div>
    </div>
  );
}

export default ReportsActionItem;

