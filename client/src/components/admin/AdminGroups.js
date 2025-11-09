import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToaster } from '../../components/Toaster';

const AdminGroups = () => {
  const { showSuccess, showError, showInfo } = useToaster();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/groups/all');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      showError('Error fetching groups');
    } finally {
      setLoading(false);
    }
  };

  const removeGroupMember = async (groupId, studentId) => {
    try {
      await axios.post('/api/groups/remove-member', { groupId, studentId });
      showSuccess('Member removed from group successfully');
      fetchGroups();
    } catch (error) {
      console.error('Error removing group member:', error);
      showError(error.response?.data?.message || 'Error removing group member');
    }
  };

  const removeGroupSupervisor = async (groupId) => {
    try {
      await axios.post('/api/groups/remove-supervisor', { groupId });
      showSuccess('Supervisor removed from group successfully');
      fetchGroups();
    } catch (error) {
      console.error('Error removing group supervisor:', error);
      showError(error.response?.data?.message || 'Error removing group supervisor');
    }
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Group Management</h1>
        <p className="text-gray-600">Manage all groups and their members</p>
      </div>



      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">All Groups ({groups.length})</h2>
        {groups.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No groups found</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleGroupClick(group)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-600">
                      Members: {group.members.length} • 
                      Status: {group.status} • 
                      Created: {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                    {group.supervisor && (
                      <p className="text-sm text-green-600">
                        Supervisor: {group.supervisor.name}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (group.supervisor) {
                          removeGroupSupervisor(group._id);
                        }
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      disabled={!group.supervisor}
                    >
                      Remove Supervisor
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Details Modal */}
      {showGroupDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Group Details</h3>
              <button
                onClick={() => setShowGroupDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900">{selectedGroup.name}</h4>
                <p className="text-sm text-gray-600">
                  Status: {selectedGroup.status} • Created: {new Date(selectedGroup.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Members */}
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Members</h5>
                <div className="space-y-2">
                  {selectedGroup.members.map((member, index) => (
                    <div key={index} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {member.studentId.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.studentId.name}</p>
                          <p className="text-xs text-gray-600">
                            {member.studentId.department} • {member.studentId.studentId}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeGroupMember(selectedGroup._id, member.studentId._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supervisor */}
              {selectedGroup.supervisor && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Supervisor</h5>
                  <div className="flex items-center justify-between border border-green-200 rounded-lg p-3 bg-green-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold text-sm">
                          {selectedGroup.supervisor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedGroup.supervisor.name}</p>
                        <p className="text-xs text-gray-600">{selectedGroup.supervisor.department}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeGroupSupervisor(selectedGroup._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Supervisor Requests */}
              {selectedGroup.supervisorRequests && selectedGroup.supervisorRequests.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Pending Supervisor Requests</h5>
                  <div className="space-y-2">
                    {selectedGroup.supervisorRequests.map((request, index) => (
                      <div key={index} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{request.facultyId.name}</p>
                            <p className="text-xs text-gray-600">{request.facultyId.department}</p>
                            <p className="text-xs text-yellow-600">Status: {request.status}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                            request.status === 'accepted' ? 'bg-green-200 text-green-800' :
                            'bg-red-200 text-red-800'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGroups; 