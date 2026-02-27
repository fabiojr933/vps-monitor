const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/DashboardController');

router.get('/', dashboard.index);
router.get('/teste', dashboard.teste);

module.exports = router;