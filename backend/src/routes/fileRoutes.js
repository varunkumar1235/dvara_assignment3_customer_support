const express = require('express');
const router = express.Router();
const { upload, uploadFile, getFile, deleteFile } = require('../controllers/fileController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/:id', getFile);
router.delete('/:id', deleteFile);

module.exports = router;

