import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  abstract: { type: String, required: true, trim: true },
  keywords: [{ type: String, trim: true }],
  department: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number },
  year: { type: Number, required: true },
  semester: { type: String, enum: ['Spring', 'Summer', 'Fall'], required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create text index for search functionality
paperSchema.index({ title: 'text', abstract: 'text', keywords: 'text' });

const Paper = mongoose.model('Paper', paperSchema);
export default Paper;

