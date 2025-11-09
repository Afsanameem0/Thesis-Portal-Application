import User from '../models/User.js';
import Thesis from '../models/Thesis.js';
import Group from '../models/Group.js';
import Notification from '../models/Notification.js';
import validator from 'validator';
import moment from 'moment';

// @desc    Get current user's marks (students only)
// @route   GET /api/marks/my-marks
// @access  Private (Students)
export const getMyMarks = async (req, res) => {
  try {
    // console.log('getMyMarks called for user:', req.user._id, req.user.role);
    
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can view their marks' });
    }

    // Include supervisor details for individual students
    const student = await User.findById(req.user._id)
      .populate('supervisor', 'name email department');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // console.log('Student found:', student.name);
    // console.log('Student marks:', student.marks);

    // Initialize marks if they don't exist
    if (!student.marks) {
      // console.log('Initializing marks for student:', student.name);
      student.marks = {};
      await student.save();
    }

    // Check if student is part of a group
    const Group = (await import('../models/Group.js')).default;
    const group = await Group.findOne({ 'members.studentId': req.user._id })
      .populate('supervisor', 'name email department')
      .populate('members.studentId', 'name email department');

    let marks = student.marks;
    let isGroupMember = false;
    let groupInfo = null;

    if (group) {
      isGroupMember = true;
      groupInfo = {
        id: group._id,
        name: group.name,
        supervisor: group.supervisor,
        members: group.members
      };

      // Check if individual student has marks assigned
      const hasIndividualMarks = student.marks && (
        student.marks.p1?.score !== null && student.marks.p1?.score !== undefined ||
        student.marks.p2?.score !== null && student.marks.p2?.score !== undefined ||
        student.marks.p3?.score !== null && student.marks.p3?.score !== undefined ||
        student.marks.supervisor?.score !== null && student.marks.supervisor?.score !== undefined
      );

      if (hasIndividualMarks) {
        // Use individual student marks if they exist
        marks = student.marks;
      } else {
        // Use group marks if no individual marks are assigned
        marks = {
          p1: group.p1Marks,
          p2: group.p2Marks,
          p3: group.p3Marks,
          supervisor: group.supervisorMarks
        };
      }
    }

    // Calculate total marks
    const totalMarks = calculateTotalMarks(marks);
    const totalPossible = 100; // P1(5) + P2(10) + P3(30) + Supervisor(55)

      res.json({
      student: {
        name: student.name,
        email: student.email,
        department: student.department,
        studentId: student.studentId,
        cgpa: student.cgpa,
        // Prefer group supervisor if in a group; otherwise use individual's assigned supervisor
        supervisor: groupInfo?.supervisor || student.supervisor || null
      },
      marks: marks,
      totalMarks: totalMarks,
      totalPossible: totalPossible,
      isGroupMember: isGroupMember,
      groupInfo: groupInfo
    });
  } catch (error) {
    console.error('Get my marks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get supervisee's marks (faculty only)
// @route   GET /api/marks/supervisee/:studentId
// @access  Private (Faculty)
export const getSuperviseeMarks = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify the student is supervised by this faculty
    const faculty = await User.findById(req.user._id);
    if (!faculty.supervisees.includes(studentId)) {
      return res.status(403).json({ message: 'You are not the supervisor of this student' });
    }

    const student = await User.findById(studentId)
      .populate('marks.p1.assignedBy', 'name role')
      .populate('marks.p2.assignedBy', 'name role')
      .populate('marks.p3.assignedBy', 'name role')
      .populate('marks.supervisor.assignedBy', 'name role')
      .select('name email department marks');

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get thesis submissions
    const theses = await Thesis.find({ author: studentId });
    const submissionStatus = {
      P1: theses.find(t => t.submissionType === 'P1'),
      P2: theses.find(t => t.submissionType === 'P2'),
      P3: theses.find(t => t.submissionType === 'P3')
    };

    const marksData = {
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        department: student.department
      },
      marks: student.marks,
      submissionStatus,
      totalMarks: calculateTotalMarks(student.marks),
      canAssignSupervisorMarks: true
    };

    res.json(marksData);
  } catch (error) {
    console.error('Get supervisee marks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllMarks = async (req, res) => {
  try {
    const marks = await User.find({ role: 'student' }).select('name marks');
    res.json(marks);
  } catch (error) {
    console.error('Get all marks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getStudentMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId).select('name marks cgpa');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student.marks);
  } catch (error) {
    console.error('Get student marks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSuperviseesMarks = async (req, res) => {
  try {
    const facultyId = req.user._id;
    // console.log('Faculty ID:', facultyId);
    // console.log('Faculty user data:', req.user);

    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can view supervisee marks' });
    }

    // Get faculty with populated supervisees
    const populatedFaculty = await User.findById(facultyId)
      .populate('supervisees', 'name email department studentId cgpa marks');

    if (!populatedFaculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // console.log('Raw faculty data:', {
    //   id: populatedFaculty._id,
    //   name: populatedFaculty.name,
    //   supervisees: populatedFaculty.supervisees?.length || 0
    // });

    // Get groups with this faculty as supervisor
    const Group = (await import('../models/Group.js')).default;
    const groupsWithSupervisor = await Group.find({ supervisor: facultyId })
      .populate('supervisor', 'name email department')
      .populate('members.studentId', 'name email department cgpa')
      .select('name members supervisor supervisorMarks p1Marks p2Marks p3Marks');

    // Get all group member IDs to exclude them from individual students list
    const groupMemberIds = [];
    groupsWithSupervisor.forEach(group => {
      group.members.forEach(member => {
        if (member.studentId && member.studentId._id) {
          groupMemberIds.push(member.studentId._id.toString());
        }
      });
    });

    // Get students with this faculty as supervisor
    const allStudentsWithSupervisor = await User.find({ supervisor: facultyId })
      .populate('supervisor', 'name email department')
      .select('name email department studentId cgpa marks supervisor');

    // Always exclude students who are part of groups from the individual list
    // so groups consistently appear as a single entity for supervisor marking
    const studentsWithSupervisor = allStudentsWithSupervisor.filter(student => {
      const isGroupMember = groupMemberIds.includes(student._id.toString());
      return !isGroupMember;
    });

    // console.log('Students with this faculty as supervisor:', studentsWithSupervisor.length);
    // console.log('Groups with this faculty as supervisor:', groupsWithSupervisor.length);

    // Process individual students
    const studentsWithMarks = [];
    // console.log('Populated faculty supervisees:', populatedFaculty.supervisees.length);
    // console.log('Number of supervisees:', populatedFaculty.supervisees.length);

    for (const student of studentsWithSupervisor) {
      // console.log('Processing student:', student.name, student._id);

      // Calculate total marks
      let totalMarks = 0;
      let maxPossibleMarks = 0;
      const marksBreakdown = {};

      if (student.marks) {
        // P1 marks (max 25)
        if (student.marks.p1 && student.marks.p1.score !== null && student.marks.p1.score !== undefined) {
          marksBreakdown.p1 = student.marks.p1.score;
          totalMarks += student.marks.p1.score;
          maxPossibleMarks += 25;
        }

        // P2 marks (max 25)
        if (student.marks.p2 && student.marks.p2.score !== null && student.marks.p2.score !== undefined) {
          marksBreakdown.p2 = student.marks.p2.score;
          totalMarks += student.marks.p2.score;
          maxPossibleMarks += 25;
        }

        // P3 marks (max 25)
        if (student.marks.p3 && student.marks.p3.score !== null && student.marks.p3.score !== undefined) {
          marksBreakdown.p3 = student.marks.p3.score;
          totalMarks += student.marks.p3.score;
          maxPossibleMarks += 25;
        }

        // Supervisor marks (max 25)
        if (student.marks.supervisor && student.marks.supervisor.score !== null && student.marks.supervisor.score !== undefined) {
          marksBreakdown.supervisor = student.marks.supervisor.score;
          totalMarks += student.marks.supervisor.score;
          maxPossibleMarks += 25;
        }
      }

      studentsWithMarks.push({
        _id: student._id,
        name: student.name,
        email: student.email,
        department: student.department,
        studentId: student.studentId,
        cgpa: student.cgpa,
        supervisor: student.supervisor,
        marks: student.marks,
        totalMarks,
        maxPossibleMarks,
        marksBreakdown,
        type: 'student'
      });
    }

    // Process groups (excluding groups where members have individual marks)
    const groupsWithMarks = [];
    // console.log('Processing group:', group.name, group._id);

    for (const group of groupsWithSupervisor) {
      // Always include the group so supervisors can mark the whole group
      // Calculate total marks for group
      let totalMarks = 0;
      let maxPossibleMarks = 0;
      const marksBreakdown = {};

      // P1 marks (max 25)
      if (group.p1Marks && group.p1Marks.score !== null && group.p1Marks.score !== undefined) {
        marksBreakdown.p1 = group.p1Marks.score;
        totalMarks += group.p1Marks.score;
        maxPossibleMarks += 25;
      }

      // P2 marks (max 25)
      if (group.p2Marks && group.p2Marks.score !== null && group.p2Marks.score !== undefined) {
        marksBreakdown.p2 = group.p2Marks.score;
        totalMarks += group.p2Marks.score;
        maxPossibleMarks += 25;
      }

      // P3 marks (max 25)
      if (group.p3Marks && group.p3Marks.score !== null && group.p3Marks.score !== undefined) {
        marksBreakdown.p3 = group.p3Marks.score;
        totalMarks += group.p3Marks.score;
        maxPossibleMarks += 25;
      }

      // Supervisor marks (max 25)
      if (group.supervisorMarks && group.supervisorMarks.score !== null && group.supervisorMarks.score !== undefined) {
        marksBreakdown.supervisor = group.supervisorMarks.score;
        totalMarks += group.supervisorMarks.score;
        maxPossibleMarks += 25;
      }

      groupsWithMarks.push({
        _id: group._id,
        name: group.name,
        members: group.members,
        supervisor: group.supervisor,
        marks: {
          p1: group.p1Marks,
          p2: group.p2Marks,
          p3: group.p3Marks,
          supervisor: group.supervisorMarks
        },
        totalMarks,
        maxPossibleMarks,
        marksBreakdown,
        type: 'group'
      });
    }

    // Combine students and groups
    const allSuperviseesWithMarks = [...studentsWithMarks, ...groupsWithMarks];
    // console.log('Total supervisees with marks:', allSuperviseesWithMarks.length);

    res.json(allSuperviseesWithMarks);
  } catch (error) {
    console.error('getSuperviseesMarks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Assign supervisor marks (faculty only)
// @route   POST /api/marks/assign-supervisor-marks
// @access  Private (Faculty)
export const assignSupervisorMarks = async (req, res) => {
  try {
    const { studentId, score, comments } = req.body;

    if (!studentId || score === undefined || score === null) {
      return res.status(400).json({ message: 'Student ID and score are required' });
    }

    const maxScore = 55;
    const numericScore = parseFloat(score);

    if (isNaN(numericScore) || numericScore < 0 || numericScore > maxScore) {
      return res.status(400).json({ 
        message: `Score must be between 0 and ${maxScore} for supervisor marks` 
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
        
        // Check if P3 marks have been assigned for groups
        if (!group.p3Marks || group.p3Marks.score === null || group.p3Marks.score === undefined) {
          return res.status(400).json({ 
            message: 'P3 marks must be assigned before supervisor can assign marks to this group' 
          });
        }
      } else {
        return res.status(404).json({ message: 'Student or group not found' });
      }
    }

    const moment = (await import('moment')).default;

    if (isGroup) {
      // Handle group supervisor marks
      const Group = (await import('../models/Group.js')).default;
      const updateData = {
        'supervisorMarks.score': numericScore,
        'supervisorMarks.assignedBy': req.user._id,
        'supervisorMarks.assignedAt': new Date(),
      };
      if (sanitizedComments) {
        updateData['supervisorMarks.comments'] = sanitizedComments;
      }

      const updatedGroup = await Group.findByIdAndUpdate(
        studentId,
        updateData,
        { new: true }
      );

      // console.log('Updated group marks:', updatedGroup.supervisorMarks);

             // Create notifications for all group members
       setImmediate(async () => {
         try {
           const populatedGroup = await Group.findById(studentId).populate('members.studentId');
           
           for (const member of populatedGroup.members) {
             if (!member.studentId || !member.studentId._id) {
               continue;
             }
             
             await Notification.create({
               recipient: member.studentId._id,
               sender: req.user._id,
               type: 'supervisor_marks_assigned',
               title: 'Supervisor Marks Assigned',
               message: `Your group supervisor marks have been assigned by ${req.user.name}. Score: ${numericScore}/${maxScore}`,
               relatedModel: 'Group',
               relatedId: studentId
             });
           }
         } catch (notificationError) {
           console.warn('Failed to create group supervisor marks notifications:', notificationError);
         }
       });

      res.json({ 
        message: `Supervisor marks assigned successfully to group ${targetName}`,
        marksAssigned: {
          student: targetName,
          type: 'supervisor',
          score: numericScore,
          isGroup: true
        }
      });
    } else {
      // Handle individual student supervisor marks
      const updateData = {
        'marks.supervisor.score': numericScore,
        'marks.supervisor.assignedBy': req.user._id,
        'marks.supervisor.assignedAt': new Date(),
      };
      if (sanitizedComments) {
        updateData['marks.supervisor.comments'] = sanitizedComments;
      }

      const updatedStudent = await User.findByIdAndUpdate(
        studentId,
        updateData,
        { new: true }
      );

      if (!updatedStudent) {
        return res.status(404).json({ message: 'Student not found after update' });
      }

      // Create notification
      setImmediate(async () => {
        try {
          await Notification.create({
            recipient: studentId,
            sender: req.user._id,
            type: 'supervisor_marks_assigned',
            title: 'Supervisor Marks Assigned',
            message: `Your supervisor marks have been assigned by ${req.user.name}. Score: ${numericScore}/${maxScore}`,
            relatedModel: 'User',
            relatedId: studentId
          });
          // console.log('Supervisor marks notification created successfully');
        } catch (notificationError) {
          console.warn('Failed to create supervisor marks notification:', notificationError);
        }
      });

      res.json({ 
        message: `Supervisor marks assigned successfully to ${targetName}`,
        marksAssigned: {
          student: targetName,
          type: 'supervisor',
          score: numericScore,
          isGroup: false
        }
      });
    }
  } catch (error) {
    console.error('Assign supervisor marks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update supervisor marks (faculty only)
// @route   PUT /api/marks/update-supervisor-marks
// @access  Private (Faculty)
export const updateSupervisorMarks = async (req, res) => {
  try {
    const { studentId, score, comments } = req.body;

    if (!studentId || score === undefined || score === null) {
      return res.status(400).json({ message: 'Student ID and score are required' });
    }

    const maxScore = 55;
    const numericScore = parseFloat(score);

    if (isNaN(numericScore) || numericScore < 0 || numericScore > maxScore) {
      return res.status(400).json({ 
        message: `Score must be between 0 and ${maxScore} for supervisor marks` 
      });
    }

    const sanitizedComments = comments ? validator.escape(comments.trim()) : '';

    // Try to find as student first
    let student = await User.findById(studentId);
    let isGroup = false;
    let targetName = '';

    if (student) {
      targetName = student.name;
      // Check if supervisor marks exist
      if (!student.marks?.supervisor?.score) {
        return res.status(400).json({ message: 'No supervisor marks found to update' });
      }
    } else {
      // Try to find as group
      const Group = (await import('../models/Group.js')).default;
      const group = await Group.findById(studentId);
      if (group) {
        isGroup = true;
        targetName = group.name;
        
        // Check if supervisor marks exist
        if (!group.supervisorMarks?.score) {
          return res.status(400).json({ message: 'No supervisor marks found to update' });
        }
      } else {
        return res.status(404).json({ message: 'Student or group not found' });
      }
    }

    const moment = (await import('moment')).default;

    if (isGroup) {
      // Handle group supervisor marks update
      const Group = (await import('../models/Group.js')).default;
      const updateData = {
        'supervisorMarks.score': numericScore,
        'supervisorMarks.updatedBy': req.user._id,
        'supervisorMarks.updatedAt': new Date(),
      };
      if (sanitizedComments !== undefined) {
        updateData['supervisorMarks.comments'] = sanitizedComments;
      }

      const updatedGroup = await Group.findByIdAndUpdate(
        studentId,
        updateData,
        { new: true }
      );

      // Create notifications for all group members
      setImmediate(async () => {
        try {
          const populatedGroup = await Group.findById(studentId).populate('members.studentId');
          for (const member of populatedGroup.members) {
            await Notification.create({
              recipient: member.studentId._id,
              sender: req.user._id,
              type: 'supervisor_marks_updated',
              title: 'Supervisor Marks Updated',
              message: `Your group supervisor marks have been updated by ${req.user.name}. New Score: ${numericScore}/${maxScore}`,
              relatedModel: 'Group',
              relatedId: studentId
            });
          }
        } catch (notificationError) {
          console.warn('Failed to create group supervisor marks update notifications:', notificationError);
        }
      });

      res.json({ 
        message: `Supervisor marks updated successfully for group ${targetName}`,
        marksUpdated: {
          student: targetName,
          type: 'supervisor',
          score: numericScore,
          isGroup: true
        }
      });
    } else {
      // Handle individual student supervisor marks update
      const updateData = {
        'marks.supervisor.score': numericScore,
        'marks.supervisor.updatedBy': req.user._id,
        'marks.supervisor.updatedAt': new Date(),
      };
      if (sanitizedComments !== undefined) {
        updateData['marks.supervisor.comments'] = sanitizedComments;
      }

      const updatedStudent = await User.findByIdAndUpdate(
        studentId,
        updateData,
        { new: true }
      );

      if (!updatedStudent) {
        return res.status(404).json({ message: 'Student not found after update' });
      }

      // Create notification
      setImmediate(async () => {
        try {
          await Notification.create({
            recipient: studentId,
            sender: req.user._id,
            type: 'supervisor_marks_updated',
            title: 'Supervisor Marks Updated',
            message: `Your supervisor marks have been updated by ${req.user.name}. New Score: ${numericScore}/${maxScore}`,
            relatedModel: 'User',
            relatedId: studentId
          });
        } catch (notificationError) {
          console.warn('Failed to create supervisor marks update notification:', notificationError);
        }
      });

      res.json({ 
        message: `Supervisor marks updated successfully for ${targetName}`,
        marksUpdated: {
          student: targetName,
          type: 'supervisor',
          score: numericScore,
          isGroup: false
        }
      });
    }
  } catch (error) {
    console.error('Update supervisor marks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get marks history for current user
// @route   GET /api/marks/history
// @access  Private
export const getMarksHistory = async (req, res) => {
  try {
    let marksHistory = [];

    if (req.user.role === 'student') {
      // Get student's own marks history
      const student = await User.findById(req.user._id)
        .populate('marks.p1.assignedBy', 'name role')
        .populate('marks.p2.assignedBy', 'name role')
        .populate('marks.p3.assignedBy', 'name role')
        .populate('marks.supervisor.assignedBy', 'name role');

      if (student.marks) {
        ['p1', 'p2', 'p3', 'supervisor'].forEach(type => {
          if (student.marks[type] && student.marks[type].score !== null) {
            marksHistory.push({
              type,
              score: student.marks[type].score,
              maxScore: type === 'supervisor' ? 55 : (type === 'p1' ? 5 : type === 'p2' ? 10 : 30),
              assignedBy: student.marks[type].assignedBy,
              assignedAt: student.marks[type].assignedAt,
              comments: student.marks[type].comments
            });
          }
        });
      }
    } else if (req.user.role === 'faculty') {
      // Get marks assigned by this faculty
      const students = await User.find({
        $or: [
          { 'marks.supervisor.assignedBy': req.user._id },
          { supervisor: req.user._id }
        ]
      }).populate('marks.supervisor.assignedBy', 'name role')
        .select('name email marks');

      students.forEach(student => {
        if (student.marks?.supervisor && student.marks.supervisor.assignedBy?.toString() === req.user._id.toString()) {
          marksHistory.push({
            studentName: student.name,
            studentEmail: student.email,
            type: 'supervisor',
            score: student.marks.supervisor.score,
            maxScore: 55,
            assignedAt: student.marks.supervisor.assignedAt,
            comments: student.marks.supervisor.comments
          });
        }
      });
    }

    // Sort by assigned date (newest first)
    marksHistory.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));

    res.json(marksHistory);
  } catch (error) {
    console.error('Get marks history error:', error);
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