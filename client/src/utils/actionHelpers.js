/**
 * Format duration between two times
 * @param {string|Date} startTime - Start time
 * @param {string|Date} endTime - End time
 * @returns {string} Formatted duration string
 */
export const formatDuration = (startTime, endTime) => {
  if (!endTime) return 'In\u00A0progress';
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  
  // Use non-breaking space (\u00A0) to prevent wrapping within duration
  if (hours > 0) {
    return `${hours}h\u00A0${minutes}m`;
  }
  return `${minutes}m`;
};

import { ACTION_TYPES, DIAPER_TYPES } from '../constants/constants';

/**
 * Get formatted details string for an action
 * @param {Object} action - Action object
 * @returns {string} Formatted details string
 */
export const getActionDetails = (action) => {
  switch (action.actionType) {
    case ACTION_TYPES.DIAPER:
      const type = action.details?.type;
      if (type === DIAPER_TYPES.PEE) return 'Pee';
      if (type === DIAPER_TYPES.POO) return 'Poo';
      return '';
    case ACTION_TYPES.FEED:
      const ml = action.details?.ml;
      if (ml) {
        return `${ml}ml`;
      }
      // If no ml, show duration or "In progress"
      if (action.details?.endTime) {
        return `${formatDuration(action.details.startTime, action.details.endTime)}`;
      }
      return 'In\u00A0progress';
    case ACTION_TYPES.SLEEP:
      return action.details?.endTime 
        ? formatDuration(action.details.startTime, action.details.endTime)
        : 'In\u00A0progress';
    case ACTION_TYPES.OTHER:
      const title = action.details?.title || '';
      return title.length > 10 ? title.slice(0, 10) + '…' : title;
    default:
      return '';
  }
};

