import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const ThesisDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [thesis, setThesis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchThesis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchThesis = async () => {
    try {
      const response = await axios.get(`/api/theses/${id}`);
      setThesis(response.data);
    } catch (error) {
      console.error('Error fetching thesis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to comment');
      return;
    }

    let cleanedComment = comment.trim();
    const userName = user?.name;
    
    if (userName) {
      // Check if the comment starts with the user's name (with optional colon)
      const namePattern = new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`, 'i');
      if (namePattern.test(cleanedComment)) {
        cleanedComment = cleanedComment.replace(namePattern, '').trim();
      }
      
      // Additional check for name anywhere in the comment
      if (cleanedComment.toLowerCase().includes(userName.toLowerCase())) {
        alert('Please don\'t include your name in the comment. Your name will be displayed automatically.');
        return;
      }
      
      // If after cleaning, the comment is empty or too short, ask for more content
      if (cleanedComment.length < 1) {
        alert('Please write a meaningful comment without including your name.');
        return;
      }
    }

    setSubmittingComment(true);
    try {
      await axios.post(`/api/theses/${id}/comments`, {
        comment: cleanedComment
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setComment('');
      fetchThesis(); // Refresh to get new comment
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!thesis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Thesis not found</h2>
          <Link to="/theses" className="text-blue-600 hover:text-blue-500">
            Back to thesis list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/theses"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to thesis list
          </Link>
        </div>

        {/* Thesis Details */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{thesis.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>By {thesis.author?.name}</span>
                  <span>•</span>
                  <span>{thesis.department}</span>
                  <span>•</span>
                  <span>{thesis.year} {thesis.semester}</span>
                  <span>•</span>
                  <span>Submitted {new Date(thesis.submissionDate).toLocaleDateString()}</span>
                </div>
              </div>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(thesis.status)}`}>
                {thesis.status}
              </span>
            </div>

            {/* Keywords */}
            {thesis.keywords && thesis.keywords.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {thesis.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Abstract */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Abstract</h3>
              <p className="text-gray-700 leading-relaxed">{thesis.abstract}</p>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Supervisor</h3>
                <p className="text-gray-900">{thesis.supervisor}</p>
              </div>
              {thesis.grade && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Grade</h3>
                  <p className="text-gray-900">{thesis.grade}</p>
                </div>
              )}
            </div>

            {/* File Download */}
            {thesis.fileUrl && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Thesis Document</h3>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-900">{thesis.fileName}</span>
                  {thesis.fileSize && (
                    <span className="text-sm text-gray-500">
                      ({(thesis.fileSize / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                  <a
                    href={thesis.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                  >
                    Download
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Comments ({thesis.comments?.length || 0})
              </h3>
              <Link
                to={`/theses/${thesis._id}/discussions`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Discussions
              </Link>
            </div>

            {/* Add Comment Form */}
            {user && (
              <form onSubmit={handleSubmitComment} className="mb-8">
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Add a comment
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Share your thoughts about this thesis..."
                  />
                </div>
                <div className="mt-3">
                  <button
                    type="submit"
                    disabled={submittingComment || !comment.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            )}

            {/* Comments List */}
            <div className="space-y-6">
              {thesis.comments && thesis.comments.length > 0 ? (
                thesis.comments.map((comment, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <div className="flex space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.commentedBy?.name || 'Anonymous'}
                          </span>
                          {comment.commentedBy?.role && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {comment.commentedBy.role}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {new Date(comment.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{comment.comment}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThesisDetail; 