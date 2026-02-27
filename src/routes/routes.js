const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/DashboardController');

router.get('/', dashboard.index);

module.exports = router;