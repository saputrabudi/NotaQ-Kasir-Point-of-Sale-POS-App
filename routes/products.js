const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// List all products
router.get('/', isAuthenticated, isAdmin, (req, res) => {
  const search = req.query.search || '';
  const category = req.query.category || '';
  
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

  if (category) {
    query += ' AND p.category_id = ?';
    params.push(category);
  }

  query += ' ORDER BY p.name ASC';

  const products = db().prepare(query).all(...params);
  const categories = db().prepare('SELECT * FROM categories ORDER BY name').all();

  res.render('products/index', {
    title: 'Manajemen Produk',
    products,
    categories,
    search,
    selectedCategory: category
  });
});

// Create product form
router.get('/create', isAuthenticated, isAdmin, (req, res) => {
  const categories = db().prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('products/form', {
    title: 'Tambah Produk',
    product: null,
    categories
  });
});

// Store product
router.post('/', isAuthenticated, isAdmin, (req, res) => {
  const { barcode, name, category_id, buy_price, sell_price, stock, min_stock } = req.body;

  if (!name) {
    req.flash('error_msg', 'Nama produk harus diisi');
    return res.redirect('/products/create');
  }

  try {
    // Check if barcode already exists
    if (barcode) {
      const existing = db().prepare('SELECT id FROM products WHERE barcode = ?').get(barcode);
      if (existing) {
        req.flash('error_msg', 'Barcode sudah digunakan produk lain');
        return res.redirect('/products/create');
      }
    }

    db().prepare(`
      INSERT INTO products (barcode, name, category_id, buy_price, sell_price, stock, min_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      barcode || null,
      name,
      category_id || null,
      parseFloat(buy_price) || 0,
      parseFloat(sell_price) || 0,
      parseInt(stock) || 0,
      parseInt(min_stock) || 5
    );

    req.flash('success_msg', 'Produk berhasil ditambahkan');
    res.redirect('/products');
  } catch (error) {
    console.error('Error creating product:', error);
    req.flash('error_msg', 'Gagal menambahkan produk');
    res.redirect('/products/create');
  }
});

// Edit product form
router.get('/:id/edit', isAuthenticated, isAdmin, (req, res) => {
  const product = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  
  if (!product) {
    req.flash('error_msg', 'Produk tidak ditemukan');
    return res.redirect('/products');
  }

  const categories = db().prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('products/form', {
    title: 'Edit Produk',
    product,
    categories
  });
});

// Update product
router.put('/:id', isAuthenticated, isAdmin, (req, res) => {
  const { barcode, name, category_id, buy_price, sell_price, stock, min_stock } = req.body;
  const productId = req.params.id;

  if (!name) {
    req.flash('error_msg', 'Nama produk harus diisi');
    return res.redirect(`/products/${productId}/edit`);
  }

  try {
    // Check if barcode already exists for other product
    if (barcode) {
      const existing = db().prepare('SELECT id FROM products WHERE barcode = ? AND id != ?').get(barcode, productId);
      if (existing) {
        req.flash('error_msg', 'Barcode sudah digunakan produk lain');
        return res.redirect(`/products/${productId}/edit`);
      }
    }

    db().prepare(`
      UPDATE products 
      SET barcode = ?, name = ?, category_id = ?, buy_price = ?, sell_price = ?, stock = ?, min_stock = ?
      WHERE id = ?
    `).run(
      barcode || null,
      name,
      category_id || null,
      parseFloat(buy_price) || 0,
      parseFloat(sell_price) || 0,
      parseInt(stock) || 0,
      parseInt(min_stock) || 5,
      productId
    );

    req.flash('success_msg', 'Produk berhasil diupdate');
    res.redirect('/products');
  } catch (error) {
    console.error('Error updating product:', error);
    req.flash('error_msg', 'Gagal mengupdate produk');
    res.redirect(`/products/${productId}/edit`);
  }
});

// Delete product
router.delete('/:id', isAuthenticated, isAdmin, (req, res) => {
  try {
    db().prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    req.flash('success_msg', 'Produk berhasil dihapus');
  } catch (error) {
    console.error('Error deleting product:', error);
    req.flash('error_msg', 'Gagal menghapus produk');
  }
  res.redirect('/products');
});

module.exports = router;
