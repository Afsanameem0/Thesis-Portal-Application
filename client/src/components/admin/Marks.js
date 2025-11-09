import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const Marks = () => {
  const { user } = useAuth();
  const [marksData, setMarksData] = useState(null);
  const [supervisees, setSupervisees] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigningMarks, setAssigningMarks] = useState(false);
  const [editingMarks, setEditingMarks] = useState(false);
  const [supervisorMarksForm, setSupervisorMarksForm] = useState({
    score: '',
    comments: ''
  });


  useEffect(() => {
    fetchMarksData();
  }, [user]);

  const fetchMarksData = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'student') {
        // Fetch student's own marks
        const response = await axios.get('/api/marks/my-marks', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMarksData(response.data);
      } else if (user?.role === 'faculty') {
        // Fetch supervisees and their marks
        const response = await axios.get('/api/marks/supervisees-marks', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSupervisees(response.data);
      }
    } catch (error) {
      console.error('Error fetching marks data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    // Initialize supervisor marks form with existing data if available
    if (student?.marks?.supervisor) {
      setSupervisorMarksForm({
        score: student.marks.supervisor.score?.toString() || '',
        comments: student.marks.supervisor.comments || ''
      });
    } else {
      setSupervisorMarksForm({
        score: '',
        comments: ''
      });
    }
  };

  const handleAssignSupervisorMarks = async (e) => {
    e.preventDefault();
    
    if (!selectedStudent) return;
    
    const score = parseFloat(supervisorMarksForm.score);
    if (isNaN(score) || score < 0 || score > 55) {
      alert('Score must be between 0 and 55');
      return;
    }

    try {
      setAssigningMarks(true);
      
      const response = await axios.post('/api/marks/assign-supervisor-marks', {
        studentId: selectedStudent._id,
        score: score,
        comments: supervisorMarksForm.comments
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert(response.data.message);
      
      // Refresh the data
      await fetchMarksData();
      
      // Reset form and exit edit mode
      setSupervisorMarksForm({
        score: '',
        comments: ''
      });
      setEditingMarks(false);
      
    } catch (error) {
      console.error('Error assigning supervisor marks:', error);
      alert(error.response?.data?.message || 'Error assigning supervisor marks');
    } finally {
      setAssigningMarks(false);
    }
  };

  const handleEditSupervisorMarks = async (e) => {
    e.preventDefault();
    
    if (!selectedStudent) return;
    
    const score = parseFloat(supervisorMarksForm.score);
    if (isNaN(score) || score < 0 || score > 55) {
      alert('Score must be between 0 and 55');
      return;
    }

    try {
      setAssigningMarks(true);
      
      const response = await axios.put('/api/marks/update-supervisor-marks', {
        studentId: selectedStudent._id,
        score: score,
        comments: supervisorMarksForm.comments
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert(response.data.message);
      
      // Refresh the data
      await fetchMarksData();
      
      // Exit edit mode
      setEditingMarks(false);
      
    } catch (error) {
      console.error('Error updating supervisor marks:', error);
      alert(error.response?.data?.message || 'Error updating supervisor marks');
    } finally {
      setAssigningMarks(false);
    }
  };



  // Check if P3 is completed for a student or group
  // We consider P3 completed when there is a P3 score present in the marks object,
  // which aligns with how groups are validated and with available backend data shape.
  const isP3Completed = (student) => {
    if (!student || !student.marks) return false;
    return student.marks.p3?.score !== null && student.marks.p3?.score !== undefined;
  };

  // Check if supervisor can assign marks (P3 must be assigned)
  const canAssignSupervisorMarks = (student) => {
    if (!student) return false;
    
    // For both groups and individuals, allow supervisor marks after P3 score exists
    return isP3Completed(student);
  };

  const hasSupervisorMarks = (student) => {
    if (!student) return false;
    return student.marks?.supervisor?.score !== null && student.marks?.supervisor?.score !== undefined;
  };

  // Calculate total marks for a student
  const calculateTotalMarks = (marks) => {
    if (!marks) return 0;
    const p1Score = marks.p1?.score || 0;
    const p2Score = marks.p2?.score || 0;
    const p3Score = marks.p3?.score || 0;
    const supervisorScore = marks.supervisor?.score || 0;
    return p1Score + p2Score + p3Score + supervisorScore;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Marks Management</h1>
          <p className="mt-2 text-gray-600">
            {user?.role === 'student' ? 'View your thesis marks and progress' : 'Manage and assign marks for your supervisees'}
          </p>
        </div>

        {/* Faculty View */}
        {user?.role === 'faculty' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Supervisee Marks Management</h2>
            {supervisees.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Student List */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Your Supervisees</h3>
                  <div className="space-y-3">
                                        {supervisees.map(supervisee => {
                      // Skip supervisees without valid data
                      if (!supervisee || !supervisee._id) return null;
                      
                      const totalMarks = calculateTotalMarks(supervisee.marks);
                      const isP3Done = isP3Completed(supervisee);
                      const isGroup = supervisee.type === 'group';
                      
                      return (
                        <div key={supervisee._id}>
                          <button
                            onClick={() => handleStudentSelect(supervisee)}
                            className={`w-full text-left p-4 rounded-lg transition border ${
                              selectedStudent?._id === supervisee._id 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium flex items-center">
                                  {supervisee.name}
                                  {isGroup && (
                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                      Group
                                    </span>
                                  )}
                                </div>
                                <div className={`text-sm ${selectedStudent?._id === supervisee._id ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {isGroup ? `${supervisee.members?.length || 0} members` : supervisee.department}
                                </div>
                                {isGroup && supervisee.members && (
                                  <div className={`text-xs ${selectedStudent?._id === supervisee._id ? 'text-blue-100' : 'text-gray-400'}`}>
                                    Members: {supervisee.members.map(m => m.studentId?.name).join(', ')}
                                </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">Total: {totalMarks}/100</div>
                                {isP3Done && (
                                  <div className={`text-xs ${selectedStudent?._id === supervisee._id ? 'text-green-200' : 'text-green-600'}`}>
                                    P3 Completed
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Student Details & Marks Assignment */}
                <div>
                  {selectedStudent ? (
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                                                  <h3 className="text-lg font-medium text-gray-800">
                          Marks Details - {selectedStudent.name}
                          {selectedStudent.type === 'group' && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Group
                            </span>
                          )}
                        </h3>
                          <button
                            onClick={() => setSelectedStudent(null)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Clear selection"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Group Information */}
                        {selectedStudent.type === 'group' && selectedStudent.members && (
                          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 mb-3">Group Members</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedStudent.members.map((member, index) => (
                                <div key={index} className="bg-white p-3 rounded border">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-600 font-semibold text-sm">
                                        {member.studentId?.name?.charAt(0).toUpperCase() || '?'}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900 text-sm">{member.studentId?.name}</p>
                                      <p className="text-xs text-gray-600">{member.studentId?.department}</p>
                                      <p className="text-xs text-gray-500">{member.studentId?.email}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                                                 {/* P3 Warning Banner */}
                         {!canAssignSupervisorMarks(selectedStudent) && (
                           <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6">
                             <div className="flex">
                               <div className="flex-shrink-0">
                                 <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                 </svg>
                               </div>
                               <div className="ml-3">
                                 <h3 className="text-sm font-medium text-red-800">
                                   Admin Marks Required for Supervisor Assignment
                                 </h3>
                                 <div className="mt-2 text-sm text-red-700">
                                   <p>
                                     {selectedStudent.type === 'group' 
                                       ? 'Marks must be assigned by admin before you can assign supervisor marks to this group.'
                                       : 'Marks must be assigned by admin before you can assign supervisor marks to this student.'
                                     }
                                   </p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}

                         {/* Marks Overview */}
                         <div className="grid grid-cols-2 gap-4 mb-6">
                           <div className="bg-blue-50 p-4 rounded-lg">
                             <div className="text-sm font-medium text-blue-700">P1 Marks</div>
                             <div className="text-2xl font-bold text-blue-900">
                               {selectedStudent.marks?.p1?.score ?? '-'}/5
                             </div>
                             <div className="text-xs text-blue-600">
                               {selectedStudent.marks?.p1?.score ? 'Submitted' : 'Not Submitted'}
                             </div>
                           </div>
                           
                           <div className="bg-green-50 p-4 rounded-lg">
                             <div className="text-sm font-medium text-green-700">P2 Marks</div>
                             <div className="text-2xl font-bold text-green-900">
                               {selectedStudent.marks?.p2?.score ?? '-'}/10
                             </div>
                             <div className="text-xs text-green-600">
                               {selectedStudent.marks?.p2?.score ? 'Submitted' : 'Not Submitted'}
                             </div>
                           </div>
                           
                           <div className="bg-purple-50 p-4 rounded-lg">
                             <div className="text-sm font-medium text-purple-700">P3 Marks</div>
                             <div className="text-2xl font-bold text-purple-900">
                               {selectedStudent.marks?.p3?.score ?? '-'}/30
                             </div>
                             <div className="text-xs text-purple-600">
                               {selectedStudent.marks?.p3?.score ? 'Submitted' : 'Not Submitted'}
                             </div>
                           </div>
                           
                           <div className="bg-orange-50 p-4 rounded-lg">
                             <div className="text-sm font-medium text-orange-700">Supervisor Marks</div>
                             <div className="text-2xl font-bold text-orange-900">
                               {selectedStudent.marks?.supervisor?.score ?? '-'}/55
                             </div>
                             <div className="text-xs text-orange-600">
                               {selectedStudent.marks?.supervisor?.score ? 'Assigned' : 'Not Assigned'}
                             </div>
                           </div>
                         </div>

                        {/* Total Score */}
                        <div className="bg-gray-100 text-black p-4 rounded-lg mb-6">
                          <div className="text-center">
                            <div className="text-sm font-medium">Total Score</div>
                            <div className="text-3xl font-bold">
                              {calculateTotalMarks(selectedStudent.marks)}/100
                            </div>
                          </div>
                        </div>

                        {/* Supervisor Marks Assignment/Edit Form */}
                        {canAssignSupervisorMarks(selectedStudent) && !hasSupervisorMarks(selectedStudent) && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-orange-800 mb-4">
                              Assign Supervisor Marks
                            </h3>
                            <form onSubmit={handleAssignSupervisorMarks} className="space-y-4">
                              <div>
                                <label htmlFor="score" className="block text-sm font-medium text-orange-700 mb-2">
                                  Score (0-55)
                                </label>
                                <input
                                  type="number"
                                  id="score"
                                  min="0"
                                  max="55"
                                  step="0.1"
                                  value={supervisorMarksForm.score}
                                  onChange={(e) => setSupervisorMarksForm(prev => ({ ...prev, score: e.target.value }))}
                                  className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="Enter score (0-55)"
                                  required
                                />
                              </div>
                              <div>
                                <label htmlFor="comments" className="block text-sm font-medium text-orange-700 mb-2">
                                  Comments (Optional)
                                </label>
                                <textarea
                                  id="comments"
                                  value={supervisorMarksForm.comments}
                                  onChange={(e) => setSupervisorMarksForm(prev => ({ ...prev, comments: e.target.value }))}
                                  className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="Enter comments..."
                                  rows="3"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={assigningMarks}
                                className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                                  assigningMarks
                                    ? 'bg-orange-300 text-orange-600 cursor-not-allowed'
                                    : 'bg-orange-600 text-black hover:bg-orange-700'
                                }`}
                              >
                                {assigningMarks ? 'Assigning...' : 'Assign Supervisor Marks'}
                              </button>
                            </form>
                          </div>
                        )}

                        {/* Edit Supervisor Marks Button */}
                        {canAssignSupervisorMarks(selectedStudent) && hasSupervisorMarks(selectedStudent) && !editingMarks && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-green-800 mb-2">
                                  Supervisor Marks Assigned
                                </h3>
                                <p className="text-sm text-green-600">
                                  Score: {selectedStudent.marks?.supervisor?.score}/55
                                  {selectedStudent.marks?.supervisor?.comments && (
                                    <span className="block mt-1">
                                      Comments: {selectedStudent.marks.supervisor.comments}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingMarks(true);
                                  setSupervisorMarksForm({
                                    score: selectedStudent.marks.supervisor.score?.toString() || '',
                                    comments: selectedStudent.marks.supervisor.comments || ''
                                  });
                                }}
                                className="bg-green-600 text-black px-4 py-2 rounded-md font-medium hover:bg-green-700 transition-colors"
                              >
                                Edit Marks
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Edit Supervisor Marks Form */}
                        {canAssignSupervisorMarks(selectedStudent) && hasSupervisorMarks(selectedStudent) && editingMarks && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-800 mb-4">
                              Edit Supervisor Marks
                            </h3>
                            <form onSubmit={handleEditSupervisorMarks} className="space-y-4">
                              <div>
                                <label htmlFor="edit-score" className="block text-sm font-medium text-green-700 mb-2">
                                  Score (0-55)
                                </label>
                                <input
                                  type="number"
                                  id="edit-score"
                                  min="0"
                                  max="55"
                                  step="0.1"
                                  value={supervisorMarksForm.score}
                                  onChange={(e) => setSupervisorMarksForm(prev => ({ ...prev, score: e.target.value }))}
                                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  placeholder="Enter score (0-55)"
                                  required
                                />
                              </div>
                              <div>
                                <label htmlFor="edit-comments" className="block text-sm font-medium text-green-700 mb-2">
                                  Comments (Optional)
                                </label>
                                <textarea
                                  id="edit-comments"
                                  value={supervisorMarksForm.comments}
                                  onChange={(e) => setSupervisorMarksForm(prev => ({ ...prev, comments: e.target.value }))}
                                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  placeholder="Enter comments..."
                                  rows="3"
                                />
                              </div>
                              <div className="flex space-x-3">
                                <button
                                  type="submit"
                                  disabled={assigningMarks}
                                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                                    assigningMarks
                                      ? 'bg-green-300 text-green-600 cursor-not-allowed'
                                      : 'bg-green-600 text-black hover:bg-green-700'
                                  }`}
                                >
                                  {assigningMarks ? 'Updating...' : 'Update Marks'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMarks(false);
                                    setSupervisorMarksForm({
                                      score: '',
                                      comments: ''
                                    });
                                  }}
                                  className="flex-1 py-2 px-4 rounded-md font-medium bg-gray-500 text-black hover:bg-gray-600 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* P3 Not Assigned Warning */}
                        {!canAssignSupervisorMarks(selectedStudent) && (
                          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
                            <div className="flex items-start">
                              <svg className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <div>
                                <h4 className="text-lg font-semibold text-red-800 mb-2">
                                 
                                </h4>
                              
                              </div>
                            </div>
                          </div>
                        )}
                      </div>


                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No student selected</h3>
                      <p className="mt-1 text-sm text-gray-500">Select a student from the list to view and manage their marks.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No supervisees</h3>
                <p className="mt-1 text-sm text-gray-500">You are not currently supervising any students.</p>
              </div>
            )}
          </div>
        )}

        {/* Student View */}
        {user?.role === 'student' && marksData && (
          <div className="space-y-6">
            {/* Student Info Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Student Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <span className="block text-sm font-medium text-gray-500">Name</span>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{marksData.student.name}</p>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500">Department</span>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{marksData.student.department}</p>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500">Supervisor</span>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{marksData.student.supervisor?.name || 'Not Assigned'}</p>
                </div>
                {marksData.student.cgpa && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500">CGPA</span>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{marksData.student.cgpa.toFixed(2)}/4.00</p>
                  </div>
                )}
                <div>
                  <span className="block text-sm font-medium text-gray-500">Total Score</span>
                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    {marksData.totalMarks}/{marksData.totalPossible}
                  </p>
                </div>
              </div>
            </div>

            {/* Group Information Card */}
            {marksData.isGroupMember && marksData.groupInfo && (
              <div className="bg-blue-50 shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-blue-900 mb-4">Group Information</h2>
                <div className="mb-4">
                  <span className="block text-sm font-medium text-blue-700">Group Name</span>
                  <p className="mt-1 text-lg font-semibold text-blue-900">{marksData.groupInfo.name}</p>
                </div>
                <div className="mb-4">
                  <span className="block text-sm font-medium text-blue-700">Group Members</span>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {marksData.groupInfo.members.map((member, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {member.studentId?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{member.studentId?.name}</p>
                            <p className="text-xs text-gray-600">{member.studentId?.department}</p>
                            <p className="text-xs text-gray-500">{member.studentId?.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Your marks are shared with your group members. All group members receive the same marks for thesis submissions.
                  </p>
                </div>
              </div>
            )}

            {/* Marks Breakdown */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Thesis Marks Breakdown</h2>
              
              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Phase 1</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {marksData.marks.p1?.score !== null && marksData.marks.p1?.score !== undefined ? marksData.marks.p1.score : '-'}/5
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      marksData.marks.p1?.score 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {marksData.marks.p1?.score ? 'Submitted' : 'Not Submitted'}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Phase 2</p>
                      <p className="text-2xl font-bold text-green-900">
                        {marksData.marks.p2?.score !== null && marksData.marks.p2?.score !== undefined ? marksData.marks.p2.score : '-'}/10
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      marksData.marks.p2?.score 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {marksData.marks.p2?.score ? 'Submitted' : 'Not Submitted'}
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Phase 3</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {marksData.marks.p3?.score !== null && marksData.marks.p3?.score !== undefined ? marksData.marks.p3.score : '-'}/30
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      marksData.marks.p3?.score 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {marksData.marks.p3?.score ? 'Submitted' : 'Not Submitted'}
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Supervisor</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {marksData.marks.supervisor?.score !== null && marksData.marks.supervisor?.score !== undefined ? marksData.marks.supervisor.score : '-'}/55
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      marksData.marks.supervisor?.score !== null && marksData.marks.supervisor?.score !== undefined
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {marksData.marks.supervisor?.score !== null && marksData.marks.supervisor?.score !== undefined ? 'Assigned' : 'Pending'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Marks */}
              <div className="space-y-6">
                {/* P1 Marks Detail */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Phase 1 (P1) - Proposal</h3>
                      <p className="text-sm text-gray-600">Initial thesis proposal and research plan</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600">
                        {marksData.marks.p1?.score !== null && marksData.marks.p1?.score !== undefined ? marksData.marks.p1.score : '-'}/5
                      </span>
                    </div>
                  </div>
                  {marksData.marks.p1?.score !== null && marksData.marks.p1?.score !== undefined && (
                    <div className="bg-white-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    
                      
                      </div>
                      {marksData.marks.p1.comments && (
                        <div className="mt-3">
                          <span className="font-medium text-gray-700">Comments:</span>
                          <p className="text-gray-900 mt-1">{marksData.marks.p1.comments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* P2 Marks Detail */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Phase 2 (P2) - Progress Report</h3>
                      <p className="text-sm text-gray-600">Mid-term progress and implementation updates</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-600">
                        {marksData.marks.p2?.score !== null && marksData.marks.p2?.score !== undefined ? marksData.marks.p2.score : '-'}/10
                      </span>
                    </div>
                  </div>
                  {marksData.marks.p2?.score !== null && marksData.marks.p2?.score !== undefined && (
                    <div className="bg-white-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   
                      
                      </div>
                      {marksData.marks.p2.comments && (
                        <div className="mt-3">
                          <span className="font-medium text-gray-700">Comments:</span>
                          <p className="text-gray-900 mt-1">{marksData.marks.p2.comments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* P3 Marks Detail */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Phase 3 (P3) - Final Thesis</h3>
                      <p className="text-sm text-gray-600">Complete thesis document and final implementation</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-purple-600">
                        {marksData.marks.p3?.score !== null && marksData.marks.p3?.score !== undefined ? marksData.marks.p3.score : '-'}/30
                      </span>
                    </div>
                  </div>
                  {marksData.marks.p3?.score !== null && marksData.marks.p3?.score !== undefined && (
                    <div className="bg-white-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              
                       
                      </div>
                      {marksData.marks.p3.comments && (
                        <div className="mt-3">
                          <span className="font-medium text-gray-700">Comments:</span>
                          <p className="text-gray-900 mt-1">{marksData.marks.p3.comments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Supervisor Marks Detail */}
                <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Supervisor Evaluation</h3>
                      <p className="text-sm text-gray-600">Overall performance and thesis quality assessment</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-orange-600">
                        {marksData.marks.supervisor?.score !== null && marksData.marks.supervisor?.score !== undefined ? marksData.marks.supervisor.score : '-'}/55
                      </span>
                    </div>
                  </div>
                  {marksData.marks.supervisor?.score !== null && marksData.marks.supervisor?.score !== undefined ? (
                    <div className="bg-white rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                     
                    
                      </div>
                      {marksData.marks.supervisor.comments && (
                        <div className="mt-3">
                          <span className="font-medium text-gray-700">Supervisor Comments:</span>
                          <p className="text-gray-900 mt-1">{marksData.marks.supervisor.comments}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-orange-200 rounded-lg p-4">
                      <div className="text-center text-gray-500">
                        <svg className="mx-auto h-8 w-8 text-orange-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">Supervisor evaluation pending</p>
                        <p className="text-xs text-gray-400 mt-1">Will be assigned after P3 completion</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Access Denied */}
        {user?.role !== 'student' && user?.role !== 'faculty' && (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-9a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-500">This section is only available for students and faculty members.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marks; 