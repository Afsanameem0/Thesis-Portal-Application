import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToaster } from '../Toaster';

const RatingAndFeedbacks = () => {
  const { user, token } = useAuth();
  const { showSuccess, showError } = useToaster();
  const [faculty, setFaculty] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState({}); // { facultyId: [feedbacks] }
  const [avgRatings, setAvgRatings] = useState({}); // { facultyId: avgRating }
  const [loading, setLoading] = useState(false);
  const [myFeedback, setMyFeedback] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [myTheses, setMyTheses] = useState([]);
  const [thesisRegistration, setThesisRegistration] = useState(null);

  useEffect(() => {
    fetchFaculty();
    fetchMyFeedback();
    if (user?.role === 'student') {
      fetchMyTheses();
      fetchThesisRegistration();
    }
  }, [user]);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/faculty', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFaculty(res.data);
      // Fetch feedbacks for all faculty
      for (const f of res.data) {
        fetchFeedbacks(f._id);
      }
    } catch (err) {
      setFaculty([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async (facultyId) => {
    try {
      const res = await axios.get(`/api/auth/feedback/faculty/${facultyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllFeedbacks(prev => ({ ...prev, [facultyId]: res.data.feedbacks }));
      setAvgRatings(prev => ({ ...prev, [facultyId]: res.data.avgRating }));
    } catch (err) {
      setAllFeedbacks(prev => ({ ...prev, [facultyId]: [] }));
      setAvgRatings(prev => ({ ...prev, [facultyId]: null }));
    }
  };

  const fetchMyFeedback = async () => {
    try {
      const res = await axios.get('/api/auth/feedback/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyFeedback(res.data);
    } catch (err) {
      setMyFeedback(null);
    }
  };

  const fetchMyTheses = async () => {
    try {
      const res = await axios.get('/api/theses/my-theses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyTheses(res.data);
    } catch (err) {
      setMyTheses([]);
    }
  };

  const fetchThesisRegistration = async () => {
    try {
      const res = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThesisRegistration(res.data.thesisRegistration);
    } catch (err) {
      setThesisRegistration(null);
    }
  };

  const handleSubmitFeedback = async (facultyId) => {
    setSubmitMsg('');
    try {
      await axios.post('/api/auth/feedback', { rating, feedback }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Feedback submitted successfully!');
      fetchFeedbacks(facultyId);
      fetchMyFeedback();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  // Check if student has completed all requirements for feedback
  const hasCompletedP1 = myTheses.some(t => t.submissionType === 'P1' && t.status === 'approved');
  const hasCompletedP2 = myTheses.some(t => t.submissionType === 'P2' && t.status === 'approved');
  const hasCompletedP3 = myTheses.some(t => t.submissionType === 'P3' && t.status === 'approved');
  const hasCompletedRegistration = thesisRegistration?.status === 'approved';
  
  // Student can only give feedback if they have completed registration, P1, P2, and P3
  const canGiveFeedback = hasCompletedRegistration && hasCompletedP1 && hasCompletedP2 && hasCompletedP3;

  // Find if this user can rate this faculty (is their supervisor, has completed all requirements, and hasn't rated yet)
  const canRate = (facultyId) => {
    if (!user || user.role !== 'student' || !user.supervisor) return false;
    if (user.supervisor !== facultyId && user.supervisor._id !== facultyId) return false;
    if (myFeedback && Array.isArray(myFeedback) && myFeedback.some(fb => fb.supervisor && (fb.supervisor._id === facultyId || fb.supervisor === facultyId))) return false;
    if (!canGiveFeedback) return false;
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Faculty Review & Ratings</h1>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-lg font-semibold mb-4">All Faculty</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faculty
            .filter(f => allFeedbacks[f._id] && allFeedbacks[f._id].length > 0)
            .map(f => (
              <div key={f._id} className="border rounded p-4 flex flex-col mb-6">
                <div className="font-semibold text-lg">{f.name}</div>
                <div className="text-gray-500 text-sm mb-2">{f.department}</div>
                {avgRatings[f._id] && <div className="mb-2">Average Rating: <span className="font-bold">{avgRatings[f._id]} / 5</span></div>}
                {/* Feedback form for eligible students */}
                {canRate(f._id) && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-semibold mb-2">Submit Your Feedback</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span>Rating:</span>
                      {[1,2,3,4,5].map(star => (
                        <button
                          key={star}
                          className={`text-2xl ${rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                          onClick={() => setRating(star)}
                        >
                          ★
                        </button>
                      ))}
                      <span className="ml-2 font-bold">{rating}</span>
                    </div>
                    <textarea
                      className="w-full border rounded p-2 mb-2"
                      rows={3}
                      placeholder="Write your feedback..."
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                    />
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      onClick={() => handleSubmitFeedback(f._id)}
                      disabled={loading || !feedback.trim()}
                    >
                      Submit Feedback
                    </button>
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto mt-4">
                  <h4 className="font-semibold mb-2">Reviews</h4>
                  {allFeedbacks[f._id] && allFeedbacks[f._id].length > 0 ? (
                    allFeedbacks[f._id].map(fb => (
                      <div key={fb._id} className="border-b py-2">
                        <div className="flex items-center gap-2">
                          {/* Use faculty list to get name and department */}
                          {(() => {
                            const facultyObj = faculty.find(fac => fac._id === (fb.supervisor?._id || fb.supervisor));
                            return (
                              <span className="font-semibold">
                                Faculty: {facultyObj ? facultyObj.name : (fb.supervisorName || 'N/A')}
                                {facultyObj && facultyObj.department && (
                                  <span className="text-gray-500 text-xs ml-2">({facultyObj.department})</span>
                                )}
                              </span>
                            );
                          })()}
                          <span className="font-semibold">Student: {fb.studentName || 'N/A'}</span>
                          <span className="text-yellow-500">{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
                        </div>
                        <div className="text-gray-700 text-sm">{fb.feedback}</div>
                        <div className="text-xs text-gray-400">{new Date(fb.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">No feedbacks yet.</div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default RatingAndFeedbacks; 