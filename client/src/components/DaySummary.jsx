import './DaySummary.css';
import { ACTION_TYPES, DIAPER_TYPES } from '../constants/constants';
import { formatDuration } from '../utils/actionHelpers';

function DaySummary({ actions }) {
  // Calculate statistics from actions
  const stats = actions.reduce((acc, action) => {
    switch (action.actionType) {
      case ACTION_TYPES.DIAPER:
        const diaperType = action.details?.type;
        if (diaperType === DIAPER_TYPES.PEE) {
          acc.diapers.pee += 1;
        } else if (diaperType === DIAPER_TYPES.POO) {
          acc.diapers.poo += 1;
        }
        break;
      
      case ACTION_TYPES.SLEEP:
        const sleepStart = action.details?.startTime ? new Date(action.details.startTime) : null;
        const sleepEnd = action.details?.endTime ? new Date(action.details.endTime) : null;
        if (sleepStart && sleepEnd) {
          acc.sleep.totalMs += sleepEnd - sleepStart;
        }
        break;
      
      case ACTION_TYPES.FEED:
        acc.feed.count += 1;
        const feedMl = action.details?.ml;
        if (feedMl) {
          acc.feed.totalMl += feedMl;
        }
        const feedStart = action.details?.startTime ? new Date(action.details.startTime) : null;
        const feedEnd = action.details?.endTime ? new Date(action.details.endTime) : null;
        if (feedStart && feedEnd) {
          acc.feed.totalDurationMs += feedEnd - feedStart;
        }
        break;
    }
    return acc;
  }, {
    diapers: { pee: 0, poo: 0 },
    sleep: { totalMs: 0 },
    feed: { count: 0, totalMl: 0, totalDurationMs: 0 }
  });

  // Format total sleep time
  const formatTotalTime = (totalMs) => {
    if (totalMs === 0) return '0m';
    const totalMins = Math.floor(totalMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const minutes = totalMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const totalSleepTime = formatTotalTime(stats.sleep.totalMs);
  const totalFeedTime = formatTotalTime(stats.feed.totalDurationMs);

  return (
    <div className="day-summary">
      <div className="day-summary-section">
        <span className="day-summary-label">Diaper:</span>
        <div className="day-summary-values">
          {stats.diapers.pee > 0 && (
            <span className="day-summary-value">
              <span className="day-summary-value-label">Pee</span>
              <span className="day-summary-value-number">{stats.diapers.pee}</span>
            </span>
          )}
          {stats.diapers.poo > 0 && (
            <span className="day-summary-value">
              <span className="day-summary-value-label">Poo</span>
              <span className="day-summary-value-number">{stats.diapers.poo}</span>
            </span>
          )}
          {stats.diapers.pee === 0 && stats.diapers.poo === 0 && (
            <span className="day-summary-value-empty">None</span>
          )}
        </div>
      </div>

      <div className="day-summary-section">
        <span className="day-summary-label">Sleep:</span>
        <span className="day-summary-value">
          <span className="day-summary-value-number">{totalSleepTime}</span>
        </span>
      </div>

      <div className="day-summary-section">
        <span className="day-summary-label">Feed:</span>
        <div className="day-summary-values">
          {stats.feed.count > 0 ? (
            <>
              <span className="day-summary-value">
                <span className="day-summary-value-number">{stats.feed.count}</span>
                <span className="day-summary-value-label">times</span>
              </span>
              {stats.feed.totalMl > 0 && (
                <span className="day-summary-value">
                  <span className="day-summary-value-number">{stats.feed.totalMl}</span>
                  <span className="day-summary-value-label">ml</span>
                </span>
              )}
              {stats.feed.totalDurationMs > 0 && (
                <span className="day-summary-value">
                  <span className="day-summary-value-number">{totalFeedTime}</span>
                </span>
              )}
            </>
          ) : (
            <span className="day-summary-value-empty">None</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default DaySummary;

