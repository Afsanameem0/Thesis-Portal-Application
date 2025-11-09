import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const FloatingMessageNotification = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [latestSender, setLatestSender] = useState(null);

  // Listen for new messages via Socket.io
  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (message) => {
        // Only show notification if message is from someone else
        if (message.sender._id !== user._id) {
          setLatestSender(message.sender);
          setShowNotification(true);
          setNotificationCount(prev => prev + 1);
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
            setShowNotification(false);
            setNotificationCount(0);
          }, 5000);
        }
      });

      return () => {
        socket.off('newMessage');
      };
    }
  }, [socket, user]);

  // Clear notification when navigating to messages page
  useEffect(() => {
    if (location.pathname === '/messages') {
      setShowNotification(false);
      setNotificationCount(0);
    }
  }, [location.pathname]);

  // Handle notification click
  const handleNotificationClick = () => {
    setShowNotification(false);
    setNotificationCount(0);
    navigate('/messages');
  };

  // Handle dismiss
  const handleDismiss = (e) => {
    e.stopPropagation();
    setShowNotification(false);
    setNotificationCount(0);
  };

  // Don't show if no notifications or user not authenticated
  if (!showNotification || notificationCount === 0 || !user) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[10000] animate-bounce">
      <div 
        onClick={handleNotificationClick}
        className="bg-white text-gray-800 rounded-lg shadow-2xl cursor-pointer transform hover:scale-105 transition-all duration-300 relative group border border-gray-200"
      >
        {/* Main notification card */}
        <div className="w-20 h-12 flex items-center justify-center rounded-lg shadow-lg relative">
          <div className="text-center relative z-10">
            <svg className="w-5 h-5 mx-auto mb-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
            </svg>
          </div>
          
          {/* Red notification badge */}
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg border-2 border-white">
            {notificationCount}
            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></div>
          </div>
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-48 shadow-lg">
          <div className="font-semibold">
            {notificationCount} new message{notificationCount > 1 ? 's' : ''}
          </div>
          {latestSender && (
            <div className="text-gray-300 mt-1">
              Latest from {latestSender.name}
            </div>
          )}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs transition-colors duration-200 shadow-md"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default FloatingMessageNotification; 