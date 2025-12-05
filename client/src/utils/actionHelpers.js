/**
 * Format duration between two times
 * @param {string|Date} startTime - Start time
 * @param {string|Date} endTime - End time
 * @returns {string} Formatted duration string
 */
export const formatDuration = (startTime, endTime) => {
  if (!endTime) return 'In progress';
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Get formatted details string for an action
 * @param {Object} action - Action object
 * @returns {string} Formatted details string
 */
export const getActionDetails = (action) => {
  switch (action.actionType) {
    case 'diaper':
      const type = action.details?.type;
      if (type === 'pee') return 'Pee';
      if (type === 'poo') return 'Poo';
      return '';
    case 'feed':
      const ml = action.details?.ml;
      if (ml) {
        return `${ml}ml`;
      }
      // If no ml, show duration or "In progress"
      if (action.details?.endTime) {
        return `${formatDuration(action.details.startTime, action.details.endTime)}`;
      }
      return 'Feeding in progress';
    case 'sleep':
      return action.details?.endTime 
        ? formatDuration(action.details.startTime, action.details.endTime)
        : 'In progress';
    case 'other':
      return action.details?.title || '';
    default:
      return '';
  }
};

