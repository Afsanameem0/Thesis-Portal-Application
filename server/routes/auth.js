import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  uploadProfileImage, 
  uploadThesisDocument,
  getFacultyList, 
  getFacultyProfile, 
  getUserProfile,
  requestSupervisor, 
  respondSupervisorRequest,
  getPendingSupervisorRequests,
  submitThesisRegistration,
  getPendingThesisRegistrations,
  reviewThesisRegistration,
  addBookmark,
  removeBookmark,
  getBookmarks,
  addThesisBookmark,
  removeThesisBookmark,
  getThesisBookmarks,
  addPaperBookmark,
  removePaperBookmark,
  getPaperBookmarks,
  submitFeedback,
  getFacultyFeedback,
  getMyFeedback,
  requestSeatIncrease,
  getSeatIncreaseRequests,
  reviewSeatIncreaseRequest,
  getFacultySeatInfo,
  changePassword,
  getPendingGroupSupervisorRequests
} from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.post('/profile/avatar', auth, uploadProfileImage);
router.post('/upload-thesis', auth, uploadThesisDocument);
router.post('/change-password', auth, changePassword);

// Faculty endpoints
router.get('/faculty', auth, getFacultyList);
router.get('/faculty/:id', auth, getFacultyProfile);
router.get('/user/:id', auth, getUserProfile);
router.post('/supervisor/request', auth, requestSupervisor);
router.post('/supervisor/respond', auth, respondSupervisorRequest);
router.get('/supervisor/pending-requests', auth, getPendingSupervisorRequests);

// Thesis registration endpoints
router.post('/thesis-registration', auth, submitThesisRegistration);
router.get('/thesis-registration/pending', auth, getPendingThesisRegistrations);
router.post('/thesis-registration/review', auth, reviewThesisRegistration);

// Legacy bookmarks endpoints (for backward compatibility)
router.post('/bookmarks/:thesisId', auth, addBookmark);
router.delete('/bookmarks/:thesisId', auth, removeBookmark);
router.get('/bookmarks', auth, getBookmarks);

// Thesis bookmarks endpoints
router.post('/thesis-bookmarks/:thesisId', auth, addThesisBookmark);
router.delete('/thesis-bookmarks/:thesisId', auth, removeThesisBookmark);
router.get('/thesis-bookmarks', auth, getThesisBookmarks);

// Paper bookmarks endpoints
router.post('/paper-bookmarks/:paperId', auth, addPaperBookmark);
router.delete('/paper-bookmarks/:paperId', auth, removePaperBookmark);
router.get('/paper-bookmarks', auth, getPaperBookmarks);

// Supervisor feedback endpoints
router.post('/feedback', auth, submitFeedback);
router.get('/feedback/faculty/:facultyId', auth, getFacultyFeedback);
router.get('/feedback/my', auth, getMyFeedback);

// Seat management endpoints
router.post('/seat-increase/request', auth, requestSeatIncrease);
router.get('/seat-increase/requests', auth, getSeatIncreaseRequests);
router.post('/seat-increase/review', auth, reviewSeatIncreaseRequest);
router.get('/seat-info', auth, getFacultySeatInfo);

// Group supervisor request endpoints
router.get('/group-supervisor/pending-requests', auth, getPendingGroupSupervisorRequests);

export default router; 