import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../../components/Toaster';

const GroupFormation = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToaster();
  const [availableStudents, setAvailableStudents] = useState([]);
  const [groupRequests, setGroupRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);

  useEffect(() => {
    fetchAvailableStudents();
    fetchGroupRequests();
  }, []);

  const fetchAvailableStudents = async () => {
    try {
      console.log('Fetching available students...');
      console.log('Token:', localStorage.getItem('token'));
      console.log('Current user:', user);
      
      const response = await axios.get('/api/groups/available-students', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Raw students from backend:', response.data);
      console.log('Current user ID:', user._id);
      console.log('Current user details:', {
        name: user.name,
        email: user.email,
        department: user.department,
        supervisor: user.supervisor,
        group: user.group
      });

      const filteredStudents = response.data.filter(student => {
        // Filter out current user
        if (student._id === user._id) {
          console.log('Filtering out current user:', student.name, student._id);
          return false;
        }

        // Filter out students who already have a supervisor
        if (student.supervisor) {
          console.log('Filtering out student with supervisor:', student.name, student._id);
          return false;
        }

        return true;
      });

      console.log('Filtered students:', filteredStudents);
      setAvailableStudents(filteredStudents);
    } catch (error) {
      console.error('Error fetching available students:', error);
      showError('Error fetching available students');
    }
  };

  const fetchGroupRequests = async () => {
    try {
      const response = await axios.get('/api/groups/requests');
      setGroupRequests(response.data);
    } catch (error) {
      console.error('Error fetching group requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendGroupRequest = async (targetStudentId) => {
    try {
      await axios.post('/api/groups/send-request', { targetStudentId });
      showSuccess('Group request sent successfully!');
      fetchAvailableStudents(); // Refresh the list
    } catch (error) {
      console.error('Error sending group request:', error);
      showError(error.response?.data?.message || 'Error sending group request');
    }
  };

  const acceptGroupRequest = async (fromStudentId) => {
    try {
      await axios.post('/api/groups/accept-request', { fromStudentId });
      showSuccess('Group formed successfully!');
      fetchGroupRequests();
      fetchAvailableStudents();
    } catch (error) {
      console.error('Error accepting group request:', error);
      showError(error.response?.data?.message || 'Error accepting group request');
    }
  };

  const rejectGroupRequest = async (fromStudentId) => {
    try {
      await axios.post('/api/groups/reject-request', { fromStudentId });
      showInfo('Group request rejected');
      fetchGroupRequests();
    } catch (error) {
      console.error('Error rejecting group request:', error);
      showError(error.response?.data?.message || 'Error rejecting group request');
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setShowStudentDetails(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Group Formation</h1>
        <p className="text-gray-600">Find students to form a group for your thesis project</p>
      </div>



      {/* Group Requests Section */}
      {groupRequests.length > 0 && (
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Group Requests</h2>
          <div className="space-y-4">
            {groupRequests.map((request, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {request.fromStudentId.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {request.fromStudentId.department} • {request.fromStudentId.studentId}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested: {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => acceptGroupRequest(request.fromStudentId._id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectGroupRequest(request.fromStudentId._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Students Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Available Students</h2>
        {availableStudents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No available students found</p>
            
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableStudents.map((student) => (
              <div
                key={student._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleStudentClick(student)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{student.name}</h3>
                    <p className="text-sm text-gray-600">{student.department}</p>
                    <p className="text-xs text-gray-500">{student.studentId}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sendGroupRequest(student._id);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Send Group Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showStudentDetails && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Student Details</h3>
              <button
                onClick={() => setShowStudentDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-xl">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedStudent.name}</h4>
                  <p className="text-sm text-gray-600">{selectedStudent.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700">Department:</span>
                  <p className="text-gray-900">{selectedStudent.department}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Student ID:</span>
                  <p className="text-gray-900">{selectedStudent.studentId}</p>
                </div>
                {selectedStudent.cgpa && (
                  <div>
                    <span className="font-medium text-gray-700">CGPA:</span>
                    <p className="text-gray-900">{selectedStudent.cgpa}</p>
                  </div>
                )}
                {selectedStudent.bio && (
                  <div>
                    <span className="font-medium text-gray-700">Bio:</span>
                    <p className="text-gray-900">{selectedStudent.bio}</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    sendGroupRequest(selectedStudent._id);
                    setShowStudentDetails(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Group Request
                </button>
                <button
                  onClick={() => setShowStudentDetails(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupFormation; 