import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToaster } from '../Toaster';

const FacultyList = () => {
  const { user, reloadUser } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToaster();
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    fetchFacultyList();
  }, []);

  const fetchFacultyList = async () => {
    try {
      const response = await axios.get('/api/auth/faculty');
      setFacultyList(response.data);
    } catch (error) {
      console.error('Error fetching faculty list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSupervisor = async (facultyId) => {
    setRequestLoading(true);
    setRequestMessage('');
    
    // Check if student is in a group
    if (user.group) {
      // Handle group supervisor request
      try {
        console.log('Sending group supervisor request:', { facultyId });
        
        const response = await axios.post('/api/auth/supervisor/request', {
          facultyId: facultyId
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('Group supervisor request sent successfully:', response.data);
        showSuccess('Group supervisor request sent successfully!');
        
        // Refresh user data to show updated request status
        await reloadUser();
        
      } catch (error) {
        console.error('Error sending group supervisor request:', {
          error: error.response?.data || error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        showError(error.response?.data?.message || 'Failed to send group supervisor request');
      } finally {
        setRequestLoading(false);
      }
      return;
    }
    
    // Handle individual supervisor request
    // Validate student ID and CGPA before making request
    if (!user.studentId) {
      showError('Student ID not updated. Please update your profile with your student ID before requesting a supervisor.');
      setRequestLoading(false);
      return;
    }
    
    if (!user.cgpa) {
      showError('CGPA not updated. Please update your profile with your CGPA before requesting a supervisor.');
      setRequestLoading(false);
      return;
    }
    
    try {
      console.log('Sending individual supervisor request:', { facultyId });
      
      const response = await axios.post('/api/auth/supervisor/request', {
        facultyId: facultyId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Individual supervisor request sent successfully:', response.data);
      showSuccess('Supervisor request sent successfully!');
      
      // Refresh user data to show updated request status
      await reloadUser();
      
    } catch (error) {
      console.error('Error sending individual supervisor request:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Check if it's a seat capacity error
      if (error.response?.data?.message?.includes('No seats available')) {
        showError('No seats available. This faculty has reached their maximum capacity.');
      } else {
        showError(error.response?.data?.message || 'Failed to send supervisor request');
      }
    } finally {
      setRequestLoading(false);
    }
  };

  const getRequestStatus = (faculty) => {
    // Check if this faculty is the current supervisor
    if (user.supervisor === faculty._id) {
      return { status: 'accepted', text: 'Current Supervisor', color: 'text-green-600' };
    }
    
    // For group students, check group supervisor requests
    if (user.group) {
      // This will be handled by the backend - group requests are stored in the group
      return { status: 'none', text: 'No Group Request', color: 'text-gray-500' };
    }
    
    // For individual students, check individual requests
    const request = user.supervisorRequests?.find(req => req.facultyId === faculty._id);
    if (request) {
      return { 
        status: request.status, 
        text: `Request ${request.status}`, 
        color: request.status === 'pending' ? 'text-yellow-600' : 
               request.status === 'accepted' ? 'text-green-600' : 'text-red-600'
      };
    }
    
    return { status: 'none', text: 'No Request', color: 'text-gray-500' };
  };

  const canRequestSupervisor = () => {
    // For individual students, check student ID and CGPA
    if (!user.group) {
      return user.studentId && user.cgpa;
    }
    
    // For group students, check if all group members have CGPA
    // This will be handled by the backend validation
    return true;
  };

  const getValidationMessage = () => {
    if (user.group) {
      return 'You can request a supervisor for your group. All group members must have updated their CGPA.';
    } else if (!user.studentId && !user.cgpa) {
      return 'Please update your Student ID and CGPA in your profile before requesting a supervisor.';
    } else if (!user.studentId) {
      return 'Please update your Student ID in your profile before requesting a supervisor.';
    } else if (!user.cgpa) {
      return 'Please update your CGPA in your profile before requesting a supervisor.';
    }
    return null;
  };

  const handleMessage = async (faculty) => {
    setMessageLoading(true);
    try {
      // Start conversation with this faculty member
      const response = await axios.get(`/api/messages/start/${faculty._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Navigate to messages page with conversation started
      navigate('/messages', { 
        state: { 
          startConversation: {
            conversationId: response.data.conversationId,
            otherUser: response.data.otherUser
          }
        }
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  };

  const filteredFaculty = facultyList.filter(faculty => {
    const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faculty.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || faculty.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Faculty Members</h1>
          <p className="text-gray-600">Browse and request supervision from faculty members</p>
          
          {/* Request Type Information */}
          {user.group ? (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="font-medium text-blue-800">Group Supervisor Request</h4>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                You are requesting a supervisor for your entire group. All group members must have updated their CGPA before making a request.
              </p>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="font-medium text-green-800">Individual Supervisor Request</h4>
              </div>
              <p className="text-sm text-green-700 mt-1">
                You are requesting a supervisor for yourself. Make sure you have updated your Student ID and CGPA in your profile.
              </p>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:w-64">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Electrical Engineering">Electrical Engineering</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
            </select>
          </div>
        </div>

        {/* Request Message */}
        {requestMessage && (
          <div className={`mb-4 p-4 rounded-lg ${
            requestMessage.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {requestMessage}
          </div>
        )}

        {/* Faculty Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFaculty.map((faculty) => {
            const requestStatus = getRequestStatus(faculty);
            return (
              <div key={faculty._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Profile Image */}
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                      {faculty.profileImage ? (
                        <img
                          src={faculty.profileImage}
                          alt={faculty.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{faculty.name}</h3>
                      <p className="text-sm text-gray-600">{faculty.department}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${requestStatus.color}`}>
                      {requestStatus.text}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedFaculty(faculty)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleMessage(faculty)}
                      disabled={messageLoading}
                      className="flex-1 bg-green-600 text-black px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Send message"
                    >
                      {messageLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                          </svg>
                          Message
                        </>
                      )}
                    </button>
                  </div>

                  {/* Request Button */}
                  {requestStatus.status === 'none' && !user.supervisor && (
                    <div>
                      {!canRequestSupervisor() && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-2">
                          {getValidationMessage()}
                        </div>
                      )}
                      <button
                        onClick={() => handleRequestSupervisor(faculty._id)}
                        disabled={requestLoading || !canRequestSupervisor()}
                        className={`w-half mt-3 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          canRequestSupervisor() 
                            ? 'bg-green-600 text-black hover:bg-green-700' 
                            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {requestLoading ? 'Sending...' : user.group ? 'Request Group Supervisor' : 'Request Supervision'}
                      </button>
                    </div>
                  )}
                  
                  {/* Show success message */}
                  {requestMessage && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      {requestMessage}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredFaculty.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No faculty found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Faculty Detail Modal */}
        {selectedFaculty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{selectedFaculty.name}</h2>
                  <button
                    onClick={() => setSelectedFaculty(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <p className="text-gray-900">{selectedFaculty.department}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedFaculty.email}</p>
                  </div>
                  
                  {selectedFaculty.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedFaculty.phone}</p>
                    </div>
                  )}
                  
                  {selectedFaculty.bio && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bio</label>
                      <p className="text-gray-900">{selectedFaculty.bio}</p>
                    </div>
                  )}
                  
                  <div className="flex space-x-3 pt-4">
                    {getRequestStatus(selectedFaculty).status === 'none' && !user.supervisor && (
                      <div className="flex-1">
                        {!canRequestSupervisor() && (
                          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {getValidationMessage()}
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            await handleRequestSupervisor(selectedFaculty._id);
                            setSelectedFaculty(null);
                          }}
                          disabled={requestLoading || !canRequestSupervisor()}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                            canRequestSupervisor() 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {requestLoading ? 'Sending...' : user.group ? 'Request Group Supervisor' : 'Request Supervision'}
                        </button>
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        await handleMessage(selectedFaculty);
                        setSelectedFaculty(null);
                      }}
                      disabled={messageLoading}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {messageLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                          </svg>
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyList; 