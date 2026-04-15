const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// List all suppliers
router.get('/', isAuthenticated, isAdmin, (req, res) => {
  const suppliers = db().prepare(`
    SELECT s.*, COUNT(po.id) as po_count 
    FROM suppliers s 
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id 
    GROUP BY s.id 
    ORDER BY s.name
  `).all();

  res.render('suppliers/index', {
    title: 'Manajemen Supplier',
    suppliers
  });
});

// Create supplier form
router.get('/create', isAuthenticated, isAdmin, (req, res) => {
  res.render('suppliers/form', {
    title: 'Tambah Supplier',
    supplier: null
  });
});

// Store supplier
router.post('/', isAuthenticated, isAdmin, (req, res) => {
  const { name, phone, address } = req.body;

  if (!name) {
    req.flash('error_msg', 'Nama supplier harus diisi');
    return res.redirect('/suppliers/create');
  }

  try {
    db().prepare(`
      INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)
    `).run(name, phone || null, address || null);

    req.flash('success_msg', 'Supplier berhasil ditambahkan');
    res.redirect('/suppliers');
  } catch (error) {
    console.error('Error creating supplier:', error);
    req.flash('error_msg', 'Gagal menambahkan supplier');
    res.redirect('/suppliers/create');
  }
});

// Edit supplier form
router.get('/:id/edit', isAuthenticated, isAdmin, (req, res) => {
  const supplier = db().prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);

  if (!supplier) {
    req.flash('error_msg', 'Supplier tidak ditemukan');
    return res.redirect('/suppliers');
  }

  res.render('suppliers/form', {
    title: 'Edit Supplier',
    supplier
  });
});

// Update supplier
router.put('/:id', isAuthenticated, isAdmin, (req, res) => {
  const { name, phone, address } = req.body;
  const supplierId = req.params.id;

  if (!name) {
    req.flash('error_msg', 'Nama supplier harus diisi');
    return res.redirect(`/suppliers/${supplierId}/edit`);
  }

  try {
    db().prepare(`
      UPDATE suppliers SET name = ?, phone = ?, address = ? WHERE id = ?
    `).run(name, phone || null, address || null, supplierId);

    req.flash('success_msg', 'Supplier berhasil diupdate');
    res.redirect('/suppliers');
  } catch (error) {
    console.error('Error updating supplier:', error);
    req.flash('error_msg', 'Gagal mengupdate supplier');
    res.redirect(`/suppliers/${supplierId}/edit`);
  }
});

// Delete supplier
router.delete('/:id', isAuthenticated, isAdmin, (req, res) => {
  try {
    db().prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
    req.flash('success_msg', 'Supplier berhasil dihapus');
  } catch (error) {
    console.error('Error deleting supplier:', error);
    req.flash('error_msg', 'Gagal menghapus supplier');
  }
  res.redirect('/suppliers');
});

module.exports = router;
