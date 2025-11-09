import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../../components/Toaster';
import axios from 'axios';
import ThesisRegistration from '../thesis/ThesisRegistration';

const StudentDashboard = () => {
  const { user, loading: authLoading, reloadUser } = useAuth();
  const { showSuccess, showError, showInfo } = useToaster();
  const [myTheses, setMyTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supervisor, setSupervisor] = useState(null);
  const [supervisorStatus, setSupervisorStatus] = useState('none');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingRequestsWithNames, setPendingRequestsWithNames] = useState([]);
  const [thesisRegistration, setThesisRegistration] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [downloadingTemplate, setDownloadingTemplate] = useState({});
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [groupRequests, setGroupRequests] = useState([]);
  const [groupDetails, setGroupDetails] = useState(null);

  // Wait for auth to load, then fetch data
  useEffect(() => {
    if (!authLoading && user) {
      fetchMyTheses();
      fetchSupervisor();
      fetchPendingRequests();
      fetchThesisRegistration();
      fetchGroupData();
      // Fetch available templates on mount
      const fetchTemplates = async () => {
        try {
          const res = await axios.get('/api/theses/templates');
          setAvailableTemplates(res.data);
        } catch (err) {
          setAvailableTemplates([]);
        }
      };
      fetchTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Add an effect to refresh user data when dashboard first loads
  useEffect(() => {
    let mounted = true;
    
    const refreshUserDataOnMount = async () => {
      if (!authLoading && user && mounted) {
        await reloadUser();
      }
    };
    
    // Small delay to avoid race conditions
    const timer = setTimeout(refreshUserDataOnMount, 500);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (!authLoading && user) {
        setRefreshing(true);
        Promise.all([fetchMyTheses(), fetchSupervisor(), fetchPendingRequests(), fetchThesisRegistration()]).finally(() => {
          setRefreshing(false);
        });
      }
    };

    const handleSupervisorNotification = () => {
      fetchPendingRequests();
    };

    window.addEventListener('refreshStudentData', handleRefresh);
    window.addEventListener('supervisorNotification', handleSupervisorNotification);
    
    return () => {
      window.removeEventListener('refreshStudentData', handleRefresh);
      window.removeEventListener('supervisorNotification', handleSupervisorNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Check if student has completed all requirements for feedback
  const hasCompletedP1 = myTheses.some(t => t.submissionType === 'P1' && t.status === 'approved');
  const hasCompletedP2 = myTheses.some(t => t.submissionType === 'P2' && t.status === 'approved');
  const hasCompletedP3 = myTheses.some(t => t.submissionType === 'P3' && t.status === 'approved');
  const hasCompletedRegistration = thesisRegistration?.status === 'approved';
  
  // Student can only give feedback if they have completed registration, P1, P2, and P3
  const canGiveFeedback = hasCompletedRegistration && hasCompletedP1 && hasCompletedP2 && hasCompletedP3;
  useEffect(() => {
    const checkFeedback = async () => {
      if (user && user.supervisor && canGiveFeedback) {
        try {
          const res = await axios.get('/api/auth/feedback/my', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setHasGivenFeedback(Array.isArray(res.data) && res.data.some(fb => fb.supervisor && (fb.supervisor._id === user.supervisor || fb.supervisor === user.supervisor)));
        } catch {
          setHasGivenFeedback(false);
        }
      }
    };
    checkFeedback();
  }, [user, canGiveFeedback]);

  const fetchMyTheses = async () => {
    try {
      const response = await axios.get('/api/theses/my-theses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMyTheses(response.data);
    } catch (error) {
      console.error('Error fetching theses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisor = async (userDataOverride = null) => {
    try {
      // Use provided user data or fetch fresh user data from server
      let currentUser = userDataOverride || user;
      
      if (!currentUser) {
        const userRes = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        currentUser = userRes.data;
      }

      if (currentUser && currentUser.supervisor) {
        const res = await axios.get(`/api/auth/faculty/${currentUser.supervisor}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSupervisor(res.data);
        setSupervisorStatus('accepted');
      } else {
        setSupervisor(null);
        setSupervisorStatus('none');
      }
    } catch (error) {
      console.error('Error fetching supervisor:', error);
      setSupervisor(null);
      setSupervisorStatus('none');
    }
  };

  const fetchPendingRequests = async (userDataOverride = null) => {
    try {
      // Use provided user data or fetch fresh user data from server
      let currentUser = userDataOverride || user;
      
      if (!currentUser) {
        const userRes = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        currentUser = userRes.data;
      }

      if (currentUser && currentUser.supervisorRequests && currentUser.supervisorRequests.length > 0) {
        const pendingRequests = currentUser.supervisorRequests.filter(req => req.status === 'pending');
        setPendingRequests(pendingRequests);
        
        // Fetch faculty names for pending requests
        if (pendingRequests.length > 0) {
          const requestsWithNames = await Promise.all(
            pendingRequests.map(async (request) => {
              try {
                const res = await axios.get(`/api/auth/faculty/${request.facultyId}`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                return {
                  ...request,
                  facultyName: res.data.name,
                  facultyDepartment: res.data.department
                };
              } catch (error) {
                console.error(`Error fetching faculty ${request.facultyId}:`, error);
                return {
                  ...request,
                  facultyName: 'Unknown Faculty',
                  facultyDepartment: 'Unknown Department'
                };
              }
            })
          );
          setPendingRequestsWithNames(requestsWithNames);
        }
      } else {
        setPendingRequests([]);
        setPendingRequestsWithNames([]);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setPendingRequests([]);
      setPendingRequestsWithNames([]);
    }
  };

  const fetchThesisRegistration = async (userDataOverride = null) => {
    try {
      // Use provided user data or fetch fresh user data from server
      let currentUser = userDataOverride || user;
      
      if (!currentUser) {
        const userRes = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        currentUser = userRes.data;
      }

      if (currentUser && currentUser.thesisRegistration) {
        setThesisRegistration(currentUser.thesisRegistration);
      } else {
        setThesisRegistration({ status: 'not_submitted' });
      }
    } catch (error) {
      console.error('Error fetching thesis registration:', error);
      setThesisRegistration({ status: 'not_submitted' });
    }
  };

  const fetchGroupData = async () => {
    try {
      // Fetch group requests
      const requestsRes = await axios.get('/api/groups/requests');
      setGroupRequests(requestsRes.data);
      
      // Fetch group details if user is in a group
      try {
        const groupRes = await axios.get('/api/groups/details');
        setGroupDetails(groupRes.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error fetching group details:', error);
        }
        setGroupDetails(null);
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
      setGroupRequests([]);
      setGroupDetails(null);
    }
  };

  // Determine supervisor status based on current data
  const getSupervisorStatus = () => {
    if (user && user.supervisor && supervisor) {
      return 'accepted';
    } else if (pendingRequests.length > 0) {
      return 'pending';
    } else {
      return 'none';
    }
  };

  const currentSupervisorStatus = getSupervisorStatus();

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      // First reload user data from server
      await reloadUser();
      
      // Fetch fresh user data directly for this refresh
      const userRes = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const freshUser = userRes.data;
      
      // Then fetch other data based on fresh user data
      await Promise.all([
        fetchMyTheses(), 
        fetchSupervisor(freshUser), 
        fetchPendingRequests(freshUser),
        fetchThesisRegistration(freshUser),
        fetchGroupData()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getSubmissionStatus = (type) => {
    const thesis = myTheses.find(t => t.submissionType === type);
    return thesis ? thesis.status : 'not_submitted';
  };

  const handleRegistrationSubmitted = (newRegistration) => {
    setThesisRegistration(newRegistration);
    // Trigger user data reload to get updated info
    handleRefreshData();
  };

  const canSubmitThesis = () => {
    return currentSupervisorStatus === 'accepted' && 
           thesisRegistration?.status === 'approved';
  };

  const isTemplateAvailable = (type) => {
    return availableTemplates.some(t => t.type === type);
  };

  const getTemplateOriginalName = (type) => {
    const t = availableTemplates.find(t => t.type === type);
    return t ? t.originalName : '';
  };

  const handleDownloadTemplate = async (type) => {
    if (!isTemplateAvailable(type)) {
      alert(`${type} template is not available.`);
      return;
    }
    try {
      setDownloadingTemplate(prev => ({ ...prev, [type]: true }));
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/theses/templates/${type}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        let errorMessage = 'Failed to download template.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getTemplateOriginalName(type) || `${type}_template.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to download template: ${err.message}`);
    } finally {
      setDownloadingTemplate(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmitFeedback = async () => {
    setFeedbackMsg('');
    try {
      await axios.post('/api/auth/feedback', { rating: feedbackRating, feedback: feedbackText }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFeedbackMsg('Feedback submitted!');
      setHasGivenFeedback(true);
      setShowFeedbackModal(false);
    } catch (err) {
      setFeedbackMsg(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  // Show loading while auth is loading or while fetching initial data
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, don't render
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome, {user?.name}!</p>
          </div>
          <button
            onClick={handleRefreshData}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            style={{ border: 'none', boxShadow: 'none' }}
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>



        {/* Supervisor Section */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Supervisor</h2>
            <div className="flex space-x-2">
              {!user?.supervisor && !user?.group && (
                <Link
                  to="/group-formation"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Group Formation
                </Link>
              )}
              <Link
                to="/faculty"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Browse All Faculty
              </Link>
            </div>
          </div>
          {canGiveFeedback && user?.supervisor && !hasGivenFeedback && (
            <div className="mb-4 flex justify-end">
              <button
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-600 font-semibold"
                style={{ border: 'none', boxShadow: 'none' }}
                onClick={() => setShowFeedbackModal(true)}
              >
                Review Supervisor
              </button>
            </div>
          )}
          {user?.supervisor && !canGiveFeedback && (
            <div className="mb-4 flex justify-end">
              <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm">
                Complete all thesis submissions (Registration, P1, P2, P3) to review supervisor
              </div>
            </div>
          )}
          {currentSupervisorStatus === 'accepted' && supervisor ? (
            <div>
              <p className="text-green-700 font-semibold">Supervisor: {supervisor.name}</p>
              <div className="flex space-x-2 mt-2">
                <Link
                  to="/faculty"
                  className="px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                >
                  Find Co-supervisor
                </Link>
              </div>
            </div>
          ) : currentSupervisorStatus === 'pending' ? (
            <div>
              <p className="text-yellow-700 font-semibold mb-2">Pending Supervisor Requests:</p>
              <div className="space-y-2">
                {pendingRequestsWithNames.map((request, index) => (
                  <div key={index} className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-800 font-medium">
                      Request sent to {request.facultyName}
                    </p>
                    <p className="text-xs text-yellow-600">
                      Department: {request.facultyDepartment}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Requested: {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">You can browse other faculty while waiting for responses.</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-2">You have not requested a supervisor yet.</p>
              <p className="text-sm text-gray-500 mb-4">Browse faculty members and request supervision for your thesis.</p>
   
            </div>
          )}
        </div>

        {/* Group Section */}
        {user?.group && groupDetails && (
          <div className="bg-white shadow rounded-lg mb-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Group</h2>
              <Link
                to="/group-details"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                View Details
              </Link>
            </div>
            <div>
              <p className="text-green-700 font-semibold mb-2">{groupDetails.name}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupDetails.members.map((member, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {member.studentId.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.studentId.name}</p>
                        <p className="text-xs text-gray-600">{member.studentId.department}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {groupDetails.supervisor ? (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium">
                    Supervisor: {groupDetails.supervisor.name}
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700">No supervisor assigned yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Group Requests Section */}
        {groupRequests.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-8 p-6">
            <h2 className="text-xl font-semibold mb-4">Group Requests</h2>
            <div className="space-y-3">
              {groupRequests.map((request, index) => (
                <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {request.fromStudentId.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {request.fromStudentId.department} • {request.fromStudentId.studentId}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Requested: {new Date(request.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={async () => {
                          try {
                            await axios.post('/api/groups/accept-request', { fromStudentId: request.fromStudentId._id });
                            showSuccess('Group formed successfully!');
                            fetchGroupData();
                          } catch (error) {
                            showError(error.response?.data?.message || 'Error accepting group request');
                          }
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await axios.post('/api/groups/reject-request', { fromStudentId: request.fromStudentId._id });
                            showInfo('Group request rejected');
                            fetchGroupData();
                          } catch (error) {
                            showError(error.response?.data?.message || 'Error rejecting group request');
                          }
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
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

        {/* Feedback Modal - moved here, inline after supervisor section */}
        {showFeedbackModal && (
          <div className="flex justify-center my-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
              <button
                className="text-gray-400 hover:text-black border-2 border-red-500 bg-yellow-200 z-50"
                style={{ zIndex: 1000 }}
                onClick={() => setShowFeedbackModal(false)}
              >
                &times;
              </button>
              <h3 className="text-lg font-semibold mb-2">Rate Your Supervisor</h3>
              <div className="flex items-center gap-2 mb-2">
                <span>Rating:</span>
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    className={`text-2xl ${feedbackRating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                    onClick={() => setFeedbackRating(star)}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-2 font-bold">{feedbackRating}</span>
              </div>
              <textarea
                className="w-full border rounded p-2 mb-2"
                rows={3}
                placeholder="Write your feedback..."
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={handleSubmitFeedback}
                disabled={!feedbackText.trim()}
              >
                Submit Feedback
              </button>
              {feedbackMsg && <div className="mt-2 text-green-600">{feedbackMsg}</div>}
            </div>
          </div>
        )}

        {/* Thesis Registration Section */}
        {currentSupervisorStatus === 'accepted' && (
          <div className="mb-8">
            <ThesisRegistration 
              currentRegistration={thesisRegistration}
              onRegistrationSubmitted={handleRegistrationSubmitted}
              user={user}
            />
          </div>
        )}

        {/* My Theses Section */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {user?.group ? 'Group Thesis' : 'My Thesis'}
            </h2>
            {canSubmitThesis() ? (
              <Link
                to="/create-thesis"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                {user?.group ? 'Submit Group Thesis' : 'Submit New Thesis'}
              </Link>
            ) : currentSupervisorStatus === 'accepted' && thesisRegistration?.status !== 'approved' ? (
              <div className="text-sm text-gray-500 italic">
                Registration must be approved to submit thesis
              </div>
            ) : null}
          </div>
          
          {myTheses.length === 0 ? (
            <div className="text-gray-400 italic">No thesis submissions yet.</div>
          ) : (
            <div className="space-y-4">
              {myTheses.map(thesis => (
                <div key={thesis._id} className="border rounded p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{thesis.title}</h3>
                      <p className="text-sm text-gray-600">Type: {thesis.submissionType}</p>
                      <p className="text-sm text-gray-600">Status: {thesis.status}</p>
                      <p className="text-sm text-gray-600">Submitted: {new Date(thesis.submissionDate).toLocaleDateString()}</p>
                      {thesis.isGroupSubmission && (
                        <p className="text-sm text-blue-600 font-medium">👥 Group Submission</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      thesis.status === 'approved' ? 'bg-green-100 text-green-800' :
                      thesis.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {thesis.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Template Download Section */}
        <div className="bg-white shadow rounded-lg mb-8 p-6 flex flex-col items-left">
          <h2 className="text-xl font-semibold mb-4">Download Templates</h2>
          <div className="flex gap-4">
            {['P1', 'P2', 'P3'].map(type => (
              <button
                key={type}
                className={`px-4 py-2 rounded-lg text-sm transition-colors border-none shadow-none focus:outline-none focus:ring-0 ${isTemplateAvailable(type) ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                style={{ border: 'none', boxShadow: 'none' }}
                onClick={() => handleDownloadTemplate(type)}
                disabled={!isTemplateAvailable(type) || downloadingTemplate[type]}
              >
                {downloadingTemplate[type] ? 'Downloading...' : isTemplateAvailable(type) ? `Download ${type} Template` : `${type} Template Unavailable`}
              </button>
            ))}
          </div>
        </div>

        {/* Submission Progress Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Submission Progress</h2>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Registration Step */}
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${
                thesisRegistration?.status === 'approved' ? 'bg-green-200 text-green-800' :
                thesisRegistration?.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                thesisRegistration?.status === 'rejected' ? 'bg-red-200 text-red-800' :
                'bg-gray-200 text-gray-500'
              }`}>
                REG
              </div>
              <div className="capitalize text-sm text-center">
                {thesisRegistration?.status === 'approved' ? 'Approved' :
                 thesisRegistration?.status === 'pending' ? 'Pending Review' :
                 thesisRegistration?.status === 'rejected' ? 'Rejected' :
                 'not submitted'}
              </div>
              {thesisRegistration?.status === 'not_submitted' && currentSupervisorStatus === 'accepted' && (
                <div className="mt-2 text-xs text-center text-gray-600">
                  Register thesis topic first
                </div>
              )}
            </div>

            {['P1', 'P2', 'P3'].map((type, idx) => {
              const status = getSubmissionStatus(type);
              return (
                <div key={type} className="flex-1 flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-2 ${
                    status === 'approved' ? 'bg-green-200 text-green-800' :
                    status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                    status === 'rejected' ? 'bg-red-200 text-red-800' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {type}
                  </div>
                  <div className="capitalize text-sm">
                    {status.replace('_', ' ')}
                  </div>
                  {/* Submission button logic */}
                  {status === 'not_submitted' &&
                    ((type === 'P1' && canSubmitThesis()) ||
                    (type === 'P2' && getSubmissionStatus('P1') === 'approved' && canSubmitThesis()) ||
                    (type === 'P3' && getSubmissionStatus('P2') === 'approved' && canSubmitThesis())) && (
                      <Link
                        to="/create-thesis"
                        state={{ submissionType: type }}
                        className="mt-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        Submit {type}
                      </Link>
                  )}
                  {/* Show message when registration is required */}
                  {status === 'not_submitted' && 
                   type === 'P1' && 
                   currentSupervisorStatus === 'accepted' && 
                   thesisRegistration?.status !== 'approved' && (
                    <div className="mt-2 text-xs text-center text-gray-500">
                      Registration required
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 