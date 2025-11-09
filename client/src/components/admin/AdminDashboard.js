import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [marksOverview, setMarksOverview] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [marksModal, setMarksModal] = useState({ open: false, student: null });
  const [postsLoading, setPostsLoading] = useState(false);
  // Add state for templates and upload
  const [templates, setTemplates] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  // Add state for selected files for each template type
  const [selectedFiles, setSelectedFiles] = useState({ P1: null, P2: null, P3: null });
  // Add state for edit mode for each template type
  const [editMode, setEditMode] = useState({ P1: false, P2: false, P3: false });
  // Add state for seat management
  const [seatRequests, setSeatRequests] = useState([]);
  const [seatRequestsLoading, setSeatRequestsLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'seats') {
      fetchSeatRequests();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, studentsRes, facultyRes, marksRes] = await Promise.all([
        axios.get('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/admin/students', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/admin/faculty', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/admin/marks-overview', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      // console.log('Students data received:', studentsRes.data);
      // console.log('Marks overview data received:', marksRes.data);
      // console.log('Sample student submission status:', studentsRes.data.students?.[0]?.submissionStatus);

      setDashboardData(dashboardRes.data);
      setStudents(studentsRes.data.students || []);
      setGroups(studentsRes.data.groups || []);
      setFaculty(facultyRes.data);
      setMarksOverview(marksRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeatRequests = async () => {
    try {
      setSeatRequestsLoading(true);
      const response = await axios.get('/api/auth/seat-increase/requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSeatRequests(response.data);
    } catch (error) {
      console.error('Error fetching seat requests:', error);
    } finally {
      setSeatRequestsLoading(false);
    }
  };

  const handleSeatRequestReview = async (facultyId, action, comments = '') => {
    try {
      await axios.post('/api/auth/seat-increase/review', {
        facultyId,
        action,
        comments
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      alert(`Seat increase request ${action}ed successfully!`);
      fetchSeatRequests(); // Refresh the list
    } catch (error) {
      console.error('Error reviewing seat request:', error);
      alert('Failed to review seat request. Please try again.');
    }
  };

  const fetchPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await axios.get('/api/posts?limit=100', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Remove the post from the list
      setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
      
      alert('Post deleted successfully!');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const handleSyncGroupSubmissions = async () => {
    try {
      const response = await axios.post('/api/theses/sync-group-submissions', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      alert(`✅ ${response.data.message}\n\nSynced ${response.data.syncCount} individual student records.`);
      
      // Refresh dashboard data to show updated information
      await fetchDashboardData();
    } catch (error) {
      console.error('Error syncing group submissions:', error);
      alert(`❌ Error syncing group submissions: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleAssignMarks = async (studentId, marksType, score, comments) => {
    try {
      // console.log('Attempting to assign marks:', { studentId, marksType, score, comments });
      const response = await axios.post('/api/admin/assign-marks', {
        studentId,
        marksType,
        score,
        comments
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // console.log('Marks assignment response:', response.data);
      alert('Marks assigned successfully!');
      setMarksModal({ open: false, student: null });
      await fetchDashboardData();
    } catch (error) {
      console.error('Error assigning marks:', error);
      alert('Error assigning marks: ' + (error.response?.data?.message || error.message));
    }
  };

  // Fetch posts when posts tab is selected
  useEffect(() => {
    if (activeTab === 'posts' && posts.length === 0) {
      fetchPosts();
    }
  }, [activeTab]);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/admin/templates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTemplates(res.data);
    } catch (err) {
      setTemplates([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab]);

  const handleTemplateUpload = async (type, file) => {
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    try {
      await axios.post('/api/admin/templates', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadSuccess(`${type} template uploaded successfully!`);
      fetchTemplates();
      // After upload, auto-exit edit mode for this type
      setEditMode(prev => ({ ...prev, [type]: false }));
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (type, file) => {
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleTemplateSubmit = (type) => {
    if (!selectedFiles[type]) {
      setUploadError('Please select a file first.');
      return;
    }
    handleTemplateUpload(type, selectedFiles[type]);
    // After upload, auto-exit edit mode for this type
    setEditMode(prev => ({ ...prev, [type]: false }));
  };

  const handleEditClick = (type) => {
    setEditMode(prev => ({ ...prev, [type]: false }));
    setSelectedFiles(prev => ({ ...prev, [type]: null }));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">System overview and management</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            {[
              { 
                id: 'overview', 
                label: 'Overview',
                icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                )
              },
              { 
                id: 'students', 
                label: 'Students',
                icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                  </svg>
                )
              },
              { 
                id: 'faculty', 
                label: 'Faculty',
                icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                )
              },
              { 
                id: 'marks', 
                label: 'Marks Management',
                icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                )
              },
              { 
                id: 'posts', 
                label: 'Posts Management',
                icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4z" clipRule="evenodd"/>
                  </svg>
                )
              },
              { 
                id: 'templates', 
                label: 'Template Management',
                icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5zm2 2v2h8V7H6zm0 4v2h5v-2H6z"/>
                  </svg>
                )
              },
              { 
                id: 'seats', 
                label: 'Seat Management',
                icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )
              },
                
        
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ease-in-out transform hover:scale-105 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-md ring-1 ring-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <span className={`transition-colors ${
                  activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {tab.icon}
                </span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Students</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData?.stats?.students || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Faculty</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData?.stats?.faculty || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Theses</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData?.stats?.totalTheses || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending Theses</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardData?.stats?.pendingTheses || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Stats */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Thesis Submissions by Phase</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{dashboardData?.stats?.p1Submissions || 0}</div>
                  <div className="text-sm text-gray-500">P1 Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{dashboardData?.stats?.p2Submissions || 0}</div>
                  <div className="text-sm text-gray-500">P2 Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{dashboardData?.stats?.p3Submissions || 0}</div>
                  <div className="text-sm text-gray-500">P3 Submissions</div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Thesis Submissions</h3>
                <div className="space-y-3">
                  {dashboardData?.recentActivities?.theses?.map((thesis) => (
                    <div key={thesis._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{thesis.title}</div>
                        <div className="text-sm text-gray-500">by {thesis.author?.name}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        thesis.status === 'approved' ? 'bg-green-100 text-green-800' :
                        thesis.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {thesis.status}
                      </span>
                    </div>
                  ))}
                  {(!dashboardData?.recentActivities?.theses || dashboardData.recentActivities.theses.length === 0) && (
                    <div className="text-gray-500 italic">No recent submissions</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Registrations</h3>
                <div className="space-y-3">
                  {dashboardData?.recentActivities?.registrations?.map((registration) => (
                    <div key={registration._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{registration.name}</div>
                        <div className="text-sm text-gray-500">{registration.thesisRegistration?.title}</div>
                      </div>
                      <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                  ))}
                  {(!dashboardData?.recentActivities?.registrations || dashboardData.recentActivities.registrations.length === 0) && (
                    <div className="text-gray-500 italic">No pending registrations</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">All Students</h3>
                
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CGPA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => {
                      const hasAnyApprovedSubmission = student.submissionStatus && (
                        student.submissionStatus.P1?.status === 'approved' ||
                        student.submissionStatus.P2?.status === 'approved' ||
                        student.submissionStatus.P3?.status === 'approved'
                      );
                      
                      // Get approved submission types
                      const approvedSubmissions = [];
                      if (student.submissionStatus?.P1?.status === 'approved') approvedSubmissions.push('P1');
                      if (student.submissionStatus?.P2?.status === 'approved') approvedSubmissions.push('P2');
                      if (student.submissionStatus?.P3?.status === 'approved') approvedSubmissions.push('P3');
                      
                      // Validate student data
                      // console.log(`Student ${student.name} validation:`, {
                      //   hasP1: !!student.submissionStatus?.p1?.status,
                      //   hasP2: !!student.submissionStatus?.p2?.status,
                      //   hasP3: !!student.submissionStatus?.p3?.status,
                      //   p1Approved: student.submissionStatus?.p1?.status === 'approved',
                      //   p2Approved: student.submissionStatus?.p2?.status === 'approved',
                      //   p3Approved: student.submissionStatus?.p3?.status === 'approved'
                      // });
                      
                      return (
                        <tr key={student._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.department}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.cgpa ? `${student.cgpa.toFixed(2)}/4.00` : 'Not provided'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.supervisor?.name || 'Not Assigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="space-y-1">
                              {['P1', 'P2', 'P3'].map(type => {
                                const submission = student.submissionStatus?.[type];
                                const statusColors = {
                                  'approved': 'bg-green-100 text-green-800',
                                  'pending': 'bg-yellow-100 text-yellow-800',
                                  'rejected': 'bg-red-100 text-red-800'
                                };
                                
                                return (
                                  <div key={type} className="flex items-center gap-2">
                                    <span className="text-xs font-medium w-6">{type}:</span>
                                    {submission ? (
                                      <div className="flex items-center gap-1">
                                        <span className={`px-2 py-1 text-xs rounded ${statusColors[submission.status] || 'bg-gray-100 text-gray-800'}`}>
                                          {submission.status}
                                        </span>
                                         {submission.status === 'approved' && (
                                           <button
                                             onClick={() => window.open(submission.fileUrl, '_blank')}
                                             className="text-blue-600 hover:text-blue-900 text-xs"
                                             title="View Paper"
                                           >
                                             📄 View
                                           </button>
                                         )}
                                      </div>
                                    ) : (
                                      <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">
                                        Not Submitted
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.totalMarks}/100
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setMarksModal({ open: true, student })}
                              disabled={!hasAnyApprovedSubmission}
                              className={`${
                                hasAnyApprovedSubmission
                                  ? 'text-blue-600 hover:text-blue-900 cursor-pointer'
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                              title={hasAnyApprovedSubmission ? `Assign marks for: ${approvedSubmissions.join(', ')}` : 'No approved submissions to assign marks for'}
                            >
                              {hasAnyApprovedSubmission ? `✅ Assign Marks (${approvedSubmissions.length})` : '❌ Cannot Assign'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">All Groups</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groups.map((group) => {
                      const hasAnyApprovedSubmission = group.submissionStatus && (
                        group.submissionStatus.P1?.status === 'approved' ||
                        group.submissionStatus.P2?.status === 'approved' ||
                        group.submissionStatus.P3?.status === 'approved'
                      );
                      
                      // Get approved submission types
                      const approvedSubmissions = [];
                      if (group.submissionStatus?.P1?.status === 'approved') approvedSubmissions.push('P1');
                      if (group.submissionStatus?.P2?.status === 'approved') approvedSubmissions.push('P2');
                      if (group.submissionStatus?.P3?.status === 'approved') approvedSubmissions.push('P3');
                      
                      return (
                        <tr key={group._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{group.name}</div>
                              <div className="text-sm text-gray-500">{group.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div>{group.members?.length || 0} students</div>
                              <div className="text-xs text-gray-500">
                                {group.members?.map(member => member.name).join(', ')}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {group.supervisor?.name || 'Not Assigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="space-y-1">
                              {['P1', 'P2', 'P3'].map(type => {
                                const submission = group.submissionStatus?.[type];
                                const statusColors = {
                                  'approved': 'bg-green-100 text-green-800',
                                  'pending': 'bg-yellow-100 text-yellow-800',
                                  'rejected': 'bg-red-100 text-red-800'
                                };
                                
                                return (
                                  <div key={type} className="flex items-center gap-2">
                                    <span className="text-xs font-medium w-6">{type}:</span>
                                    {submission ? (
                                      <div className="flex items-center gap-1">
                                        <span className={`px-2 py-1 text-xs rounded ${statusColors[submission.status] || 'bg-gray-100 text-gray-800'}`}>
                                          {submission.status}
                                        </span>
                                         {submission.status === 'approved' && (
                                           <button
                                             onClick={() => window.open(submission.fileUrl, '_blank')}
                                             className="text-blue-600 hover:text-blue-900 text-xs"
                                             title="View Paper"
                                           >
                                             📄 View
                                           </button>
                                         )}
                                      </div>
                                    ) : (
                                      <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">
                                        Not Submitted
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {group.totalMarks}/100
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setMarksModal({ open: true, student: group })}
                              disabled={!hasAnyApprovedSubmission}
                              className={`${
                                hasAnyApprovedSubmission
                                  ? 'text-blue-600 hover:text-blue-900 cursor-pointer'
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                              title={hasAnyApprovedSubmission ? `Assign marks for: ${approvedSubmissions.join(', ')}` : 'No approved submissions to assign marks for'}
                            >
                              {hasAnyApprovedSubmission ? `✅ Assign Marks (${approvedSubmissions.length})` : '❌ Cannot Assign'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'faculty' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">All Faculty</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisees</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {faculty.map((facultyMember) => (
                    <tr key={facultyMember._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{facultyMember.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{facultyMember.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-2">
                          {/* Individual Students */}
                          <div>
                            <div className="font-medium text-xs text-gray-700 mb-1">
                              Individual Students ({facultyMember.supervisees?.length || 0})
                            </div>
                            {facultyMember.supervisees?.length > 0 && (
                              <div className="space-y-1">
                                {facultyMember.supervisees.map((supervisee) => (
                                  <div key={supervisee._id} className="text-xs text-gray-500">
                                    {supervisee.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Groups */}
                          <div>
                            <div className="font-medium text-xs text-gray-700 mb-1">
                              Groups ({facultyMember.supervisedGroups?.length || 0})
                            </div>
                            {facultyMember.supervisedGroups?.length > 0 && (
                              <div className="space-y-1">
                                {facultyMember.supervisedGroups.map((group) => (
                                  <div key={group._id} className="text-xs text-gray-500">
                                    <span className="font-medium">{group.name}</span>
                                    <span className="text-gray-400 ml-1">
                                      ({group.members?.length || 0} members)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{facultyMember.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'marks' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Marks Overview</h3>
              <p className="text-sm text-gray-500 mt-1">📋 Admin can assign/edit P1, P2, P3 marks based on approved submissions. Supervisor marks are assigned by supervisors.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student/Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P1 (5)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P2 (10)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P3 (30)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor (55)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {marksOverview.map((student) => {
                    const hasAnyApprovedSubmission = student.submissionStatus && (
                      student.submissionStatus.P1?.status === 'approved' ||
                      student.submissionStatus.P2?.status === 'approved' ||
                      student.submissionStatus.P3?.status === 'approved'
                    );
                    
                    // Get approved submission types
                    const approvedSubmissions = [];
                    if (student.submissionStatus?.P1?.status === 'approved') approvedSubmissions.push('P1');
                    if (student.submissionStatus?.P2?.status === 'approved') approvedSubmissions.push('P2');
                    if (student.submissionStatus?.P3?.status === 'approved') approvedSubmissions.push('P3');
                    
                    // Validate student data for marks overview
                    // console.log(`Marks Overview - Student ${student.name} validation:`, {
                    //   hasP1: !!student.submissionStatus?.p1?.status,
                    //   hasP2: !!student.submissionStatus?.p2?.status,
                    //   hasP3: !!student.submissionStatus?.p3?.status,
                    //   p1Approved: student.submissionStatus?.p1?.status === 'approved',
                    //   p2Approved: student.submissionStatus?.p2?.status === 'approved',
                    //   p3Approved: student.submissionStatus?.p3?.status === 'approved'
                    // });
                    
                    return (
                      <tr key={student._id} className={!hasAnyApprovedSubmission ? 'bg-gray-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              {student.type === 'group' && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  Group
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                            {student.type === 'group' && student.members && (
                              <div className="text-xs text-gray-400 mt-1">
                                Members: {student.members.map(member => member.name).join(', ')}
                              </div>
                            )}
                            {student.type === 'student' && student.cgpa && (
                              <div className="text-xs text-gray-400">CGPA: {student.cgpa.toFixed(2)}/4.00</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-1">
                            {['P1', 'P2', 'P3'].map(type => {
                              const submission = student.submissionStatus?.[type];
                              const statusColors = {
                                'approved': 'bg-green-100 text-green-800',
                                'pending': 'bg-yellow-100 text-yellow-800',
                                'rejected': 'bg-red-100 text-red-800'
                              };
                              
                              return (
                                <span
                                  key={type}
                                  className={`px-1 py-1 text-xs rounded ${
                                    submission ? statusColors[submission.status] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-500'
                                  }`}
                                  title={submission ? `${type}: ${submission.status}` : `${type}: Not submitted`}
                                >
                                  {type}: {submission ? submission.status[0].toUpperCase() : 'N'}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.marks?.p1?.score ?? '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.marks?.p2?.score ?? '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.marks?.p3?.score ?? '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <span>{student.marks?.supervisor?.score ?? '-'}</span>
                            <span className="text-xs text-gray-400" title="Assigned by supervisor"></span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.totalMarks}/100
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setMarksModal({ open: true, student })}
                            disabled={!hasAnyApprovedSubmission}
                            className={`${
                              hasAnyApprovedSubmission
                                ? 'text-blue-600 hover:text-blue-900 cursor-pointer'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={hasAnyApprovedSubmission ? `Edit P1/P2/P3 marks for: ${approvedSubmissions.join(', ')}. Supervisor marks are managed by supervisors.` : 'No approved submissions to edit marks for'}
                          >
                            {hasAnyApprovedSubmission ? `✏️ Edit Marks (${approvedSubmissions.length})` : '❌ Cannot Edit'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Posts Management</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage all posts in the system. Admins can delete any post.</p>
                </div>
                <button
                  onClick={fetchPosts}
                  disabled={postsLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {postsLoading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {postsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No posts found.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {posts.map((post) => (
                    <div key={post._id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {post.author?.profileImage ? (
                                <img
                                  src={post.author.profileImage.startsWith('http') ? post.author.profileImage : `/uploads/${post.author.profileImage}`}
                                  alt={post.author.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <span className="text-sm" style={{ display: post.author?.profileImage ? 'none' : 'flex' }}>
                                {post.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{post.author?.name}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(post.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-gray-900 leading-relaxed whitespace-pre-wrap mb-3">
                            {post.content}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>👍 {post.likes?.length || 0} likes</span>
                            <span>💬 {post.comments?.length || 0} comments</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200"
                            title="Delete post"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Template Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['P1', 'P2', 'P3'].map(type => {
                const template = templates.find(t => t.type === type);
                return (
                  <div key={type} className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-2">{type} Template</h3>
                    {template ? (
                      <>
                        <div className="text-xs text-gray-500 mb-2">Last uploaded: {new Date(template.uploadDate).toLocaleString()}</div>
                        {/* Only show Edit button unless in editMode */}
                        {!editMode[type] ? (
                          <button
                            className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm mb-2"
                            onClick={() => setEditMode(prev => ({ ...prev, [type]: true }))}
                            disabled={uploading}
                          >
                            Edit
                          </button>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={e => handleFileChange(type, e.target.files[0])}
                              disabled={uploading}
                              className="mb-2"
                              style={{ display: 'block' }}
                            />
                            <button
                              className="bg-green-600 text-black px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm mb-2"
                              onClick={() => handleTemplateSubmit(type)}
                              disabled={uploading}
                            >
                              Submit
                            </button>
                            <button
                              className="bg-gray-400 text-black px-3 py-1 rounded ml-2 text-xs"
                              onClick={() => setEditMode(prev => ({ ...prev, [type]: false }))}
                              disabled={uploading}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      // If no template uploaded, show file input and submit
                      <>
                        <div className="text-gray-400 italic mb-2">No template uploaded</div>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={e => handleFileChange(type, e.target.files[0])}
                          disabled={uploading}
                          className="mb-2"
                          style={{ display: 'block' }}
                        />
                        <button
                          className="bg-green-600 text-black px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm mb-2"
                          onClick={() => handleTemplateSubmit(type)}
                          disabled={uploading}
                        >
                          Submit
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {uploadError && <div className="text-red-600 mt-2">{uploadError}</div>}
            {uploadSuccess && <div className="text-green-600 mt-2">{uploadSuccess}</div>}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Group Management</h2>
              <a
                href="/admin/groups"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Manage Groups
              </a>
            </div>
            
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Group Management</h3>
              <p className="text-gray-500">Click the button above to manage all groups, remove members, and assign supervisors.</p>
            </div>
          </div>
        )}

        {activeTab === 'seats' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Seat Management</h2>
              <button
                onClick={fetchSeatRequests}
                disabled={seatRequestsLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {seatRequestsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {seatRequests.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending seat requests</h3>
                <p className="text-gray-500">All faculty seat increase requests have been processed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {seatRequests.map(faculty => {
                  const pendingRequest = faculty.seatIncreaseRequests.find(req => req.status === 'pending');
                  return (
                    <div key={faculty._id} className="bg-white p-6 rounded-lg shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{faculty.name}</h3>
                          <p className="text-sm text-gray-600">{faculty.email} | {faculty.department}</p>
                          <div className="mt-2 text-sm text-gray-600">
                            Current Capacity: {faculty.seatCapacity} | Current Students: {faculty.supervisees.length}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending Request
                          </span>
                        </div>
                      </div>
                      
                      {pendingRequest && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Requested Seats</label>
                              <p className="text-lg font-semibold text-gray-900">{pendingRequest.requestedSeats}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Requested On</label>
                              <p className="text-sm text-gray-600">{new Date(pendingRequest.requestedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                            <p className="text-gray-700 bg-white p-3 rounded border">{pendingRequest.reason}</p>
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                const comments = prompt('Enter approval comments (optional):');
                                handleSeatRequestReview(faculty._id, 'approve', comments || '');
                              }}
                              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const comments = prompt('Enter rejection reason (optional):');
                                handleSeatRequestReview(faculty._id, 'reject', comments || '');
                              }}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Marks Assignment Modal */}
      {marksModal.open && (
        <MarksAssignmentModal
          student={marksModal.student}
          onClose={() => setMarksModal({ open: false, student: null })}
          onAssign={handleAssignMarks}
        />
      )}
    </div>
  );
};

// Marks Assignment Modal Component
const MarksAssignmentModal = ({ student, onClose, onAssign }) => {
  // Get available mark types based on approved submissions
  // Admin can only assign P1, P2, P3 marks - supervisor marks are assigned by supervisors only
  const getAvailableMarkTypes = () => {
    const availableTypes = [];
    if (student.submissionStatus?.P1?.status === 'approved') {
      availableTypes.push({ value: 'p1', label: 'P1 (max 5)', max: 5 });
    }
    if (student.submissionStatus?.P2?.status === 'approved') {
      availableTypes.push({ value: 'p2', label: 'P2 (max 10)', max: 10 });
    }
    if (student.submissionStatus?.P3?.status === 'approved') {
      availableTypes.push({ value: 'p3', label: 'P3 (max 30)', max: 30 });
    }
    return availableTypes;
  };

  const availableMarkTypes = getAvailableMarkTypes();
  const isGroup = student.type === 'group';
  
  const [formData, setFormData] = useState({
    marksType: availableMarkTypes.length > 0 ? availableMarkTypes[0].value : '',
    score: '',
    comments: ''
  });

  const maxScores = { p1: 5, p2: 10, p3: 30 };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert marks type to uppercase to match backend expectations
    const marksType = formData.marksType.toUpperCase();
    onAssign(student._id, marksType, parseFloat(formData.score), formData.comments);
    onClose();
  };

  if (availableMarkTypes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            No Marks Available for {student.name}
          </h3>
          <p className="text-gray-600 mb-4">
            No approved submissions found. Admin can only assign marks for approved P1, P2, or P3 submissions. Supervisor marks must be assigned by the {isGroup ? 'group\'s' : 'student\'s'} supervisor.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Assign Marks for {student.name}
          {isGroup && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Group</span>}
        </h3>
        
        {isGroup && student.members && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-700 mb-2">Group Members:</p>
            <div className="text-xs text-blue-600">
              {student.members.map((member, index) => (
                <div key={index} className="mb-1">
                  • {member.name} ({member.email})
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Available for: {availableMarkTypes.map(type => type.label.split(' ')[0]).join(', ')}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Marks Type</label>
            <select
              value={formData.marksType}
              onChange={(e) => setFormData({ ...formData, marksType: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {availableMarkTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Score (0 - {maxScores[formData.marksType]})
            </label>
            <input
              type="number"
              min="0"
              max={maxScores[formData.marksType]}
              step="0.1"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Comments (Optional)</label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Assign Marks
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard; 