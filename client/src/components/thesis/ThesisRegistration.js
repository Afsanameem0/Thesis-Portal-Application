import React, { useState } from 'react';
import { useToaster } from '../Toaster';
import axios from 'axios';

const ThesisRegistration = ({ currentRegistration, onRegistrationSubmitted, user }) => {
  const { showSuccess, showError } = useToaster();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/auth/thesis-registration', {
        title: title.trim(),
        description: description.trim()
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      showSuccess('Thesis registration submitted successfully!');
      setSuccess('Thesis registration submitted successfully!');
      setTitle('');
      setDescription('');
      
      // Notify parent component
      if (onRegistrationSubmitted) {
        onRegistrationSubmitted(response.data.thesisRegistration);
      }
      
      // Trigger refresh event
      window.dispatchEvent(new CustomEvent('refreshStudentData'));
      
    } catch (error) {
      console.error('Error submitting thesis registration:', error);
      const errorMessage = error.response?.data?.message || 'Error submitting thesis registration';
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Don't show the form if registration is already submitted
  if (currentRegistration?.status && currentRegistration.status !== 'not_submitted') {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Thesis Registration</h2>
        <div className={`p-4 rounded-lg ${
          currentRegistration.status === 'approved' ? 'bg-green-50 border border-green-200' :
          currentRegistration.status === 'pending' ? 'bg-yellow-50 border border-yellow-200' :
          currentRegistration.status === 'rejected' ? 'bg-red-50 border border-red-200' :
          'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">
              {currentRegistration.title || 'Thesis Registration'}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
              currentRegistration.status === 'approved' ? 'bg-green-100 text-green-800' :
              currentRegistration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              currentRegistration.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {currentRegistration.status}
            </span>
          </div>
          
          {currentRegistration.description && (
            <p className="text-gray-600 text-sm mb-3">
              {currentRegistration.description}
            </p>
          )}
          
          <div className="text-xs text-gray-500 space-y-1">
            {currentRegistration.supervisorName && (
              <p>Supervisor: {currentRegistration.supervisorName}</p>
            )}
            {currentRegistration.submittedAt && (
              <p>Submitted: {new Date(currentRegistration.submittedAt).toLocaleDateString()}</p>
            )}
            {currentRegistration.reviewedAt && (
              <p>Reviewed: {new Date(currentRegistration.reviewedAt).toLocaleDateString()}</p>
            )}
            {currentRegistration.comments && (
              <p className="mt-2">
                <span className="font-medium">Comments:</span> {currentRegistration.comments}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Thesis Registration</h2>
      <p className="text-gray-600 text-sm mb-6">
        Register your thesis topic with your supervisor before submitting thesis phases.
      </p>
      
      {/* Group Information */}
      {user?.group && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">👥</span>
            <h3 className="font-medium text-blue-800">Group Registration</h3>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            You are registering on behalf of your group. Only one member can submit the registration for the entire group.
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Group: {user.group.name || 'Unnamed Group'}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Thesis Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your thesis title"
            disabled={loading}
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Thesis Description *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Provide a detailed description of your thesis topic, objectives, and methodology"
            disabled={loading}
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/1000 characters</p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !title.trim() || !description.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{loading ? 'Submitting...' : 'Submit Registration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ThesisRegistration; 