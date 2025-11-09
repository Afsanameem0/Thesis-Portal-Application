import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToaster } from './Toaster';
import axios from 'axios';

const Profile = () => {
  const { user, updateProfile, uploadProfileImage } = useAuth();
  const { showSuccess, showError } = useToaster();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    department: user?.department || '',
    studentId: user?.studentId || '',
    cgpa: user?.cgpa || ''
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate CGPA if provided
    if (user.role === 'student' && formData.cgpa !== '') {
      const cgpa = parseFloat(formData.cgpa);
      if (isNaN(cgpa) || cgpa < 0.0 || cgpa > 4.0) {
        setMessage('CGPA must be a number between 0.00 and 4.00');
        return;
      }
    }
    
    setLoading(true);
    setMessage('');
    const result = await updateProfile(formData);
    setLoading(false);
    if (result.success) {
      showSuccess('Profile updated successfully!');
      setEditMode(false);
    } else {
      showError(result.message);
      setMessage(result.message);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Preview the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    const file = fileInputRef.current.files[0];
    if (!file) {
      setMessage('Please select an image file');
      return;
    }

    setLoading(true);
    setMessage('');
    const result = await uploadProfileImage(file);
    setLoading(false);
    if (result.success) {
      showSuccess('Profile image updated successfully!');
      setImagePreview(null);
      fileInputRef.current.value = '';
    } else {
      showError(result.message);
      setMessage(result.message);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters long');
      return;
    }
    
    setPasswordLoading(true);
    setMessage('');
    
    try {
      const response = await axios.post('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      showSuccess('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to change password');
      setMessage(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Image Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-center">
                <div className="relative inline-block cursor-pointer group" onClick={() => fileInputRef.current.click()}>
                  <img
                    src={imagePreview || (user.profileImage ? (user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:5001/uploads/${user.profileImage}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=200&background=3B82F6&color=fff&bold=true`)}
                    alt="Profile"
                    className="w-48 h-48 rounded-full object-cover object-center border-4 border-blue-100 shadow-lg mx-auto mb-4 transition-transform duration-200 group-hover:scale-105"
                    style={{ 
                      objectFit: 'cover', 
                      objectPosition: 'center center',
                      minWidth: '192px',
                      minHeight: '192px',
                      maxWidth: '192px',
                      maxHeight: '192px'
                    }}
                    onLoad={() => {
                      // console.log('Profile image loaded successfully:', user.profileImage);
                    }}
                    onError={(e) => {
                      // console.log('Profile image failed to load:', user.profileImage);
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=200&background=3B82F6&color=fff&bold=true`;
                    }}
                  />
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                
                {imagePreview && (
                  <div className="mt-4 flex flex-col items-center space-y-3">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-32 h-32 rounded-full border-2 border-blue-400 object-cover object-center shadow-lg mb-2" 
                      style={{ 
                        objectFit: 'cover', 
                        objectPosition: 'center center',
                        minWidth: '128px',
                        minHeight: '128px',
                        maxWidth: '128px',
                        maxHeight: '128px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); fileInputRef.current.value = ''; }}
                      className="w-half bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleImageUpload}
                      disabled={loading}
                      className="w-half bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-black font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      {loading ? 'Uploading...' : 'Upload Image'}
                    </button>
                    <div className="text-xs text-gray-400 mt-1">You can clear the preview before uploading</div>
                  </div>
                )}
                
                                  <div className="mt-4 text-sm text-gray-500">
                    <p>Click to choose and upload a new profile picture</p>
                  
                  </div>
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                  message.includes('successfully') 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              {!editMode ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                    <button
                      onClick={() => setEditMode(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Profile</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                        <p className="text-lg font-semibold text-gray-900">{user.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                        <p className="text-lg font-semibold text-gray-900">{user.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                        <p className="text-lg font-semibold text-gray-900">{user.department}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Role </label>
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-300 text-sm font-medium capitalize">{user.role}</span>
                      
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Student ID</label>
                        <p className="text-lg font-semibold text-gray-900">{user.studentId || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                        <p className="text-lg font-semibold text-gray-900">{user.phone || 'Not provided'}</p>
                      </div>
                      {user.role === 'student' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">CGPA</label>
                          <p className="text-lg font-semibold text-gray-900">{user.cgpa ? `${user.cgpa.toFixed(2)}/4.00` : 'Not provided'}</p>
                        </div>
                      )}
                    </div>  
                  </div>
                  <div> <br></br>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Member since</label>
                          <p className="text-lg font-semibold text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  {user.bio && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-500 mb-2">Bio</label>
                      <p className="text-gray-900 leading-relaxed bg-gray-50 p-4 rounded-lg">{user.bio}</p>
                    </div>
                  )}
                  
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
                      <input
                        type="text"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                      />
                    </div>
                    {user.role === 'student' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CGPA</label>
                        <input
                          type="number"
                          name="cgpa"
                          value={formData.cgpa}
                          onChange={handleChange}
                          min="0.0"
                          max="4.0"
                          step="0.01"
                          placeholder="e.g., 3.75"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter your CGPA on a 4.0 scale (0.00 - 4.00)</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 resize-none"
                      placeholder="Tell us a bit about yourself..."
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Password Change Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="bg-red-600 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    {showPasswordForm ? "Close" : 'Change Password'}
                  </button>
                </div>

                {showPasswordForm && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        required
                        minLength="6"
                      />
                      <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordForm({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                        }}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center space-x-2"
                      >
                        {passwordLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Changing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <span>Change Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 