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

  const wheelItemNodes = (el) => el?.querySelectorAll('.datetime-picker-item') ?? [];

  /** Scroll so item `index` is vertically centered (uses layout offsets — no padding on wheel) */
  const scrollWheelToItemIndex = (el, index) => {
    const items = wheelItemNodes(el);
    const item = items[index];
    if (!item) return;
    const centerY = item.offsetTop + item.offsetHeight / 2;
    el.scrollTop = Math.max(0, centerY - el.clientHeight / 2);
  };

  /** Index of the item whose center is closest to the viewport center (maxIndex inclusive) */
  const nearestItemIndex = (el, maxIndex) => {
    const items = wheelItemNodes(el);
    if (!items.length || maxIndex < 0) return -1;
    const limit = Math.min(maxIndex, items.length - 1);
    const visibleCenter = el.scrollTop + el.clientHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= limit; i++) {
      const c = items[i].offsetTop + items[i].offsetHeight / 2;
      const d = Math.abs(visibleCenter - c);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  };

  const wheelReady = (el, minCount) => wheelItemNodes(el).length >= minCount;

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

  // Continuously check scroll position and update centered values using requestAnimationFrame
  useEffect(() => {
    let animationFrameId;
    
    const checkScrollPositions = () => {
      if (!scrollPositionsSet.current) {
        animationFrameId = requestAnimationFrame(checkScrollPositions);
        return;
      }
      if (hourRef.current) {
        const hourIndex = nearestItemIndex(hourRef.current, 23);
        if (hourIndex >= 0 && hourIndex < 24) {
          setCenteredHour(hourIndex);
        }
      }
      if (minuteRef.current) {
        const minuteIndex = nearestItemIndex(minuteRef.current, 59);
        if (minuteIndex >= 0 && minuteIndex < 60) {
          setCenteredMinute(minuteIndex);
        }
      }
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
      if (!dateRef.current || !hourRef.current || !minuteRef.current) {
        return false;
      }
      if (
        !wheelReady(dateRef.current, dateOptions.length) ||
        !wheelReady(hourRef.current, 24) ||
        !wheelReady(minuteRef.current, 60)
      ) {
        return false;
      }

      dateRef.current.style.scrollBehavior = 'auto';
      hourRef.current.style.scrollBehavior = 'auto';
      minuteRef.current.style.scrollBehavior = 'auto';

      if (selectedDate) {
        const index = findDateIndex(selectedDate);
        if (index >= 0 && index < dateOptions.length) {
          scrollWheelToItemIndex(dateRef.current, index);
        }
      }

      if (selectedHour >= 0 && selectedHour < 24) {
        scrollWheelToItemIndex(hourRef.current, selectedHour);
        void hourRef.current.offsetHeight;
        setCenteredHour(selectedHour);
      }

      if (selectedMinute >= 0 && selectedMinute < 60) {
        scrollWheelToItemIndex(minuteRef.current, selectedMinute);
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
        const hourIndex = nearestItemIndex(hourRef.current, 23);
        if (hourIndex >= 0 && hourIndex < 24) {
          setCenteredHour(hourIndex);
        }
      }
      if (minuteRef.current) {
        const minuteIndex = nearestItemIndex(minuteRef.current, 59);
        if (minuteIndex >= 0 && minuteIndex < 60) {
          setCenteredMinute(minuteIndex);
        }
      }

      return true;
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

  const snapToCenter = (element, maxIndex) => {
    if (!element || maxIndex < 0) return -1;
    const itemIndex = nearestItemIndex(element, maxIndex);
    if (itemIndex < 0) return -1;
    const items = wheelItemNodes(element);
    const item = items[itemIndex];
    if (!item) return -1;
    const centerY = item.offsetTop + item.offsetHeight / 2;
    const targetScroll = Math.max(0, centerY - element.clientHeight / 2);
    element.scrollTo({ top: targetScroll, behavior: 'smooth' });
    return itemIndex;
  };

  const handleDateScroll = (e) => {
    // Don't update selectedDate until scroll positions have been initialized
    // This prevents the initial scroll position (0) from overwriting the correct date
    if (!scrollPositionsSet.current) {
      return;
    }
    
    hasScrolled.current = true;
    const index = nearestItemIndex(e.target, dateOptions.length - 1);
    if (index < 0) return;
    
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
    // Don't update until scroll positions have been initialized
    if (!scrollPositionsSet.current) {
      return;
    }
    
    const index = snapToCenter(e.target, dateOptions.length - 1);
    if (index >= 0 && index < dateOptions.length) {
      const newDate = new Date(dateOptions[index]);
      newDate.setHours(selectedHour, selectedMinute, 0, 0);
      setSelectedDate(newDate);
    }
  };

  const handleHourScroll = (e) => {
    if (!scrollPositionsSet.current) {
      return;
    }
    hasScrolled.current = true;
    const index = nearestItemIndex(e.target, 23);
    if (index < 0) return;
    
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
    if (!scrollPositionsSet.current) {
      return;
    }
    const index = snapToCenter(e.target, 23);
    if (index >= 0 && index < hourOptions.length) {
      // Wait for scroll animation to complete, then update
      setTimeout(() => {
        const finalIndex = nearestItemIndex(e.target, 23);
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
    if (!scrollPositionsSet.current) {
      return;
    }
    hasScrolled.current = true;
    const index = nearestItemIndex(e.target, 59);
    if (index < 0) return;
    
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
    if (!scrollPositionsSet.current) {
      return;
    }
    const index = snapToCenter(e.target, 59);
    if (index >= 0 && index < minuteOptions.length) {
      // Wait for scroll animation to complete, then update
      setTimeout(() => {
        const finalIndex = nearestItemIndex(e.target, 59);
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
          <div className="datetime-picker-selection-indicator" aria-hidden />
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
