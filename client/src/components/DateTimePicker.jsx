import { useState, useEffect, useRef } from 'react';
import './DateTimePicker.css';

function DateTimePicker({ value, onChange, onClose, title = 'Select time' }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [centeredHour, setCenteredHour] = useState(0);
  const [centeredMinute, setCenteredMinute] = useState(0);
  
  const dateRef = useRef(null);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const isInitialMount = useRef(true);
  const hasScrolled = useRef(false);
  const prevValueRef = useRef(value);
  const scrollPositionsSet = useRef(false);
  const scrollCheckInterval = useRef(null);

  // Generate date options (7 days before today, today, 7 days after)
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = -7; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dateOptions = generateDateOptions();
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      // Handle datetime-local format (YYYY-MM-DDTHH:mm) or ISO strings
      let date;
      if (typeof value === 'string' && value.includes('T') && !value.includes('Z')) {
        // datetime-local format - parse manually to avoid timezone issues
        const [datePart, timePart] = value.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        let hours = 0;
        let minutes = 0;
        if (timePart) {
          const timeParts = timePart.split(':');
          hours = Number(timeParts[0]) || 0;
          minutes = Number(timeParts[1]) || 0;
        }
        date = new Date(year, month - 1, day, hours, minutes, 0, 0);
      } else {
        date = new Date(value);
      }
      
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const hourValue = Number.isInteger(hours) ? hours : 0;
        const minuteValue = Number.isInteger(minutes) ? minutes : 0;
        setSelectedHour(hourValue);
        setSelectedMinute(minuteValue);
        setCenteredHour(hourValue);
        setCenteredMinute(minuteValue);
      } else {
        const now = new Date();
        setSelectedDate(now);
        const hours = now.getHours();
        const minutes = now.getMinutes();
        setSelectedHour(hours);
        setSelectedMinute(minutes);
        setCenteredHour(hours);
        setCenteredMinute(minutes);
      }
    } else {
      const now = new Date();
      setSelectedDate(now);
      const hours = now.getHours();
      const minutes = now.getMinutes();
      setSelectedHour(hours);
      setSelectedMinute(minutes);
      setCenteredHour(hours);
      setCenteredMinute(minutes);
    }
  }, [value]);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Find closest date index
  const findDateIndex = (targetDate) => {
    if (!targetDate) return 7; // Default to today
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    
    const index = dateOptions.findIndex(date => {
      const compare = new Date(date);
      compare.setHours(0, 0, 0, 0);
      return compare.getTime() === target.getTime();
    });
    
    // If not found, find the closest date
    if (index < 0) {
      let closestIndex = 7; // Default to today
      let minDiff = Infinity;
      dateOptions.forEach((date, idx) => {
        const compare = new Date(date);
        compare.setHours(0, 0, 0, 0);
        const diff = Math.abs(compare.getTime() - target.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = idx;
        }
      });
      return closestIndex;
    }
    
    return index;
  };

  // Calculate which item is centered based on scroll position
  const getCenteredIndex = (element) => {
    if (!element) return -1;
    const itemHeight = 50;
    const topPadding = 100;
    const spacerHeight = 100;
    const containerCenter = 125;
    const scrollTop = element.scrollTop;
    
    // When scrollTop is set to center an item at index N:
    // scrollTop = (topPadding + spacerHeight + N*itemHeight + itemHeight/2) - containerCenter
    // visibleCenter = scrollTop + containerCenter = topPadding + spacerHeight + N*itemHeight + itemHeight/2
    // rawIndex = (visibleCenter - topPadding - spacerHeight) / itemHeight = N + 0.5
    // So we need to use Math.floor, not Math.round, to get N
    const visibleCenter = scrollTop + containerCenter;
    const rawIndex = (visibleCenter - topPadding - spacerHeight) / itemHeight;
    return Math.max(0, Math.floor(rawIndex));
  };

  // Continuously check scroll position and update centered values using requestAnimationFrame
  useEffect(() => {
    let animationFrameId;
    
    const checkScrollPositions = () => {
      if (hourRef.current) {
        const hourIndex = getCenteredIndex(hourRef.current);
        if (hourIndex >= 0 && hourIndex < 24) {
          setCenteredHour(hourIndex);
        }
      }
      if (minuteRef.current) {
        const minuteIndex = getCenteredIndex(minuteRef.current);
        if (minuteIndex >= 0 && minuteIndex < 60) {
          setCenteredMinute(minuteIndex);
        }
      }
      
      // Continue checking
      animationFrameId = requestAnimationFrame(checkScrollPositions);
    };

    // Start checking
    animationFrameId = requestAnimationFrame(checkScrollPositions);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []); // Only run once on mount

  // Track when value prop changes
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      hasScrolled.current = false; // Reset scroll flag when value changes externally
      scrollPositionsSet.current = false; // Allow repositioning when value changes
      isInitialMount.current = true; // Reset initial mount flag to allow repositioning
    }
  }, [value]);

  // Scroll to selected values after state is initialized (instantly, before showing)
  useEffect(() => {
    // Only scroll on initial mount or when value prop changes externally, not on user scrolls
    if (hasScrolled.current && !isInitialMount.current) {
      return;
    }
    
    // Helper function to set scroll positions instantly
    const setScrollPositions = () => {
      const itemHeight = 50;
      const topPadding = 100; // CSS padding-top
      const spacerHeight = 100; // Height of top spacer div
      const containerCenter = 125; // Half of 250px container height
      
      // Check if all refs are ready
      if (!dateRef.current || !hourRef.current || !minuteRef.current) {
        return false; // Not ready yet
      }
      
      // Disable smooth scrolling temporarily
      dateRef.current.style.scrollBehavior = 'auto';
      hourRef.current.style.scrollBehavior = 'auto';
      minuteRef.current.style.scrollBehavior = 'auto';
      
      // Set date scroll position
      if (selectedDate) {
        const index = findDateIndex(selectedDate);
        if (index >= 0 && index < dateOptions.length) {
          const itemTop = topPadding + spacerHeight + (index * itemHeight);
          const itemCenter = itemTop + (itemHeight / 2);
          const targetScroll = itemCenter - containerCenter;
          dateRef.current.scrollTop = Math.max(0, targetScroll);
        }
      }
      
      // Set hour scroll position
      if (selectedHour >= 0 && selectedHour < 24) {
        const itemTop = topPadding + spacerHeight + (selectedHour * itemHeight);
        const itemCenter = itemTop + (itemHeight / 2);
        const targetScroll = itemCenter - containerCenter;
        hourRef.current.scrollTop = Math.max(0, targetScroll);
        // Force a reflow to ensure scroll position is applied
        void hourRef.current.offsetHeight;
        setCenteredHour(selectedHour);
      }
      
      // Set minute scroll position
      if (selectedMinute >= 0 && selectedMinute < 60) {
        const itemTop = topPadding + spacerHeight + (selectedMinute * itemHeight);
        const itemCenter = itemTop + (itemHeight / 2);
        const targetScroll = itemCenter - containerCenter;
        minuteRef.current.scrollTop = Math.max(0, targetScroll);
        // Force a reflow to ensure scroll position is applied
        void minuteRef.current.offsetHeight;
        setCenteredMinute(selectedMinute);
      }
      
      // Re-enable smooth scrolling for user interactions after a brief delay
      setTimeout(() => {
        if (dateRef.current) {
          dateRef.current.style.scrollBehavior = '';
        }
        if (hourRef.current) {
          hourRef.current.style.scrollBehavior = '';
        }
        if (minuteRef.current) {
          minuteRef.current.style.scrollBehavior = '';
        }
      }, 50);
      
      scrollPositionsSet.current = true;
      isInitialMount.current = false;
      
      // Sync centered values with actual scroll positions
      if (hourRef.current) {
        const hourIndex = getCenteredIndex(hourRef.current);
        if (hourIndex >= 0 && hourIndex < 24) {
          setCenteredHour(hourIndex);
        }
      }
      if (minuteRef.current) {
        const minuteIndex = getCenteredIndex(minuteRef.current);
        if (minuteIndex >= 0 && minuteIndex < 60) {
          setCenteredMinute(minuteIndex);
        }
      }
      
      return true; // Successfully set all positions
    };
    
    // Try to set positions with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!setScrollPositions()) {
        // If not all refs are ready, try again on next frame
        const rafId = requestAnimationFrame(() => {
          if (!setScrollPositions()) {
            const rafId2 = requestAnimationFrame(() => {
              setScrollPositions();
            });
            return () => cancelAnimationFrame(rafId2);
          }
        });
        return () => cancelAnimationFrame(rafId);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedDate, selectedHour, selectedMinute, dateOptions]); // Run when selected values are set

  // Handle scroll events with debouncing and snap-to-center
  const snapToCenter = (element, itemHeight, maxIndex = Infinity) => {
    if (!element) return -1;
    const topPadding = 100;
    const spacerHeight = 100;
    const containerCenter = 125;
    const scrollTop = element.scrollTop;
    
    // Calculate which item should be centered based on current scroll position
    // Current visible center position in scrollable content = scrollTop + containerCenter
    // Item index = (visibleCenter - topPadding - spacerHeight) / itemHeight
    // Note: Use Math.floor because when centered, rawIndex = N + 0.5
    const visibleCenter = scrollTop + containerCenter;
    const rawIndex = (visibleCenter - topPadding - spacerHeight) / itemHeight;
    const itemIndex = Math.max(0, Math.min(maxIndex, Math.floor(rawIndex)));
    
    // Calculate target scroll position to center this item
    const itemTop = topPadding + spacerHeight + (itemIndex * itemHeight);
    const itemCenter = itemTop + (itemHeight / 2);
    const targetScroll = Math.max(0, itemCenter - containerCenter);
    
    // Smooth scroll to center
    element.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
    
    return itemIndex;
  };

  const handleDateScroll = (e) => {
    hasScrolled.current = true;
    const itemHeight = 50;
    const topPadding = 100;
    const spacerHeight = 100;
    const containerCenter = 125;
    const scrollTop = e.target.scrollTop;
    
    // Calculate which item is currently centered
    const visibleCenter = scrollTop + containerCenter;
    const rawIndex = (visibleCenter - topPadding - spacerHeight) / itemHeight;
    const index = Math.max(0, Math.min(dateOptions.length - 1, Math.floor(rawIndex)));
    
    if (index >= 0 && index < dateOptions.length) {
      const currentIndex = findDateIndex(selectedDate);
      if (currentIndex !== index) {
        const newDate = new Date(dateOptions[index]);
        newDate.setHours(selectedHour, selectedMinute, 0, 0);
        setSelectedDate(newDate);
      }
    }
  };

  const handleDateScrollEnd = (e) => {
    const itemHeight = 50;
    const index = snapToCenter(e.target, itemHeight, dateOptions.length - 1);
    if (index >= 0 && index < dateOptions.length) {
      const newDate = new Date(dateOptions[index]);
      newDate.setHours(selectedHour, selectedMinute, 0, 0);
      setSelectedDate(newDate);
    }
  };

  const handleHourScroll = (e) => {
    hasScrolled.current = true;
    const itemHeight = 50;
    const topPadding = 100;
    const spacerHeight = 100;
    const containerCenter = 125;
    const scrollTop = e.target.scrollTop;
    
    // Calculate which item is currently centered
    const visibleCenter = scrollTop + containerCenter;
    const rawIndex = (visibleCenter - topPadding - spacerHeight) / itemHeight;
    const index = Math.max(0, Math.min(23, Math.floor(rawIndex)));
    
    // Always update centered hour for bold styling
    setCenteredHour(index);
    
    if (index >= 0 && index < hourOptions.length && index !== selectedHour) {
      setSelectedHour(index);
      if (selectedDate) {
        const newDate = new Date(selectedDate);
        newDate.setHours(index, selectedMinute, 0, 0);
        setSelectedDate(newDate);
      }
    }
  };

  const handleHourScrollEnd = (e) => {
    const itemHeight = 50;
    const index = snapToCenter(e.target, itemHeight, 23);
    if (index >= 0 && index < hourOptions.length) {
      // Wait for scroll animation to complete, then update
      setTimeout(() => {
        const finalIndex = getCenteredIndex(e.target);
        if (finalIndex >= 0 && finalIndex < 24) {
          setCenteredHour(finalIndex);
          setSelectedHour(finalIndex);
          if (selectedDate) {
            const newDate = new Date(selectedDate);
            newDate.setHours(finalIndex, selectedMinute, 0, 0);
            setSelectedDate(newDate);
          }
        }
      }, 100);
    }
  };

  const handleMinuteScroll = (e) => {
    hasScrolled.current = true;
    const itemHeight = 50;
    const topPadding = 100;
    const spacerHeight = 100;
    const containerCenter = 125;
    const scrollTop = e.target.scrollTop;
    
    // Calculate which item is currently centered
    const visibleCenter = scrollTop + containerCenter;
    const rawIndex = (visibleCenter - topPadding - spacerHeight) / itemHeight;
    const index = Math.max(0, Math.min(59, Math.floor(rawIndex)));
    
    // Always update centered minute for bold styling
    setCenteredMinute(index);
    
    if (index >= 0 && index < minuteOptions.length && index !== selectedMinute) {
      setSelectedMinute(index);
      if (selectedDate) {
        const newDate = new Date(selectedDate);
        newDate.setHours(selectedHour, index, 0, 0);
        setSelectedDate(newDate);
      }
    }
  };

  const handleMinuteScrollEnd = (e) => {
    const itemHeight = 50;
    const index = snapToCenter(e.target, itemHeight, 59);
    if (index >= 0 && index < minuteOptions.length) {
      // Wait for scroll animation to complete, then update
      setTimeout(() => {
        const finalIndex = getCenteredIndex(e.target);
        if (finalIndex >= 0 && finalIndex < 60) {
          setCenteredMinute(finalIndex);
          setSelectedMinute(finalIndex);
          if (selectedDate) {
            const newDate = new Date(selectedDate);
            newDate.setHours(selectedHour, finalIndex, 0, 0);
            setSelectedDate(newDate);
          }
        }
      }, 100);
    }
  };

  const handleSave = () => {
    if (selectedDate) {
      const finalDate = new Date(selectedDate);
      finalDate.setHours(selectedHour, selectedMinute, 0, 0);
      
      // Convert to local datetime string format (YYYY-MM-DDTHH:mm)
      const year = finalDate.getFullYear();
      const month = String(finalDate.getMonth() + 1).padStart(2, '0');
      const day = String(finalDate.getDate()).padStart(2, '0');
      const hours = String(selectedHour).padStart(2, '0');
      const minutes = String(selectedMinute).padStart(2, '0');
      
      const datetimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
      onChange(datetimeString);
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="datetime-picker-overlay" onClick={handleCancel}>
      <div className="datetime-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="datetime-picker-title">{title}</div>
        <div className="datetime-picker-separator"></div>
        
        <div className="datetime-picker-wheels">
          <div className="datetime-picker-wheel-container">
            <div 
              className="datetime-picker-wheel datetime-picker-wheel-date" 
              ref={dateRef} 
              onScroll={handleDateScroll}
              onTouchEnd={handleDateScrollEnd}
              onMouseUp={handleDateScrollEnd}
            >
              <div className="datetime-picker-spacer"></div>
              {dateOptions.map((date, index) => (
                <div
                  key={index}
                  className={`datetime-picker-item datetime-picker-item-date ${findDateIndex(selectedDate) === index ? 'selected' : ''}`}
                >
                  {formatDate(date)}
                </div>
              ))}
              <div className="datetime-picker-spacer"></div>
            </div>
          </div>
          
          <div className="datetime-picker-wheel-container">
            <div 
              className="datetime-picker-wheel datetime-picker-wheel-time" 
              ref={hourRef} 
              onScroll={handleHourScroll}
              onTouchEnd={handleHourScrollEnd}
              onMouseUp={handleHourScrollEnd}
            >
              <div className="datetime-picker-spacer"></div>
              {hourOptions.map((hour) => (
                <div
                  key={hour}
                  className={`datetime-picker-item datetime-picker-item-time ${centeredHour === hour ? 'selected' : ''}`}
                >
                  {String(hour).padStart(2, '0')}
                </div>
              ))}
              <div className="datetime-picker-spacer"></div>
            </div>
          </div>
          
          <div className="datetime-picker-wheel-container">
            <div 
              className="datetime-picker-wheel datetime-picker-wheel-time" 
              ref={minuteRef} 
              onScroll={handleMinuteScroll}
              onTouchEnd={handleMinuteScrollEnd}
              onMouseUp={handleMinuteScrollEnd}
            >
              <div className="datetime-picker-spacer"></div>
              {minuteOptions.map((minute) => (
                <div
                  key={minute}
                  className={`datetime-picker-item datetime-picker-item-time ${centeredMinute === minute ? 'selected' : ''}`}
                >
                  {String(minute).padStart(2, '0')}
                </div>
              ))}
              <div className="datetime-picker-spacer"></div>
            </div>
          </div>
        </div>
        
        <div className="datetime-picker-selection-indicator"></div>
        
        <div className="datetime-picker-buttons">
          <button className="datetime-picker-button datetime-picker-button-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button className="datetime-picker-button datetime-picker-button-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default DateTimePicker;
