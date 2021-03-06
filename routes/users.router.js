'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const {dbGet} = require('../db-knex');
const { getUserId } = require('../utils/getUserId');

router.post ('/users', (req, res, next) => {
  const knex = dbGet();
  const { firstname, username, password, income } = req.body;
  let userId;

  const requiredFields = ['username', 'password', 'income', 'firstname'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    const err = new Error(`Missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }

  const stringFields = ['username', 'password', 'firstname'];
  const nonStringField = stringFields.find(
    field => field in req.body && typeof req.body[field] !== 'string'
  );

  const incomeField = ['income'];
  const nonIncomeField = incomeField.find(
    field => field in req.body && typeof req.body[field] !== 'number'
  );

  if (nonIncomeField) {
    const err = new Error(`Field: '${incomeField}' must be a number`);
    err.status = 422;
    return next(err);
  }

  if (nonStringField) {
    const err = new Error(`Field: '${nonStringField}' must be a string`);
    err.status = 422;
    return next(err);
  }

  const explicityTrimmedFields = ['username', 'password', 'firstname'];
  const nonTrimmedField = explicityTrimmedFields.find(
    field => req.body[field].trim() !== req.body[field]
  );

  if (nonTrimmedField) {
    const err = new Error(`Field: '${nonTrimmedField}' cannot start or end with whitespace`);
    err.status = 422;
    return next(err);
  }

  const sizedFields = {
    username: { min: 1 },
    password: { min: 8, max: 72 }
  };

  const tooSmallField = Object.keys(sizedFields).find(
    field => 'min' in sizedFields[field] &&
        req.body[field].trim().length < sizedFields[field].min
  );

  if (tooSmallField) {
    const min = sizedFields[tooSmallField].min;
    const err = new Error(`Field: '${tooSmallField}' must be at least ${min} characters long`);
    err.status = 422;
    return next(err);
  }

  const tooLargeField = Object.keys(sizedFields).find(
    field => 'max' in sizedFields[field] &&
        req.body[field].trim().length > sizedFields[field].max
  );

  if (tooLargeField) {
    const max = sizedFields[tooLargeField].max;
    const err = new Error(`Field: '${tooSmallField}' must be at most ${max} characters long`);
    err.status = 422;
    return next(err);
  }

  return bcrypt.hash(password, 10)
    .then(digest => {
      const newUser = {
        firstname: firstname,
        username: username,
        income: income,
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
      return knex.select('users.firstname', 'users.username')
        .from('users')
        .where('users.id', userId)
        .first();
    })
    .then (user => {
      if (user) {
        res.location(`${req.originalUrl}/${userId}`).status(201).json(user);
      } else {
        next();
      }
    })
    .catch (err => {
      // console.log(err);
      if (err.code === '23505') {
        err = new Error('Sorry, this username already exists');
        err.status = 400;
      }
      next(err);
    });

});

router.get('/users/income', (req, res, next) => {
  const knex = dbGet();
  const userId = getUserId(req);

  knex
    .select('users.income')
    .from('users')
    .where('users.id', userId)
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      next(err);
    });
});

router.put('/users/income', (req, res, next) => {
  const knex = dbGet();

  const { income } = req.body;
  const userId = getUserId(req);
  const userIncome = {
    income: income
  };

  knex('users.id').from('users')
    .where('users.id', userId)
    .then(result => {
      if (result && result.length > 0) {
        knex('users')
          .update(userIncome)
          .where('id', userId)
          .then(() => {
            return knex.select('users.income')
              .from('users')
              .where('users.id', userId)
              .first()
              .then(user => {
                if (user) {
                  res.json(user);
                }
              });
          });
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });

});

module.exports = router;