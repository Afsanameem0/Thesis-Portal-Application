import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  getUnreadCount, 
  deleteNotification,
  clearAllNotifications
} from '../controllers/notificationController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(auth);

// Get all notifications for the current user
router.get('/', getNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', markAllAsRead);

// Delete notification
router.delete('/:notificationId', deleteNotification);

// Clear all notifications
router.delete('/', clearAllNotifications);



export default router; 