import Paper from '../models/Paper.js';
import { authorize } from '../middleware/auth.js';
import path from 'path';

// @desc    Get a single paper by ID
// @route   GET /api/papers/:id
// @access  Public
export const getPaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id)
      .populate('uploadedBy', 'name email department');
    
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }
    
    res.json(paper);
  } catch (error) {
    console.error('Get paper error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload a paper (faculty only)
// @route   POST /api/papers
// @access  Private (faculty)
export const uploadPaper = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can upload papers' });
    }

    const { title, abstract, keywords, department, fileUrl, fileName, fileSize, year, semester } = req.body;

    if (!title || !abstract || !department || !fileUrl || !fileName || !year || !semester) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const paper = await Paper.create({
      title,
      abstract,
      keywords: (keywords || '').split(',').map(k => k.trim()).filter(Boolean),
      department,
      fileUrl,
      fileName,
      fileSize,
      year,
      semester,
      uploadedBy: req.user._id
    });

    const populated = await Paper.findById(paper._id).populate('uploadedBy', 'name email department');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Upload paper error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload paper file (faculty only, returns file URL and meta)
// @route   POST /api/papers/upload
// @access  Private (faculty)
export const uploadPaperFile = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can upload papers' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = `uploads/papers/${req.file.filename}`;
    const fileUrl = `${req.protocol}://${req.get('host')}/${filePath}`;

    return res.status(201).json({
      fileUrl,
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      path: filePath
    });
  } catch (error) {
    console.error('Upload paper file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List papers (public)
// @route   GET /api/papers
// @access  Public
export const listPapers = async (req, res) => {
  try {
    const { department, year, semester, search } = req.query;
    const query = {};
    if (department) query.department = department;
    if (year) query.year = Number(year);
    if (semester) query.semester = semester;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { abstract: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    const papers = await Paper.find(query)
      .populate('uploadedBy', 'name email department')
      .sort({ createdAt: -1 });
    res.json(papers);
  } catch (error) {
    console.error('List papers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a paper (owner faculty or admin)
// @route   DELETE /api/papers/:id
// @access  Private (faculty/admin)
export const deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    const isOwner = paper.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await paper.deleteOne();
    res.json({ message: 'Paper deleted' });
  } catch (error) {
    console.error('Delete paper error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

