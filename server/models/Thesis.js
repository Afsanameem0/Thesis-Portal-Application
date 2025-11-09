import mongoose from "mongoose";

const thesisSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // For group submissions
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  // Indicates if this is a group submission
  isGroupSubmission: {
    type: Boolean,
    default: false
  },
  abstract: {
    type: String,
    required: true,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  department: {
    type: String,
    required: true,
    trim: true
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submissionType: {
    type: String,
    enum: ['P1', 'P2', 'P3'],
    required: true
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  year: {
    type: Number,
    required: true
  },
  semester: {
    type: String,
    enum: ['Spring', 'Summer', 'Fall'],
    required: true
  },
  grade: {
    type: String,
    trim: true
  },
  comments: [{
    comment: String,
    commentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }]
});

const Thesis = mongoose.model('Thesis', thesisSchema);

export default Thesis; 