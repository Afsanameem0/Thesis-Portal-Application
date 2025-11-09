import express from 'express';
import { uploadPaper, listPapers, deletePaper, uploadPaperFile, getPaper } from '../controllers/paperController.js';
import { protect, faculty, admin } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, '../uploads/papers');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for papers with basic sanitization
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, 'paper-' + uniqueSuffix + '-' + sanitizedName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Public list
router.get('/', listPapers);

// Get single paper
router.get('/:id', getPaper);

// Faculty upload
router.post('/', protect, faculty, uploadPaper);
router.post(
  '/upload',
  protect,
  faculty,
  // Wrap multer to surface clear errors back to client instead of generic 500
  (req, res, next) => {
    upload.single('paper')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err.message || 'File upload failed' });
      }
      next();
    });
  },
  uploadPaperFile
);

// Delete by owner or admin
router.delete('/:id', protect, deletePaper);

export default router;

