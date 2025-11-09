import mongoose from 'mongoose';

const supervisorFeedbackSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  feedback: {
    type: String,
    trim: true,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

supervisorFeedbackSchema.index({ student: 1, supervisor: 1 }, { unique: true }); // One feedback per student-supervisor

export default mongoose.model('SupervisorFeedback', supervisorFeedbackSchema); 