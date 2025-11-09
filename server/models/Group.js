import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  members: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
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
  p1Marks: {
    score: {
      type: Number,
      default: null
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    comments: {
      type: String,
      default: null
    }
  },
  p2Marks: {
    score: {
      type: Number,
      default: null
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    comments: {
      type: String,
      default: null
    }
  },
  p3Marks: {
    score: {
      type: Number,
      default: null
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    comments: {
      type: String,
      default: null
    }
  },
  supervisorMarks: {
    score: {
      type: Number,
      default: null
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    comments: {
      type: String,
      default: null
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce group size constraints: at least 2 and at most 4 members
groupSchema.path('members').validate(function(members) {
  // When creating or updating, ensure group size within limits
  const size = members?.length || 0;
  return size >= 2 && size <= 4;
}, 'Group must have between 2 and 4 members');

// Update the updatedAt field before saving
groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Group = mongoose.model('Group', groupSchema);

export default Group; 