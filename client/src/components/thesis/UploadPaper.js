import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../Toaster';

const UploadPaper = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToaster();
  const [form, setForm] = useState({
    title: '',
    abstract: '',
    keywords: '',
    department: '',
    year: new Date().getFullYear(),
    semester: 'Spring',
    file: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFile = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      // Check file type
      if (!selectedFile.type.includes('pdf')) {
        setError('Please upload a PDF file');
        return;
      }
      setForm(prev => ({ ...prev, file: selectedFile }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.file) {
      setError('Please upload a PDF file');
      return;
    }

    // Validation
    if (!form.title || !form.abstract || !form.keywords || !form.department) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Step 1: Upload the file first
      setUploadingFile(true);
      const data = new FormData();
      data.append('paper', form.file, form.file.name);
      
      const uploadRes = await axios.post('/api/papers/upload', data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const { fileUrl, fileName, fileSize } = uploadRes.data;
      setUploadingFile(false);

      // Step 2: Submit paper data
      await axios.post('/api/papers', {
        title: form.title,
        abstract: form.abstract,
        keywords: form.keywords,
        department: form.department,
        year: Number(form.year),
        semester: form.semester,
        fileUrl,
        fileName,
        fileSize
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      showSuccess('Paper uploaded successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Upload paper failed:', error);
      setUploadingFile(false);
      
      // Better error handling with toaster
      let errorMessage = 'Error uploading paper. Please check your connection and try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid submission data. Please check all fields.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to upload papers.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'faculty') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6 text-center">Only faculty can upload papers.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Paper</h1>
          <p className="mt-2 text-gray-600">
            Upload a research paper for students to access and reference.
          </p>
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
                  Paper Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  value={form.title}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter the title of your paper"
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
                  value={form.abstract}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Provide a comprehensive abstract of your paper"
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
                  value={form.keywords}
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
                  value={form.department}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select Department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Political Science">Political Science</option>
                </select>
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
                    value={form.year}
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
                    value={form.semester}
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
                  Paper Document *
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
                          accept=".pdf"
                          onChange={handleFile}
                          required
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF up to 10MB
                    </p>
                  </div>
                </div>
                {form.file && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                    </svg>
                    {form.file.name} ({(form.file.size / 1024 / 1024).toFixed(2)} MB)
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
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    uploadingFile ? 'Uploading Document...' : 'Uploading Paper...'
                  ) : (
                    'Upload Paper'
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

export default UploadPaper;

