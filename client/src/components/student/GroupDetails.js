import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../../components/Toaster';
import { useNavigate } from 'react-router-dom';

const GroupDetails = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToaster();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupTheses, setGroupTheses] = useState([]);
  const [thesisRegistration, setThesisRegistration] = useState(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionType, setSubmissionType] = useState('');
  const [isResubmission, setIsResubmission] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    keywords: '',
    department: '',
    supervisor: '',
    year: new Date().getFullYear(),
    semester: 'Spring'
  });
  const [file, setFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
  }, []);

  useEffect(() => {
    if (group) {
      fetchGroupTheses();
      fetchGroupThesisRegistration();
    }
  }, [group]);

  const fetchGroupDetails = async () => {
    try {
      const response = await axios.get('/api/groups/details');
      setGroup(response.data);
    } catch (error) {
      console.error('Error fetching group details:', error);
      if (error.response?.status === 404) {
        showInfo('No group found');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupTheses = async () => {
    try {
      const response = await axios.get('/api/theses/my-theses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Filter for group submissions
      const groupSubmissions = response.data.filter(thesis => 
        thesis.group === group?._id || thesis.isGroupSubmission
      );
      setGroupTheses(groupSubmissions);
    } catch (error) {
      console.error('Error fetching group theses:', error);
    }
  };

  const fetchGroupThesisRegistration = async () => {
    try {
      const response = await axios.get('/api/auth/thesis-registration', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setThesisRegistration(response.data);
    } catch (error) {
      console.error('Error fetching thesis registration:', error);
    }
  };

  // Check if all group members have updated their CGPA
  const allMembersHaveCGPA = () => {
    if (!group || !group.members) return false;
    return group.members.every(member => member.studentId?.cgpa);
  };

  // Check if any group member is missing CGPA
  const getMembersWithoutCGPA = () => {
    if (!group || !group.members) return [];
    return group.members.filter(member => !member.studentId?.cgpa);
  };

  // Get submission status for a specific type
  const getSubmissionStatus = (type) => {
    const thesis = groupTheses.find(t => t.submissionType === type);
    return thesis ? thesis.status : 'not_submitted';
  };

  // Check if group can submit a specific thesis type
  const canSubmitThesisType = (type) => {
    if (!group?.supervisor) return false;
    if (!thesisRegistration || thesisRegistration.status !== 'approved') return false;
    
    // Check if already submitted (pending or approved)
    const existingSubmission = groupTheses.find(t => t.submissionType === type && (t.status === 'pending' || t.status === 'approved'));
    if (existingSubmission) return false;

    // Check prerequisites
    if (type === 'P1') {
      return true; // Can always submit P1 if registration approved
    } else if (type === 'P2') {
      // Check if any P1 submission is approved (original or resubmission)
      const hasApprovedP1 = groupTheses.some(t => t.submissionType === 'P1' && t.status === 'approved');
      return hasApprovedP1;
    } else if (type === 'P3') {
      // Check if any P1 and P2 submissions are approved (original or resubmissions)
      const hasApprovedP1 = groupTheses.some(t => t.submissionType === 'P1' && t.status === 'approved');
      const hasApprovedP2 = groupTheses.some(t => t.submissionType === 'P2' && t.status === 'approved');
      return hasApprovedP1 && hasApprovedP2;
    }
    return false;
  };

  // Check if group can resubmit a specific thesis type
  const canResubmitThesisType = (type) => {
    const thesis = groupTheses.find(t => t.submissionType === type);
    return thesis && thesis.status === 'rejected' && thesis.canResubmit;
  };

  // Check if group can reopen a specific thesis type for resubmission
  const canReopenThesisType = (type) => {
    const thesis = groupTheses.find(t => t.submissionType === type);
    return thesis && thesis.status === 'rejected' && thesis.canResubmit;
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Handle thesis submission
  const handleThesisSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      showError('Please upload a thesis file');
      return;
    }

    setSubmitting(true);
    setUploadingFile(true);

    try {
      // Step 1: Upload the file
      const fileFormData = new FormData();
      fileFormData.append('thesisDocument', file);

      const fileUploadResponse = await axios.post('/api/auth/upload-thesis', fileFormData, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadingFile(false);

      // Step 2: Submit thesis data
      const thesisData = {
        title: formData.title,
        abstract: formData.abstract,
        keywords: formData.keywords,
        department: formData.department,
        supervisor: formData.supervisor,
        fileUrl: fileUploadResponse.data.fileUrl,
        fileName: fileUploadResponse.data.fileName,
        fileSize: fileUploadResponse.data.fileSize,
        year: formData.year,
        semester: formData.semester,
        submissionType: submissionType,
        group: group._id,
        isGroupSubmission: true
      };

      // Check if this is a resubmission
      const originalThesis = groupTheses.find(t => t.submissionType === submissionType && t.status === 'rejected' && t.canResubmit);
      let response;
      
      if (originalThesis) {
        // This is a resubmission
        thesisData.originalThesisId = originalThesis._id;
        response = await axios.post('/api/theses/resubmit', thesisData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        showSuccess(`${submissionType} resubmitted successfully!`);
      } else {
        // This is a new submission
        response = await axios.post('/api/theses', thesisData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        showSuccess(`${submissionType} submitted successfully!`);
      }

      setShowSubmissionForm(false);
      setFormData({
        title: '',
        abstract: '',
        keywords: '',
        department: '',
        supervisor: '',
        year: new Date().getFullYear(),
        semester: 'Spring'
      });
      setFile(null);
      fetchGroupTheses(); // Refresh theses list
    } catch (error) {
      console.error('Error submitting thesis:', error);
      showError(error.response?.data?.message || 'Error submitting thesis');
    } finally {
      setSubmitting(false);
      setUploadingFile(false);
    }
  };

  // Handle supervisor request button click
  const handleRequestSupervisor = () => {
    if (!allMembersHaveCGPA()) {
      const membersWithoutCGPA = getMembersWithoutCGPA();
      const memberNames = membersWithoutCGPA.map(member => member.studentId?.name || 'Unknown').join(', ');
      showError(`Cannot request supervisor. The following group members need to update their CGPA: ${memberNames}`);
      return;
    }

    if (group.supervisor) {
      showError('Your group already has a supervisor assigned.');
      return;
    }

    if (group.supervisorRequests && group.supervisorRequests.length > 0) {
      showError('Your group already has pending supervisor requests.');
      return;
    }

    // Navigate to faculty list page for supervisor request
    navigate('/faculty');
  };

  // Open submission form for a specific type
  const openSubmissionForm = (type) => {
    setSubmissionType(type);
    
    // Check if this is a resubmission
    const originalThesis = groupTheses.find(t => t.submissionType === type && t.status === 'rejected' && t.canResubmit);
    const resubmission = !!originalThesis;
    setIsResubmission(resubmission);
    
    setFormData({
      ...formData,
      supervisor: group?.supervisor?.name || '',
      department: group?.members?.[0]?.studentId?.department || '',
      // Pre-fill with original thesis data if it's a resubmission
      title: resubmission ? originalThesis.title : '',
      abstract: resubmission ? originalThesis.abstract : '',
      keywords: resubmission ? (originalThesis.keywords?.join(', ') || '') : '',
      year: resubmission ? new Date(originalThesis.year).getFullYear() : new Date().getFullYear(),
      semester: resubmission ? originalThesis.semester : 'Spring'
    });
    
    setShowSubmissionForm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Group Found</h2>
          <p className="text-gray-600">You are not currently part of any group.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Group Details</h1>
        <p className="text-gray-600">Manage your group and supervisor</p>
      </div>

      {/* Resubmission Notification */}
      {groupTheses.some(thesis => thesis.status === 'rejected' && thesis.canResubmit) && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">🔄</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800">Group Resubmission Allowed!</h3>
              <p className="text-green-700">
                Your supervisor has allowed your group to resubmit some rejected thesis submissions. 
                You can now reopen and modify these submissions to address the feedback.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{group.name}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {group.status}
          </span>
        </div>

        {/* CGPA Status Summary */}
        {!allMembersHaveCGPA() ? (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h4 className="font-medium text-yellow-800">CGPA Update Required</h4>
            </div>
            <p className="text-sm text-yellow-700">
              {getMembersWithoutCGPA().length} of {group.members.length} group members need to update their CGPA before requesting a supervisor.
            </p>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h4 className="font-medium text-green-800">Ready for Supervisor Request</h4>
            </div>
            <p className="text-sm text-green-700">
              All group members have updated their CGPA. You can now request a supervisor.
            </p>
          </div>
        )}

        {/* Group Members */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Members</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.members.map((member, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {member.studentId?.name ? member.studentId.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{member.studentId?.name || 'Unknown'}</h4>
                    <p className="text-sm text-gray-600">{member.studentId?.department || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{member.studentId?.studentId || 'N/A'}</p>
                    {member.studentId?.cgpa ? (
                      <p className="text-xs text-green-600 font-medium">CGPA: {member.studentId.cgpa} </p>
                    ) : (
                      <p className="text-xs text-red-600 font-medium">CGPA: Not Updated ✗</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
              
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supervisor Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Supervisor</h3>
          {group.supervisor ? (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">
                    {group.supervisor?.name ? group.supervisor.name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{group.supervisor?.name || 'Unknown'}</h4>
                  <p className="text-sm text-gray-600">{group.supervisor?.department || 'N/A'}</p>
                  <p className="text-sm text-green-600 font-medium">✓ Assigned</p>
                </div>
              </div>
            </div>
          ) : group.supervisorRequests && group.supervisorRequests.length > 0 ? (
            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-semibold">
                    ⏳
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Request Pending</h4>
                  <p className="text-sm text-gray-600">
                    {group.supervisorRequests.length} supervisor request{group.supervisorRequests.length > 1 ? 's' : ''} sent
                  </p>
                  <p className="text-sm text-yellow-600 font-medium">Waiting for response</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600 mb-4">No supervisor assigned yet.</p>
              
              {/* CGPA Validation Message */}
              {!allMembersHaveCGPA() && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium mb-2">
                    Cannot request supervisor yet
                  </p>
                  <p className="text-xs text-red-600">
                    All group members must update their CGPA before requesting a supervisor.
                  </p>
                  <div className="mt-2">
                    <p className="text-xs text-red-600 font-medium">Members without CGPA:</p>
                    <ul className="text-xs text-red-600 mt-1">
                      {getMembersWithoutCGPA().map((member, index) => (
                        <li key={index}>• {member.studentId?.name || 'Unknown'}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Request Supervisor Button */}
              <button
                onClick={handleRequestSupervisor}
                disabled={!allMembersHaveCGPA() || group.supervisor || (group.supervisorRequests && group.supervisorRequests.length > 0)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  allMembersHaveCGPA() && !group.supervisor && (!group.supervisorRequests || group.supervisorRequests.length === 0)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
              >
                Request Supervisor
              </button>
            </div>
          )}
        </div>

        {/* Thesis Submission Status Section */}
        {group.supervisor && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thesis Submission Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['P1', 'P2', 'P3'].map((type) => {
                const status = getSubmissionStatus(type);
                const canResubmit = canResubmitThesisType(type);
                const canSubmit = canSubmitThesisType(type);
                
                return (
                  <div key={type} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-2 mx-auto ${
                        status === 'approved' ? 'bg-green-200 text-green-800' :
                        status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                        status === 'rejected' ? 'bg-red-200 text-red-800' :
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {type}
                      </div>
                      <div className="capitalize text-sm font-medium mb-2">
                        {status.replace('_', ' ')}
                      </div>
                      
                      {/* Show resubmission button for rejected theses that allow resubmission */}
                      {canResubmit && (
                        <button
                          onClick={() => openSubmissionForm(type)}
                          className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors mb-2"
                        >
                          Reopen & Resubmit {type}
                        </button>
                      )}
                      
                      {/* Show submission button for new submissions */}
                      {canSubmit && (
                        <button
                          onClick={() => openSubmissionForm(type)}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Submit {type}
                        </button>
                      )}
                      
                      {/* Show resubmission allowed message */}
                      {canResubmit && (
                        <div className="mt-2 text-xs text-center text-green-600">
                          Resubmission allowed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Supervisor Requests */}
        {group.supervisorRequests && group.supervisorRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Supervisor Requests</h3>
            <div className="space-y-3">
              {group.supervisorRequests.map((request, index) => (
                <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {request.facultyId?.name || 'Unknown'}
                      </h4>
                      <p className="text-sm text-gray-600">{request.facultyId?.department || 'N/A'}</p>
                      <p className="text-xs text-yellow-600">
                        Status: {request.status}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      request.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                      request.status === 'accepted' ? 'bg-green-200 text-green-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Requested: {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

     </div>
     </div>


  );
};

export default GroupDetails; 