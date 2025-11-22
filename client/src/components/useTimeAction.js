import { useState, useEffect } from 'react';
import { API_URL } from '../constants/constants';

export function useTimeAction({ actionType, lastAction, profile, userId, userEmoji, onSuccess, onClose }) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const getLocalDateTime = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19);
  };

  useEffect(() => {
    if (lastAction && !lastAction.details?.endTime) {
      setIsStarting(false);
      setEndTime(getLocalDateTime());
      if (lastAction.details?.startTime) {
        const startDate = new Date(lastAction.details.startTime);
        const localStartDateTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 19);
        setStartTime(localStartDateTime);
      }
    } else {
      setIsStarting(true);
      setStartTime(getLocalDateTime());
      setEndTime('');
    }
  }, [lastAction]);

  const handleError = async (response, defaultMessage) => {
    let errorMessage = defaultMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // If we can't parse the error, use the default message
    }
    throw new Error(errorMessage);
  };

  const handleStart = async () => {
    if (!startTime) {
      setError('Please set a start time');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_URL}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          babyProfileId: profile?.id,
          userId: userId,
          actionType: actionType,
          details: {
            startTime: new Date(startTime).toISOString(),
            endTime: null,
          },
          userEmoji: userEmoji || null,
        }),
      });

      if (!response.ok) {
        await handleError(response, `Failed to save ${actionType} action (${response.status})`);
      }

      const data = await response.json();
      if (onSuccess) onSuccess(data.action);
      onClose();
    } catch (err) {
      console.error(`Error saving ${actionType} action:`, err);
      setError(err.message || `Failed to save ${actionType} action`);
    } finally {
      setSaving(false);
    }
  };

  const handleEnd = async (additionalDetails = {}) => {
    if (!startTime || !endTime) {
      setError('Please set both start and end times');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      setError('End time must be after start time');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const details = {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        endUserId: userId,
        endUserEmoji: userEmoji || null,
        ...additionalDetails,
      };

      if (lastAction && lastAction.id && !lastAction.details?.endTime) {
        const response = await fetch(`${API_URL}/actions/${lastAction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ details }),
        });

        if (!response.ok) {
          await handleError(response, `Failed to update ${actionType} action (${response.status})`);
        }

        const data = await response.json();
        if (onSuccess) onSuccess(data.action);
      } else {
        const response = await fetch(`${API_URL}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            babyProfileId: profile?.id,
            userId: userId,
            actionType: actionType,
            details: details,
            userEmoji: userEmoji || null,
          }),
        });

        if (!response.ok) {
          await handleError(response, `Failed to save ${actionType} action (${response.status})`);
        }

        const data = await response.json();
        if (onSuccess) onSuccess(data.action);
      }

      onClose();
    } catch (err) {
      console.error(`Error saving ${actionType} action:`, err);
      setError(err.message || `Failed to save ${actionType} action`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!lastAction || !lastAction.id) {
      setError(`No ongoing ${actionType} to cancel`);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_URL}/actions/${lastAction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        await handleError(response, `Failed to cancel ${actionType} action (${response.status})`);
      }

      if (onSuccess) onSuccess(null);
      onClose();
    } catch (err) {
      console.error(`Error canceling ${actionType} action:`, err);
      setError(err.message || `Failed to cancel ${actionType} action`);
    } finally {
      setSaving(false);
    }
  };

  return {
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    saving,
    error,
    isStarting,
    handleStart,
    handleEnd,
    handleCancel,
  };
}

