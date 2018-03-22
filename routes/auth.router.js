'use strict';

const express = require('express');
const passport = require(passport);
const router = express.Router();

// const {dbGet} = require('../db-knex');

const options = {session: false, failWithError: true};

const localAuth = passport.authenticate('local', options);

router.post('/login', localAuth, function (req, res) {
  return res.json(req.user);
});