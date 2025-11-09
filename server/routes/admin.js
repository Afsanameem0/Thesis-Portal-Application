import express from 'express';
import {
  getDashboardStats,
  getAllStudents,
  getAllFaculty,
  getStudentDetails,
  getFacultyDetails,
  assignMarks,
  getMarksOverview
} from '../controllers/adminController.js';
import { auth, authorize } from '../middleware/auth.js';
import {
  uploadTemplate,
  getTemplates,
  downloadTemplate
} from '../controllers/templateController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Set up multer for template uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/templates'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// All admin routes require authentication and admin role
router.use(auth);
router.use(authorize('admin'));

// Dashboard and overview routes
router.get('/dashboard', getDashboardStats);
router.get('/marks-overview', getMarksOverview);

// User management routes
router.get('/students', getAllStudents);
router.get('/faculty', getAllFaculty);
router.get('/students/:id', getStudentDetails);
router.get('/faculty/:id', getFacultyDetails);

// Marks management
router.post('/assign-marks', assignMarks);

// Admin upload template
router.post('/templates', upload.single('file'), uploadTemplate);
// Get all templates
router.get('/templates', getTemplates);
// Download template by type
router.get('/templates/:type/download', downloadTemplate);

export default router; 