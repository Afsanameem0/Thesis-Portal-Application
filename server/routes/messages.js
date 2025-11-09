import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
  getUnreadCount,
  startConversation,
  searchUsers
} from '../controllers/messageController.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get all conversations for the current user
router.get('/conversations', getConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', getMessages);

// Send a new message
router.post('/send', sendMessage);

// Mark conversation as read
router.put('/conversations/:conversationId/read', markConversationAsRead);

// Get unread message count
router.get('/unread-count', getUnreadCount);

// Start a new conversation
router.get('/start/:userId', startConversation);

// Search users for messaging
router.get('/search-users', searchUsers);

export default router; 