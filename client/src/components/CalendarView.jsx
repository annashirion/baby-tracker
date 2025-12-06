import { useMemo } from 'react';
import './CalendarView.css';
import ReportsActionItem from './ReportsActionItem';
import { getActionDetails } from '../utils/actionHelpers';
import { ACTION_TYPES } from '../constants/constants';

function CalendarView({ 
  actions, 
  currentWeekStart, 
  selectedAction, 
  onDayClick, 
  onActionClick,
  onActionItemClick,
  onWeekNavigate, 
  onGoToToday,
  onClose 
}) {
  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentWeekStart]);

  // Calculate week date range
  const weekDateRange = useMemo(() => {
    const firstDay = currentWeekStart;
    const lastDay = new Date(currentWeekStart);
    lastDay.setDate(currentWeekStart.getDate() + 6);
    
    const firstDayNum = firstDay.getDate();
    const lastDayNum = lastDay.getDate();
    const month = firstDay.toLocaleDateString('en-US', { month: 'short' });
    const year = firstDay.getFullYear();
    
    // If both days are in the same month
    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${firstDayNum}-${lastDayNum} ${month} ${year}`;
    } else {
      // If week spans two months
      const lastMonth = lastDay.toLocaleDateString('en-US', { month: 'short' });
      return `${firstDayNum} ${month} - ${lastDayNum} ${lastMonth} ${year}`;
    }
  }, [currentWeekStart]);

  // Time slots for the chart (6am to 5am next day - 24 hours)
  const timeSlots = useMemo(() => {
    const slots = [];
    // Generate 24 hours starting at 6am: 6, 7, 8, ..., 23, 0, 1, 2, 3, 4, 5
    for (let i = 0; i < 24; i++) {
      const hour = (6 + i) % 24;
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      const isNextDay = hour < 6;
      // Format as 24-hour format with minutes (e.g., 06:00, 07:00, 12:00, 13:00, 23:00)
      const label = String(hour).padStart(2, '0') + ':00';
      slots.push({
        hour,
        label,
        minutes: hour * 60,
        isNextDay
      });
    }
    return slots;
  }, []);

  // Get actions for a specific day (6 AM to 5:59 AM next day)
  const getActionsForDay = (day) => {
    // Selected day: from 6:00 AM to 11:59:59 PM
    const dayStart = new Date(day);
    dayStart.setHours(6, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    // Next day: from 00:00:00 to 5:59:59 AM
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStart = new Date(nextDay);
    nextDayStart.setHours(0, 0, 0, 0);
    const nextDayEnd = new Date(nextDay);
    nextDayEnd.setHours(5, 59, 59, 999);

    return actions.filter(action => {
      // For sleep/feed, check if they start or end in the time range, or span the range
      if (action.actionType === ACTION_TYPES.SLEEP || action.actionType === ACTION_TYPES.FEED) {
        const startTime = action.details?.startTime ? new Date(action.details.startTime) : new Date(action.createdAt);
        const endTime = action.details?.endTime ? new Date(action.details.endTime) : new Date();
        
        // Check if action overlaps with selected day (6am-11:59pm) or next day (midnight-5:59am)
        const overlapsSelectedDay = (startTime <= dayEnd && endTime >= dayStart);
        const overlapsNextDay = (startTime <= nextDayEnd && endTime >= nextDayStart);
        return overlapsSelectedDay || overlapsNextDay;
      }
      // For other actions (diaper, other), check if they fall in either time range
      const actionDate = new Date(action.createdAt);
      const inSelectedDay = actionDate >= dayStart && actionDate <= dayEnd;
      const inNextDay = actionDate >= nextDayStart && actionDate <= nextDayEnd;
      return inSelectedDay || inNextDay;
    });
  };

  // Calculate position and height for an action bar
  const getActionBarStyle = (action, day) => {
    // Selected day boundaries: 6:00 AM to 11:59:59 PM
    const selectedDayStart = new Date(day);
    selectedDayStart.setHours(6, 0, 0, 0);
    const selectedDayEnd = new Date(day);
    selectedDayEnd.setHours(23, 59, 59, 999);

    // Next day boundaries: 00:00:00 to 5:59:59 AM
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStart = new Date(nextDay);
    nextDayStart.setHours(0, 0, 0, 0);
    const nextDayEnd = new Date(nextDay);
    nextDayEnd.setHours(5, 59, 59, 999);

    let startTime, endTime;
    
    if (action.actionType === ACTION_TYPES.SLEEP || action.actionType === ACTION_TYPES.FEED) {
      startTime = action.details?.startTime ? new Date(action.details.startTime) : new Date(action.createdAt);
      endTime = action.details?.endTime ? new Date(action.details.endTime) : new Date();
      
      // Clamp to the appropriate boundaries (selected day 6am-11:59pm or next day midnight-5:59am)
      // Check which range the action overlaps with
      const overlapsSelectedDay = (startTime <= selectedDayEnd && endTime >= selectedDayStart);
      const overlapsNextDay = (startTime <= nextDayEnd && endTime >= nextDayStart);
      
      if (overlapsSelectedDay && overlapsNextDay) {
        // Action spans both ranges - clamp to the range where it starts
        if (startTime < selectedDayStart) {
          // Starts before selected day, clamp to next day range
          startTime = startTime < nextDayStart ? nextDayStart : startTime;
          endTime = endTime > nextDayEnd ? nextDayEnd : endTime;
        } else {
          // Starts in selected day, clamp to selected day range
          startTime = startTime < selectedDayStart ? selectedDayStart : startTime;
          endTime = endTime > selectedDayEnd ? selectedDayEnd : endTime;
        }
      } else if (overlapsSelectedDay) {
        // Only overlaps selected day
        startTime = startTime < selectedDayStart ? selectedDayStart : startTime;
        endTime = endTime > selectedDayEnd ? selectedDayEnd : endTime;
      } else if (overlapsNextDay) {
        // Only overlaps next day
        startTime = startTime < nextDayStart ? nextDayStart : startTime;
        endTime = endTime > nextDayEnd ? nextDayEnd : endTime;
      }
    } else {
      // For instant actions (diaper, other), use details.timestamp if available, otherwise createdAt
      const actionTime = action.details?.timestamp ? new Date(action.details.timestamp) : new Date(action.createdAt);
      startTime = new Date(actionTime);
      endTime = new Date(actionTime);
      // Add a small duration for visibility (15 minutes)
      endTime.setMinutes(endTime.getMinutes() + 15);
      
      // Clamp to appropriate boundaries
      if (actionTime >= selectedDayStart && actionTime <= selectedDayEnd) {
        if (startTime < selectedDayStart) startTime = selectedDayStart;
        if (endTime > selectedDayEnd) endTime = selectedDayEnd;
      } else if (actionTime >= nextDayStart && actionTime <= nextDayEnd) {
        if (startTime < nextDayStart) startTime = nextDayStart;
        if (endTime > nextDayEnd) endTime = nextDayEnd;
      }
    }

    // Calculate position in minutes from start of day using local time
    // getHours() and getMinutes() return local time, which is what we want
    // The calendar displays from 6am to 5am next day (24 hours total)
    let startHour = startTime.getHours();
    let startMin = startTime.getMinutes();
    let endHour = endTime.getHours();
    let endMin = endTime.getMinutes();
    
    // Convert to calendar hours (0 = 6am, 23 = 5am next day)
    // Times >= 6am: calendarHour = hour - 6 (6am = 0, 7am = 1, ..., 11pm = 17)
    // Times < 6am: calendarHour = hour + 18 (midnight = 18, 1am = 19, ..., 5am = 23)
    let startCalendarHour = startHour >= 6 ? startHour - 6 : startHour + 18;
    let endCalendarHour = endHour >= 6 ? endHour - 6 : endHour + 18;
    
    // Calculate minutes from calendar start (6am = 0)
    let startMinutes = startCalendarHour * 60 + startMin;
    let endMinutes = endCalendarHour * 60 + endMin;
    
    // Total minutes in a day (1440)
    const totalMinutes = 24 * 60;
    const topPercent = (startMinutes / totalMinutes) * 100;
    const heightPercent = ((endMinutes - startMinutes) / totalMinutes) * 100;
    
    // Minimum height equivalent to 15 minutes (15/1440 = ~1.04%)
    const minHeightPercent = (15 / totalMinutes) * 100;

    return {
      top: `${topPercent}%`,
      height: `${Math.max(heightPercent, minHeightPercent)}%`, // Minimum 15 minutes
    };
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


  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={onClose} className="btn back-button" title="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="calendar-header-center">
          <button className="week-nav-btn" onClick={() => onWeekNavigate(-1)}>‹</button>
          <div className="week-info">
            <span className="month-year">
              {weekDateRange}
            </span>
          </div>
          <button className="week-nav-btn" onClick={() => onWeekNavigate(1)}>›</button>
        </div>
        <button className="today-btn" onClick={onGoToToday}>Today</button>
      </div>

      <div className="calendar-grid">
        <div className="time-column">
          <div className="month-label">
            {currentWeekStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
          {timeSlots.map((slot, idx) => (
            <div key={idx} className="time-slot">
              {slot.label}
            </div>
          ))}
        </div>

        <div className="days-container">
          {weekDays.map((day, dayIdx) => {
            const dayActions = getActionsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={dayIdx} 
                className={`day-column ${isToday ? 'today' : ''}`}
                onClick={() => onDayClick(day)}
              >
                <div className="day-header">
                  <div className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="day-number">{day.getDate()}</div>
                </div>
                <div className="day-bars">
                  {dayActions.map((action) => {
                    const style = getActionBarStyle(action, day);
                    const diaperType = action.actionType === ACTION_TYPES.DIAPER ? action.details?.type : null;
                    return (
                      <div
                        key={action.id}
                        className={`action-bar ${action.actionType} ${diaperType ? `diaper-${diaperType}` : ''} ${selectedAction?.id === action.id ? 'selected' : ''}`}
                        style={style}
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionClick(action);
                        }}
                        title={`${getActionTypeLabel(action.actionType)}: ${getActionDetails(action)}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedAction && (
        <div className="action-detail-panel">
          <div className="detail-panel-content">
            <ReportsActionItem
              action={selectedAction}
              onClick={onActionItemClick ? (e) => onActionItemClick(selectedAction, e) : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;

