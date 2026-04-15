const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// List all users
router.get('/', isAuthenticated, isAdmin, (req, res) => {
  const users = db().prepare(`
    SELECT id, username, name, role, created_at FROM users ORDER BY name
  `).all();

  res.render('users/index', {
    title: 'Manajemen User',
    users
  });
});

// Create user form
router.get('/create', isAuthenticated, isAdmin, (req, res) => {
  res.render('users/form', {
    title: 'Tambah User',
    editUser: null
  });
});

// Store user
router.post('/', isAuthenticated, isAdmin, (req, res) => {
  const { username, password, name, role } = req.body;

  if (!username || !password || !name || !role) {
    req.flash('error_msg', 'Semua field harus diisi');
    return res.redirect('/users/create');
  }

  // Check if username exists
  const existing = db().prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    req.flash('error_msg', 'Username sudah digunakan');
    return res.redirect('/users/create');
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db().prepare(`
      INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)
    `).run(username, hashedPassword, name, role);

    req.flash('success_msg', 'User berhasil ditambahkan');
    res.redirect('/users');
  } catch (error) {
    console.error('Error creating user:', error);
    req.flash('error_msg', 'Gagal menambahkan user');
    res.redirect('/users/create');
  }
});

// Edit user form
router.get('/:id/edit', isAuthenticated, isAdmin, (req, res) => {
  const editUser = db().prepare('SELECT id, username, name, role FROM users WHERE id = ?').get(req.params.id);

  if (!editUser) {
    req.flash('error_msg', 'User tidak ditemukan');
    return res.redirect('/users');
  }

  res.render('users/form', {
    title: 'Edit User',
    editUser
  });
});

// Update user
router.put('/:id', isAuthenticated, isAdmin, (req, res) => {
  const { username, password, name, role } = req.body;
  const userId = req.params.id;

  if (!username || !name || !role) {
    req.flash('error_msg', 'Username, nama, dan role harus diisi');
    return res.redirect(`/users/${userId}/edit`);
  }

  // Check if username exists for other user
  const existing = db().prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
  if (existing) {
    req.flash('error_msg', 'Username sudah digunakan');
    return res.redirect(`/users/${userId}/edit`);
  }

  try {
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db().prepare(`
        UPDATE users SET username = ?, password = ?, name = ?, role = ? WHERE id = ?
      `).run(username, hashedPassword, name, role, userId);
    } else {
      db().prepare(`
        UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?
      `).run(username, name, role, userId);
    }

    req.flash('success_msg', 'User berhasil diupdate');
    res.redirect('/users');
  } catch (error) {
    console.error('Error updating user:', error);
    req.flash('error_msg', 'Gagal mengupdate user');
    res.redirect(`/users/${userId}/edit`);
  }
});

// Delete user
router.delete('/:id', isAuthenticated, isAdmin, (req, res) => {
  const userId = req.params.id;

  // Prevent deleting self
  if (parseInt(userId) === req.session.user.id) {
    req.flash('error_msg', 'Tidak dapat menghapus akun sendiri');
    return res.redirect('/users');
  }

  try {
    db().prepare('DELETE FROM users WHERE id = ?').run(userId);
    req.flash('success_msg', 'User berhasil dihapus');
  } catch (error) {
    console.error('Error deleting user:', error);
    req.flash('error_msg', 'Gagal menghapus user');
  }

  res.redirect('/users');
});

module.exports = router;
