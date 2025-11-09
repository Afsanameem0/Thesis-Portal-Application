import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../Toaster';
import NotificationPage from '../notifications/NotificationPage';
import ThesisDetailModal from '../thesis/ThesisDetailModal';

const FacultyDashboard = () => {
  const { user, reloadUser } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToaster();
  const [requests, setRequests] = useState([]);
  const [supervisees, setSupervisees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [superviseeTheses, setSuperviseeTheses] = useState({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [studentMarks, setStudentMarks] = useState({});
  const [seatInfo, setSeatInfo] = useState(null);
  const [groupSupervisorRequests, setGroupSupervisorRequests] = useState([]);
  const [pendingTheses, setPendingTheses] = useState([]);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    data: null,
    type: null // 'registration', 'thesis', or 'student'
  });
  const [studentDetail, setStudentDetail] = useState(null);

  useEffect(() => {
    if (user) {
      // console.log('Faculty Dashboard mounted, user:', user);
      fetchRequests();
      fetchSupervisees();
      fetchPendingRequests();
      fetchSuperviseeTheses();
      fetchUnreadNotifications();
      fetchPendingRegistrations();
      fetchStudentMarks();
      fetchSeatInfo();
      fetchGroupSupervisorRequests();
      fetchPendingTheses();
    }
  }, [user]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshing(true);
      Promise.all([
        fetchRequests(),
        fetchSupervisees(),
        fetchPendingRequests(),
        fetchSuperviseeTheses(),
        fetchUnreadNotifications(),
        fetchPendingRegistrations(),
        fetchGroupSupervisorRequests()
      ]).finally(() => {
        setRefreshing(false);
      });
    };

    window.addEventListener('refreshFacultyData', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshFacultyData', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStudentMarks = async () => {
    try {
      const res = await axios.get('/api/marks/all-marks', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const marksData = res.data.reduce((acc, mark) => {
        acc[mark.student._id] = mark;
        return acc;
      }, {});
      setStudentMarks(marksData);
    } catch (err) {
      console.error('Error fetching student marks:', err);
    }
  };

  const fetchSeatInfo = async () => {
    try {
      const res = await axios.get('/api/auth/seat-info', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSeatInfo(res.data);
    } catch (err) {
      console.error('Error fetching seat info:', err);
    }
  };

  const fetchGroupSupervisorRequests = async () => {
    try {
      const res = await axios.get('/api/auth/group-supervisor/pending-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setGroupSupervisorRequests(res.data);
    } catch (err) {
      console.error('Error fetching group supervisor requests:', err);
    }
  };

  const fetchPendingTheses = async () => {
    try {
      // Get all theses where this faculty is the supervisor and status is pending
      const res = await axios.get('/api/theses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Filter for theses where this faculty is the supervisor and status is pending
      const facultyTheses = res.data.filter(thesis => 
        thesis.supervisor?._id === user?._id && thesis.status === 'pending'
      );
      
      setPendingTheses(facultyTheses);
    } catch (err) {
      console.error('Error fetching pending theses:', err);
      setPendingTheses([]);
    }
  };





  const fetchRequests = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/theses/supervisor-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(res.data);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setRequests([]);
    }
  };

  const fetchSupervisees = async () => {
    try {
      const res = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.supervisees && res.data.supervisees.length > 0) {
        // console.log('Fetching supervisee details for IDs:', res.data.supervisees);
        
        const superviseePromises = res.data.supervisees.map(async (id) => {
          try {
            // First try to fetch as a student
            const studentResponse = await axios.get(`/api/auth/user/${id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            // console.log(`Successfully fetched student ${id}:`, studentResponse.data.name);
            return { ...studentResponse.data, type: 'student' };
          } catch (studentError) {
            // If not a student, try to fetch as a group
            try {
              const groupResponse = await axios.get(`/api/groups/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
              });
              // console.log(`Successfully fetched group ${id}:`, groupResponse.data.name);
              return { ...groupResponse.data, type: 'group' };
            } catch (groupError) {
              console.error(`Error fetching supervisee ${id} as student or group:`, studentError, groupError);
              return null; // Return null for failed requests
            }
          }
        });
        
        const supervisees = await Promise.all(superviseePromises);
        // Filter out null/undefined values
        const validSupervisees = supervisees.filter(supervisee => supervisee !== null && supervisee !== undefined);
        // console.log('Valid supervisees found:', validSupervisees.length);
        setSupervisees(validSupervisees);
      } else {
        // console.log('No supervisees found in faculty profile');
        setSupervisees([]);
      }
    } catch (err) {
      console.error('Error fetching supervisees:', err);
      setSupervisees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      // console.log('Fetching pending requests...');
      const res = await axios.get('/api/auth/supervisor/pending-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // console.log('API Response:', res.data);
      setPendingRequests(res.data);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
      setPendingRequests([]);
    }
  };

  const fetchSuperviseeTheses = useCallback(async () => {
    try {
      // console.log('=== Starting fetchSuperviseeTheses ===');
      
      // Get current user data to ensure we have the latest supervisees list
      const userRes = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const currentUser = userRes.data;
      // console.log('Current user data:', currentUser);
      // console.log('Supervisees list:', currentUser?.supervisees);
      
      if (!currentUser?.supervisees || currentUser.supervisees.length === 0) {
        // console.log('No supervisees found for thesis fetching');
        setSuperviseeTheses({});
        return;
      }
      
      // console.log('Fetching theses for supervisees:', currentUser.supervisees);
      const thesesByStudent = {};
      
      for (const studentId of currentUser.supervisees) {
        try {
          // console.log(`Fetching theses for supervisee ID: ${studentId}`);
          const res = await axios.get(`/api/theses/supervisee/${studentId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          // console.log(`Fetched ${res.data.length} theses for supervisee ${studentId}:`, res.data);
          thesesByStudent[studentId] = res.data;
        } catch (error) {
          console.error(`Error fetching theses for supervisee ${studentId}:`, error);
          thesesByStudent[studentId] = []; // Set empty array for failed requests
        }
      }
      setSuperviseeTheses(thesesByStudent);
      // console.log('Final theses data:', thesesByStudent);
      // console.log('=== Completed fetchSuperviseeTheses ===');
    } catch (err) {
      console.error('Error fetching supervisee theses:', err);
      setSuperviseeTheses({});
    }
  }, [user?.supervisees]);

  const fetchUnreadNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUnreadNotifications(res.data.count);
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
      setUnreadNotifications(0);
    }
  };

  const fetchPendingRegistrations = async () => {
    try {
      // console.log('Fetching pending thesis registrations...');
      const res = await axios.get('/api/auth/thesis-registration/pending', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // console.log('Pending registrations:', res.data);
      setPendingRegistrations(res.data);
    } catch (err) {
      console.error('Error fetching pending registrations:', err);
      setPendingRegistrations([]);
    }
  };

  const handleRespondRequest = async (studentId, accept) => {
    try {
      await axios.post('/api/auth/supervisor/respond', {
        studentId: studentId,
        accept: accept
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (accept) {
        showSuccess('Supervisor request accepted successfully!');
      } else {
        showSuccess('Supervisor request declined successfully!');
      }
      
      fetchPendingRequests();
      fetchSupervisees();
    } catch (err) {
      console.error('Error responding to request:', err);
      showError('Failed to respond to supervisor request');
    }
  };

  const handleApproveThesis = async (thesisId, status) => {
    try {
      await axios.post(`/api/theses/${thesisId}/approve`, { 
        status 
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (status === 'approved') {
        showSuccess('Thesis approved successfully!');
      } else if (status === 'rejected') {
        showSuccess('Thesis rejected successfully!');
      }
      
      fetchSuperviseeTheses();
      fetchPendingTheses(); // Refresh pending theses list
    } catch (err) {
      console.error('Error approving thesis:', err);
      showError('Failed to update thesis status');
    }
  };

  const handleAssignMarks = async (thesisId, studentId) => {
    try {
      const marks = prompt('Enter marks (0-100):');
      if (marks === null) return; // User cancelled
      
      const marksNumber = parseFloat(marks);
      if (isNaN(marksNumber) || marksNumber < 0 || marksNumber > 100) {
        alert('Please enter a valid number between 0 and 100');
        return;
      }

      const feedback = prompt('Enter feedback (optional):') || '';

      await axios.post('/api/marks/assign', {
        studentId: studentId,
        thesisId: thesisId,
        marks: marksNumber,
        feedback: feedback
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      showSuccess('Marks assigned successfully!');
      fetchSuperviseeTheses(); // Refresh to show updated data
    } catch (err) {
      console.error('Error assigning marks:', err);
      showError('Error assigning marks. Please try again.');
    }
  };

  const handleReviewRegistration = async (studentId, action, comments = '') => {
    try {
      await axios.post('/api/auth/thesis-registration/review', {
        studentId: studentId,
        action: action,
        comments: comments
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (action === 'approve') {
        showSuccess('Thesis registration approved successfully!');
      } else if (action === 'reject') {
        showSuccess('Thesis registration rejected successfully!');
      }
      
      fetchPendingRegistrations();
      fetchSupervisees(); // Refresh to update student data
    } catch (err) {
      console.error('Error reviewing registration:', err);
      showError('Failed to review thesis registration');
    }
  };

  const handleGroupSupervisorRequest = async (groupId, accept) => {
    try {
      const endpoint = accept ? '/api/groups/accept-supervisor-request' : '/api/groups/reject-supervisor-request';
      const res = await axios.post(endpoint, {
        groupId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      showSuccess(res.data.message);
      
      // Reload user data to get updated supervisees list
      await reloadUser();
      
      fetchGroupSupervisorRequests();
      fetchSupervisees(); // Refresh supervisees list
      fetchSuperviseeTheses(); // Refresh theses for all supervisees including the new group
    } catch (err) {
      showError(err.response?.data?.message || `Error ${accept ? 'accepting' : 'rejecting'} group supervisor request`);
    }
  };

  // Modal helper functions
  const openModal = (data, type) => {
    setModalState({
      isOpen: true,
      data: data,
      type: type
    });
    if (type === 'student') {
      setStudentDetail(data);
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      data: null,
      type: null
    });
    setStudentDetail(null);
  };

  const handleModalApprove = () => {
    if (modalState.type === 'registration') {
      handleReviewRegistration(modalState.data._id, 'approve');
    } else if (modalState.type === 'thesis') {
      handleApproveThesis(modalState.data._id, 'approved');
    }
  };

  const handleModalReject = (comments = '') => {
    if (modalState.type === 'registration') {
      handleReviewRegistration(modalState.data._id, 'reject', comments);
    } else if (modalState.type === 'thesis') {
      handleApproveThesis(modalState.data._id, 'rejected');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
                      <div>
              <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
              <p className="mt-2 text-gray-600">Welcome, {user?.name}!</p>
            {seatInfo && (
              <div className="mt-2 flex items-center space-x-4 text-sm">
                <span className="text-gray-600">
                  Total Seats: {seatInfo.currentStudents}/{seatInfo.seatCapacity}
                  {seatInfo.individualStudents > 0 && (
                    <span className="ml-2 text-blue-600">
                      (Individual: {seatInfo.individualStudents}, Groups: {seatInfo.groups})
                    </span>
                  )}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  seatInfo.availableSeats > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {seatInfo.availableSeats > 0 ? `${seatInfo.availableSeats} seats available` : 'No seats available'}
                </span>
                {seatInfo.hasPendingRequest && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Seat request pending
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {seatInfo && seatInfo.availableSeats === 0 && !seatInfo.hasPendingRequest && (
              <button
                onClick={() => navigate('/seat-request')}
                className="bg-orange-600 hover:bg-orange-700 text-black px-4 py-2 rounded-lg transition-colors"
              >
                Request More Seats
              </button>
            )}
            <button
              onClick={() => {
                setRefreshing(true);
                Promise.all([
                  fetchRequests(),
                  fetchSupervisees(),
                  fetchPendingRequests(),
                  fetchSuperviseeTheses(),
                  fetchUnreadNotifications(),
                  fetchPendingRegistrations(),
                  fetchSeatInfo(),
                  fetchGroupSupervisorRequests()
                ]).finally(() => {
                  setRefreshing(false);
                });
              }}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              className="relative bg-white text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
              onClick={() => setShowNotifications(true)}
              title="Show Notifications"
            >
              Notifications
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>
        {showNotifications && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowNotifications(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <NotificationPage />
            </div>
          </div>
        )}

        {/* Supervisor Requests Section */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Supervisor Requests</h2>
          {pendingRequests.length === 0 ? (
            <div className="text-gray-400 italic">No pending supervisor requests.</div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(request => {
                // Safety check for request and request.studentId
                if (!request || !request.studentId) {
                  return null;
                }
                return (
                  <div key={request.studentId._id || `request-${Math.random()}`} className="border rounded p-4 flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {request.studentId?.name || 'Unknown Student'}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Department: {request.studentId?.department || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Email: {request.studentId?.email || 'N/A'}
                      </div>
                      {request.studentId?.studentId && (
                        <div className="text-sm text-gray-600 mb-1">
                          Student ID: {request.studentId.studentId}
                        </div>
                      )}
                      {request.studentId?.cgpa && (
                        <div className="text-sm text-gray-600 mb-1">
                          CGPA: {request.studentId.cgpa.toFixed(2)}/4.00
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Requested: {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 md:mt-0">
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        onClick={() => openModal(request.studentId, 'student')}
                      >
                        Details
                      </button>
                      <button
                        className="px-4 py-2 bg-green-600 text-black rounded text-sm hover:bg-green-700 transition-colors"
                        onClick={() => handleRespondRequest(request.studentId._id, true)}
                      >
                        Accept
                      </button>
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        onClick={() => handleRespondRequest(request.studentId._id, false)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Group Supervisor Requests Section */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Group Supervisor Requests</h2>
          {groupSupervisorRequests.length === 0 ? (
            <div className="text-gray-400 italic">No pending group supervisor requests.</div>
          ) : (
            <div className="space-y-4">
              {groupSupervisorRequests.map(group => {
                // Safety check for group
                if (!group) {
                  return null;
                }
                
                return (
                  <div key={group._id} className="border rounded p-4 bg-gray-50">
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{group.name || 'Unnamed Group'}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Group created: {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  
                  {/* Group Members */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Group Members:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.members.map((member, index) => {
                        // Safety check for member and member.studentId
                        if (!member || !member.studentId) {
                          return (
                            <div key={index} className="border border-gray-200 rounded p-3 bg-white">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-semibold text-sm">?</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">Unknown Student</p>
                                  <p className="text-xs text-gray-600">Data not available</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={index} className="border border-gray-200 rounded p-3 bg-white">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {member.studentId.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{member.studentId.name}</p>
                                <p className="text-xs text-gray-600">{member.studentId.department}</p>
                                <p className="text-xs text-gray-500">{member.studentId.studentId}</p>
                                {member.studentId.cgpa && (
                                  <p className="text-xs text-gray-500">CGPA: {member.studentId.cgpa}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This group will occupy 1 seat from your capacity.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      onClick={() => handleGroupSupervisorRequest(group._id, true)}
                    >
                      Accept Group
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      onClick={() => handleGroupSupervisorRequest(group._id, false)}
                    >
                      Decline Group
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Thesis Registration Requests Section */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Thesis Registration Requests</h2>
          {pendingRegistrations.length === 0 ? (
            <div className="text-gray-400 italic">No pending thesis registrations.</div>
          ) : (
            <div className="space-y-4">
              {pendingRegistrations.map(student => (
                <div key={student._id} className="border rounded p-4 flex flex-col bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {student.name}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {student.email} | {student.department}
                      </div>
                      {student.studentId && (
                        <div className="text-sm text-gray-600 mb-2">
                          Student ID: {student.studentId}
                        </div>
                      )}
                      {student.cgpa && (
                        <div className="text-sm text-gray-600 mb-2">
                          CGPA: {student.cgpa.toFixed(2)}/4.00
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-800 mb-2">Thesis Registration</h4>
                    <div className="mb-3">
                      <span className="font-medium text-sm">Title:</span>
                      <p className="text-gray-900 mt-1">{student.thesisRegistration.title}</p>
                    </div>
                    <div className="mb-3">
                      <span className="font-medium text-sm">Description:</span>
                      <p className="text-gray-700 mt-1 text-sm leading-relaxed">
                        {student.thesisRegistration.description}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      Submitted: {new Date(student.thesisRegistration.submittedAt).toLocaleDateString()}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(student, 'registration')}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleReviewRegistration(student._id, 'approve')}
                        className="px-4 py-2 bg-green-600 text-black rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const comments = prompt('Enter rejection reason (optional):');
                          handleReviewRegistration(student._id, 'reject', comments || '');
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thesis Submissions Section */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Thesis Submissions (P1, P2, P3)</h2>
          {pendingTheses.length === 0 ? (
            <div className="text-gray-400 italic">No pending thesis submissions.</div>
          ) : (
            <div className="space-y-4">
              {pendingTheses.map(thesis => (
                <div key={thesis._id} className="border rounded p-4 flex flex-col bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1 flex items-center">
                        {thesis.title || 'Untitled Thesis'}
                        {thesis.isGroupSubmission && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Group Submission
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Type: {thesis.submissionType} | Status: {thesis.status}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Submitted by: {thesis.author?.name || 'Unknown'}
                      </div>
                      {thesis.isGroupSubmission && thesis.group && (
                        <div className="text-sm text-blue-600 mb-1">
                          📋 Group: {thesis.group.name}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Submitted: {new Date(thesis.submissionDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-800 mb-2">Thesis Details</h4>
                    <div className="mb-3">
                      <span className="font-medium text-sm">Abstract:</span>
                      <p className="text-gray-700 mt-1 text-sm leading-relaxed">
                        {thesis.abstract || 'No abstract provided'}
                      </p>
                    </div>
                    <div className="mb-3">
                      <span className="font-medium text-sm">Keywords:</span>
                      <p className="text-gray-700 mt-1 text-sm">
                        {thesis.keywords?.join(', ') || 'No keywords provided'}
                      </p>
                    </div>
                    <div className="mb-3">
                      <span className="font-medium text-sm">Department:</span>
                      <p className="text-gray-700 mt-1 text-sm">{thesis.department}</p>
                    </div>
                    <div className="mb-3">
                      <span className="font-medium text-sm">File:</span>
                      <p className="text-gray-700 mt-1 text-sm">{thesis.fileName}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(thesis, 'thesis')}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                      {thesis.isGroupSubmission && thesis.group && (
                        <button
                          onClick={() => openModal(thesis.group, 'group')}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-700 ml-2"
                        >
                          View Group
                        </button>
                      )}
                      <button
                        onClick={() => handleApproveThesis(thesis._id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveThesis(thesis._id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supervisees Section */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Current Supervisees</h2>
          {supervisees.length === 0 ? (
            <div className="text-gray-400 italic">No current supervisees.</div>
          ) : (
            <div className="space-y-4">
              {supervisees.filter(supervisee => supervisee && supervisee._id).map(supervisee => (
                <div key={supervisee._id} className="border rounded p-4 bg-gray-50">
                  {supervisee.type === 'group' ? (
                    // Group Display
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center">
                            <span className="mr-2">👥</span>
                            {supervisee.name || 'Unnamed Group'}
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Group ({supervisee.members?.length || 0} members)
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Created: {supervisee.createdAt ? new Date(supervisee.createdAt).toLocaleDateString() : 'Unknown'}
                          </div>
                        </div>
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 ml-2"
                          onClick={() => openModal(supervisee, 'group')}
                        >
                          View Group
                        </button>
                      </div>
                      
                      {/* Group Members */}
                      {supervisee.members && supervisee.members.length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-medium text-gray-700 mb-2">Group Members:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {supervisee.members.map((member, index) => {
                              if (!member || !member.studentId) return null;
                              return (
                                <div key={index} className="bg-white p-3 rounded border">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-600 font-semibold text-sm">
                                        {member.studentId.name?.charAt(0).toUpperCase() || '?'}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900 text-sm">{member.studentId.name}</div>
                                      <div className="text-xs text-gray-600">{member.studentId.department}</div>
                                      <div className="text-xs text-gray-500">{member.studentId.studentId}</div>
                                      {member.studentId.cgpa && (
                                        <div className="text-xs text-gray-500">CGPA: {member.studentId.cgpa}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                
                      
                      {/* Group's Theses */}
                      {superviseeTheses[supervisee._id] && superviseeTheses[supervisee._id].length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-medium text-gray-700 mb-2">Thesis Submissions:</h4>
                          <div className="space-y-2">
                            {superviseeTheses[supervisee._id].map(thesis => (
                              <div key={thesis._id} className="bg-white p-3 rounded border">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium flex items-center">
                                      {thesis.title || 'Untitled'}
                                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        Group Submission
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-600">Type: {thesis.submissionType || 'N/A'}</div>
                                    <div className="text-sm text-gray-600">Status: {thesis.status || 'Unknown'}</div>
                                    <div className="text-sm text-gray-500">
                                      Submitted by: {thesis.author?.name || 'Group Member'}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openModal(thesis, 'thesis')}
                                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                    >
                                      View Details
                                    </button>
                                    {thesis.status === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleApproveThesis(thesis._id, 'approved')}
                                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleApproveThesis(thesis._id, 'rejected')}
                                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Individual Student Display
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center">
                            <span className="mr-2">👤</span>
                            {supervisee.name || 'Unknown Student'}
                          </div>
                          <div className="text-sm text-gray-600">{supervisee.department || 'N/A'}</div>
                          <div className="text-sm text-gray-600">{supervisee.email || 'N/A'}</div>
                          {supervisee.studentId && (
                            <div className="text-sm text-gray-600">Student ID: {supervisee.studentId}</div>
                          )}
                          {supervisee.cgpa && (
                            <div className="text-sm text-gray-600">CGPA: {supervisee.cgpa.toFixed(2)}/4.00</div>
                          )}
                        </div>
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 ml-2"
                          onClick={() => openModal(supervisee, 'student')}
                        >
                          View Info
                        </button>
                      </div>
                      
                      {/* Student's Theses */}
                      {superviseeTheses[supervisee._id] && superviseeTheses[supervisee._id].length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-medium text-gray-700 mb-2">Thesis Submissions:</h4>
                          <div className="space-y-2">
                            {superviseeTheses[supervisee._id].map(thesis => (
                              <div key={thesis._id} className="bg-white p-3 rounded border">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium flex items-center">
                                      {thesis.title || 'Untitled'}
                                      {thesis.isGroupSubmission && (
                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                          Group Submission
                                        </span>
                                      )}
                                    </div>
                                    {thesis.isGroupSubmission && thesis.group && (
                                      <div className="text-sm font-medium text-blue-700 mb-1">
                                        📋 Group: {thesis.group.name}
                                      </div>
                                    )}
                                    <div className="text-sm text-gray-600">Type: {thesis.submissionType || 'N/A'}</div>
                                    <div className="text-sm text-gray-600">Status: {thesis.status || 'Unknown'}</div>
                                    {thesis.isGroupSubmission && thesis.group && (
                                      <div className="text-sm text-blue-600">Group: {thesis.group.name}</div>
                                    )}
                                    <div className="text-sm text-gray-500">
                                      Submitted by: {thesis.isGroupSubmission 
                                        ? (thesis.author?.name || 'Group Member') 
                                        : (thesis.author?.name || 'Unknown')}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openModal(thesis, 'thesis')}
                                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                    >
                                      View Details
                                    </button>
                                    {studentMarks[supervisee._id] &&
                                      studentMarks[supervisee._id].p1 !== null &&
                                      studentMarks[supervisee._id].p2 !== null &&
                                      studentMarks[supervisee._id].p3 !== null && (
                                        <button
                                          onClick={() => navigate(`/assign-marks/${supervisee._id}`)}
                                          className="px-3 py-1 bg-purple-600 text-black rounded text-xs hover:bg-purple-700"
                                        >
                                          Assign Marks
                                        </button>
                                      )}
                                    {thesis.status === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleApproveThesis(thesis._id, 'approved')}
                                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleApproveThesis(thesis._id, 'rejected')}
                                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>



      {/* Thesis Detail Modal */}
      {modalState.isOpen && modalState.type === 'thesis' && (
        <ThesisDetailModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          data={modalState.data}
          type={modalState.type}
          onApprove={handleModalApprove}
          onReject={handleModalReject}
        />
      )}

      {/* Student Detail Modal */}
      {modalState.isOpen && modalState.type === 'student' && studentDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Student Details</h2>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={closeModal}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-3"><span className="font-bold">Name:</span> {studentDetail.name}</div>
            <div className="mb-3"><span className="font-bold">Email:</span> {studentDetail.email}</div>
            <div className="mb-3"><span className="font-bold">Department:</span> {studentDetail.department}</div>
            {studentDetail.studentId && (
              <div className="mb-3"><span className="font-bold">Student ID:</span> {studentDetail.studentId}</div>
            )}
            {studentDetail.cgpa && (
              <div className="mb-3"><span className="font-bold">CGPA:</span> {studentDetail.cgpa.toFixed(2)}/4.00</div>
            )}
          </div>
        </div>
      )}

      {/* Group Detail Modal */}
      {modalState.isOpen && modalState.type === 'group' && modalState.data && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto relative p-6">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={closeModal}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold mb-4">Group Info</h2>
            <div className="mb-2 font-semibold text-lg">{modalState.data.name}</div>
            <div className="mb-2 text-gray-600">Status: {modalState.data.status}</div>
            <div className="mb-4 text-gray-600">Created: {new Date(modalState.data.createdAt).toLocaleDateString()}</div>
            <h3 className="font-semibold mb-2">Members:</h3>
            <div className="space-y-2">
              {modalState.data.members && modalState.data.members.map((member, idx) => (
                <div key={idx} className="border rounded p-2 bg-gray-50">
                  <div className="font-medium">{member.studentId?.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-600">Department: {member.studentId?.department || 'N/A'}</div>
                  <div className="text-xs text-gray-600">Email: {member.studentId?.email || 'N/A'}</div>
                  <div className="text-xs text-gray-600">Student ID: {member.studentId?.studentId || 'N/A'}</div>
                  <div className="text-xs text-gray-600">CGPA: {member.studentId?.cgpa ? member.studentId.cgpa.toFixed(2) : 'N/A'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default FacultyDashboard; 