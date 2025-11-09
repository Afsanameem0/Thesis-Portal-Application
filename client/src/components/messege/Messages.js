import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useLocation } from 'react-router-dom';

const Messages = () => {
  const { user } = useAuth();
  const { socket, sendMessage: sendSocketMessage } = useSocket();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messageNotification, setMessageNotification] = useState(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const conversationStartedRef = useRef(false);
  const [startingConversation, setStartingConversation] = useState(false);

  // Debug: Log when notification popup state changes
  useEffect(() => {
    // console.log('Notification popup state changed:', showNotificationPopup);
    // console.log('Notification data:', messageNotification);
  }, [showNotificationPopup, messageNotification]);

  // Get auth token
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to message input box
  const scrollToMessageInput = () => {
    setTimeout(() => {
      messageInputRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest' 
      });
      // Focus on the input field for better UX
      const inputElement = messageInputRef.current?.querySelector('input');
      if (inputElement) {
        inputElement.focus();
      }
    }, 100); // Small delay to ensure UI has updated
  };



  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/messages/conversations', {
        headers: getAuthHeaders()
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;
    
    setMessageLoading(true);
    try {
      const response = await axios.get(`/api/messages/conversations/${conversationId}/messages`, {
        headers: getAuthHeaders()
      });
      setMessages(response.data.messages);
      
      // Mark conversation as read
      await axios.put(`/api/messages/conversations/${conversationId}/read`, {}, {
        headers: getAuthHeaders()
      });
      
      // Trigger message update event for navbar
      window.dispatchEvent(new CustomEvent('messageUpdate'));
      
      // Update conversations to reflect read status
      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessageLoading(false);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    let cleanedMessage = newMessage.trim();
    const userName = user?.name;
    
    if (userName) {
      // Check if the message starts with the user's name (with optional colon)
      const namePattern = new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`, 'i');
      if (namePattern.test(cleanedMessage)) {
        cleanedMessage = cleanedMessage.replace(namePattern, '').trim();
      }
      
      // Additional check for name anywhere in the message
      if (cleanedMessage.toLowerCase().includes(userName.toLowerCase())) {
        alert('Please don\'t include your name in the message. Your name will be displayed automatically.');
        return;
      }
      
      // If after cleaning, the message is empty or too short, ask for more content
      if (cleanedMessage.length < 1) {
        alert('Please write a meaningful message without including your name.');
        return;
      }
    }

    setSendingMessage(true);
    const messageContent = cleanedMessage;
    const receiverId = selectedConversation.otherUser._id;
    
    try {
      const response = await axios.post('/api/messages/send', {
        receiverId,
        content: messageContent
      }, {
        headers: getAuthHeaders()
      });

      // Add message to current messages
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
      // If this was a new chat, remove the flag since we now have a message
      if (selectedConversation?.isNewChat) {
        setSelectedConversation(prev => ({ ...prev, isNewChat: false }));
        // Update the conversation in the list too
        setConversations(prev => prev.map(conv => 
          conv.conversationId === selectedConversation.conversationId 
            ? { ...conv, isNewChat: false }
            : conv
        ));
      }
      
      // Send real-time message via Socket.io
      if (socket) {
        sendSocketMessage(receiverId, response.data);
      }
      
      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await axios.get(`/api/messages/search-users?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      });
      
      setSearchResults(response.data);
    } catch (error) {
      
      if (error.response?.status === 404) {
        setSearchResults([]);
      } else if (error.response?.status === 401) {
        setSearchResults([]);
      } else {
        console.error('Error searching users:', error);
        setSearchResults([]);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Start conversation with user
  const startConversation = async (userId) => {
    if (startingConversation) {
      return;
    }
    
    setStartingConversation(true);
    try {
      const response = await axios.get(`/api/messages/start/${userId}`, {
        headers: getAuthHeaders()
      });
      
      const { conversationId, otherUser } = response.data;
      
      // Create a fresh conversation entry for new chat
      const newConversation = {
        conversationId,
        otherUser,
        lastMessage: null,
        unreadCount: 0,
        isNewChat: true // Flag to indicate this is a fresh start
      };
      
      // Check if conversation already exists in our list
      let existingConv = conversations.find(conv => conv.conversationId === conversationId);
      
      if (!existingConv) {
        // Add new conversation to the top of the list
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversation(newConversation);
      } else {
        // Update existing conversation but mark as new chat
        const updatedConv = { ...existingConv, isNewChat: true };
        setConversations(prev => prev.map(conv => 
          conv.conversationId === conversationId ? updatedConv : conv
        ));
        setSelectedConversation(updatedConv);
      }
      
      // Clear search interface
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // Start with empty messages for new chat experience
      setMessages([]);
      setMessageLoading(false);
      
      // Don't fetch previous messages to maintain "new chat" experience
      // User can see previous messages if they select the conversation from sidebar later
      
      // Scroll to message input box for new conversation
      scrollToMessageInput();
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      setStatusMessage('Failed to start conversation. Please try again.');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setStartingConversation(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Load conversations on component mount
  useEffect(() => {
    fetchConversations();
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        // console.log('Notification permission:', permission);
      });
    }
    
    // Cleanup function to reset ref when component unmounts
    return () => {
      conversationStartedRef.current = false;
    };
  }, []);



  // Socket.io event listeners
  useEffect(() => {
    if (socket) {
      // Listen for new messages
      socket.on('receive_message', (message) => {
        
        // Show popup notification if message is not from current user
        if (message.sender._id !== user.id) {
          setMessageNotification({
            id: Date.now(),
            senderName: message.sender.name,
            senderImage: message.sender.profileImage,
            content: message.content,
            timestamp: message.timestamp
          });
          setShowNotificationPopup(true);
          
          // Also show browser notification
          if (Notification.permission === 'granted') {
            new Notification(`New message from ${message.sender.name}`, {
              body: message.content,
              icon: message.sender.profileImage || '/favicon.ico'
            });
          }
          
          // Auto hide popup after 5 seconds
          setTimeout(() => {
            setShowNotificationPopup(false);
          }, 5000);
        } else {
        }
        
        // Add message to current conversation if it matches
        if (selectedConversation && 
            (message.sender._id === selectedConversation.otherUser._id || 
             message.receiver._id === selectedConversation.otherUser._id)) {
          setMessages(prev => [...prev, message]);
        } else {
        }
        
        // Refresh conversations to update last message and unread count
        fetchConversations();
        
        // Trigger message update event for navbar
        window.dispatchEvent(new CustomEvent('messageUpdate'));
      });

      // Listen for typing indicators
      socket.on('user_typing', ({ isTyping: userIsTyping }) => {
        setIsTyping(userIsTyping);
        
        // Clear typing indicator after 3 seconds
        if (userIsTyping) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      });

      // Cleanup listeners
      return () => {
        socket.off('receive_message');
        socket.off('user_typing');
      };
    }
  }, [socket, selectedConversation]);

  // Handle navigation from faculty list
  useEffect(() => {
    if (location.state?.startConversation) {
      const { conversationId, otherUser } = location.state.startConversation;
      
      // Check if conversation already exists in our list
      let existingConv = conversations.find(conv => conv.conversationId === conversationId);
      
      if (!existingConv) {
        // Create a new conversation entry
        existingConv = {
          conversationId,
          otherUser,
          lastMessage: null,
          unreadCount: 0
        };
        setConversations(prev => [existingConv, ...prev]);
      }
      
      // Select this conversation
      setSelectedConversation(existingConv);
      fetchMessages(conversationId);
      
      // Scroll to message input box
      scrollToMessageInput();
      
      // Clear the state to prevent repeated triggers
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state]);

  // Handle navigation from post card (send message button)
  useEffect(() => {
    if (location.state?.selectedUserId && location.state?.selectedUserName && !conversationStartedRef.current && !startingConversation) {
      const { selectedUserId, selectedUserName } = location.state;
      
      // Mark as started to prevent infinite loop
      conversationStartedRef.current = true;
      
      // Show status message
      setStatusMessage(`Starting conversation with ${selectedUserName}...`);
      
      // Start conversation with the selected user
      startConversation(selectedUserId);
      
      // Clear status message after a delay
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
      
      // Clear the state to prevent repeated triggers
      window.history.replaceState({}, '', location.pathname);
      
      // Reset the ref after a delay to allow future navigation
      setTimeout(() => {
        conversationStartedRef.current = false;
      }, 1000);
    }
  }, [location.state, startingConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);





  // Handle search with debouncing
  useEffect(() => {
    if (!showSearch) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchQuery, showSearch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Messages</h3>
          <p className="text-gray-500">Please wait while we set up your messaging experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Message Notification Popup */}
      {showNotificationPopup && messageNotification && (
        <div className="fixed top-4 right-4 z-[9999] animate-bounce" style={{ zIndex: 9999 }}>
          <div className="bg-white border border-gray-200 rounded-full shadow-2xl max-w-sm w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-white rounded-t-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                  </svg>
                  <span className="font-semibold text-sm">New Message</span>
                </div>
                <button
                  onClick={() => setShowNotificationPopup(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  {messageNotification.senderImage ? (
                    <img
                      src={messageNotification.senderImage}
                      alt={messageNotification.senderName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-black text-sm mb-1">
                    {messageNotification.senderName}
                  </div>
                  <div className="text-black text-sm truncate">
                    {messageNotification.content}
                  </div>
                  <div className="text-xs text-black mt-1">
                    {new Date(messageNotification.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 rounded-b-full">
              <button
                onClick={() => setShowNotificationPopup(false)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chat here..</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                fetchConversations();
                if (selectedConversation && selectedConversation.conversationId) {
                  fetchMessages(selectedConversation.conversationId);
                }
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-blue-100 rounded-lg transition-all duration-200 flex items-center space-x-2"
              title="Manual refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Now</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">{statusMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Separator Line */}
        <div className="mb-8">
          <div className="h-px bg-black"></div>
        </div>
        
        <div className="w-full h-[75vh] flex bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white flex flex-col">
        {/* Header */}
        <div className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black">Messages</h2>
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) {
                  // Clear search when opening
                  setSearchQuery('');
                  setSearchResults([]);
                }
              }}
              className={`p-3 text-black hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-200 transform hover:scale-105 ${showSearch ? 'bg-gray-100' : ''}`}
              title="Start new conversation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          
          {/* Search Box */}
          {showSearch && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search users to message..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                onFocus={() => {
                  // Search again when focused if there's a query
                  if (searchQuery && searchQuery.length >= 2) {
                    searchUsers(searchQuery);
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl placeholder-gray-500 text-black focus:ring-2 focus:ring-gray-300 focus:border-gray-400 focus:outline-none transition-all duration-200"
                autoFocus
              />
              <div className="absolute right-4 top-3.5">
                {searchLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {showSearch && (
          <div className="bg-white max-h-48 overflow-y-auto border-t border-gray-200">
            {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 ? (
              <div className="p-4 text-center text-black">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">No users found</p>
                <p className="text-xs text-black">Try a different search term</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="p-3 text-xs font-semibold text-black uppercase tracking-wider bg-gray-50/80">
                  Search Results ({searchResults.length})
                </div>
                {searchResults.map(user => (
                  <div
                    key={user._id}
                    onClick={() => {
                      startConversation(user._id);
                    }}
                    className="px-4 py-4 cursor-pointer flex items-center hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 transition-all duration-200 border-b border-gray-100/50 group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-4 ring-2 ring-white shadow-md group-hover:scale-105 transition-transform duration-200">
                      {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-black group-hover:text-blue-700 transition-colors duration-200">{user.name}</div>
                      <div className="text-sm text-black">{user.role} • {user.department}</div>
                    </div>
                  </div>
                ))}
              </>
            ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
              <div className="p-4 text-center text-black">
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {conversations.length === 0 ? (
            <div className="p-12 text-center text-black">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-black mb-2">No conversations yet</p>
              <p className="text-sm text-black">Click the + button to start messaging</p>
            </div>
          ) : (
            conversations.map(conversation => (
              <div
                key={conversation.conversationId}
                onClick={() => {
                  // Remove new chat flag when selecting from sidebar
                  const normalConversation = { ...conversation, isNewChat: false };
                  setSelectedConversation(normalConversation);
                  fetchMessages(conversation.conversationId);
                  setShowSearch(false);
                  
                  // Update conversation in list to remove new chat flag
                  setConversations(prev => prev.map(conv => 
                    conv.conversationId === conversation.conversationId 
                      ? normalConversation
                      : conv
                  ));
                  
                  // Scroll to message input box
                  scrollToMessageInput();
                }}
                className={`px-6 py-4 cursor-pointer flex items-center border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 group ${
                  selectedConversation?.conversationId === conversation.conversationId 
                    ? 'bg-gray-100 border-l-4 border-l-black' 
                    : ''
                }`}
              >
                <div className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200">
                  {conversation.otherUser?.profileImage ? (
                    <img
                      src={conversation.otherUser.profileImage}
                      alt={conversation.otherUser.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-black truncate group-hover:text-gray-700 transition-colors duration-200">
                      {conversation.otherUser?.name}
                      <span className="text-xs text-gray-600 ml-2 font-normal">
                        ({conversation.otherUser?.role})
                      </span>
                    </div>
                    {conversation.lastMessage && (
                      <div className="text-xs text-black ml-2 font-medium">
                        {formatTime(conversation.lastMessage.timestamp)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-black truncate">
                      {conversation.isNewChat ? (
                        <span className="text-blue-600 italic font-medium">Click to start new chat</span>
                      ) : conversation.lastMessage ? (
                        <span className={conversation.lastMessage.isFromMe ? 'text-black' : 'font-medium text-black'}>
                          {conversation.lastMessage.isFromMe && 'You: '}
                          {conversation.lastMessage.content}
                        </span>
                      ) : (
                        <span className="text-black italic">No messages yet</span>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2.5 py-1 ml-2 font-bold">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-white border-l border-black">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center mr-4">
                  {selectedConversation.otherUser?.profileImage ? (
                    <img
                      src={selectedConversation.otherUser.profileImage}
                      alt={selectedConversation.otherUser.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-bold text-xl text-black">{selectedConversation.otherUser?.name}</div>
                  <div className="text-gray-600 text-sm">{selectedConversation.otherUser?.role} • {selectedConversation.otherUser?.department}</div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {messageLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-gray-600"></div>
                    <span className="text-black font-medium">Loading messages...</span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                      </svg>
                    </div>
                    {selectedConversation?.isNewChat ? (
                      <>
                        <p className="text-xl font-semibold text-black mb-2">Start New Chat</p>
                        <p className="text-gray-600">You're starting a fresh conversation with {selectedConversation.otherUser?.name}!</p>
                        <p className="text-gray-500 text-sm mt-2">Type your first message below to begin chatting.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-semibold text-black mb-2">No messages yet</p>
                        <p className="text-gray-600">Start the conversation and share your thoughts!</p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={message._id}>
                      {/* Message Container */}
                      <div className={`flex ${String(message.sender._id) === String(user.id) ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className={`max-w-lg px-4 py-3 rounded-lg ${
                          String(message.sender._id) === String(user.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-black'
                        }`}>
                          {/* Sender name */}
                          <div className={`text-xs font-semibold mb-1 ${
                            String(message.sender._id) === String(user.id) ? 'text-blue-100' : 'text-gray-600'
                          }`}>
                            {String(message.sender._id) === String(user.id) ? 'You' : message.sender.name}
                          </div>
                          
                          <div className={`break-words text-sm leading-relaxed mb-1 ${
                            String(message.sender._id) === String(user.id) ? 'text-white' : 'text-black'
                          }`}>{message.content}</div>
                          <div className={`text-xs ${
                            String(message.sender._id) === String(user.id) ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="mt-4">
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg max-w-xs">
                      <div className="flex space-x-1 mb-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <div className="text-xs text-gray-600">typing...</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form ref={messageInputRef} onSubmit={sendMessage} className="p-6 bg-white border-t border-gray-200">
              <div className="flex gap-3 items-end w-full">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      
                      // Send typing indicator
                      if (socket && selectedConversation) {
                        socket.emit('typing', {
                          receiverId: selectedConversation.otherUser._id,
                          isTyping: e.target.value.length > 0
                        });
                      }
                    }}
                    placeholder="Type your message..."
                    className="w-full border border-gray-300 rounded-lg px-6 py-4 text-base focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all duration-200 resize-none outline-none bg-white"
                    disabled={sendingMessage}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center text-gray-600 max-w-lg mx-auto p-12">
              <div className="w-32 h-32 mx-auto mb-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-black mb-4">Welcome to Messages</h3>
              <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                Select a conversation from the sidebar to start messaging.
              </p>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
};

export default Messages; 