import { useMemo } from 'react';
import './CalendarView.css';
import ReportsActionItem from './ReportsActionItem';
import { getActionDetails } from '../utils/actionHelpers';

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

  // Get actions for a specific day
  const getActionsForDay = (day) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return actions.filter(action => {
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
  };

  // Calculate position and height for an action bar
  const getActionBarStyle = (action, day) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    let startTime, endTime;
    
    if (action.actionType === 'sleep' || action.actionType === 'feed') {
      startTime = action.details?.startTime ? new Date(action.details.startTime) : new Date(action.createdAt);
      endTime = action.details?.endTime ? new Date(action.details.endTime) : new Date();
      
      // Clamp to day boundaries for display
      const displayStart = startTime < dayStart ? dayStart : startTime;
      const displayEnd = endTime > dayEnd ? dayEnd : endTime;
      
      startTime = displayStart;
      endTime = displayEnd;
    } else {
      // For instant actions (diaper, other), use details.timestamp if available, otherwise createdAt
      const actionTime = action.details?.timestamp ? new Date(action.details.timestamp) : new Date(action.createdAt);
      startTime = new Date(actionTime);
      endTime = new Date(actionTime);
      // Add a small duration for visibility (15 minutes)
      endTime.setMinutes(endTime.getMinutes() + 15);
      
      // Clamp to day boundaries
      if (startTime < dayStart) startTime = dayStart;
      if (endTime > dayEnd) endTime = dayEnd;
    }

    // Calculate position in minutes from start of day using local time
    // getHours() and getMinutes() return local time, which is what we want
    // The calendar displays from 6am to 5am next day (24 hours total)
    let startHour = startTime.getHours();
    let startMin = startTime.getMinutes();
    let endHour = endTime.getHours();
    let endMin = endTime.getMinutes();
    
    // Check if times were clamped to day boundaries
    const startWasClamped = startTime.getTime() === dayStart.getTime();
    const endWasClamped = endTime.getTime() === dayEnd.getTime();
    
    // Convert to calendar hours (0 = 6am, 23 = 5am next day)
    // Times before 6am are on the "next day" in calendar view
    let startCalendarHour = startHour >= 6 ? startHour - 6 : startHour + 18; // +18 = +24-6
    let endCalendarHour = endHour >= 6 ? endHour - 6 : endHour + 18;
    
    // If end time was clamped to end of day, it should extend to the end of the calendar view (5am next day = calendar hour 23)
    if (endWasClamped) {
      endCalendarHour = 23;
      endMin = 60; // Set to 60 so it extends to the very end (will be handled in calculation)
    }
    
    // If start time was clamped to start of day, it should start at the beginning of the calendar view (6am = calendar hour 0)
    if (startWasClamped) {
      startCalendarHour = 0;
      startMin = 0;
    }
    
    // Calculate minutes from calendar start (6am = 0)
    let startMinutes = startCalendarHour * 60 + startMin;
    let endMinutes = endCalendarHour * 60 + endMin;
    
    // If endMin was set to 60 (clamped case), set endMinutes to exactly 1440 (end of calendar view)
    if (endWasClamped && endMin === 60) {
      endMinutes = 24 * 60; // Exactly 1440 minutes = end of calendar view
    }
    
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
                    const diaperType = action.actionType === 'diaper' ? action.details?.type : null;
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

