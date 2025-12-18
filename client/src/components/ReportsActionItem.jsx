import './ReportsActionItem.css';
import { getActionDetails } from '../utils/actionHelpers';
import { ACTION_TYPES } from '../constants/constants';

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
      case ACTION_TYPES.DIAPER:
        return 'Diaper';
      case ACTION_TYPES.FEED:
        return 'Feed';
      case ACTION_TYPES.SLEEP:
        return 'Sleep';
      case ACTION_TYPES.OTHER:
        return 'Other';
      default:
        return type;
    }
  };

  const diaperType = action.actionType === ACTION_TYPES.DIAPER ? action.details?.type : null;
  
  // Get start and end times based on action type
  const getTimeRange = () => {
    if (action.actionType === ACTION_TYPES.SLEEP || action.actionType === ACTION_TYPES.FEED) {
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
        {(action.userEmoji || action.userId?.emoji) && (
          <span className="reports-action-emoji"> • {action.userEmoji || action.userId?.emoji}</span>
        )}
      </div>
    </div>
  );
}

export default ReportsActionItem;

