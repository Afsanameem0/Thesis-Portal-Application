import express from 'express';
import {
  createPost,
  getAllPosts,
  getPostsByUser,
  getMyPosts,
  toggleLikePost,
  addComment,
  deletePost,
  getPostById
} from '../controllers/postController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   POST /api/posts
// @desc    Create a new post (students only)
// @access  Private
router.post('/', createPost);

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Private
router.get('/', getAllPosts);

// @route   GET /api/posts/my-posts
// @desc    Get current user's posts
// @access  Private
router.get('/my-posts', getMyPosts);

// @route   GET /api/posts/user/:userId
// @desc    Get posts by specific user
// @access  Private
router.get('/user/:userId', getPostsByUser);

// @route   POST /api/posts/:id/like
// @desc    Like/Unlike a post
// @access  Private
router.post('/:id/like', toggleLikePost);

// @route   POST /api/posts/:id/comment
// @desc    Add comment to a post
// @access  Private
router.post('/:id/comment', addComment);

// @route   GET /api/posts/:id
// @desc    Get a single post by ID
// @access  Private
router.get('/:id', getPostById);

// @route   DELETE /api/posts/:id
// @desc    Delete a post (author or admin only)
// @access  Private
router.delete('/:id', deletePost);

export default router; 