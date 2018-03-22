'use strict';

const express = require('express');
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');

const app = express();
const bodyParser = require('body-parser');


const {dbGet} = require('../db-knex');

app.use(express.static('public'));
app.use(bodyParser.json());

const localStrategy = new LocalStrategy((username, password, done) => {

  const knex = dbGet();
  let user;

  knex.select('users.username', 'users.password')
    .from('users')
    .where('users.username', username)
    .first()
    .then(results => {
      user = results;
      if (!user) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect username',
          location: 'username'
        });
      }
      return user.validatePassword(password);
    })
    .then(isValid => {
      if (!isValid) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect password',
          location: 'password'
        });
      }
      return done(null, user);
    })
    .catch(err => {
      if(err.reason === 'LoginError') {
        return done(null, false);
      }
      return done(err);
    });
});

module.exports = localStrategy;
