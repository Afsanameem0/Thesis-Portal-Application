import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  timestamp: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Index for efficient querying
postSchema.index({ timestamp: -1 });
postSchema.index({ author: 1 });
postSchema.index({ isActive: 1 });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Instance method to toggle like
postSchema.methods.toggleLike = function(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const likeIndex = this.likes.findIndex(like => like.equals(userObjectId));
  
  if (likeIndex > -1) {
    // Unlike
    this.likes.splice(likeIndex, 1);
    return false; // was unliked
  } else {
    // Like
    this.likes.push(userObjectId);
    return true; // was liked
  }
};

// Instance method to add comment
postSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    author: userId,
    content: content
  });
};

// Static method to get posts with author info
postSchema.statics.getPostsWithAuthor = function(query = {}, options = {}) {
  const { page = 1, limit = 10, sort = { timestamp: -1 } } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ isActive: true, ...query })
    .populate('author', 'name email profileImage department role')
    .populate('comments.author', 'name profileImage')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Ensure virtual fields are serialized
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

const Post = mongoose.model('Post', postSchema);

export default Post; 