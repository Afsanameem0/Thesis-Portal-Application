import express from 'express';
import {
  getTheses,
  getThesis,
  createThesis,
  updateThesis,
  deleteThesis,
  addComment,
  getMyTheses,
  getSuperviseeTheses,
  approveThesis,
  createThesisRequest,
  getSupervisorRequests,
  respondToSupervisorRequest,
  downloadThesis,
  syncGroupSubmissions
} from '../controllers/thesisController.js';
import { auth, authorize } from '../middleware/auth.js';
import { getTemplates, downloadTemplate } from '../controllers/templateController.js';

const router = express.Router();

// Public routes
router.get('/', getTheses);
router.get('/templates', getTemplates);
router.get('/templates/:type/download', downloadTemplate);

// Protected routes
router.use(auth);

// Supervisor request routes (must come before /:id routes)
router.post('/supervisor-request', createThesisRequest);
router.get('/supervisor-requests', getSupervisorRequests);
router.post('/supervisor-request/respond', respondToSupervisorRequest);

// My theses route (must come before /:id routes)
router.get('/my-theses', getMyTheses);

// Supervisee theses route (for faculty)
router.get('/supervisee/:studentId', getSuperviseeTheses);

// General thesis routes
router.post('/', createThesis);

// Routes with ID parameter
router.get('/:id/download', downloadThesis);
router.get('/:id', getThesis);
router.put('/:id', updateThesis);
router.delete('/:id', deleteThesis);
router.post('/:id/comments', addComment);
router.post('/:id/approve', auth, approveThesis);

// Admin sync route
router.post('/sync-group-submissions', auth, authorize('admin'), syncGroupSubmissions);

export default router; 