import User from '../models/User.js';
import Thesis from '../models/Thesis.js';
import Group from '../models/Group.js';
import Notification from '../models/Notification.js';
import validator from 'validator';
import moment from 'moment';

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
export const getDashboardStats = async (req, res) => {
  try {
    // Get counts for different entities
    const studentCount = await User.countDocuments({ role: 'student' });
    const facultyCount = await User.countDocuments({ role: 'faculty' });
    const thesisCount = await Thesis.countDocuments();
    const pendingTheses = await Thesis.countDocuments({ status: 'pending' });
    const approvedTheses = await Thesis.countDocuments({ status: 'approved' });
    const rejectedTheses = await Thesis.countDocuments({ status: 'rejected' });
    
    // Get thesis submissions by type
    const p1Count = await Thesis.countDocuments({ submissionType: 'P1' });
    const p2Count = await Thesis.countDocuments({ submissionType: 'P2' });
    const p3Count = await Thesis.countDocuments({ submissionType: 'P3' });
    
    // Get recent activities
    const recentTheses = await Thesis.find()
      .populate('author', 'name email department')
      .populate('supervisor', 'name email')
      .sort({ submissionDate: -1 })
      .limit(5);
    
    const recentRegistrations = await User.find({ 
      'thesisRegistration.status': 'pending' 
    }).select('name email department thesisRegistration').limit(5);

    res.json({
      stats: {
        students: studentCount,
        faculty: facultyCount,
        totalTheses: thesisCount,
        pendingTheses,
        approvedTheses,
        rejectedTheses,
        p1Submissions: p1Count,
        p2Submissions: p2Count,
        p3Submissions: p3Count
      },
      recentActivities: {
        theses: recentTheses,
        registrations: recentRegistrations
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all students and groups with their thesis submission status
// @route   GET /api/admin/students
// @access  Private (Admin only)
export const getAllStudents = async (req, res) => {
  try {
    let query = { role: 'student' };
    if (req.query.noSupervisor === 'true') {
      query.supervisor = null;
    }
    
    // Get all groups first to identify students who are part of groups
    const groups = await Group.find()
      .populate('supervisor', 'name email department')
      .populate('members.studentId', 'name email department cgpa')
      .sort({ name: 1 });

    // Get all group member IDs to exclude them from individual students list
    const groupMemberIds = [];
    groups.forEach(group => {
      group.members.forEach(member => {
        if (member.studentId && member.studentId._id) {
          groupMemberIds.push(member.studentId._id.toString());
        }
      });
    });

    // Filter out students who are part of groups
    const allStudents = await User.find(query)
      .populate('supervisor', 'name email department')
      .select('-password')
      .sort({ name: 1 });

    // Filter out students who are part of groups
    const students = allStudents.filter(student => 
      !groupMemberIds.includes(student._id.toString())
    );

    // Get thesis counts and submission status for each student
    const studentsWithTheses = await Promise.all(
      students.map(async (student) => {
        const theses = await Thesis.find({ author: student._id });
        const thesesByType = {
          P1: theses.filter(t => t.submissionType === 'P1'),
          P2: theses.filter(t => t.submissionType === 'P2'),
          P3: theses.filter(t => t.submissionType === 'P3')
        };
        
        // Create submission status object with latest submission for each type
        const submissionStatus = {};
        ['P1', 'P2', 'P3'].forEach(type => {
          const submissions = thesesByType[type];
          if (submissions.length > 0) {
            // Get the latest submission of this type
            const latestSubmission = submissions.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate))[0];
            submissionStatus[type] = {
              status: latestSubmission.status,
              submissionDate: latestSubmission.submissionDate,
              fileUrl: latestSubmission.fileUrl,
              fileName: latestSubmission.fileName,
              title: latestSubmission.title
            };
          }
        });
        
        return {
          ...student.toObject(),
          thesesCount: theses.length,
          thesesByType,
          submissionStatus,
          totalMarks: calculateTotalMarks(student.marks),
          type: 'student'
        };
      })
    );

    // Get thesis counts and submission status for each group
    const groupsWithTheses = await Promise.all(
      groups.map(async (group) => {
        const theses = await Thesis.find({ group: group._id });
        const thesesByType = {
          P1: theses.filter(t => t.submissionType === 'P1'),
          P2: theses.filter(t => t.submissionType === 'P2'),
          P3: theses.filter(t => t.submissionType === 'P3')
        };
        
        // Create submission status object with latest submission for each type
        const submissionStatus = {};
        ['P1', 'P2', 'P3'].forEach(type => {
          const submissions = thesesByType[type];
          if (submissions.length > 0) {
            // Get the latest submission of this type
            const latestSubmission = submissions.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate))[0];
            submissionStatus[type] = {
              status: latestSubmission.status,
              submissionDate: latestSubmission.submissionDate,
              fileUrl: latestSubmission.fileUrl,
              fileName: latestSubmission.fileName,
              title: latestSubmission.title
            };
          }
        });
        
        // Calculate total marks for group (P1 + P2 + P3 + Supervisor)
        const p1Score = group.p1Marks?.score || 0;
        const p2Score = group.p2Marks?.score || 0;
        const p3Score = group.p3Marks?.score || 0;
        const supervisorScore = group.supervisorMarks?.score || 0;
        const totalMarks = p1Score + p2Score + p3Score + supervisorScore;
        
        return {
          _id: group._id,
          name: group.name,
          email: `Group: ${group.name}`,
          department: group.members[0]?.studentId?.department || 'N/A',
          cgpa: null, // Groups don't have individual CGPA
          supervisor: group.supervisor,
          members: group.members.map(member => ({
            name: member.studentId?.name || 'Unknown',
            email: member.studentId?.email || 'N/A',
            department: member.studentId?.department || 'N/A',
            cgpa: member.studentId?.cgpa || null
          })),
          thesesCount: theses.length,
          thesesByType,
          submissionStatus,
          totalMarks,
          type: 'group',
          marks: {
            p1: group.p1Marks,
            p2: group.p2Marks,
            p3: group.p3Marks,
            supervisor: group.supervisorMarks
          }
        };
      })
    );

    res.json({
      students: studentsWithTheses,
      groups: groupsWithTheses
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all faculty with their supervisees
// @route   GET /api/admin/faculty
// @access  Private (Admin only)
export const getAllFaculty = async (req, res) => {
  try {
    const faculty = await User.find({ role: 'faculty' })
      .populate('supervisees', 'name email department studentId cgpa')
      .select('-password')
      .sort({ name: 1 });

    // For each faculty member, also get the groups they supervise
    const facultyWithGroups = await Promise.all(
      faculty.map(async (facultyMember) => {
        // Find groups where this faculty member is the supervisor
        const supervisedGroups = await Group.find({ supervisor: facultyMember._id })
          .populate('members.studentId', 'name email department cgpa')
          .sort({ name: 1 });

        return {
          ...facultyMember.toObject(),
          supervisedGroups
        };
      })
    );

    res.json(facultyWithGroups);
  } catch (error) {
    console.error('Get all faculty error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get detailed student information
// @route   GET /api/admin/students/:id
// @access  Private (Admin only)
export const getStudentDetails = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .populate('supervisor', 'name email department')
      .select('-password');

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all theses for this student
    const theses = await Thesis.find({ author: student._id })
      .populate('supervisor', 'name email')
      .sort({ submissionDate: -1 });

    res.json({
      student,
      theses,
      totalMarks: calculateTotalMarks(student.marks)
    });
  } catch (error) {
    console.error('Get student details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get detailed faculty information
// @route   GET /api/admin/faculty/:id
// @access  Private (Admin only)
export const getFacultyDetails = async (req, res) => {
  try {
    const faculty = await User.findById(req.params.id)
      .populate('supervisees', 'name email department studentId marks cgpa')
      .select('-password');

    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Get theses supervised by this faculty
    const supervisedTheses = await Thesis.find({ supervisor: faculty._id })
      .populate('author', 'name email department')
      .sort({ submissionDate: -1 });

    res.json({
      faculty,
      supervisedTheses
    });
  } catch (error) {
    console.error('Get faculty details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Assign marks to students and groups
// @route   POST /api/admin/assign-marks
// @access  Private (Admin only)
export const assignMarks = async (req, res) => {
  try {
    const { studentId, marksType, score, comments } = req.body;

    if (!studentId || !marksType || score === undefined || score === null) {
      return res.status(400).json({ message: 'Student ID, marks type, and score are required' });
    }

    // Correct max scores according to schema: P1 (5), P2 (10), P3 (30)
    const maxScores = { P1: 5, P2: 10, P3: 30 };
    const numericScore = parseFloat(score);

    if (isNaN(numericScore) || numericScore < 0 || numericScore > maxScores[marksType]) {
      return res.status(400).json({ 
        message: `Score must be between 0 and ${maxScores[marksType]} for ${marksType}` 
      });
    }

    const sanitizedComments = comments ? validator.escape(comments.trim()) : '';

    // Try to find as student first
    let student = await User.findById(studentId);
    let isGroup = false;
    let targetName = '';

    if (student) {
      targetName = student.name;
    } else {
      // Try to find as group
      const Group = (await import('../models/Group.js')).default;
      const group = await Group.findById(studentId);
      if (group) {
        isGroup = true;
        targetName = group.name;
      } else {
        return res.status(404).json({ message: 'Student or group not found' });
      }
    }

    const moment = (await import('moment')).default;
    // console.log(`Admin ${req.user.name} (${req.user._id}) assigning ${marksType} marks (${numericScore}/${maxScores[marksType]}) to ${isGroup ? 'group' : 'student'} ${targetName} (${studentId}) at ${moment().format('YYYY-MM-DD HH:mm:ss')}`);

    if (isGroup) {
      // Handle group marks
      const Group = (await import('../models/Group.js')).default;
      
      // Map marksType to the correct field name in Group model
      const fieldMapping = {
        'P1': 'p1Marks',
        'P2': 'p2Marks', 
        'P3': 'p3Marks',
        'SUPERVISOR': 'supervisorMarks'
      };
      
      const updateField = fieldMapping[marksType];
      if (!updateField) {
        return res.status(400).json({ message: `Invalid marks type: ${marksType}` });
      }
      
      const updateData = {
        [`${updateField}.score`]: numericScore,
        [`${updateField}.assignedBy`]: req.user._id,
        [`${updateField}.assignedAt`]: new Date(),
      };
      if (sanitizedComments) {
        updateData[`${updateField}.comments`] = sanitizedComments;
      }

      const updatedGroup = await Group.findByIdAndUpdate(
        studentId,
        updateData,
        { new: true }
      );

      // console.log('Updated group marks:', updatedGroup);

      // Create notifications for all group members and update individual student marks
      setImmediate(async () => {
        try {
          const populatedGroup = await Group.findById(studentId).populate('members.studentId');
          
          for (const member of populatedGroup.members) {
            if (!member.studentId || !member.studentId._id) {
              continue;
            }
            
            // Create notification
            await Notification.create({
              recipient: member.studentId._id,
              sender: req.user._id,
              type: 'marks_assigned',
              title: `${marksType} Marks Assigned`,
              message: `Your ${marksType} marks have been assigned by ${req.user.name}. Score: ${numericScore}/${maxScores[marksType]}`,
              relatedModel: 'Group',
              relatedId: studentId
            });

            // Update individual student marks to reflect group marks
            // Map to lowercase keys for User.marks
            const userFieldMapping = { P1: 'p1', P2: 'p2', P3: 'p3', SUPERVISOR: 'supervisor' };
            const updateField = `marks.${userFieldMapping[marksType]}`;
            const studentUpdateData = {
              [`${updateField}.score`]: numericScore,
              [`${updateField}.assignedBy`]: req.user._id,
              [`${updateField}.assignedAt`]: new Date(),
            };
            if (sanitizedComments) {
              studentUpdateData[`${updateField}.comments`] = sanitizedComments;
            }
            if (!member.studentId.marks) {
              await User.findByIdAndUpdate(member.studentId._id, { marks: {} });
            }
            await User.findByIdAndUpdate(member.studentId._id, studentUpdateData);
          }
        } catch (notificationError) {
          console.warn('Failed to create group marks notifications or update individual student marks:', notificationError);
        }
      });

      res.json({ 
        message: `${marksType} marks assigned successfully to group ${targetName}`,
        marksAssigned: {
          student: targetName,
          type: marksType,
          score: numericScore,
          isGroup: true
        }
      });
    } else {
      // Handle individual student marks
      // Map to lowercase keys for User.marks
      const userFieldMapping = { P1: 'p1', P2: 'p2', P3: 'p3' };
      const mappedType = userFieldMapping[marksType];
      if (!mappedType) {
        return res.status(400).json({ message: `Invalid marks type for individual: ${marksType}` });
      }
      const updateField = `marks.${mappedType}`;
      const updateData = {
        [`${updateField}.score`]: numericScore,
        [`${updateField}.assignedBy`]: req.user._id,
        [`${updateField}.assignedAt`]: new Date(),
      };
      if (sanitizedComments) {
        updateData[`${updateField}.comments`] = sanitizedComments;
      }

      // console.log('Update data:', updateData);
      // console.log('About to update marks for student:', studentId, updateData);

      const updatedStudent = await User.findByIdAndUpdate(
        studentId,
        updateData,
        { new: true }
      );

      if (!updatedStudent) {
        // console.log('User not found after update:', studentId);
        return res.status(404).json({ message: 'Student not found after update' });
      }

      // console.log('Student updated successfully:', updatedStudent.marks);

      // Create notification
      setImmediate(async () => {
        try {
          await Notification.create({
            recipient: studentId,
            sender: req.user._id,
            type: 'marks_assigned',
            title: `${marksType} Marks Assigned`,
            message: `Your ${marksType} marks have been assigned by ${req.user.name}. Score: ${numericScore}/${maxScores[marksType]}`,
            relatedModel: 'User',
            relatedId: studentId
          });
          // console.log('Notification created successfully');
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError);
        }
      });

      res.json({ 
        message: `${marksType} marks assigned successfully to ${targetName}`,
        marksAssigned: {
          student: targetName,
          type: marksType,
          score: numericScore,
          isGroup: false
        }
      });
    }
  } catch (error) {
    console.error('Assign marks error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('User ID:', req.user?._id);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get marks overview for all students and groups
// @route   GET /api/admin/marks-overview
// @access  Private (Admin only)
export const getMarksOverview = async (req, res) => {
  try {
    // Get all groups first to identify students who are part of groups
    const groups = await Group.find()
      .populate('supervisor', 'name')
      .populate('members.studentId', 'name email department cgpa')
      .sort({ name: 1 });

    // Get all group member IDs to exclude them from individual students list
    const groupMemberIds = [];
    groups.forEach(group => {
      group.members.forEach(member => {
        if (member.studentId && member.studentId._id) {
          groupMemberIds.push(member.studentId._id.toString());
        }
      });
    });

    // Get all students and filter out those who are part of groups
    const allStudents = await User.find({ role: 'student' })
      .populate('supervisor', 'name')
      .select('name email department studentId marks supervisor cgpa')
      .sort({ name: 1 });

    // Filter out students who are part of groups
    const students = allStudents.filter(student => 
      !groupMemberIds.includes(student._id.toString())
    );

    // Get marks overview with submission status for each student
    const studentsMarksOverview = await Promise.all(
      students.map(async (student) => {
        // Get thesis submissions for this student
        const theses = await Thesis.find({ author: student._id });
        
        // Create submission status object with latest submission for each type
        const submissionStatus = {};
        ['P1', 'P2', 'P3'].forEach(type => {
          const submissions = theses.filter(t => t.submissionType === type);
          if (submissions.length > 0) {
            // Get the latest submission of this type
            const latestSubmission = submissions.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate))[0];
            submissionStatus[type] = {
              status: latestSubmission.status,
              submissionDate: latestSubmission.submissionDate,
              fileUrl: latestSubmission.fileUrl,
              fileName: latestSubmission.fileName,
              title: latestSubmission.title
            };
          }
        });

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          department: student.department,
          studentId: student.studentId,
          supervisor: student.supervisor?.name || 'Not Assigned',
          marks: student.marks,
          submissionStatus,
          totalMarks: calculateTotalMarks(student.marks),
          type: 'student'
        };
      })
    );

    // Get marks overview with submission status for each group
    const groupsMarksOverview = await Promise.all(
      groups.map(async (group) => {
        // Get thesis submissions for this group (any member can submit for the group)
        // Filter out null studentId references and get valid member IDs
        const groupMemberIds = group.members
          .filter(member => member.studentId && member.studentId._id)
          .map(member => member.studentId._id);
        
        const theses = await Thesis.find({ author: { $in: groupMemberIds } });
        
        // Create submission status object with latest submission for each type
        const submissionStatus = {};
        ['P1', 'P2', 'P3'].forEach(type => {
          const submissions = theses.filter(t => t.submissionType === type);
          if (submissions.length > 0) {
            // Get the latest submission of this type
            const latestSubmission = submissions.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate))[0];
            submissionStatus[type] = {
              status: latestSubmission.status,
              submissionDate: latestSubmission.submissionDate,
              fileUrl: latestSubmission.fileUrl,
              fileName: latestSubmission.fileName,
              title: latestSubmission.title
            };
          }
        });

        // Calculate group marks from group document
        const groupMarks = {
          p1: group.p1Marks,
          p2: group.p2Marks,
          p3: group.p3Marks,
          supervisor: group.supervisorMarks
        };

        return {
          _id: group._id,
          name: group.name,
          email: `Group: ${group.name}`,
          department: group.members[0]?.studentId?.department || 'Not specified',
          studentId: `Group-${group._id}`,
          supervisor: group.supervisor?.name || 'Not Assigned',
          marks: groupMarks,
          submissionStatus,
          totalMarks: calculateTotalMarks(groupMarks),
          type: 'group',
          members: group.members
            .filter(member => member.studentId) // Filter out null studentId references
            .map(member => ({
              name: member.studentId.name,
              email: member.studentId.email,
              department: member.studentId.department,
              cgpa: member.studentId.cgpa
            }))
        };
      })
    );

    // Combine students and groups
    const allMarksOverview = [...studentsMarksOverview, ...groupsMarksOverview];

    res.json(allMarksOverview);
  } catch (error) {
    console.error('Get marks overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate total marks
const calculateTotalMarks = (marks) => {
  if (!marks) return 0;
  
  const p1 = marks.p1?.score || 0;
  const p2 = marks.p2?.score || 0;
  const p3 = marks.p3?.score || 0;
  const supervisor = marks.supervisor?.score || 0;
  
  return p1 + p2 + p3 + supervisor;
}; 