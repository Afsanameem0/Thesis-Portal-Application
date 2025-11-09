import Template from '../models/Template.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload a new template (admin only)
export const uploadTemplate = async (req, res) => {
  try {
    const { type } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    // Remove existing template of this type if exists
    const existing = await Template.findOne({ type });
    if (existing) {
      // Remove old file
      const oldPath = path.join(path.resolve(), 'server/uploads/templates/', existing.filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      await existing.deleteOne();
    }
    const template = new Template({
      type,
      filename: req.file.filename,
      originalName: req.file.originalname,
      uploadedBy: req.user._id
    });
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

// Get all templates (for student fetch)
export const getTemplates = async (req, res) => {
  try {
    const templates = await Template.find().select('-__v');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch templates', error: err.message });
  }
};

// Download a template by type
export const downloadTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    const template = await Template.findOne({ type });
    if (!template) {
      console.error(`[Download] Template not found for type: ${type}`);
      return res.status(404).json({ message: 'Template not found' });
    }
    // Use __dirname to resolve the correct path
    const filePath = path.join(__dirname, '../uploads/templates/', template.filename);
    console.log(`[Download] Attempting to download file:`, filePath);
    if (!fs.existsSync(filePath)) {
      console.error(`[Download] File not found at path: ${filePath}`);
      return res.status(404).json({ message: 'File not found' });
    }
    res.download(filePath, template.originalName, (err) => {
      if (err) {
        console.error(`[Download] Error sending file:`, err);
      } else {
        console.log(`[Download] File sent successfully:`, template.originalName);
      }
    });
  } catch (err) {
    console.error(`[Download] Unexpected error:`, err);
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
}; 