import Post from '../models/Post.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import validator from 'validator';

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private (Students only)
export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user._id;

    // Validation
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ message: 'Post content cannot exceed 2000 characters' });
    }

    // Check if content contains user's name
    const userName = req.user.name;
    if (userName && content.toLowerCase().includes(userName.toLowerCase())) {
      return res.status(400).json({ message: 'Please don\'t include your name in the post. Your name will be displayed automatically.' });
    }

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create posts' });
    }

    const post = new Post({
      content: content.trim(),
      author: userId
    });

    await post.save();

    // Populate author info before returning
    await post.populate('author', 'name email profileImage department role');

    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
};

// @desc    Get all posts (feed)
// @route   GET /api/posts
// @access  Private
export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user._id;

    // Get posts with pagination
    const posts = await Post.getPostsWithAuthor({}, { page, limit });

    // Add user's like status for each post
    const postsWithUserLikes = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLikedByUser = post.likes.some(like => like.equals(userId));
      return postObj;
    });

    // Get total count for pagination
    const totalPosts = await Post.countDocuments({ isActive: true });
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts: postsWithUserLikes,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

// @desc    Get posts by specific user
// @route   GET /api/posts/user/:userId
// @access  Private
export const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const currentUserId = req.user._id;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await User.findById(userId).select('name email profileImage department role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's posts
    const posts = await Post.getPostsWithAuthor({ author: userId }, { page, limit });

    // Add user's like status for each post
    const postsWithUserLikes = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLikedByUser = post.likes.some(like => like.equals(currentUserId));
      return postObj;
    });

    // Get total count for pagination
    const totalPosts = await Post.countDocuments({ author: userId, isActive: true });
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      user,
      posts: postsWithUserLikes,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Error fetching user posts' });
  }
};

// @desc    Get current user's posts
// @route   GET /api/posts/my-posts
// @access  Private
export const getMyPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Get user's posts
    const posts = await Post.getPostsWithAuthor({ author: userId }, { page, limit });

    // Add user's like status for each post
    const postsWithUserLikes = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLikedByUser = post.likes.some(like => like.equals(userId));
      return postObj;
    });

    // Get total count for pagination
    const totalPosts = await Post.countDocuments({ author: userId, isActive: true });
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts: postsWithUserLikes,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching my posts:', error);
    res.status(500).json({ message: 'Error fetching your posts' });
  }
};

// @desc    Like/Unlike a post
// @route   POST /api/posts/:id/like
// @access  Private
export const toggleLikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate post ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(id).populate('author', 'name');
    if (!post || !post.isActive) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Toggle like
    const wasLiked = post.toggleLike(userId);
    await post.save();

    // Send notification to post owner when someone likes their post (but not when they unlike)
    if (wasLiked && !post.author._id.equals(userId)) {
      try {
        const notification = await Notification.create({
          recipient: post.author._id,
          sender: userId,
          type: 'post_like',
          title: 'New Like on Your Post',
          message: `${req.user.name} liked your post`,
          relatedId: post._id,
          relatedModel: 'Post'
        });

        // Emit real-time notification via Socket.IO
        if (req.app.get('io')) {
          req.app.get('io').to(post.author._id.toString()).emit('new_notification', {
            type: 'post_like',
            title: 'New Like on Your Post',
            message: `${req.user.name} liked your post`,
            notificationId: notification._id
          });
        }
      } catch (notificationError) {
        console.warn('Failed to create like notification:', notificationError);
      }
    }

    res.json({
      message: wasLiked ? 'Post liked' : 'Post unliked',
      isLiked: wasLiked,
      likeCount: post.likeCount
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Error updating like status' });
  }
};

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Validate post ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    // Validation
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: 'Comment cannot exceed 500 characters' });
    }

    let cleanedContent = content.trim();
    const userName = req.user.name;
    
    if (userName) {
      // Check if the comment starts with the user's name (with optional colon)
      const namePattern = new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`, 'i');
      if (namePattern.test(cleanedContent)) {
        cleanedContent = cleanedContent.replace(namePattern, '').trim();
      }
      
      // Additional check for name anywhere in the cleaned comment
      if (cleanedContent.toLowerCase().includes(userName.toLowerCase())) {
        return res.status(400).json({ message: 'Please don\'t include your name in the comment. Your name will be displayed automatically.' });
      }
      
      // If after cleaning, the comment is empty or too short
      if (cleanedContent.length < 1) {
        return res.status(400).json({ message: 'Please write a meaningful comment without including your name.' });
      }
    }

    const post = await Post.findById(id);
    if (!post || !post.isActive) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add comment
    post.addComment(userId, cleanedContent);
    await post.save();

    // Populate the new comment with author info
    await post.populate('comments.author', 'name profileImage');

    // Get the newly added comment
    const newComment = post.comments[post.comments.length - 1];

    // Send notification to post owner when someone comments on their post (but not when they comment on their own post)
    if (!post.author.equals(userId)) {
      try {
        const notification = await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'post_comment',
          title: 'New Comment on Your Post',
          message: `${req.user.name} commented on your post`,
          relatedId: post._id,
          relatedModel: 'Post'
        });

        // Emit real-time notification via Socket.IO
        if (req.app.get('io')) {
          req.app.get('io').to(post.author.toString()).emit('new_notification', {
            type: 'post_comment',
            title: 'New Comment on Your Post',
            message: `${req.user.name} commented on your post`,
            notificationId: notification._id
          });
        }
      } catch (notificationError) {
        console.warn('Failed to create comment notification:', notificationError);
      }
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment,
      commentCount: post.commentCount
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private (Author only)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate post ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(id);
    if (!post || !post.isActive) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author or admin
    if (!post.author.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Soft delete by setting isActive to false
    post.isActive = false;
    await post.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
};

// @desc    Get a single post by ID
// @route   GET /api/posts/:id
// @access  Private
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate post ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(id)
      .populate('author', 'name email profileImage department role')
      .populate('comments.author', 'name profileImage');

    if (!post || !post.isActive) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add user's like status
    const postObj = post.toObject();
    postObj.isLikedByUser = post.likes.some(like => like.equals(userId));

    res.json({ post: postObj });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
}; 