import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const useSessionTimeout = (timeoutMinutes = 1, warningMinutes = 2) => {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const intervalRef = useRef(null);

  const resetTimeout = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setShowWarning(false);
    
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;
    
    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeLeft(warningMinutes * 60);
      
      // Start countdown
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Show session expired toast
            window.dispatchEvent(new CustomEvent('showToast', { 
              detail: { message: 'Your session has expired due to inactivity.', type: 'warning' } 
            }));
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningMs);
    
    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);
  }, [logout, timeoutMinutes, warningMinutes]);

  const extendSession = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimeoutHandler = () => {
      if (!showWarning) {
        resetTimeout();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimeoutHandler, true);
    });

    // Initial timeout
    resetTimeout();

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, resetTimeoutHandler, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetTimeout, showWarning]);

  return {
    showWarning,
    timeLeft,
    extendSession
  };
};

export default useSessionTimeout; 