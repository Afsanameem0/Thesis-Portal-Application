import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import StudentDashboard from '../student/StudentDashboard';
import FacultyDashboard from '../faculty/FacultyDashboard';

const Dashboard = () => {
  const { user, refreshUserData } = useAuth();

  // Trigger data refresh when dashboard mounts
  useEffect(() => {
    if (user) {
      // Small delay to ensure components are mounted
      setTimeout(() => {
        refreshUserData();
      }, 100);
    }
  }, [user, refreshUserData]);

  if (!user) return null;
  
  // Redirect admin users to admin dashboard
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  if (user.role === 'faculty') return <FacultyDashboard />;
  return <StudentDashboard />;
};

export default Dashboard; 