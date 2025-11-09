import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
});

// Index for efficient querying
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });

// Static method to create conversation ID between two users
messageSchema.statics.createConversationId = function(userId1, userId2) {
  // Sort user IDs to ensure consistent conversation ID regardless of who starts the conversation
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

// Instance method to mark message as read
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

export default Message; 