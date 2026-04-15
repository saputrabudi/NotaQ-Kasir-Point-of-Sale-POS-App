const express = require('express');
const router = express.Router();
const database = require('../../config/database');
const db = () => database.getDb();
const { isAuthenticated } = require('../../middleware/auth');

// Search products (for POS)
router.get('/search', isAuthenticated, (req, res) => {
  const search = req.query.q || '';
  const category = req.query.category || '';

  let query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock > 0
  `;
  const params = [];

  if (search) {
    query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    query += ' AND p.category_id = ?';
    params.push(category);
  }

  query += ' ORDER BY p.name ASC LIMIT 50';

  const products = db().prepare(query).all(...params);
  res.json({ success: true, data: products });
});

// Get product by barcode
router.get('/barcode/:code', isAuthenticated, (req, res) => {
  const product = db().prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.barcode = ?
  `).get(req.params.code);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  }

  if (product.stock <= 0) {
    return res.status(400).json({ success: false, message: 'Stok produk habis' });
  }

  res.json({ success: true, data: product });
});

// Get product by ID
router.get('/:id', isAuthenticated, (req, res) => {
  const product = db().prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  }

  res.json({ success: true, data: product });
});

module.exports = router;
