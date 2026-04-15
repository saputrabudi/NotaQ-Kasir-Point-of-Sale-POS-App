const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Stock list
router.get('/', isAuthenticated, isAdmin, (req, res) => {
  const search = req.query.search || '';
  const filter = req.query.filter || ''; // all, low, out

  let query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (filter === 'low') {
    query += ' AND p.stock <= p.min_stock AND p.stock > 0';
  } else if (filter === 'out') {
    query += ' AND p.stock <= 0';
  }

  query += ' ORDER BY p.stock ASC, p.name ASC';

  const products = db().prepare(query).all(...params);

  // Get summary
  const summary = db().prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN stock <= min_stock AND stock > 0 THEN 1 ELSE 0 END) as low_stock,
      SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) as out_of_stock
    FROM products
  `).get();

  res.render('stock/index', {
    title: 'Manajemen Stok',
    products,
    summary,
    search,
    filter
  });
});

// Adjustment form
router.get('/adjustment/:id', isAuthenticated, isAdmin, (req, res) => {
  const product = db().prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) {
    req.flash('error_msg', 'Produk tidak ditemukan');
    return res.redirect('/stock');
  }

  // Get adjustment history
  const history = db().prepare(`
    SELECT sa.*, u.name as user_name 
    FROM stock_adjustments sa 
    LEFT JOIN users u ON sa.user_id = u.id 
    WHERE sa.product_id = ?
    ORDER BY sa.created_at DESC 
    LIMIT 10
  `).all(req.params.id);

  res.render('stock/adjustment', {
    title: 'Penyesuaian Stok',
    product,
    history
  });
});

// Process adjustment
router.post('/adjustment/:id', isAuthenticated, isAdmin, (req, res) => {
  const { adjustment_type, qty, reason } = req.body;
  const productId = req.params.id;

  const product = db().prepare('SELECT * FROM products WHERE id = ?').get(productId);

  if (!product) {
    req.flash('error_msg', 'Produk tidak ditemukan');
    return res.redirect('/stock');
  }

  const qtyNum = parseInt(qty) || 0;
  if (qtyNum <= 0) {
    req.flash('error_msg', 'Jumlah harus lebih dari 0');
    return res.redirect(`/stock/adjustment/${productId}`);
  }

  const qtyBefore = product.stock;
  let qtyAfter, adjustmentValue;

  if (adjustment_type === 'add') {
    qtyAfter = qtyBefore + qtyNum;
    adjustmentValue = qtyNum;
  } else if (adjustment_type === 'subtract') {
    qtyAfter = qtyBefore - qtyNum;
    adjustmentValue = -qtyNum;
    if (qtyAfter < 0) {
      req.flash('error_msg', 'Stok tidak boleh kurang dari 0');
      return res.redirect(`/stock/adjustment/${productId}`);
    }
  } else if (adjustment_type === 'set') {
    qtyAfter = qtyNum;
    adjustmentValue = qtyNum - qtyBefore;
  } else {
    req.flash('error_msg', 'Tipe penyesuaian tidak valid');
    return res.redirect(`/stock/adjustment/${productId}`);
  }

  try {
    const transaction = db().transaction(() => {
      // Update stock
      db().prepare('UPDATE products SET stock = ? WHERE id = ?').run(qtyAfter, productId);

      // Record adjustment
      db().prepare(`
        INSERT INTO stock_adjustments (product_id, user_id, qty_before, qty_after, adjustment, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(productId, req.session.user.id, qtyBefore, qtyAfter, adjustmentValue, reason || null);
    });

    transaction();
    req.flash('success_msg', 'Stok berhasil disesuaikan');
  } catch (error) {
    console.error('Error adjusting stock:', error);
    req.flash('error_msg', 'Gagal menyesuaikan stok');
  }

  res.redirect(`/stock/adjustment/${productId}`);
});

// Adjustment history
router.get('/history', isAuthenticated, isAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const totalCount = db().prepare('SELECT COUNT(*) as total FROM stock_adjustments').get();
  const totalPages = Math.ceil(totalCount.total / limit);

  const adjustments = db().prepare(`
    SELECT sa.*, p.name as product_name, p.barcode, u.name as user_name 
    FROM stock_adjustments sa 
    LEFT JOIN products p ON sa.product_id = p.id 
    LEFT JOIN users u ON sa.user_id = u.id 
    ORDER BY sa.created_at DESC 
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.render('stock/history', {
    title: 'Riwayat Penyesuaian Stok',
    adjustments,
    currentPage: page,
    totalPages
  });
});

module.exports = router;
