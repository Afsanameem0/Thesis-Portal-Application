import express from 'express';
import {
  getAvailableStudents,
  sendGroupRequest,
  acceptGroupRequest,
  rejectGroupRequest,
  getGroupRequests,
  getGroupDetails,
  getGroupById,
  sendGroupSupervisorRequest,
  acceptGroupSupervisorRequest,
  rejectGroupSupervisorRequest,
  getAllGroups,
  removeGroupMember,
  removeGroupSupervisor
} from '../controllers/groupController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Student routes
router.get('/available-students', auth, getAvailableStudents);
router.post('/send-request', auth, sendGroupRequest);
router.post('/accept-request', auth, acceptGroupRequest);
router.post('/reject-request', auth, rejectGroupRequest);
router.get('/requests', auth, getGroupRequests);
router.get('/details', auth, getGroupDetails);
router.get('/:id', auth, getGroupById);
router.post('/send-supervisor-request', auth, sendGroupSupervisorRequest);

// Faculty routes
router.post('/accept-supervisor-request', auth, acceptGroupSupervisorRequest);
router.post('/reject-supervisor-request', auth, rejectGroupSupervisorRequest);

// Admin routes
router.get('/all', auth, getAllGroups);
router.post('/remove-member', auth, removeGroupMember);
router.post('/remove-supervisor', auth, removeGroupSupervisor);

export default router; 