import { useMemo, useRef } from 'react';
import './CalendarView.css';
import { getActionDetails } from '../utils/actionHelpers';
import { ACTION_TYPES } from '../constants/constants';
import Spinner from './Spinner';

function CalendarView({ 
  actions, 
  currentPeriodStart, 
  onDayClick, 
  onActionClick,
  onPeriodNavigate,
  onGoToToday,
  onClose,
  loading = false
}) {
  // Touch/swipe handling
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const lastWheelTime = useRef(0);
  const MIN_SWIPE_DISTANCE = 50;
  const WHEEL_DEBOUNCE_MS = 300;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > MIN_SWIPE_DISTANCE) {
      if (deltaX > 0) {
        // Swipe right -> go to previous period
        onPeriodNavigate(-1);
      } else {
        // Swipe left -> go to next period
        onPeriodNavigate(1);
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Mouse wheel horizontal scroll handling
  const handleWheel = (e) => {
    // Check for horizontal scroll (deltaX) or shift+scroll
    const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    
    if (Math.abs(deltaX) > 30) {
      const now = Date.now();
      // Debounce to prevent rapid navigation
      if (now - lastWheelTime.current > WHEEL_DEBOUNCE_MS) {
        lastWheelTime.current = now;
        if (deltaX > 0) {
          // Scroll right -> go to next period
          onPeriodNavigate(1);
        } else {
          // Scroll left -> go to previous period
          onPeriodNavigate(-1);
        }
      }
    }
  };

  // Generate 4 days
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < 4; i++) {
      const date = new Date(currentPeriodStart);
      date.setDate(currentPeriodStart.getDate() + i);
      result.push(date);
    }
    return result;
  }, [currentPeriodStart]);

  // Check if today is visible in the current period
  const isTodayVisible = useMemo(() => {
    const todayStr = new Date().toDateString();
    return days.some(day => day.toDateString() === todayStr);
  }, [days]);

  // Handle Today button click
  const handleTodayClick = () => {
    if (isTodayVisible) {
      // Today is visible, open day list view for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      onDayClick(today);
    } else {
      // Navigate to today
      onGoToToday();
    }
  };

  // Calculate date range for 4 days
  const dateRange = useMemo(() => {
    const firstDay = currentPeriodStart;
    const lastDay = new Date(currentPeriodStart);
    lastDay.setDate(currentPeriodStart.getDate() + 3);
    
    const firstDayNum = firstDay.getDate();
    const lastDayNum = lastDay.getDate();
    const month = firstDay.toLocaleDateString('en-US', { month: 'short' });
    const year = firstDay.getFullYear();
    
    // If both days are in the same month
    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${firstDayNum}-${lastDayNum} ${month} ${year}`;
    } else {
      // If range spans two months, don't show year
      const lastMonth = lastDay.toLocaleDateString('en-US', { month: 'short' });
      return `${firstDayNum} ${month} - ${lastDayNum} ${lastMonth}`;
    }
  }, [currentPeriodStart]);

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
  // Show actions that OVERLAP with this time period (for calendar view, we want to see all overlapping actions)
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

    // Combined time range for the day (6am to 5:59am next day)
    const periodStart = dayStart;
    const periodEnd = nextDayEnd;

    return actions.filter(action => {
      // For sleep/feed, check if the action OVERLAPS with the time period (use only details)
      if (action.actionType === ACTION_TYPES.SLEEP || action.actionType === ACTION_TYPES.FEED) {
        const startTime = action.details?.startTime ? new Date(action.details.startTime) : null;
        if (!startTime) return false;
        const endTime = action.details?.endTime ? new Date(action.details.endTime) : new Date();
        return startTime < periodEnd && endTime > periodStart;
      }
      const ts = action.details?.timestamp;
      if (!ts) return false;
      const actionDate = new Date(ts);
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
      startTime = action.details?.startTime ? new Date(action.details.startTime) : null;
      endTime = action.details?.endTime ? new Date(action.details.endTime) : new Date();
      if (!startTime) startTime = endTime;
      
      // For calendar view, we want to show the full action spanning the day's period (6am to 5:59am next day)
      // Clamp to the combined period boundaries (6am selected day to 5:59am next day)
      const periodStart = selectedDayStart; // 6am selected day
      const periodEnd = nextDayEnd; // 5:59am next day
      
      // Clamp startTime and endTime to the period boundaries
      if (startTime < periodStart) {
        startTime = periodStart;
      }
      if (endTime > periodEnd) {
        endTime = periodEnd;
      }
      
      // If the action doesn't overlap the period at all, it shouldn't be shown (but this is handled by getActionsForDay)
      // Ensure we have valid times
      if (startTime > periodEnd || endTime < periodStart) {
        // Action doesn't overlap period - shouldn't happen due to filtering, but handle gracefully
        startTime = periodStart;
        endTime = periodStart;
      }
    } else {
      const ts = action.details?.timestamp;
      const actionTime = ts ? new Date(ts) : null;
      if (!actionTime) return { display: 'none' };
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
    const finalHeightPercent = Math.max(heightPercent, minHeightPercent);
    
    // Calculate z-index: smaller bars should be on top (higher z-index)
    // Map height (0-100%) to z-index (100-1), so smaller heights get higher z-index
    const zIndex = Math.round(100 - finalHeightPercent) + 2;

    return {
      top: `${topPercent}%`,
      height: `${finalHeightPercent}%`, // Minimum 15 minutes
      zIndex,
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
          <div className="date-info">
            <span className="month-year">
              {dateRange}
            </span>
          </div>
        </div>
        <button className="today-btn btn-secondary" onClick={handleTodayClick} title="Go to today">
          Today
        </button>
      </div>

      {loading ? (
        <div className="calendar-loading">
          <Spinner size="medium" />
        </div>
      ) : (
        <div 
          className="calendar-grid"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <div className="time-column">
            <div className="month-label">
              {currentPeriodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
            {timeSlots.map((slot, idx) => (
              <div key={idx} className="time-slot">
                {slot.label}
              </div>
            ))}
          </div>

          <div className="days-container">
            {days.map((day, dayIdx) => {
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
                          className={`action-bar ${action.actionType} ${diaperType ? `diaper-${diaperType}` : ''}`}
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
      )}
    </div>
  );
}

export default CalendarView;

