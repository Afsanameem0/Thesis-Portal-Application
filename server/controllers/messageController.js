import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Get all conversations for the current user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get all unique conversations where the user is either sender or receiver
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { receiver: userObjectId }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', userObjectId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    // Populate user information for each conversation
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = conv.lastMessage;
        const otherUserId = lastMessage.sender.toString() === userId ? lastMessage.receiver : lastMessage.sender;
        const otherUser = await User.findById(otherUserId).select('name email profileImage role department');
        
        return {
          conversationId: conv._id,
          otherUser,
          lastMessage: {
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
            isFromMe: lastMessage.sender.toString() === userId
          },
          unreadCount: conv.unreadCount
        };
      })
    );

    res.json(populatedConversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ message: 'Error retrieving conversations' });
  }
};

// Get messages for a specific conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is part of this conversation
    const userInConversation = await Message.findOne({
      conversationId,
      $or: [
        { sender: userObjectId },
        { receiver: userObjectId }
      ]
    });

    if (!userInConversation) {
      return res.status(403).json({ message: 'Unauthorized access to conversation' });
    }

    // Get messages with pagination
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name profileImage')
      .populate('receiver', 'name profileImage')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // Reverse to show oldest first
    messages.reverse();

    // Mark unread messages as read for the current user
    await Message.updateMany(
      {
        conversationId,
        receiver: userObjectId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      messages,
      page,
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ message: 'Error retrieving messages' });
  }
};

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    let cleanedContent = content.trim();
    const userName = req.user.name;
    
    if (userName) {
      // Check if the message starts with the user's name (with optional colon)
      const namePattern = new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`, 'i');
      if (namePattern.test(cleanedContent)) {
        cleanedContent = cleanedContent.replace(namePattern, '').trim();
      }
      
      // Additional check for name anywhere in the cleaned message
      if (cleanedContent.toLowerCase().includes(userName.toLowerCase())) {
        return res.status(400).json({ message: 'Please don\'t include your name in the message. Your name will be displayed automatically.' });
      }
      
      // If after cleaning, the message is empty or too short
      if (cleanedContent.length < 1) {
        return res.status(400).json({ message: 'Please write a meaningful message without including your name.' });
      }
    }

    // Verify receiver exists and is not admin
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    if (receiver.role === 'admin') {
      return res.status(403).json({ message: 'Cannot send messages to admin users' });
    }

    // Create conversation ID
    const conversationId = Message.createConversationId(senderId, receiverId);

    // Create and save the message
    const message = new Message({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      content: cleanedContent
    });

    await message.save();

    // Populate sender and receiver info for response
    await message.populate('sender', 'name profileImage');
    await message.populate('receiver', 'name profileImage');

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

// Mark conversation as read
export const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Mark all unread messages in the conversation as read for the current user
    const result = await Message.updateMany(
      {
        conversationId,
        receiver: userObjectId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ 
      message: 'Conversation marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ message: 'Error marking conversation as read' });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const unreadCount = await Message.countDocuments({
      receiver: userObjectId,
      isRead: false
    });

    res.json({ count: unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Error getting unread count' });
  }
};

// Start a new conversation (for messaging button in profiles)
export const startConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (currentUserId === userId) {
      return res.status(400).json({ message: 'Cannot start conversation with yourself' });
    }

    // Verify the other user exists and is not admin
    const otherUser = await User.findById(userId).select('name email profileImage role department');
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (otherUser.role === 'admin') {
      return res.status(403).json({ message: 'Cannot message admin users' });
    }

    // Create conversation ID
    const conversationId = Message.createConversationId(currentUserId, userId);

    // Check if conversation already exists
    const existingMessage = await Message.findOne({ conversationId });

    res.json({
      conversationId,
      otherUser,
      exists: !!existingMessage
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ message: 'Error starting conversation' });
  }
};

// Search users for messaging (students can find students, faculty can find students)
export const searchUsers = async (req, res) => {
  try {
    const { q: query } = req.query; // Note: the frontend sends 'q' parameter
    const currentUser = req.user;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    let searchCriteria = {
      _id: { $ne: currentUser.id }, // Exclude current user
      role: { $ne: 'admin' }, // Exclude admin users
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { studentId: { $regex: query, $options: 'i' } }
      ]
    };

    // Students can only message their supervisor and other students
    if (currentUser.role === 'student') {
      // For students, we need to combine role filtering with search text filtering
      let roleFilter = [
        { role: 'student' }
      ];
      
      // Add supervisor to the list if they have one
      if (currentUser.supervisor) {
        roleFilter.push({ _id: currentUser.supervisor });
      }
      
      searchCriteria = {
        _id: { $ne: currentUser.id }, // Exclude current user
        role: { $ne: 'admin' }, // Exclude admin users
        $and: [
          {
            $or: roleFilter
          },
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } },
              { studentId: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      };
    }

    const users = await User.find(searchCriteria)
      .select('name email profileImage role department studentId')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
}; 