const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// List all categories
router.get('/', isAuthenticated, isAdmin, (req, res) => {
  const categories = db().prepare(`
    SELECT c.*, COUNT(p.id) as product_count 
    FROM categories c 
    LEFT JOIN products p ON c.id = p.category_id 
    GROUP BY c.id 
    ORDER BY c.name
  `).all();

  res.render('categories/index', {
    title: 'Manajemen Kategori',
    categories
  });
});

// Store category
router.post('/', isAuthenticated, isAdmin, (req, res) => {
  const { name } = req.body;

  if (!name) {
    req.flash('error_msg', 'Nama kategori harus diisi');
    return res.redirect('/categories');
  }

  try {
    db().prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    req.flash('success_msg', 'Kategori berhasil ditambahkan');
  } catch (error) {
    console.error('Error creating category:', error);
    req.flash('error_msg', 'Gagal menambahkan kategori');
  }
  res.redirect('/categories');
});

// Update category
router.put('/:id', isAuthenticated, isAdmin, (req, res) => {
  const { name } = req.body;

  if (!name) {
    req.flash('error_msg', 'Nama kategori harus diisi');
    return res.redirect('/categories');
  }

  try {
    db().prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, req.params.id);
    req.flash('success_msg', 'Kategori berhasil diupdate');
  } catch (error) {
    console.error('Error updating category:', error);
    req.flash('error_msg', 'Gagal mengupdate kategori');
  }
  res.redirect('/categories');
});

// Delete category
router.delete('/:id', isAuthenticated, isAdmin, (req, res) => {
  try {
    db().prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    req.flash('success_msg', 'Kategori berhasil dihapus');
  } catch (error) {
    console.error('Error deleting category:', error);
    req.flash('error_msg', 'Gagal menghapus kategori');
  }
  res.redirect('/categories');
});

module.exports = router;
