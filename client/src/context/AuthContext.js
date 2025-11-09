import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // Install: npm install jwt-decode

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:5001';

// Toaster event system
const toasterEvents = {
  showSuccess: (message) => {
    window.dispatchEvent(new CustomEvent('showToast', { 
      detail: { message, type: 'success' } 
    }));
  },
  showError: (message) => {
    window.dispatchEvent(new CustomEvent('showToast', { 
      detail: { message, type: 'error' } 
    }));
  },
  showInfo: (message) => {
    window.dispatchEvent(new CustomEvent('showToast', { 
      detail: { message, type: 'info' } 
    }));
  }
};

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: action.payload,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };
    case 'LOGIN_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    case 'USER_LOADED':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up axios interceptor for auth token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      config => {
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [state.token]);

  // Add token validation function
  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  // Update the loadUser function
  const loadUser = async () => {
    if (!state.token || isTokenExpired(state.token)) {
      dispatch({ type: 'AUTH_ERROR' });
      return;
    }

    try {
      const res = await axios.get('/api/auth/profile');
      dispatch({ type: 'USER_LOADED', payload: res.data });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR' });
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', {
        email,
        password
      });
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
      
      // Show success toast
      toasterEvents.showSuccess(`Welcome back, ${res.data.name}!`);
      
      // Role-based redirect logic
      const userRole = res.data.role;
      let redirectPath = '/dashboard'; // default
      
      if (userRole === 'admin') {
        redirectPath = '/admin';
      } else if (userRole === 'student') {
        // For students, refresh thesis and supervisor data
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshStudentData'));
        }, 100);
      } else if (userRole === 'faculty') {
        // For faculty, refresh supervisees and requests data
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshFacultyData'));
        }, 100);
      }
      
      return { success: true, redirectPath };
    } catch (error) {
      dispatch({ type: 'LOGIN_FAIL' });
      toasterEvents.showError(error.response?.data?.message || 'Login failed');
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      const res = await axios.post('/api/auth/register', userData);
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
      toasterEvents.showSuccess(`Account created successfully! Welcome, ${res.data.name}!`);
      return { success: true };
    } catch (error) {
      dispatch({ type: 'LOGIN_FAIL' });
      toasterEvents.showError(error.response?.data?.message || 'Registration failed');
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  // Logout user
  const logout = () => {
    const userName = state.user?.name || 'User';
    dispatch({ type: 'LOGOUT' });
    delete axios.defaults.headers.common['Authorization'];
    toasterEvents.showInfo(`You have been logged out successfully.`);
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const res = await axios.put('/api/auth/profile', profileData);
      dispatch({ type: 'USER_LOADED', payload: res.data });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Update failed' };
    }
  };

  // Refresh data based on user role
  const refreshUserData = () => {
    if (state.user?.role === 'student') {
      window.dispatchEvent(new CustomEvent('refreshStudentData'));
    } else if (state.user?.role === 'faculty') {
      window.dispatchEvent(new CustomEvent('refreshFacultyData'));
    }
  };

  // Upload profile image (file upload)
  const uploadProfileImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const res = await axios.post('/api/auth/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      dispatch({ type: 'USER_LOADED', payload: { ...state.user, profileImage: res.data.profileImage } });
      return { success: true, profileImage: res.data.profileImage };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Image upload failed' };
    }
  };

  // Add session validation effect
  useEffect(() => {
    // Check token validity every minute
    const interval = setInterval(() => {
      if (state.token && isTokenExpired(state.token)) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [state.token]);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add a function to reload user data from backend
  const reloadUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        login,
        register,
        logout,
        updateProfile,
        refreshUserData,
        uploadProfileImage,
        reloadUser, // <-- add this
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 