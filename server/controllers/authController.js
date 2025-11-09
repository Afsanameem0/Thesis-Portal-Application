import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Group from '../models/Group.js';
import multer from "multer";
import path from "path";
import fs from "fs";
import { createNotification } from './notificationController.js';
import Thesis from '../models/Thesis.js';
import SupervisorFeedback from '../models/SupervisorFeedback.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { 
    expiresIn: '1h' // 1 hour expiration
  });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
}).single('profileImage');

// Configure multer for thesis document uploads
const thesisStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/theses/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, 'thesis-' + uniqueSuffix + '-' + sanitizedName);
  }
});

const uploadThesis = multer({
  storage: thesisStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for thesis documents
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
    }
  }
}).single('thesisDocument');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, department, studentId, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      department,
      studentId,
      role: role || 'student'
    });

    if (user) {
      const token = generateToken(user._id);
      const userResponse = await User.findById(user._id).select('-password');
      res.status(201).json({
        ...userResponse.toObject(),
        token
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    const userResponse = await User.findById(user._id).select('-password');
    res.json({
      ...userResponse.toObject(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user's profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update current user's profile
export const updateProfile = async (req, res) => {
  try {
    const updates = (({ name, email, bio, phone, department, studentId, cgpa }) => ({ name, email, bio, phone, department, studentId, cgpa }))(req.body);
    
    // Validate CGPA if provided
    if (updates.cgpa !== undefined && updates.cgpa !== null && updates.cgpa !== '') {
      const cgpa = parseFloat(updates.cgpa);
      if (isNaN(cgpa) || cgpa < 0.0 || cgpa > 4.0) {
        return res.status(400).json({ message: 'CGPA must be a number between 0.00 and 4.00' });
      }
      updates.cgpa = cgpa;
    } else if (updates.cgpa === '') {
      updates.cgpa = null;
    }
    
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload profile image (file upload)
export const uploadProfileImage = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      // Delete old profile image if exists
      const user = await User.findById(req.user._id);
      if (user.profileImage && user.profileImage !== '') {
        const oldImagePath = user.profileImage.replace('http://localhost:5001/', '');
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new image path
      const imageUrl = `http://localhost:5001/${req.file.path}`;
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id, 
        { profileImage: imageUrl }, 
        { new: true }
      ).select('-password');

      res.json({ 
        profileImage: updatedUser.profileImage,
        message: 'Profile image uploaded successfully'
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
};

// Upload thesis document
export const uploadThesisDocument = async (req, res) => {
  uploadThesis(req, res, async function (err) {
    if (err) {
      console.error('Thesis upload error:', err.message);
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      console.log('Thesis file uploaded:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      });

      // Generate the file URL that can be accessed by the client
      const fileUrl = `http://localhost:5001/${req.file.path.replace(/\\/g, '/')}`;
      
      res.json({ 
        fileUrl: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        message: 'Thesis document uploaded successfully'
      });
    } catch (error) {
      console.error('Error processing thesis upload:', error);
      res.status(500).json({ message: 'Server error processing file upload' });
    }
  });
};

// Get list of all faculty
export const getFacultyList = async (req, res) => {
  try {
    const faculty = await User.find({ role: 'faculty' }).select('-password');
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get faculty profile by ID
export const getFacultyProfile = async (req, res) => {
  try {
    const faculty = await User.findOne({ _id: req.params.id, role: 'faculty' }).select('-password');
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile by ID (for faculty to view student profiles)
export const getUserProfile = async (req, res) => {
  try {
    // Only faculty can access other users' profiles
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Only faculty can view user profiles.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Student requests a supervisor (faculty)
export const requestSupervisor = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('group');
    const faculty = await User.findById(req.body.facultyId);
    
    if (!student || !faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Check if student already has a supervisor
    if (student.supervisor) {
      return res.status(400).json({ message: 'You already have a supervisor' });
    }

    // Check if student is in a group
    if (student.group) {
      // Handle group supervisor request
      const group = student.group;
      
      // Check if group already has a supervisor
      if (group.supervisor) {
        return res.status(400).json({ message: 'Your group already has a supervisor' });
      }

      // Check if request already exists for this group
      const existingGroupRequest = group.supervisorRequests.find(
        req => req.facultyId.toString() === faculty._id.toString()
      );
      
      if (existingGroupRequest) {
        return res.status(400).json({ message: 'Group supervisor request already sent to this faculty' });
      }

      // Add supervisor request to group
      group.supervisorRequests.push({
        facultyId: faculty._id,
        status: 'pending',
        requestedAt: new Date()
      });

      await group.save();

      // Create notification for faculty
      await createNotification(
        faculty._id,
        student._id,
        'group_supervisor_request',
        'New Group Supervisor Request',
        `Group "${group.name}" has requested you as their supervisor`,
        group._id,
        'Group'
      );

      res.json({ message: 'Group supervisor request sent successfully' });
    } else {
      // Handle individual supervisor request
      // Check if request already exists
      const existingRequest = student.supervisorRequests.find(
        req => req.facultyId.toString() === faculty._id.toString()
      );
      
      if (existingRequest) {
        return res.status(400).json({ message: 'Request already sent to this faculty' });
      }

      // Add request to student's requests
      student.supervisorRequests.push({
        facultyId: faculty._id,
        status: 'pending',
        requestedAt: new Date()
      });

      // Add request to faculty's pending requests
      faculty.pendingSupervisorRequests.push({
        studentId: student._id,
        requestedAt: new Date()
      });

      await student.save();
      await faculty.save();

      // Create notification for faculty
      await createNotification(
        faculty._id,
        student._id,
        'supervisor_request',
        'New Supervisor Request',
        `${student.name} has requested you as their supervisor`,
        student._id,
        'User'
      );

      res.json({ message: 'Supervisor request sent' });
    }
  } catch (err) {
    console.error('Error in requestSupervisor:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Faculty responds to supervisor request
export const respondSupervisorRequest = async (req, res) => {
  try {
    const { studentId, accept } = req.body;
    const student = await User.findById(studentId);
    const faculty = await User.findById(req.user._id);
    
    if (!student || !faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ message: 'Not found' });
    }

    // Find the specific request
    const studentRequest = student.supervisorRequests.find(
      req => req.facultyId.toString() === faculty._id.toString()
    );

    if (!studentRequest || studentRequest.status !== 'pending') {
      return res.status(400).json({ message: 'No pending request found' });
    }

    if (accept) {
      // Check if faculty has available seats
      if (faculty.supervisees.length >= faculty.seatCapacity) {
        return res.status(400).json({ 
          message: 'No seats available. Faculty has reached maximum capacity.',
          seatCapacity: faculty.seatCapacity,
          currentStudents: faculty.supervisees.length
        });
      }

      // Set this faculty as the supervisor
      student.supervisor = faculty._id;
      
      // Mark this request as accepted
      studentRequest.status = 'accepted';
      
      // Auto-decline all other pending requests
      student.supervisorRequests.forEach(req => {
        if (req.facultyId.toString() !== faculty._id.toString() && req.status === 'pending') {
          req.status = 'rejected';
        }
      });

      // Add student to faculty's supervisees
      if (!faculty.supervisees.includes(student._id)) {
        faculty.supervisees.push(student._id);
      }

      // Remove all pending requests from faculty's list
      faculty.pendingSupervisorRequests = faculty.pendingSupervisorRequests.filter(
        req => req.studentId.toString() !== student._id.toString()
      );

      // Create notification for student
      await createNotification(
        student._id,
        faculty._id,
        'supervisor_response',
        'Supervisor Request Accepted',
        `${faculty.name} has accepted your supervisor request`,
        faculty._id,
        'User'
      );

      // Notify other faculty members that their requests were declined
      const declinedRequests = student.supervisorRequests.filter(
        req => req.facultyId.toString() !== faculty._id.toString() && req.status === 'rejected'
      );

      for (const declinedReq of declinedRequests) {
        const declinedFaculty = await User.findById(declinedReq.facultyId);
        if (declinedFaculty) {
          // Remove from their pending requests
          declinedFaculty.pendingSupervisorRequests = declinedFaculty.pendingSupervisorRequests.filter(
            req => req.studentId.toString() !== student._id.toString()
          );
          await declinedFaculty.save();

          // Create notification for declined faculty
          await createNotification(
            declinedFaculty._id,
            student._id,
            'supervisor_response',
            'Supervisor Request Declined',
            `${student.name} has chosen another supervisor`,
            student._id,
            'User'
          );
        }
      }
    } else {
      // Mark this request as rejected
      studentRequest.status = 'rejected';
      
      // Remove from faculty's pending requests
      faculty.pendingSupervisorRequests = faculty.pendingSupervisorRequests.filter(
        req => req.studentId.toString() !== student._id.toString()
      );

      // Create notification for student
      await createNotification(
        student._id,
        faculty._id,
        'supervisor_response',
        'Supervisor Request Declined',
        `${faculty.name} has declined your supervisor request`,
        faculty._id,
        'User'
      );
    }

    await student.save();
    await faculty.save();

    res.json({ message: accept ? 'Request accepted' : 'Request rejected' });
  } catch (err) {
    console.error('Error in respondSupervisorRequest:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending supervisor requests for faculty
export const getPendingSupervisorRequests = async (req, res) => {
  try {
    const faculty = await User.findById(req.user._id).populate('pendingSupervisorRequests.studentId', 'name email department cgpa studentId');
    
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(faculty.pendingSupervisorRequests);
  } catch (err) {
    console.error('Error in getPendingSupervisorRequests:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit thesis registration (for students)
export const submitThesisRegistration = async (req, res) => {
  try {
    const { title, description } = req.body;
    const student = await User.findById(req.user._id).populate('supervisor', 'name').populate('group');

    if (!student || student.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit thesis registration' });
    }

    // Check if student is in a group
    if (student.group) {
      // For group submissions, check if group already has a registration
      const groupMembers = await User.find({ group: student.group._id });
      const hasGroupRegistration = groupMembers.some(member => 
        member.thesisRegistration && (member.thesisRegistration.status === 'pending' || member.thesisRegistration.status === 'approved')
      );

      if (hasGroupRegistration) {
        return res.status(400).json({ message: 'Your group already has a thesis registration. Only one member can submit the registration for the entire group.' });
      }

      // Check if group has a supervisor
      if (!student.group.supervisor) {
        return res.status(400).json({ message: 'Your group must have a supervisor before registering your thesis' });
      }

      // Update thesis registration for all group members
      const updatePromises = groupMembers.map(member => {
        member.thesisRegistration = {
          status: 'pending',
          title: title,
          description: description,
          supervisorName: student.group.supervisor.name,
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          comments: '',
          isGroupRegistration: true,
          groupId: student.group._id
        };
        return member.save();
      });

      await Promise.all(updatePromises);

      // Create notification for group supervisor
      await createNotification(
        student.group.supervisor,
        student._id,
        'thesis_registration',
        'New Group Thesis Registration',
        `Group "${student.group.name}" has submitted their thesis registration: "${title}"`,
        student.group._id,
        'Group'
      );

      res.json({ 
        message: 'Group thesis registration submitted successfully',
        thesisRegistration: student.thesisRegistration
      });
    } else {
      // Individual student submission
      if (!student.supervisor) {
        return res.status(400).json({ message: 'You must have a supervisor before registering your thesis' });
      }

      if (student.thesisRegistration.status === 'pending') {
        return res.status(400).json({ message: 'You already have a pending thesis registration' });
      }

      if (student.thesisRegistration.status === 'approved') {
        return res.status(400).json({ message: 'Your thesis registration is already approved' });
      }

      // Update thesis registration
      student.thesisRegistration = {
        status: 'pending',
        title: title,
        description: description,
        supervisorName: student.supervisor.name,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        comments: ''
      };

      await student.save();

      // Create notification for supervisor
      await createNotification(
        student.supervisor._id,
        student._id,
        'thesis_registration',
        'New Thesis Registration',
        `${student.name} has submitted their thesis registration: "${title}"`,
        student._id,
        'User'
      );

      res.json({ 
        message: 'Thesis registration submitted successfully',
        thesisRegistration: student.thesisRegistration
      });
    }
  } catch (err) {
    console.error('Error in submitThesisRegistration:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending thesis registrations for faculty
export const getPendingThesisRegistrations = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find all students supervised by this faculty with pending thesis registrations
    const students = await User.find({
      supervisor: req.user._id,
      'thesisRegistration.status': 'pending'
    }).select('name email department studentId thesisRegistration cgpa');

    res.json(students);
  } catch (err) {
    console.error('Error in getPendingThesisRegistrations:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve or reject thesis registration (for faculty)
export const reviewThesisRegistration = async (req, res) => {
  try {
    const { studentId, action, comments } = req.body; // action: 'approve' or 'reject'

    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can review thesis registrations' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be approve or reject' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Verify this faculty is the student's supervisor
    if (student.supervisor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not the supervisor of this student' });
    }

    if (student.thesisRegistration.status !== 'pending') {
      return res.status(400).json({ message: 'No pending thesis registration found' });
    }

    // Update thesis registration status
    student.thesisRegistration.status = action === 'approve' ? 'approved' : 'rejected';
    student.thesisRegistration.reviewedAt = new Date();
    student.thesisRegistration.reviewedBy = req.user._id;
    student.thesisRegistration.comments = comments || '';

    await student.save();

    // Create notification for student
    await createNotification(
      student._id,
      req.user._id,
      'thesis_registration_response',
      `Thesis Registration ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      `Your thesis registration "${student.thesisRegistration.title}" has been ${action === 'approve' ? 'approved' : 'rejected'}${comments ? ': ' + comments : ''}`,
      req.user._id,
      'User'
    );

    res.json({ 
      message: `Thesis registration ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      action: action
    });
  } catch (err) {
    console.error('Error in reviewThesisRegistration:', err);
    res.status(500).json({ message: 'Server error' });
  }
}; 

// --- BOOKMARK CONTROLLERS ---

// Add a thesis to bookmarks
export const addThesisBookmark = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { thesisId } = req.params;
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!thesisId) return res.status(400).json({ message: 'Thesis ID required' });
    if (user.thesisBookmarks.includes(thesisId)) {
      return res.status(400).json({ message: 'Already bookmarked' });
    }
    user.thesisBookmarks.push(thesisId);
    await user.save();
    res.json({ message: 'Thesis bookmarked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a thesis from bookmarks
export const removeThesisBookmark = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { thesisId } = req.params;
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!thesisId) return res.status(400).json({ message: 'Thesis ID required' });
    user.thesisBookmarks = user.thesisBookmarks.filter(id => id.toString() !== thesisId);
    await user.save();
    res.json({ message: 'Thesis bookmark removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a paper to bookmarks
export const addPaperBookmark = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { paperId } = req.params;
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!paperId) return res.status(400).json({ message: 'Paper ID required' });
    if (user.paperBookmarks.includes(paperId)) {
      return res.status(400).json({ message: 'Already bookmarked' });
    }
    user.paperBookmarks.push(paperId);
    await user.save();
    res.json({ message: 'Paper bookmarked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a paper from bookmarks
export const removePaperBookmark = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { paperId } = req.params;
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!paperId) return res.status(400).json({ message: 'Paper ID required' });
    user.paperBookmarks = user.paperBookmarks.filter(id => id.toString() !== paperId);
    await user.save();
    res.json({ message: 'Paper bookmark removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bookmarked theses for the current user
export const getThesisBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'thesisBookmarks',
      populate: { path: 'author', select: 'name email department' }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.thesisBookmarks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bookmarked papers for the current user
export const getPaperBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'paperBookmarks',
      populate: { path: 'uploadedBy', select: 'name email department' }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.paperBookmarks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Legacy bookmark functions for backward compatibility
export const addBookmark = async (req, res) => {
  // This will handle both thesis and paper bookmarks based on the ID format or type parameter
  try {
    const user = await User.findById(req.user._id);
    const { thesisId } = req.params;
    const { type } = req.query; // 'thesis' or 'paper'
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!thesisId) return res.status(400).json({ message: 'ID required' });
    
    if (type === 'paper') {
      if (user.paperBookmarks.includes(thesisId)) {
        return res.status(400).json({ message: 'Already bookmarked' });
      }
      user.paperBookmarks.push(thesisId);
    } else {
      if (user.thesisBookmarks.includes(thesisId)) {
        return res.status(400).json({ message: 'Already bookmarked' });
      }
      user.thesisBookmarks.push(thesisId);
    }
    
    await user.save();
    res.json({ message: 'Bookmarked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeBookmark = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { thesisId } = req.params;
    const { type } = req.query; // 'thesis' or 'paper'
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!thesisId) return res.status(400).json({ message: 'ID required' });
    
    if (type === 'paper') {
      user.paperBookmarks = user.paperBookmarks.filter(id => id.toString() !== thesisId);
    } else {
      user.thesisBookmarks = user.thesisBookmarks.filter(id => id.toString() !== thesisId);
    }
    
    await user.save();
    res.json({ message: 'Bookmark removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookmarks = async (req, res) => {
  try {
    const { type } = req.query; // 'thesis' or 'paper'
    const user = await User.findById(req.user._id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (type === 'paper') {
      await user.populate({
        path: 'paperBookmarks',
        populate: { path: 'uploadedBy', select: 'name email department' }
      });
      res.json(user.paperBookmarks);
    } else {
      await user.populate({
        path: 'thesisBookmarks',
        populate: { path: 'author', select: 'name email department' }
      });
      res.json(user.thesisBookmarks);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit supervisor feedback (student only, must have completed registration, P1, P2, P3 and have supervisor)
export const submitFeedback = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating || !feedback) return res.status(400).json({ message: 'Rating and feedback are required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
    const student = await User.findById(req.user._id);
    if (!student || student.role !== 'student') return res.status(403).json({ message: 'Only students can submit feedback' });
    if (!student.supervisor) return res.status(400).json({ message: 'You do not have a supervisor' });
    
    // Check if student has completed thesis registration
    if (!student.thesisRegistration || student.thesisRegistration.status !== 'approved') {
      return res.status(400).json({ message: 'You must have an approved thesis registration to submit feedback' });
    }
    
    // Check if student has completed P1
    const p1 = await Thesis.findOne({ author: student._id, submissionType: 'P1', status: 'approved' });
    if (!p1) return res.status(400).json({ message: 'You must complete P1 to submit feedback' });
    
    // Check if student has completed P2
    const p2 = await Thesis.findOne({ author: student._id, submissionType: 'P2', status: 'approved' });
    if (!p2) return res.status(400).json({ message: 'You must complete P2 to submit feedback' });
    
    // Check if student has completed P3
    const p3 = await Thesis.findOne({ author: student._id, submissionType: 'P3', status: 'approved' });
    if (!p3) return res.status(400).json({ message: 'You must complete P3 to submit feedback' });
    
    // Only one feedback per student-supervisor
    const existing = await SupervisorFeedback.findOne({ student: student._id, supervisor: student.supervisor });
    if (existing) return res.status(400).json({ message: 'You have already submitted feedback for your supervisor' });
    
    const fb = await SupervisorFeedback.create({ student: student._id, supervisor: student.supervisor, rating, feedback });
    res.json({ message: 'Feedback submitted', feedback: fb });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all feedback for a faculty
export const getFacultyFeedback = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const feedbacks = await SupervisorFeedback.find({ supervisor: facultyId })
      .populate('student', 'name email department')
      .populate('supervisor', 'name email department')
      .sort({ createdAt: -1 });
    // Calculate average rating
    const avgRating = feedbacks.length ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(2) : null;
    // Map feedbacks to include supervisor and student names
    const feedbacksWithNames = feedbacks.map(fb => ({
      _id: fb._id,
      supervisorName: fb.supervisor?.name || '',
      studentName: fb.student?.name || '',
      rating: fb.rating,
      feedback: fb.feedback,
      createdAt: fb.createdAt
    }));
    res.json({ feedbacks: feedbacksWithNames, avgRating });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get feedback the current student has given
export const getMyFeedback = async (req, res) => {
  try {
    const feedbacks = await SupervisorFeedback.find({ student: req.user._id })
      .populate('supervisor', 'name email department');
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Request seat increase (faculty only)
export const requestSeatIncrease = async (req, res) => {
  try {
    const { requestedSeats, reason } = req.body;
    const faculty = await User.findById(req.user._id);
    
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can request seat increases' });
    }

    if (!requestedSeats || requestedSeats < 1) {
      return res.status(400).json({ message: 'Requested seats must be at least 1' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    // Check if there's already a pending request
    const pendingRequest = faculty.seatIncreaseRequests.find(req => req.status === 'pending');
    if (pendingRequest) {
      return res.status(400).json({ message: 'You already have a pending seat increase request' });
    }

    // Add the request
    faculty.seatIncreaseRequests.push({
      requestedSeats,
      reason: reason.trim(),
      status: 'pending',
      requestedAt: new Date()
    });

    await faculty.save();

    // Create notification for admin
    await createNotification(
      'admin', // This will need to be updated to actual admin ID
      faculty._id,
      'seat_increase_request',
      'Seat Increase Request',
      `${faculty.name} has requested ${requestedSeats} additional seats`,
      faculty._id,
      'User'
    );

    res.json({ message: 'Seat increase request submitted successfully' });
  } catch (err) {
    console.error('Error in requestSeatIncrease:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seat increase requests (admin only)
export const getSeatIncreaseRequests = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const facultyWithRequests = await User.find({
      role: 'faculty',
      'seatIncreaseRequests.status': 'pending'
    }).select('name email department seatCapacity supervisees seatIncreaseRequests');

    res.json(facultyWithRequests);
  } catch (err) {
    console.error('Error in getSeatIncreaseRequests:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve/reject seat increase request (admin only)
export const reviewSeatIncreaseRequest = async (req, res) => {
  try {
    const { facultyId, action, comments } = req.body; // action: 'approve' or 'reject'
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    const pendingRequest = faculty.seatIncreaseRequests.find(req => req.status === 'pending');
    if (!pendingRequest) {
      return res.status(400).json({ message: 'No pending seat increase request found' });
    }

    if (action === 'approve') {
      // Increase seat capacity
      faculty.seatCapacity += pendingRequest.requestedSeats;
      pendingRequest.status = 'approved';
      pendingRequest.reviewedAt = new Date();
      pendingRequest.reviewedBy = req.user._id;
      pendingRequest.comments = comments || '';

      await faculty.save();

      // Create notification for faculty
      await createNotification(
        faculty._id,
        req.user._id,
        'seat_increase_approved',
        'Seat Increase Approved',
        `Your request for ${pendingRequest.requestedSeats} additional seats has been approved`,
        faculty._id,
        'User'
      );

      res.json({ 
        message: 'Seat increase request approved',
        newCapacity: faculty.seatCapacity
      });
    } else if (action === 'reject') {
      pendingRequest.status = 'rejected';
      pendingRequest.reviewedAt = new Date();
      pendingRequest.reviewedBy = req.user._id;
      pendingRequest.comments = comments || '';

      await faculty.save();

      // Create notification for faculty
      await createNotification(
        faculty._id,
        req.user._id,
        'seat_increase_rejected',
        'Seat Increase Rejected',
        `Your request for ${pendingRequest.requestedSeats} additional seats has been rejected`,
        faculty._id,
        'User'
      );

      res.json({ message: 'Seat increase request rejected' });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (err) {
    console.error('Error in reviewSeatIncreaseRequest:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get faculty seat information
export const getFacultySeatInfo = async (req, res) => {
  try {
    const faculty = await User.findById(req.user._id);
    
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Import Group model
    const Group = (await import('../models/Group.js')).default;
    
    // Check if faculty has any groups in their supervisees (groups are stored as group IDs)
    const groupIds = [];
    const individualStudentIds = [];
    
    for (const id of faculty.supervisees) {
      try {
        const group = await Group.findById(id);
        if (group) {
          groupIds.push(id);
        } else {
          individualStudentIds.push(id);
        }
      } catch (error) {
        // If it's not a group, it's an individual student
        individualStudentIds.push(id);
      }
    }
    
    // Calculate total seats used: individual students + groups (each group = 1 seat)
    const currentStudents = individualStudentIds.length + groupIds.length;
    const availableSeats = faculty.seatCapacity - currentStudents;
    const pendingRequest = faculty.seatIncreaseRequests.find(req => req.status === 'pending');

    res.json({
      seatCapacity: faculty.seatCapacity,
      currentStudents,
      availableSeats,
      hasPendingRequest: !!pendingRequest,
      pendingRequest: pendingRequest || null,
      individualStudents: individualStudentIds.length,
      groups: groupIds.length
    });
  } catch (err) {
    console.error('Error in getFacultySeatInfo:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change user password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get user with password
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error in changePassword:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending group supervisor requests for faculty
export const getPendingGroupSupervisorRequests = async (req, res) => {
  try {
    const faculty = await User.findById(req.user._id);
    
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Only faculty can access group supervisor requests.' });
    }

    // Find all groups that have pending supervisor requests for this faculty
    const Group = (await import('../models/Group.js')).default;
    const groups = await Group.find({
      'supervisorRequests.facultyId': faculty._id,
      'supervisorRequests.status': 'pending'
    }).populate('members.studentId', 'name email department studentId')
      .populate('supervisorRequests.facultyId', 'name email department');

    res.json(groups);
  } catch (error) {
    console.error('Get pending group supervisor requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 