import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Navbar = () => {
  const { isAuthenticated, user, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Check for notifications and messages
  useEffect(() => {
    if (isAuthenticated && user) {
      checkUnreadNotifications();
      checkUnreadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Listen for notification and message events
  useEffect(() => {
    const handleNotificationCleared = () => {
      setUnreadNotifications(0);
    };

    const handleNotificationUpdate = () => {
      checkUnreadNotifications();
    };

    const handleMessageUpdate = () => {
      checkUnreadMessages();
    };

    window.addEventListener('notificationsCleared', handleNotificationCleared);
    window.addEventListener('notificationUpdate', handleNotificationUpdate);
    window.addEventListener('messageUpdate', handleMessageUpdate);

    return () => {
      window.removeEventListener('notificationsCleared', handleNotificationCleared);
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
      window.removeEventListener('messageUpdate', handleMessageUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUnreadNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUnreadNotifications(response.data.count);
    } catch (error) {
      console.error('Error checking unread notifications:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      setUnreadNotifications(0);
    }
  };

  const checkUnreadMessages = async () => {
    try {
      const response = await axios.get('/api/messages/unread-count', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUnreadMessages(response.data.count);
    } catch (error) {
      console.error('Error checking unread messages:', error);
      setUnreadMessages(0);
    }
  };

  // Removed modal functionality - notifications now redirect to page

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative dropdown-container">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="hover:text-blue-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Menu
                  <svg className={`ml-2 h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute left-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-4 z-50 border-2 border-black transform transition-all duration-200 ease-out">
                    <div className="px-3 py-2 mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</p>
                    </div>
                    
                    {/* Hide Dashboard for admin users */}
                    {user?.role !== 'admin' && (
                      <div className="mx-3 mb-2">
                        <Link
                          to="/dashboard"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            refreshUserData();
                          }}
                        >
                          <svg className="w-4 h-4 mr-3 text-blue-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                          </svg>
                          <span className="font-medium">Dashboard</span>
                        </Link>
                      </div>
                    )}
                    
                    {user?.role === 'student' && (
                      <>
                        <div className="mx-3 mb-2">
                          <Link
                            to="/create-post"
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <svg className="w-4 h-4 mr-3 text-indigo-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="font-medium">Create Post</span>
                          </Link>
                        </div>
            
                        <div className="mx-3 mb-2">
                          <Link
                            to="/posts"
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <svg className="w-4 h-4 mr-3 text-pink-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                            </svg>
                            <span className="font-medium">Posts Feed</span>
                          </Link>
                        </div>
                        <div className="mx-3 mb-2">
                          <Link
                            to="/faculty"
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <svg className="w-4 h-4 mr-3 text-green-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-medium">Supervisor/Co-supervisor</span>
                          </Link>
                        </div>
                      </>
                    )}
                    
                    {user?.role === 'faculty' && (
                      <div className="mx-3 mb-2">
                        <Link
                          to="/upload-paper"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg className="w-4 h-4 mr-3 text-green-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="font-medium">Upload Paper</span>
                        </Link>
                      </div>
                    )}
                    
                    {(user?.role === 'student' || user?.role === 'faculty') && (
                      <div className="mx-3 mb-2">
                        <Link
                          to="/marks"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg className="w-4 h-4 mr-3 text-purple-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="font-medium">Marks</span>
                        </Link>
                      </div>
                    )}
                    
                    {(user?.role === 'student' || user?.role === 'faculty') && (
                      <div className="mx-3 mb-2">
                        <Link
                          to="/messages"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg className="w-4 h-4 mr-3 text-cyan-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                          </svg>
                          <span className="font-medium">Messages</span>
                          {unreadMessages > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-white relative">
                              {unreadMessages}
                              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></div>
                            </span>
                          )}
                        </Link>
                      </div>
                    )}
                    
                    {user?.role === 'admin' && (
                      <div className="mx-3 mb-2">
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg className="w-4 h-4 mr-3 text-red-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">Admin Panel</span>
                        </Link>
                      </div>
                    )}
                    
                    
                    <div className="border-t border-gray-100 my-3"></div>
                    
                    <div className="mx-3 mb-2">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-all duration-200 group rounded-lg border border-gray-300 hover:border-blue-500 bg-gray-50 hover:shadow-md"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <svg className="w-4 h-4 mr-3 text-orange-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">Profile</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/" className="hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium">
                <h1 className="text-xl font-bold">Academic Thesis Portal</h1>
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {/* Hide Browse Thesis for admin users */}
            {user?.role !== 'admin' && (
              <>
                <Link to="/theses" className="hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium">
                  Browse Thesis
                </Link>
                {user?.role === 'student' && (
                  <Link to="/feedbacks" className="hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium">
                    Review & Ratings
                  </Link>
                )}
              </>
            )}
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                {/* Hide Notifications for admin users */}
                {user?.role !== 'admin' && (
                  <div className="hidden md:flex items-center space-x-4">
                    <Link 
                      to="/notifications" 
                      className="relative hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Notifications
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>
                  </div>
                )}
                
                <span className="text-sm">Welcome, {user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="bg-white text-red-500 hover:bg-red-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="bg-blue-500 hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-500 hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Notification Button */}
            {isAuthenticated && user?.role !== 'admin' && (
              <div className="relative">
                <Link
                  to="/notifications"
                  className="relative hover:text-blue-200 p-2 rounded-md text-sm font-medium transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
              </div>
            )}
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-blue-200 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-blue-700">
            {/* Hide Browse Thesis for admin users in mobile */}
            {user?.role !== 'admin' && (
              <Link
                to="/theses"
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Browse Thesis
              </Link>
            )}
            
            {isAuthenticated ? (
              <>
                {/* Mobile Dropdown Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="block w-full text-left px-3 py-3 rounded-lg text-base font-medium hover:text-blue-200 hover:bg-blue-600 flex items-center justify-between transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      Menu
                    </div>
                    <svg className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="mt-2 ml-4 space-y-1 bg-blue-800 rounded-lg p-2 border-2 border-black">
                      <div className="px-3 py-1 mb-2 border-b border-blue-600">
                        <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Navigation</p>
                      </div>
                      
                      {/* Hide Dashboard for admin users in mobile */}
                      {user?.role !== 'admin' && (
                        <Link
                          to="/dashboard"
                          className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDropdownOpen(false);
                            refreshUserData();
                          }}
                        >
                          <svg className="w-4 h-4 mr-3 text-blue-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                          </svg>
                          <span>Dashboard</span>
                        </Link>
                      )}
                      
                      {user?.role === 'student' && (
                        <>
                          <Link
                            to="/create-post"
                            className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <svg className="w-4 h-4 mr-3 text-indigo-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Create Post</span>
                          </Link>
                          <Link
                            to="/posts"
                            className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <svg className="w-4 h-4 mr-3 text-pink-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                            </svg>
                            <span>Posts Feed</span>
                          </Link>
                          <Link
                            to="/faculty"
                            className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <svg className="w-4 h-4 mr-3 text-green-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>Supervisor/Co-supervisor</span>
                          </Link>
                        </>
                      )}
                      
                      {(user?.role === 'student' || user?.role === 'faculty') && (
                        <Link
                          to="/marks"
                          className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <svg className="w-4 h-4 mr-3 text-purple-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Marks</span>
                        </Link>
                      )}
                      
                      {(user?.role === 'student' || user?.role === 'faculty') && (
                        <Link
                          to="/messages"
                          className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <svg className="w-4 h-4 mr-3 text-cyan-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                          </svg>
                          <span>Messages</span>
                          {unreadMessages > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-white relative">
                              {unreadMessages}
                              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></div>
                            </span>
                          )}
                        </Link>
                      )}
                      
                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <svg className="w-4 h-4 mr-3 text-red-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      
                      {user?.role === 'student' && (
                        <Link
                          to="/create-thesis"
                          className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <svg className="w-4 h-4 mr-3 text-yellow-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Submit Thesis</span>
                        </Link>
                      )}
                      
                      {user?.role === 'faculty' && (
                        <Link
                          to="/upload-paper"
                          className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <svg className="w-4 h-4 mr-3 text-green-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Upload Paper</span>
                        </Link>
                      )}
                      
                      <div className="border-t border-blue-600 my-2"></div>
                      
                      <Link
                        to="/profile"
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 group mx-2 border border-blue-600 hover:border-blue-500"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <svg className="w-4 h-4 mr-3 text-orange-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile</span>
                      </Link>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 text-sm">Welcome, {user?.name}</div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-red-500 hover:bg-red-600"
                >
                  Logout 
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium bg-blue-500 hover:bg-blue-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium bg-green-500 hover:bg-green-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Removed Notification Modal - redirecting to page instead */}
    </nav>
  );
};

export default Navbar; 