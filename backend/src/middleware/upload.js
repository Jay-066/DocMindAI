const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

const uploadDir = path.resolve(process.cwd(), config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const EXT_TO_TYPE = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  // Plain-text formats, read as UTF-8 by textParser
  '.txt': 'text',
  '.md': 'text',
  '.markdown': 'text',
  '.csv': 'text',
  '.tsv': 'text',
  '.json': 'text',
  '.xml': 'text',
  '.yaml': 'text',
  '.yml': 'text',
  '.log': 'text',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!EXT_TO_TYPE[ext]) {
    const err = new Error(
      `Unsupported file type: ${ext || '(none)'}. Allowed: ${Object.keys(EXT_TO_TYPE).join(', ')}`
    );
    err.statusCode = 400;
    return cb(err, false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
});

function resolveFileType(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return EXT_TO_TYPE[ext] || null;
}

module.exports = { upload, resolveFileType, EXT_TO_TYPE, uploadDir };
