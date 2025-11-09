import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToasterProvider, useToaster } from './components/Toaster';
import useSessionTimeout from './hooks/useSessionTimeout';
import SessionWarningModal from './components/SessionWarningModal';
import Navbar from './components/Index/Navbar'; 
import LandingPage from './components/Index/LandingPage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Index/Dashboard';
import ThesisList from './components/thesis/ThesisList';
import ThesisDetail from './components/thesis/ThesisDetail';
import PaperDetail from './components/thesis/PaperDetail';
import UploadPaper from './components/thesis/UploadPaper';
import CreateThesis from './components/thesis/CreateThesis';
import AssignMarks from './components/faculty/AssignMarks';
import PrivateRoute from './components/PrivateRoute';
import StudentRoute from './components/student/StudentRoute';
import Profile from './components/Profile';
import NotificationPage from './components/notifications/NotificationPage';
import AdminDashboard from './components/admin/AdminDashboard';
import Marks from './components/admin/Marks';
import Messages from './components/messege/Messages';
import FloatingMessageNotification from './components/messege/FloatingMessageNotification';
import AIAnalysisPage from './components/ai/AIAnalysisPage';
import GroupFormation from './components/student/GroupFormation';
import GroupDetails from './components/student/GroupDetails';
import AdminGroups from './components/admin/AdminGroups';

import FacultyList from './components/faculty/FacultyList';
import SeatRequestPage from './components/faculty/SeatRequestPage';
import CreatePost from './components/posts/CreatePost';
import PostFeed from './components/posts/PostFeed';
import RatingAndFeedbacks from './components/student/RatingAndFeedbacks';
import './css/App.css';

// Create a SessionWrapper component
const SessionWrapper = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const { showWarning, timeLeft, extendSession } = useSessionTimeout(15, 2); // 15 min timeout, 2 min warning
  const { showToast } = useToaster();

  // Listen for toast events from AuthContext
  useEffect(() => {
    const handleToastEvent = (event) => {
      const { message, type } = event.detail;
      showToast(message, type);
    };

    window.addEventListener('showToast', handleToastEvent);
    return () => window.removeEventListener('showToast', handleToastEvent);
  }, [showToast]);

  return (
    <>
      {children}
      {isAuthenticated && (
        <>
          <SessionWarningModal
            isOpen={showWarning}
            timeLeft={timeLeft}
            onExtend={extendSession}
            onLogout={logout}
          />
          <FloatingMessageNotification />
        </>
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToasterProvider>
          <AppContent />
        </ToasterProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

const AppContent = () => {
  const { user } = useAuth();
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SessionWrapper>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/theses" element={<ThesisList />} />
            <Route path="/theses/:id" element={<ThesisDetail />} />
            <Route path="/papers/:paperId" element={<PaperDetail />} />
            <Route path="/upload-paper" element={<PrivateRoute><UploadPaper /></PrivateRoute>} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/create-thesis" 
              element={
                <StudentRoute>
                  <CreateThesis />
                </StudentRoute>
              } 
            />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/faculty" element={<PrivateRoute><FacultyList /></PrivateRoute>} />
            <Route path="/marks" element={<PrivateRoute><Marks /></PrivateRoute>} />
            <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            <Route path="/assign-marks/:studentId" element={<AssignMarks />} />
            <Route path="/notifications" element={<NotificationPage />} />
            <Route path="/posts" element={<PrivateRoute><PostFeed /></PrivateRoute>} />
            <Route 
              path="/create-post" 
              element={
                <StudentRoute>
                  <CreatePost />
                </StudentRoute>
              } 
            />
            <Route 
              path="/feedbacks" 
              element={
                <StudentRoute>
                  <RatingAndFeedbacks />
                </StudentRoute>
              } 
            />
            <Route 
              path="/ai-analysis" 
              element={
                <PrivateRoute>
                  <AIAnalysisPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/seat-request" 
              element={
                <PrivateRoute>
                  <SeatRequestPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/group-formation" 
              element={
                <StudentRoute>
                  <GroupFormation />
                </StudentRoute>
              } 
            />
            <Route 
              path="/group-details" 
              element={
                <StudentRoute>
                  <GroupDetails />
                </StudentRoute>
              } 
            />
            <Route 
              path="/admin/groups" 
              element={
                <PrivateRoute>
                  <AdminGroups />
                </PrivateRoute>
              } 
            />
          </Routes>
        </div>
      </SessionWrapper>
    </Router>
  );
};

export default App; 