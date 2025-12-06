import { useState } from 'react';
import DateTimePicker from './DateTimePicker';
import './TimeInput.css';

function TimeInputPicker({ value, onChange, className = '', id, label }) {
  const [showPicker, setShowPicker] = useState(false);

  const handleInputClick = () => {
    setShowPicker(true);
  };

  const handlePickerChange = (newValue) => {
    onChange({ target: { value: newValue } });
    setShowPicker(false);
  };

  const handlePickerClose = () => {
    setShowPicker(false);
  };

  // Format value for display
  const formatDisplayValue = (val) => {
    if (!val) return '';
    try {
      // Handle both datetime-local format (YYYY-MM-DDTHH:mm) and ISO strings
      const date = new Date(val);
      if (isNaN(date.getTime())) return val;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return val;
    }
  };

  return (
    <>
      <input
        type="text"
        id={id}
        className={`time-input ${className}`}
        value={formatDisplayValue(value)}
        onChange={() => {}} // Read-only, only opens picker
        onClick={handleInputClick}
        readOnly
        placeholder="Select date and time"
      />
      {showPicker && (
        <DateTimePicker
          value={value}
          onChange={handlePickerChange}
          onClose={handlePickerClose}
          title={label || 'Select time'}
        />
      )}
    </>
  );
}

export default TimeInputPicker;
