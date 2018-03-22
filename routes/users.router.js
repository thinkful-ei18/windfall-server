'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const {dbGet} = require('../db-knex');

router.post ('/users', (req, res, next) => {
  const knex = dbGet();

  const { fullname, username, password } = req.body;

  let userId;

  function hashPassword (password) {
    return bcrypt.hash(password, 10);
  }

  return hashPassword(password)
    .then(digest => {
      const newUser = {
        fullname: fullname,
        username: username,
        password: digest
      };
      return knex.insert(newUser)
        .into('users')
        .returning('id')
        .then(([id]) => {
          userId = id;
        });
    })
    .then(() => {
      return knex.select('users.fullname', 'users.username')
        .from('users')
        .where('users.id', userId)
        .first();
    })
    .then (result => {
      if (result) {
        res.location(`${req.originalUrl}/${userId}`).status(201).json(result);
      } else {
        next();
      }
    })
    .catch (err => {
      next(err);
    });

});

module.exports = router;