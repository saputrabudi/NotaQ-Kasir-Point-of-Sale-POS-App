const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const database = require('../config/database');
const db = () => database.getDb();
const { isGuest, isAuthenticated } = require('../middleware/auth');

// Home redirect
router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Login page
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { 
    title: 'Login',
    layout: 'layouts/auth'
  });
});

// Login process
router.post('/login', isGuest, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    req.flash('error_msg', 'Username dan password harus diisi');
    return res.redirect('/login');
  }

  const user = db().prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    req.flash('error_msg', 'Username tidak ditemukan');
    return res.redirect('/login');
  }

  const isMatch = bcrypt.compareSync(password, user.password);

  if (!isMatch) {
    req.flash('error_msg', 'Password salah');
    return res.redirect('/login');
  }

  // Set session
  req.session.user = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  };

  req.flash('success_msg', `Selamat datang, ${user.name}!`);
  res.redirect('/dashboard');
});

// Logout
router.get('/logout', isAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
