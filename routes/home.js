'use strict';

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const homeGetController = require('../controllers/home/get');

router.get('/', jsonParser, homeGetController.get_index);

module.exports = router;
