import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  studentId: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String, // URL to the profile image
    default: ''
  },
  bio: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  cgpa: {
    type: Number,
    min: 0.0,
    max: 4.0,
    default: null
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Only for students
  },
  // Group formation fields
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  groupRequests: [{
    fromStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Updated to support multiple supervisor requests
  supervisorRequests: [{
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // For faculty: track all pending requests from students
  pendingSupervisorRequests: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  supervisees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [] // Only for faculty
  }],
  // Seat management for faculty
  seatCapacity: {
    type: Number,
    default: 9, // Default capacity for faculty
    min: 0
  },
  seatIncreaseRequests: [{
    requestedSeats: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      trim: true,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: {
      type: String,
      trim: true
    }
  }],
  // Bookmarked theses (for all users)
  thesisBookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Thesis',
    default: []
  }],
  // Bookmarked papers (for all users)
  paperBookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    default: []
  }],
  // Thesis registration fields
  thesisRegistration: {
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted'
    },
    title: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    supervisorName: {
      type: String,
      trim: true
    },
    submittedAt: {
      type: Date
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: {
      type: String,
      trim: true
    }
  },
  // Marks system - only for students
  marks: {
    p1: {
      score: {
        type: Number,
        min: 0,
        max: 5,
        default: null
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedAt: {
        type: Date
      },
      comments: {
        type: String,
        trim: true
      }
    },
    p2: {
      score: {
        type: Number,
        min: 0,
        max: 10,
        default: null
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedAt: {
        type: Date
      },
      comments: {
        type: String,
        trim: true
      }
    },
    p3: {
      score: {
        type: Number,
        min: 0,
        max: 30,
        default: null
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedAt: {
        type: Date
      },
      comments: {
        type: String,
        trim: true
      }
    },
    supervisor: {
      score: {
        type: Number,
        min: 0,
        max: 55,
        default: null
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedAt: {
        type: Date
      },
      comments: {
        type: String,
        trim: true
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User; 