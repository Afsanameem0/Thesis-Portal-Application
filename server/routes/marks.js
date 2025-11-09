import express from 'express';
import {
  getMyMarks,
  getSuperviseeMarks,
  assignSupervisorMarks,
  updateSupervisorMarks,
  getMarksHistory,
  getAllMarks,
  getStudentMarks,
  getSuperviseesMarks,
} from '../controllers/marksController.js';
import { protect, faculty, admin } from '../middleware/auth.js';

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Marks API is working', timestamp: new Date() });
});

router.route('/my-marks').get(protect, getMyMarks);
router.route('/all-marks').get(protect, faculty, getAllMarks);
router.route('/supervisees-marks').get(protect, faculty, getSuperviseesMarks);
router.route('/student/:studentId').get(protect, faculty, getStudentMarks);
router.route('/supervisee/:studentId').get(protect, faculty, getSuperviseeMarks);
router.route('/assign-supervisor-marks').post(protect, faculty, assignSupervisorMarks);
router.route('/update-supervisor-marks').put(protect, faculty, updateSupervisorMarks);
router.route('/history').get(protect, getMarksHistory);

export default router; 