import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../Toaster';

const PaperDetail = () => {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToaster();
  
  const [paper, setPaper] = useState(location.state?.paper || null);
  const [loading, setLoading] = useState(!paper);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (!paper) {
      fetchPaper();
    } else {
      checkBookmarkStatus();
    }
  }, [paperId]);

  const fetchPaper = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/papers/${paperId}`);
      setPaper(response.data);
      checkBookmarkStatus();
    } catch (error) {
      console.error('Error fetching paper:', error);
      showError('Failed to load paper details');
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!isAuthenticated || !paper) return;
    
    try {
      const response = await axios.get('/api/auth/paper-bookmarks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const bookmarks = response.data;
      setIsBookmarked(bookmarks.some(b => b._id === paperId));
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) return;
    
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await axios.delete(`/api/auth/paper-bookmarks/${paperId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccess('Bookmark removed successfully!');
        setIsBookmarked(false);
      } else {
        await axios.post(`/api/auth/paper-bookmarks/${paperId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccess('Paper bookmarked successfully!');
        setIsBookmarked(true);
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Paper Not Found</h2>
            <p className="text-gray-600 mb-4">The paper you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/theses')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Back to Papers
            </button>
      
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/theses')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Papers
            </button>
            {isAuthenticated && (
              <button
                onClick={handleBookmark}
                disabled={bookmarkLoading}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isBookmarked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {bookmarkLoading ? 'Loading...' : isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
              </button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{paper.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>By {paper.uploadedBy?.name}</span>
            <span>•</span>
            <span>{paper.department}</span>
            <span>•</span>
            <span>{paper.year} {paper.semester}</span>
            <span>•</span>
            <span>{new Date(paper.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Paper Content */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            {/* Abstract */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Abstract</h2>
              <p className="text-gray-700 leading-relaxed">{paper.abstract}</p>
            </div>

            {/* Keywords */}
            {paper.keywords && paper.keywords.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Keywords</h2>
                <div className="flex flex-wrap gap-2">
                  {paper.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Paper Details */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Paper Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Department</h3>
                  <p className="text-gray-900">{paper.department}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Year & Semester</h3>
                  <p className="text-gray-900">{paper.year} {paper.semester}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Uploaded By</h3>
                  <p className="text-gray-900">{paper.uploadedBy?.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Upload Date</h3>
                  <p className="text-gray-900">{new Date(paper.createdAt).toLocaleDateString()}</p>
                </div>
                {paper.fileSize && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">File Size</h3>
                    <p className="text-gray-900">{(paper.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-500">File Name</h3>
                  <p className="text-gray-900">{paper.fileName}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={paper.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View PDF
                </a>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperDetail;
