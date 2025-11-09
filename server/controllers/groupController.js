import User from '../models/User.js';
import Group from '../models/Group.js';
import { createNotification } from './notificationController.js';

// Get all students without supervisors (for group formation)
export const getAvailableStudents = async (req, res) => {
  try {
    console.log('Fetching available students for user:', req.user.id);
    console.log('User details:', req.user);

    // Get all students who don't have a supervisor (regardless of group status)
    const students = await User.find({
      role: 'student',
      supervisor: null
    }).select('name email department studentId cgpa bio');

    console.log('Found students:', students.length);
    console.log('Student IDs:', students.map(s => ({ id: s._id, name: s.name })));

    res.json(students);
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send group formation request
export const sendGroupRequest = async (req, res) => {
  try {
    const { targetStudentId } = req.body;
    const fromStudentId = req.user.id;

    // Prevent students from grouping with themselves
    if (fromStudentId === targetStudentId) {
      return res.status(400).json({ message: 'You cannot send a group request to yourself' });
    }

    // Check if both students are available for group formation
    const fromStudent = await User.findById(fromStudentId);
    const targetStudent = await User.findById(targetStudentId);

    if (!fromStudent || !targetStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (fromStudent.supervisor) {
      return res.status(400).json({ message: 'You already have a supervisor' });
    }

    if (targetStudent.supervisor) {
      return res.status(400).json({ message: 'Target student already has a supervisor' });
    }

    // Check if request already exists
    const existingRequest = targetStudent.groupRequests.find(
      request => request.fromStudentId.toString() === fromStudentId
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Group request already sent' });
    }

    // Add group request
    targetStudent.groupRequests.push({
      fromStudentId: fromStudentId,
      status: 'pending'
    });

    await targetStudent.save();

    res.json({ message: 'Group request sent successfully' });
  } catch (error) {
    console.error('Error sending group request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept group formation request
export const acceptGroupRequest = async (req, res) => {
  try {
    const { fromStudentId } = req.body;
    const targetStudentId = req.user.id;

    const fromStudent = await User.findById(fromStudentId);
    const targetStudent = await User.findById(targetStudentId);

    if (!fromStudent || !targetStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find the group request
    const groupRequest = targetStudent.groupRequests.find(
      request => request.fromStudentId.toString() === fromStudentId
    );

    if (!groupRequest) {
      return res.status(404).json({ message: 'Group request not found' });
    }

    if (groupRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    // Create a new group
    const group = new Group({
      name: `Group: ${fromStudent.name} & ${targetStudent.name}`,
      members: [
        { studentId: fromStudentId },
        { studentId: targetStudentId }
      ]
    });

    // Validate group size on creation (min 2, max 4 is naturally satisfied here)
    await group.save();

    // Update both students
    fromStudent.group = group._id;
    targetStudent.group = group._id;

    // Remove all group requests for both students
    fromStudent.groupRequests = [];
    targetStudent.groupRequests = [];

    await fromStudent.save();
    await targetStudent.save();

    res.json({ message: 'Group formed successfully', groupId: group._id });
  } catch (error) {
    console.error('Error accepting group request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject group formation request
export const rejectGroupRequest = async (req, res) => {
  try {
    const { fromStudentId } = req.body;
    const targetStudentId = req.user.id;

    const targetStudent = await User.findById(targetStudentId);

    if (!targetStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find and update the group request
    const groupRequest = targetStudent.groupRequests.find(
      request => request.fromStudentId.toString() === fromStudentId
    );

    if (!groupRequest) {
      return res.status(404).json({ message: 'Group request not found' });
    }

    groupRequest.status = 'rejected';
    await targetStudent.save();

    res.json({ message: 'Group request rejected' });
  } catch (error) {
    console.error('Error rejecting group request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get group requests for a student
export const getGroupRequests = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await User.findById(studentId).populate('groupRequests.fromStudentId', 'name email department studentId');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student.groupRequests);
  } catch (error) {
    console.error('Error fetching group requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get group details
export const getGroupDetails = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await User.findById(studentId).populate({
      path: 'group',
      populate: [
        {
          path: 'members.studentId',
          select: 'name email department studentId cgpa bio profileImage'
        },
        {
          path: 'supervisor',
          select: 'name email department'
        },
        {
          path: 'supervisorRequests.facultyId',
          select: 'name email department'
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.group) {
      return res.status(404).json({ message: 'No group found' });
    }

    res.json(student.group);
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get group by ID (for faculty to view group details)
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.studentId', 'name email department studentId cgpa bio profileImage')
      .populate('supervisor', 'name email department')
      .populate('supervisorRequests.facultyId', 'name email department');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send supervisor request from group
export const sendGroupSupervisorRequest = async (req, res) => {
  try {
    const { facultyId } = req.body;
    const studentId = req.user.id;

    const student = await User.findById(studentId).populate('group');
    const faculty = await User.findById(facultyId);

    if (!student || !faculty) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!student.group) {
      return res.status(400).json({ message: 'You are not in a group' });
    }

    if (faculty.role !== 'faculty') {
      return res.status(400).json({ message: 'Invalid faculty member' });
    }

    // Check if group already has a supervisor
    if (student.group.supervisor) {
      return res.status(400).json({ message: 'Group already has a supervisor' });
    }

    // Check if request already exists
    const existingRequest = student.group.supervisorRequests.find(
      request => request.facultyId.toString() === facultyId
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Supervisor request already sent' });
    }

    // Add supervisor request to group
    student.group.supervisorRequests.push({
      facultyId: facultyId,
      status: 'pending'
    });

    await student.group.save();

    res.json({ message: 'Supervisor request sent successfully' });
  } catch (error) {
    console.error('Error sending group supervisor request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept group supervisor request (faculty)
export const acceptGroupSupervisorRequest = async (req, res) => {
  try {
    const { groupId } = req.body;
    const facultyId = req.user.id;

    const faculty = await User.findById(facultyId);
    const group = await Group.findById(groupId);

    if (!faculty || !group) {
      return res.status(404).json({ message: 'User or group not found' });
    }

    if (faculty.role !== 'faculty') {
      return res.status(400).json({ message: 'Only faculty can accept supervisor requests' });
    }

    // Check if faculty has available seats
    // Count individual students and groups (each group counts as 1 seat)
    const currentSupervisees = faculty.supervisees.length;
    if (currentSupervisees >= faculty.seatCapacity) {
      return res.status(400).json({ message: 'No available seats for supervision' });
    }

    // Find the supervisor request
    const supervisorRequest = group.supervisorRequests.find(
      request => request.facultyId.toString() === facultyId
    );

    if (!supervisorRequest) {
      return res.status(404).json({ message: 'Supervisor request not found' });
    }

    if (supervisorRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    // Accept the request
    supervisorRequest.status = 'accepted';
    group.supervisor = facultyId;

    // Add group to faculty's supervisees (counts as ONE seat for the entire group)
    // We add the group ID instead of individual members to represent one seat
    if (!faculty.supervisees.includes(groupId)) {
      faculty.supervisees.push(groupId);
    }

    // Update supervisor field for all students in the group
    const studentIds = group.members.map(member => member.studentId);
    await User.updateMany(
      { _id: { $in: studentIds } },
      { supervisor: facultyId }
    );

    // Create notifications for all students in the group
    for (const studentId of studentIds) {
      await createNotification(
        studentId,
        facultyId,
        'supervisor_response',
        'Group Supervisor Request Accepted',
        `${faculty.name} has accepted your group's supervisor request`,
        facultyId,
        'User'
      );
    }

    await group.save();
    await faculty.save();

    res.json({ message: 'Group supervisor request accepted' });
  } catch (error) {
    console.error('Error accepting group supervisor request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject group supervisor request (faculty)
export const rejectGroupSupervisorRequest = async (req, res) => {
  try {
    const { groupId } = req.body;
    const facultyId = req.user.id;

    const faculty = await User.findById(facultyId);
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Find and update the supervisor request
    const supervisorRequest = group.supervisorRequests.find(
      request => request.facultyId.toString() === facultyId
    );

    if (!supervisorRequest) {
      return res.status(404).json({ message: 'Supervisor request not found' });
    }

    supervisorRequest.status = 'rejected';
    await group.save();

    // Create notifications for all students in the group
    const studentIds = group.members.map(member => member.studentId);
    for (const studentId of studentIds) {
      await createNotification(
        studentId,
        facultyId,
        'supervisor_response',
        'Group Supervisor Request Declined',
        `${faculty.name} has declined your group's supervisor request`,
        facultyId,
        'User'
      );
    }

    res.json({ message: 'Group supervisor request rejected' });
  } catch (error) {
    console.error('Error rejecting group supervisor request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all groups (admin only)
export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('members.studentId', 'name email department studentId')
      .populate('supervisor', 'name email department')
      .populate('supervisorRequests.facultyId', 'name email department');

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove member from group (admin only)
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, studentId } = req.body;

    const group = await Group.findById(groupId);
    const student = await User.findById(studentId);

    if (!group || !student) {
      return res.status(404).json({ message: 'Group or student not found' });
    }

    // Prevent removing a member if it would drop below minimum size (2), unless removing last member deletes group
    const newSize = group.members.filter(member => member.studentId.toString() !== studentId).length;
    if (newSize > 0 && newSize < 2) {
      return res.status(400).json({ message: 'Group must have at least 2 members' });
    }

    // Remove student from group
    group.members = group.members.filter(member => member.studentId.toString() !== studentId);

    // If group becomes empty, delete it
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
    } else {
      await group.save();
    }

    // Update student's group reference
    student.group = null;
    await student.save();

    res.json({ message: 'Member removed from group successfully' });
  } catch (error) {
    console.error('Error removing group member:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove supervisor from group (admin only)
export const removeGroupSupervisor = async (req, res) => {
  try {
    const { groupId } = req.body;

    const group = await Group.findById(groupId);
    const faculty = await User.findById(group.supervisor);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (faculty) {
      // Remove group from faculty's supervisees (group counts as one seat)
      faculty.supervisees = faculty.supervisees.filter(
        superviseeId => superviseeId.toString() !== groupId
      );
      await faculty.save();
    }

    // Remove supervisor from all students in the group
    const studentIds = group.members.map(member => member.studentId);
    await User.updateMany(
      { _id: { $in: studentIds } },
      { supervisor: null }
    );

    // Create notifications for all students in the group
    for (const studentId of studentIds) {
      await createNotification(
        studentId,
        faculty?._id || null,
        'supervisor_removed',
        'Supervisor Removed',
        'Your group supervisor has been removed by an administrator',
        faculty?._id || null,
        'User'
      );
    }

    // Remove supervisor from group
    group.supervisor = null;
    group.supervisorRequests = [];
    await group.save();

    res.json({ message: 'Supervisor removed from group successfully' });
  } catch (error) {
    console.error('Error removing group supervisor:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 