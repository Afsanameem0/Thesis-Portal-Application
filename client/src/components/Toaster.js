import React, { createContext, useContext, useState, useCallback } from 'react';
import '../css/Toaster.css';

const ToasterContext = createContext();

export const useToaster = () => {
  const context = useContext(ToasterContext);
  if (!context) {
    throw new Error('useToaster must be used within a ToasterProvider');
  }
  return context;
};

export const ToasterProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);

    return id;
  });

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  });

  const showSuccess = useCallback((message, duration) => {
    return showToast(message, 'success', duration);
  });

  const showError = useCallback((message, duration) => {
    return showToast(message, 'error', duration);
  });

  const showInfo = useCallback((message, duration) => {
    return showToast(message, 'info', duration);
  });

  const showWarning = useCallback((message, duration) => {
    return showToast(message, 'warning', duration);
  });

  return (
    <ToasterContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning, removeToast }}>
      {children}
      <ToasterContainer toasts={toasts} removeToast={removeToast} />
    </ToasterContext.Provider>
  );
};

const ToasterContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toaster-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

const Toast = ({ toast, onRemove }) => {
  const { id, message, type } = toast;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button 
        className="toast-close" 
        onClick={() => onRemove(id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}; 