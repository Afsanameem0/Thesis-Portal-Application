import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['P1', 'P2', 'P3'],
    required: true,
    unique: true // Only one template per type
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

export default mongoose.model('Template', templateSchema); 