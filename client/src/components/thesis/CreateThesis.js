import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../Toaster';
import axios from 'axios';

const CreateThesis = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToaster();
  
  // Get submissionType from navigation state (P1, P2, P3)
  const submissionType = location.state?.submissionType || 'P1';
  
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    keywords: '',
    department: user?.department || '',
    supervisor: '',
    year: new Date().getFullYear(),
    semester: 'Fall'
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Pre-fill supervisor if available
    if (user?.supervisor || user?.group) {
      // Fetch supervisor name
      fetchSupervisorName();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSupervisorName = async () => {
    try {
      let supervisorId;
      if (user?.group) {
        // For group submissions, get group supervisor
        const groupResponse = await axios.get(`/api/groups/details`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        // Check if supervisor is populated (object) or just an ID
        if (groupResponse.data.supervisor) {
          if (typeof groupResponse.data.supervisor === 'object' && groupResponse.data.supervisor._id) {
            // Supervisor is populated, use the name directly
            setFormData(prev => ({ ...prev, supervisor: groupResponse.data.supervisor.name }));
          } else {
            // Supervisor is just an ID, fetch the faculty details
            const response = await axios.get(`/api/auth/faculty/${groupResponse.data.supervisor}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setFormData(prev => ({ ...prev, supervisor: response.data.name }));
          }
        }
      } else {
        // For individual submissions, use user's supervisor
        supervisorId = user.supervisor;
        
        if (supervisorId) {
          const response = await axios.get(`/api/auth/faculty/${supervisorId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setFormData(prev => ({ ...prev, supervisor: response.data.name }));
        }
      }
    } catch (error) {
      console.error('Error fetching supervisor:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please upload a thesis file');
      return;
    }

    // Check if title or abstract contains the user's name
    const userName = user?.name;
    if (userName) {
      if (formData.title.toLowerCase().includes(userName.toLowerCase())) {
        setError('Please don\'t include your name in the thesis title. Your name will be displayed automatically as the author.');
        return;
      }
      if (formData.abstract.toLowerCase().includes(userName.toLowerCase())) {
        setError('Please don\'t include your name in the abstract. Your name will be displayed automatically as the author.');
        return;
      }
    }

    // For group submissions, check if another member has already submitted this type
    if (user?.group) {
      try {
        const response = await axios.get('/api/theses/my-theses', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const existingGroupThesis = response.data.find(thesis => 
          thesis.group === user.group._id && thesis.submissionType === submissionType
        );
        
        if (existingGroupThesis) {
          setError(`Your group has already submitted ${submissionType}. Only one member can submit each phase for the entire group.`);
          return;
        }
      } catch (error) {
        console.error('Error checking existing group submissions:', error);
        // Continue with submission if check fails
      }
    }

    setLoading(true);
    setError('');

    // Validation
    if (!formData.title || !formData.abstract || !formData.keywords || 
        !formData.department || !formData.supervisor || !file) {
      setError('Please fill in all required fields and upload a file');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Upload the file first
      setUploadingFile(true);
      const fileFormData = new FormData();
      fileFormData.append('thesisDocument', file);

      const fileUploadResponse = await axios.post('/api/auth/upload-thesis', fileFormData, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Step 2: Submit thesis data with the actual file URL
      const thesisData = {
        title: formData.title,
        abstract: formData.abstract,
        keywords: formData.keywords,
        department: formData.department,
        supervisor: formData.supervisor,
        fileUrl: fileUploadResponse.data.fileUrl, // Use the real file URL
        fileName: fileUploadResponse.data.fileName,
        fileSize: fileUploadResponse.data.fileSize,
        year: formData.year,
        semester: formData.semester,
        submissionType: submissionType // Use the submissionType from navigation state
      };

      // Add group information if user is in a group
      if (user?.group) {
        thesisData.group = user.group._id;
        thesisData.isGroupSubmission = true;
      }

      const response = await axios.post('/api/theses', thesisData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      showSuccess(`${submissionType} submitted successfully!`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting thesis:', error);
      setUploadingFile(false);
      
      // Better error handling with toaster
      let errorMessage = 'Error submitting thesis. Please check your connection and try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid submission data. Please check all fields.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to submit this thesis.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Submit {submissionType}</h1>
          <p className="mt-2 text-gray-600">
            Submit your {submissionType} thesis document for review and approval.
          </p>
          
          {/* Group Information */}
          {user?.group && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">👥</span>
                <h3 className="font-medium text-blue-800">Group Submission</h3>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                You are submitting on behalf of your group. Only one submission per group is allowed for each phase (P1, P2, P3).
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Group: {user.group.name || 'Unnamed Group'}
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Thesis Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter the title of your thesis"
                />
              </div>

              {/* Abstract */}
              <div>
                <label htmlFor="abstract" className="block text-sm font-medium text-gray-700">
                  Abstract *
                </label>
                <textarea
                  name="abstract"
                  id="abstract"
                  rows={6}
                  required
                  value={formData.abstract}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Provide a comprehensive abstract of your thesis"
                />
              </div>

              {/* Keywords */}
              <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
                  Keywords *
                </label>
                <input
                  type="text"
                  name="keywords"
                  id="keywords"
                  required
                  value={formData.keywords}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter keywords separated by commas (e.g., machine learning, AI, data analysis)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Separate keywords with commas
                </p>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  name="department"
                  id="department"
                  required
                  value={formData.department}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select Department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
        
                </select>
              </div>

              {/* Supervisor */}
              <div>
                <label htmlFor="supervisor" className="block text-sm font-medium text-gray-700">
                  Supervisor *
                </label>
                <input
                  type="text"
                  name="supervisor"
                  id="supervisor"
                  required
                  value={formData.supervisor}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your supervisor's name"
                  readOnly={!!user?.supervisor}
                />
              </div>

              {/* Year and Semester */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                    Year *
                  </label>
                  <select
                    name="year"
                    id="year"
                    required
                    value={formData.year}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700">
                    Semester *
                  </label>
                  <select
                    name="semester"
                    id="semester"
                    required
                    value={formData.semester}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                  Thesis Document *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          required
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, or DOCX up to 10MB
                    </p>
                  </div>
                </div>
                {file && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                    </svg>
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    uploadingFile ? 'Uploading Document...' : 'Submitting Thesis...'
                  ) : (
                    `Submit ${submissionType}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateThesis; 