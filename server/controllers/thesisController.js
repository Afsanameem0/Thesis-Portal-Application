import Thesis from '../models/Thesis.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Notification from '../models/Notification.js';
import path from 'path';
import fs from 'fs';

// @desc    Get all theses
// @route   GET /api/theses
// @access  Public
export const getTheses = async (req, res) => {
  try {
    const { department, year, semester, status, search } = req.query;
    
    let query = {};
    
    if (department) query.department = department;
    if (year) query.year = year;
    if (semester) query.semester = semester;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { abstract: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const theses = await Thesis.find(query)
      .populate('author', 'name email department')
      .populate('supervisor', 'name email department') // <-- ensure supervisor is populated
      .sort({ submissionDate: -1 });

    res.json(theses);
  } catch (error) {
    console.error('Get theses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single thesis
// @route   GET /api/theses/:id
// @access  Public
export const getThesis = async (req, res) => {
  try {
    const thesis = await Thesis.findById(req.params.id)
      .populate('author', 'name email department')
      .populate('comments.commentedBy', 'name role');

    if (!thesis) {
      return res.status(404).json({ message: 'Thesis not found' });
    }

    res.json(thesis);
  } catch (error) {
    console.error('Get thesis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create thesis (P1, P2, P3 submission gating)
// @route   POST /api/theses
// @access  Private
export const createThesis = async (req, res) => {
  try {
    const { title, abstract, keywords, department, supervisor, fileUrl, fileName, fileSize, year, semester, submissionType } = req.body;

    // Validate required fields
    if (!title || !abstract || !keywords || !department || !supervisor || 
        !fileUrl || !fileName || !year || !semester || !submissionType) {
      return res.status(400).json({ 
        message: 'All fields are required. Please fill in all the form fields.' 
      });
    }

    // Validate submissionType
    if (!['P1', 'P2', 'P3'].includes(submissionType)) {
      return res.status(400).json({ 
        message: `Invalid submission type: ${submissionType}. Must be P1, P2, or P3.` 
      });
    }

    // Only students can submit
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit theses' });
    }

    // Fetch fresh student data with group information
    const student = await User.findById(req.user._id).populate('group');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student is in a group
    const isGroupSubmission = !!student.group;
    let groupId = null;

    if (isGroupSubmission) {
      // For group submissions, check if group already has a submission for this type
      const existingGroupThesis = await Thesis.findOne({
        group: student.group._id,
        submissionType: submissionType
      });

      if (existingGroupThesis) {
        return res.status(400).json({ 
          message: `Your group has already submitted ${submissionType}. Only one member can submit each phase (P1, P2, P3) for the entire group.` 
        });
      }

      // Check if group has a supervisor
      if (!student.group.supervisor) {
        return res.status(400).json({ 
          message: 'Your group must have an accepted supervisor before submitting. Please request supervision from a faculty member first.' 
        });
      }

      groupId = student.group._id;
    } else {
      // Individual student submission
      // Must have accepted supervisor
      if (!student.supervisor) {
        return res.status(400).json({ 
          message: 'You must have an accepted supervisor before submitting. Please request supervision from a faculty member first.' 
        });
      }
    }

    // Check if student has an accepted supervisor request
    if (isGroupSubmission) {
      // For group students, check if they have a supervisor assigned directly
      if (!student.supervisor) {
        return res.status(400).json({ 
          message: 'Your group must have an accepted supervisor before submitting. Please wait for your supervisor to accept your group request.' 
        });
      }
    } else {
      // For individual students, check for accepted supervisor request
      const acceptedRequest = student.supervisorRequests?.find(req => req.status === 'accepted');
      if (!acceptedRequest) {
        return res.status(400).json({ 
          message: 'You must have an accepted supervisor request before submitting. Please wait for your supervisor to accept your request.' 
        });
      }
    }

    // Check if thesis registration exists and is approved
    if (isGroupSubmission) {
      // For group submissions, check if any group member has approved registration
      const groupMembers = await User.find({ group: groupId });
      const hasApprovedRegistration = groupMembers.some(member => 
        member.thesisRegistration && member.thesisRegistration.status === 'approved'
      );

      if (!hasApprovedRegistration) {
        return res.status(400).json({ 
          message: 'Your group thesis registration must be approved by your supervisor before submitting thesis phases. Please submit or wait for approval of your group thesis registration.',
          registrationStatus: 'not_approved'
        });
      }
    } else {
      // For individual submissions
      if (!student.thesisRegistration || student.thesisRegistration.status !== 'approved') {
        return res.status(400).json({ 
          message: 'Your thesis registration must be approved by your supervisor before submitting thesis phases. Please submit or wait for approval of your thesis registration.',
          registrationStatus: student.thesisRegistration?.status || 'not_submitted'
        });
      }
    }

    // Submission gating logic
    let myTheses;
    if (isGroupSubmission) {
      // For group submissions, check group theses
      myTheses = await Thesis.find({ group: groupId }).sort({ submissionDate: 1 });
    } else {
      // For individual submissions, check individual theses
      myTheses = await Thesis.find({ author: req.user._id }).sort({ submissionDate: 1 });
    }
    
    const hasP1 = myTheses.find(t => t.submissionType === 'P1');
    const hasP2 = myTheses.find(t => t.submissionType === 'P2');
    const hasP3 = myTheses.find(t => t.submissionType === 'P3');
    const p1Approved = hasP1 && hasP1.status === 'approved';
    const p2Approved = hasP2 && hasP2.status === 'approved';

    if (submissionType === 'P1') {
      if (hasP1) {
        return res.status(400).json({ 
          message: 'P1 has already been submitted. You can only submit P1 once.' 
        });
      }
    } else if (submissionType === 'P2') {
      if (!p1Approved) {
        return res.status(400).json({ 
          message: 'P1 must be approved before submitting P2. Please wait for P1 approval.' 
        });
      }
      if (hasP2) {
        return res.status(400).json({ 
          message: 'P2 has already been submitted. You can only submit P2 once.' 
        });
      }
    } else if (submissionType === 'P3') {
      if (!p2Approved) {
        return res.status(400).json({ 
          message: 'P2 must be approved before submitting P3. Please wait for P2 approval.' 
        });
      }
      if (hasP3) {
        return res.status(400).json({ 
          message: 'P3 has already been submitted. You can only submit P3 once.' 
        });
      }
    }

    // Create the thesis
    const thesisData = {
      title,
      author: req.user._id,
      abstract,
      keywords: keywords.split(',').map(k => k.trim()),
      department,
      fileUrl,
      fileName,
      fileSize,
      year,
      semester,
      submissionType,
      isGroupSubmission,
      group: groupId
    };

    // Set supervisor based on submission type
    if (isGroupSubmission) {
      thesisData.supervisor = student.group.supervisor;
    } else {
      thesisData.supervisor = student.supervisor;
    }

    const thesis = await Thesis.create(thesisData);

    const populatedThesis = await Thesis.findById(thesis._id)
      .populate('author', 'name email department')
      .populate('supervisor', 'name email department');

    res.status(201).json(populatedThesis);
  } catch (error) {
    console.error('Create thesis error:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      body: req.body
    });
    
    // Check for specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error: ' + validationErrors.join(', ') 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate entry. This thesis may already exist.' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error occurred while creating thesis. Please try again.' 
    });
  }
};

// @desc    Update thesis
// @route   PUT /api/theses/:id
// @access  Private
export const updateThesis = async (req, res) => {
  try {
    const thesis = await Thesis.findById(req.params.id);

    if (!thesis) {
      return res.status(404).json({ message: 'Thesis not found' });
    }

    // Check if user is author or admin/faculty
    if (thesis.author.toString() !== req.user._id.toString() && 
        !['admin', 'faculty'].includes(req.user.role)) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedThesis = await Thesis.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('author', 'name email department');

    res.json(updatedThesis);
  } catch (error) {
    console.error('Update thesis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete thesis
// @route   DELETE /api/theses/:id
// @access  Private
export const deleteThesis = async (req, res) => {
  try {
    const thesis = await Thesis.findById(req.params.id);

    if (!thesis) {
      return res.status(404).json({ message: 'Thesis not found' });
    }

    // Check if user is author or admin
    if (thesis.author.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await thesis.deleteOne();
    res.json({ message: 'Thesis removed' });
  } catch (error) {
    console.error('Delete thesis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add comment to thesis
// @route   POST /api/theses/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { comment } = req.body;
    
    let cleanedComment = comment.trim();
    const userName = req.user.name;
    
    if (userName) {
      // Check if the comment starts with the user's name (with optional colon)
      const namePattern = new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`, 'i');
      if (namePattern.test(cleanedComment)) {
        cleanedComment = cleanedComment.replace(namePattern, '').trim();
      }
      
      // Additional check for name anywhere in the cleaned comment
      if (cleanedComment.toLowerCase().includes(userName.toLowerCase())) {
        return res.status(400).json({ message: 'Please don\'t include your name in the comment. Your name will be displayed automatically.' });
      }
      
      // If after cleaning, the comment is empty or too short
      if (cleanedComment.length < 1) {
        return res.status(400).json({ message: 'Please write a meaningful comment without including your name.' });
      }
    }
    
    const thesis = await Thesis.findById(req.params.id);

    if (!thesis) {
      return res.status(404).json({ message: 'Thesis not found' });
    }

    thesis.comments.push({
      comment: cleanedComment,
      commentedBy: req.user._id
    });

    await thesis.save();

    const updatedThesis = await Thesis.findById(req.params.id)
      .populate('author', 'name email department')
      .populate('comments.commentedBy', 'name role');

    res.json(updatedThesis);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve or reject thesis (faculty only)
// @route   POST /api/theses/:id/approve
// @access  Private (faculty)
export const approveThesis = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can approve/reject theses' });
    }
    const thesis = await Thesis.findById(req.params.id);
    if (!thesis) {
      return res.status(404).json({ message: 'Thesis not found' });
    }
    if (thesis.supervisor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not the supervisor for this thesis' });
    }
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    thesis.status = status;
    await thesis.save();

    // If this is a group thesis and it's being approved, update individual student submission status
    if (thesis.isGroupSubmission && thesis.group && status === 'approved') {
      try {
        // Get the group and its members
        const group = await Group.findById(thesis.group).populate('members.studentId');
        if (group) {
          // Update submission status for all group members
          for (const member of group.members) {
            if (member.studentId) {
              // Update the student's submission status to reflect the group approval
              const updateField = `submissionStatus.${thesis.submissionType}`;
              await User.findByIdAndUpdate(member.studentId._id, {
                [`${updateField}.status`]: 'approved',
                [`${updateField}.submissionDate`]: thesis.submissionDate,
                [`${updateField}.fileUrl`]: thesis.fileUrl,
                [`${updateField}.fileName`]: thesis.fileName,
                [`${updateField}.title`]: thesis.title
              });
            }
          }
        }
      } catch (syncError) {
        console.error('Error syncing group approval to individual students:', syncError);
        // Don't fail the approval if sync fails
      }
    }

    res.json({ message: `Thesis ${status}` });
  } catch (error) {
    console.error('Approve thesis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's theses
// @route   GET /api/theses/my-theses
// @access  Private
export const getMyTheses = async (req, res) => {
  try {
    // Get user with group information
    const user = await User.findById(req.user._id).populate('group');
    
    let theses;
    if (user.group) {
      // If user is in a group, get group theses
      theses = await Thesis.find({ group: user.group._id })
        .populate('author', 'name email department')
        .populate('group', 'name')
        .sort({ submissionDate: -1 });
    } else {
      // If user is individual, get individual theses
      theses = await Thesis.find({ author: req.user._id })
        .populate('author', 'name email department')
        .sort({ submissionDate: -1 });
    }

    res.json(theses);
  } catch (error) {
    console.error('Get my theses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get supervisee's theses (for faculty)
// @route   GET /api/theses/supervisee/:studentId
// @access  Private (faculty only)
export const getSuperviseeTheses = async (req, res) => {
  try {
    // Only faculty can access this endpoint
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can view supervisee theses' });
    }

    const { studentId } = req.params;
    
    // Verify that the supervisee is actually supervised by this faculty
    const faculty = await User.findById(req.user._id);
    
    if (!faculty.supervisees.includes(studentId)) {
      return res.status(403).json({ message: 'You are not the supervisor of this student/group' });
    }

    // First, try to find a student with this ID
    let student = await User.findById(studentId).populate('group');
    
    if (student) {
      // This is a student ID
      let theses;
      if (student.group) {
        // If student is in a group, get group theses
        theses = await Thesis.find({ group: student.group._id })
          .populate('author', 'name email department')
          .populate('group', 'name')
          .sort({ submissionDate: -1 });
      } else {
        // If student is individual, get individual theses
        theses = await Thesis.find({ author: studentId })
          .populate('author', 'name email department')
          .sort({ submissionDate: -1 });
      }
      return res.json(theses);
    } else {
      // This might be a group ID, try to find a group
      const Group = (await import('../models/Group.js')).default;
      const group = await Group.findById(studentId);
      
      if (group) {
        // This is a group ID, get group theses
        const theses = await Thesis.find({ group: studentId })
          .populate('author', 'name email department')
          .populate('group', 'name')
          .sort({ submissionDate: -1 });
        return res.json(theses);
      } else {
        return res.status(404).json({ message: 'Student or group not found' });
      }
    }
  } catch (error) {
    console.error('Get supervisee theses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

// Function to handle supervisor request
export const createThesisRequest = async (req, res) => {
  try {
    const { title, supervisorId } = req.body;
    
    if (!title || !supervisorId) {
      return res.status(400).json({ message: 'Title and supervisor ID are required' });
    }

    // Verify supervisor exists
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== 'faculty') {
      return res.status(400).json({ message: 'Invalid supervisor ID' });
    }

    // Get student with group information
    const student = await User.findById(req.user._id).populate('group');
    
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
        req => req.facultyId.toString() === supervisorId
      );
      
      if (existingGroupRequest) {
        return res.status(400).json({ message: 'Group supervisor request already sent to this faculty' });
      }

      // Add supervisor request to group
      group.supervisorRequests.push({
        facultyId: supervisorId,
        status: 'pending',
        requestedAt: new Date()
      });

      await group.save();

      // Create notification for supervisor
      const notification = await Notification.create({
        recipient: supervisorId,
        sender: req.user._id,
        type: 'group_supervisor_request',
        title: 'New Group Supervisor Request',
        message: `Group "${group.name}" has requested you as their supervisor for thesis: "${title}"`,
        relatedId: group._id,
        relatedModel: 'Group'
      });

    } else {
      // Handle individual supervisor request
      // Check if student already has a pending request to this supervisor
      const existingRequest = student.supervisorRequests?.find(
        request => request.facultyId.toString() === supervisorId && request.status === 'pending'
      );
      
      if (existingRequest) {
        return res.status(400).json({ message: 'You already have a pending request to this supervisor' });
      }

      // Update student's supervisorRequests array
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          supervisorRequests: {
            facultyId: supervisorId,
            status: 'pending',
            requestedAt: new Date()
          }
        }
      });

      // Update faculty's pendingSupervisorRequests array
      await User.findByIdAndUpdate(supervisorId, {
        $push: {
          pendingSupervisorRequests: {
            studentId: req.user._id,
            requestedAt: new Date()
          }
        }
      });

      // Create notification for supervisor
      const notification = await Notification.create({
        recipient: supervisorId,
        sender: req.user._id,
        type: 'supervisor_request',
        title: 'New Supervisor Request',
        message: `You have a new supervisor request from ${req.user.name} for thesis: "${title}"`,
        relatedId: req.user._id,
        relatedModel: 'User'
      });

      // Return the updated student info
      const updatedStudent = await User.findById(req.user._id)
        .populate('supervisorRequests.facultyId', 'name email department');

      res.status(201).json({
        message: 'Supervisor request sent successfully',
        supervisorRequests: updatedStudent.supervisorRequests
      });
    }
  } catch (err) {
    console.error('Create thesis request error:', {
      error: err.message,
      stack: err.stack,
      user: req.user._id,
      body: req.body
    });
    res.status(500).json({ message: 'Server error' });
  }
}; 

// Function to get supervisor requests for a faculty
export const getSupervisorRequests = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can view supervisor requests' });
    }

    const faculty = await User.findById(req.user._id)
      .populate('pendingSupervisorRequests.studentId', 'name email department studentId cgpa');
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Filter for pending requests only
    const pendingRequests = faculty.pendingSupervisorRequests || [];
    
    res.json(pendingRequests);
  } catch (err) {
    console.error('Get supervisor requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function to accept or reject supervisor request
export const respondToSupervisorRequest = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can respond to supervisor requests' });
    }

    const { studentId, action } = req.body; // action: 'accept' or 'reject'
    
    if (!studentId || !action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Student ID and valid action (accept/reject) are required' });
    }

    // Update student's supervisorRequests array
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find the request in student's array
    const requestIndex = student.supervisorRequests.findIndex(
      request => request.facultyId.toString() === req.user._id.toString() && request.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Supervisor request not found' });
    }

    // Update the request status
    student.supervisorRequests[requestIndex].status = action === 'accept' ? 'accepted' : 'rejected';
    
    // If accepting, set as supervisor and add to supervisees
    if (action === 'accept') {
      student.supervisor = req.user._id;
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { supervisees: studentId }
      });
    }

    await student.save();

    // Remove from faculty's pending requests
    await User.findByIdAndUpdate(req.user._id, {
      $pull: {
        pendingSupervisorRequests: { studentId: studentId }
      }
    });

    // Create notification for student
    await Notification.create({
      recipient: studentId,
      sender: req.user._id,
      type: 'supervisor_response',
      title: `Supervisor Request ${action === 'accept' ? 'Accepted' : 'Rejected'}`,
      message: `Your supervisor request has been ${action === 'accept' ? 'accepted' : 'rejected'} by ${req.user.name}`,
      relatedId: req.user._id,
      relatedModel: 'User'
    });

    res.json({ 
      message: `Supervisor request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
      action: action
    });
  } catch (err) {
    console.error('Respond to supervisor request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Download thesis PDF
// @route   GET /api/theses/:id/download
// @access  Private
export const downloadThesis = async (req, res) => {
  try {
    
    const thesis = await Thesis.findById(req.params.id);
    
    if (!thesis) {
      return res.status(404).json({ message: 'Thesis not found' });
    }

    // Check authorization - user should be the author, supervisor, or faculty
    const isAuthor = thesis.author.toString() === req.user._id.toString();
    const isSupervisor = thesis.supervisor.toString() === req.user._id.toString();
    const isFaculty = req.user.role === 'faculty';
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isSupervisor && !isFaculty && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to download this thesis' });
    }

    // Check if file exists
    if (!thesis.fileUrl) {
      return res.status(404).json({ message: 'No file available for this thesis' });
    }

    // Extract the file path from the URL
    // thesis.fileUrl might be something like "http://localhost:5000/uploads/theses/filename.pdf"
    // We need to extract just the "uploads/theses/filename.pdf" part
    let relativePath;
    if (thesis.fileUrl.startsWith('http')) {
      // Extract path from URL
      const url = new URL(thesis.fileUrl);
      relativePath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    } else {
      // Already a relative path
      relativePath = thesis.fileUrl;
    }
    
    // Get the full file path
    const filePath = path.join(process.cwd(), relativePath);
    
    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${thesis.fileName}"`);
    res.setHeader('Content-Length', fileSize);

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file' });
      }
    });

    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download thesis error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error during download' });
    }
  }
};

// @desc    Sync group submissions with individual students
// @route   POST /api/theses/sync-group-submissions
// @access  Private (Admin only)
export const syncGroupSubmissions = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can sync group submissions' });
    }

    // Get all approved group theses
    const groupTheses = await Thesis.find({
      isGroupSubmission: true,
      group: { $exists: true },
      status: 'approved'
    }).populate('group');

    let syncCount = 0;
    const errors = [];

    for (const thesis of groupTheses) {
      try {
        if (!thesis.group) continue;

        // Get group members
        const group = await Group.findById(thesis.group._id).populate('members.studentId');
        if (!group) continue;

        // Update submission status for all group members
        for (const member of group.members) {
          if (member.studentId) {
            const updateField = `submissionStatus.${thesis.submissionType}`;
            await User.findByIdAndUpdate(member.studentId._id, {
              [`${updateField}.status`]: 'approved',
              [`${updateField}.submissionDate`]: thesis.submissionDate,
              [`${updateField}.fileUrl`]: thesis.fileUrl,
              [`${updateField}.fileName`]: thesis.fileName,
              [`${updateField}.title`]: thesis.title
            });
            syncCount++;
          }
        }
      } catch (error) {
        errors.push(`Error syncing thesis ${thesis._id}: ${error.message}`);
      }
    }

    res.json({
      message: `Synced ${syncCount} individual student records with group submissions`,
      syncCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Sync group submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 