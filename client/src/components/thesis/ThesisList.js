import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../Toaster';

const ThesisList = () => {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToaster();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    year: '',
    semester: ''
  });
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    // Always fetch bookmarks if authenticated
    if (isAuthenticated) {
      fetchBookmarks();
    }
    if (showBookmarks) {
      fetchBookmarks();
    } else {
      fetchPapers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, showBookmarks, isAuthenticated]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (showBookmarks) {
        fetchBookmarks();
      } else {
        fetchPapers();
      }
    };

    window.addEventListener('refreshStudentData', handleRefresh);
    window.addEventListener('refreshFacultyData', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshStudentData', handleRefresh);
      window.removeEventListener('refreshFacultyData', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBookmarks]);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.year) params.append('year', filters.year);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.search) params.append('search', filters.search);
      const response = await axios.get(`/api/papers?${params}`);
      setPapers(response.data);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/paper-bookmarks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookmarks(response.data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async (paperId) => {
    if (!isAuthenticated) return;
    setBookmarkLoading(true);
    try {
      await axios.post(`/api/auth/paper-bookmarks/${paperId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Paper bookmarked successfully!');
      fetchBookmarks();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to bookmark paper');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleUnbookmark = async (paperId) => {
    if (!isAuthenticated) return;
    setBookmarkLoading(true);
    try {
      await axios.delete(`/api/auth/paper-bookmarks/${paperId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Bookmark removed successfully!');
      fetchBookmarks();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to remove bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  // Helper to check if a paper is bookmarked
  const isBookmarked = (paperId) => {
    return bookmarks.some(b => b._id === paperId);
  };

  const handlePaperClick = (paper) => {
    navigate(`/papers/${paper._id}`, { state: { paper } });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Choose which list to show
  const displayPapers = showBookmarks ? bookmarks : papers;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-left md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Browse Papers</h1>
            <p className="mt-2 text-gray-600">
              Discover papers uploaded by faculty members.
            </p>
          </div>
          <div className="flex justify-end w-full md:w-auto gap-2">
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-purple-600 text-black hover:bg-purple-700"
              onClick={() => navigate('/ai-analysis')}
            >
               AI Analysis
            </button>
            {isAuthenticated && (
              <button
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${showBookmarks ? 'bg-gray-600 text-black' : 'bg-gray-200 text-gray-800 hover:bg-blue-100'}`}
                onClick={() => setShowBookmarks(b => !b)}
              >
                {showBookmarks ? 'Show All' : 'Bookmarks'}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {!showBookmarks && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Search & Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="Search by title, abstract, or keywords"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <select
                    name="department"
                    id="department"
                    value={filters.department}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Political Science">Political Science</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                    Year
                  </label>
                  <select
                    name="year"
                    id="year"
                    value={filters.year}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">All Years</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700">
                    Semester
                  </label>
                  <select
                    name="semester"
                    id="semester"
                    value={filters.semester}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">All Semesters</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Results ({displayPapers.length} papers)
              </h3>
            </div>

            {displayPapers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No papers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search criteria or filters.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {displayPapers.map((paper) => (
                  <div 
                    key={paper._id} 
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handlePaperClick(paper)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900 mb-2 hover:text-blue-600">
                          {paper.title}
                        </h4>
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {paper.abstract}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {paper.keywords?.map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
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
                      <div className="ml-4 flex flex-col items-end gap-2 min-w-[120px]">
                        <a
                          href={paper.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View PDF
                        </a>
                        {isAuthenticated && (
                          <>
                            {isBookmarked(paper._id) && (
                              <button
                                className="px-3 py-1 rounded bg-red-400 text-black text-xs font-semibold hover:bg-red-500 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnbookmark(paper._id);
                                }}
                                disabled={bookmarkLoading}
                              >
                                ❌
                              </button>
                            )}
                            {!isBookmarked(paper._id) && (
                              <button
                                className="px-3 py-1 rounded bg-blue-200 text-blue-900 text-xs font-semibold hover:bg-blue-300 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookmark(paper._id);
                                }}
                                disabled={bookmarkLoading}
                              >
                                ⭐️
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThesisList; 