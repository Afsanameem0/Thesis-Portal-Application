import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AssignMarks = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [group, setGroup] = useState(null);
  const [marks, setMarks] = useState(null);
  const [supervisorMarks, setSupervisorMarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGroup, setIsGroup] = useState(false);

  useEffect(() => {
    const fetchDataAndMarks = async () => {
      try {
        // First try to fetch as a student
        try {
          const studentRes = await axios.get(`/api/auth/user/${studentId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          });
          setStudent(studentRes.data);
          setIsGroup(false);
        } catch (studentError) {
          // If not a student, try to fetch as a group
          try {
            const groupRes = await axios.get(`/api/groups/${studentId}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            setGroup(groupRes.data);
            setIsGroup(true);
          } catch (groupError) {
            setError('Neither student nor group found with this ID.');
            return;
          }
        }

        // Fetch marks for the entity (student or group)
        const marksRes = await axios.get(`/api/marks/student/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setMarks(marksRes.data);
        if (marksRes.data?.supervisor?.score !== undefined && marksRes.data?.supervisor?.score !== null) {
          setSupervisorMarks(marksRes.data.supervisor.score);
        }
      } catch (err) {
        setError('Failed to fetch data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDataAndMarks();
  }, [studentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(supervisorMarks) > 55) {
      setError('Supervisor marks cannot exceed 55.');
      return;
    }
    try {
      await axios.post(
        `/api/marks/assign-supervisor-marks`,
        { studentId, score: parseFloat(supervisorMarks) },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      navigate('/faculty-dashboard');
    } catch (err) {
      setError('Failed to assign marks.');
      console.error(err);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">
          Assign Marks to {isGroup ? group?.name : student?.name}
        </h1>
        
        {isGroup ? (
          // Group Information
          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Group Information</h2>
              <p className="text-blue-700">Group: {group?.name}</p>
              <p className="text-blue-700">Members: {group?.members?.length || 0}</p>
              <p className="text-blue-700">Status: {group?.status}</p>
            </div>
            
            {/* Group Members */}
            {group?.members && group.members.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Group Members</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.members.map((member, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {member.studentId?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.studentId?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-600">{member.studentId?.department || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{member.studentId?.studentId || 'N/A'}</p>
                          {member.studentId?.cgpa && (
                            <p className="text-xs text-gray-500">CGPA: {member.studentId.cgpa}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Individual Student Information
          <div className="mb-6">
            {student?.studentId && (
              <p className="text-gray-600 mb-4">Student ID: {student.studentId}</p>
            )}
            {student?.department && (
              <p className="text-gray-600 mb-4">Department: {student.department}</p>
            )}
            {student?.email && (
              <p className="text-gray-600 mb-4">Email: {student.email}</p>
            )}
          </div>
        )}

        {marks && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Existing Marks</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">P1 Marks</p>
                <p>{marks.p1?.score ?? 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">P2 Marks</p>
                <p>{marks.p2?.score ?? 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">P3 Marks</p>
                <p>{marks.p3?.score ?? 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="supervisorMarks" className="block text-gray-700 font-semibold mb-2">
              Supervisor Marks (out of 55)
            </label>
            <input
              type="number"
              id="supervisorMarks"
              value={supervisorMarks}
              onChange={(e) => setSupervisorMarks(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              max="55"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-black py-2 rounded-lg hover:bg-blue-700"
          >
            Submit Marks
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssignMarks; 