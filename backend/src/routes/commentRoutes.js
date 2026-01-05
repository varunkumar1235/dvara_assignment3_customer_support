const express = require('express');
const router = express.Router();
const { createComment, getComments } = require('../controllers/commentController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.post('/', createComment);
router.get('/ticket/:ticket_id', getComments);

module.exports = router;





