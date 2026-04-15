const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Generate PO number
const generatePONumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const lastPO = db().prepare(`
    SELECT po_number FROM purchase_orders 
    WHERE po_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`PO${year}${month}%`);

  let sequence = 1;
  if (lastPO) {
    const lastSeq = parseInt(lastPO.po_number.slice(-4));
    sequence = lastSeq + 1;
  }

  return `PO${year}${month}${String(sequence).padStart(4, '0')}`;
};

// List POs
router.get('/', isAuthenticated, isAdmin, (req, res) => {
  const status = req.query.status || '';
  
  let query = `
    SELECT po.*, s.name as supplier_name, u.name as user_name 
    FROM purchase_orders po 
    LEFT JOIN suppliers s ON po.supplier_id = s.id 
    LEFT JOIN users u ON po.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND po.status = ?';
    params.push(status);
  }

  query += ' ORDER BY po.created_at DESC';

  const orders = db().prepare(query).all(...params);

  res.render('purchase-orders/index', {
    title: 'Purchase Orders',
    orders,
    selectedStatus: status
  });
});

// Create PO form
router.get('/create', isAuthenticated, isAdmin, (req, res) => {
  const suppliers = db().prepare('SELECT * FROM suppliers ORDER BY name').all();
  const products = db().prepare('SELECT * FROM products ORDER BY name').all();

  res.render('purchase-orders/form', {
    title: 'Buat Purchase Order',
    order: null,
    suppliers,
    products
  });
});

// Store PO
router.post('/', isAuthenticated, isAdmin, (req, res) => {
  const { supplier_id, notes, items } = req.body;

  if (!items || items.length === 0) {
    req.flash('error_msg', 'Minimal harus ada 1 item');
    return res.redirect('/purchase-orders/create');
  }

  try {
    const poNumber = generatePONumber();
    let total = 0;

    // Calculate total
    items.forEach(item => {
      total += item.qty * item.price;
    });

    const transaction = db().transaction(() => {
      const result = db().prepare(`
        INSERT INTO purchase_orders (po_number, supplier_id, user_id, status, total, notes)
        VALUES (?, ?, ?, 'draft', ?, ?)
      `).run(poNumber, supplier_id || null, req.session.user.id, total, notes || null);

      const poId = result.lastInsertRowid;

      items.forEach(item => {
        db().prepare(`
          INSERT INTO po_items (po_id, product_id, qty, price, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `).run(poId, item.product_id, item.qty, item.price, item.qty * item.price);
      });

      return poId;
    });

    const poId = transaction();
    req.flash('success_msg', 'Purchase Order berhasil dibuat');
    res.redirect(`/purchase-orders/${poId}`);
  } catch (error) {
    console.error('Error creating PO:', error);
    req.flash('error_msg', 'Gagal membuat Purchase Order');
    res.redirect('/purchase-orders/create');
  }
});

// View PO detail
router.get('/:id', isAuthenticated, isAdmin, (req, res) => {
  const order = db().prepare(`
    SELECT po.*, s.name as supplier_name, s.phone as supplier_phone, s.address as supplier_address, u.name as user_name 
    FROM purchase_orders po 
    LEFT JOIN suppliers s ON po.supplier_id = s.id 
    LEFT JOIN users u ON po.user_id = u.id
    WHERE po.id = ?
  `).get(req.params.id);

  if (!order) {
    req.flash('error_msg', 'Purchase Order tidak ditemukan');
    return res.redirect('/purchase-orders');
  }

  const items = db().prepare(`
    SELECT pi.*, p.name as product_name, p.barcode 
    FROM po_items pi 
    LEFT JOIN products p ON pi.product_id = p.id 
    WHERE pi.po_id = ?
  `).all(req.params.id);

  res.render('purchase-orders/detail', {
    title: `PO ${order.po_number}`,
    order,
    items
  });
});

// Update PO status
router.post('/:id/status', isAuthenticated, isAdmin, (req, res) => {
  const { status } = req.body;
  const poId = req.params.id;

  const order = db().prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);

  if (!order) {
    req.flash('error_msg', 'Purchase Order tidak ditemukan');
    return res.redirect('/purchase-orders');
  }

  try {
    if (status === 'received') {
      // Update stock when receiving
      const items = db().prepare('SELECT * FROM po_items WHERE po_id = ?').all(poId);

      const transaction = db().transaction(() => {
        // Update PO status
        db().prepare(`
          UPDATE purchase_orders SET status = ?, received_date = CURRENT_TIMESTAMP WHERE id = ?
        `).run(status, poId);

        // Update stock for each item
        items.forEach(item => {
          db().prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.qty, item.product_id);
        });
      });

      transaction();
      req.flash('success_msg', 'Barang berhasil diterima dan stok diupdate');
    } else {
      db().prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(status, poId);
      req.flash('success_msg', 'Status Purchase Order berhasil diupdate');
    }
  } catch (error) {
    console.error('Error updating PO status:', error);
    req.flash('error_msg', 'Gagal mengupdate status');
  }

  res.redirect(`/purchase-orders/${poId}`);
});

// Print PO
router.get('/:id/print', isAuthenticated, isAdmin, (req, res) => {
  const order = db().prepare(`
    SELECT po.*, s.name as supplier_name, s.phone as supplier_phone, s.address as supplier_address, u.name as user_name 
    FROM purchase_orders po 
    LEFT JOIN suppliers s ON po.supplier_id = s.id 
    LEFT JOIN users u ON po.user_id = u.id
    WHERE po.id = ?
  `).get(req.params.id);

  if (!order) {
    req.flash('error_msg', 'Purchase Order tidak ditemukan');
    return res.redirect('/purchase-orders');
  }

  const items = db().prepare(`
    SELECT pi.*, p.name as product_name, p.barcode 
    FROM po_items pi 
    LEFT JOIN products p ON pi.product_id = p.id 
    WHERE pi.po_id = ?
  `).all(req.params.id);

  res.render('purchase-orders/print', {
    title: `PO ${order.po_number}`,
    order,
    items,
    layout: 'layouts/print'
  });
});

// Delete PO (only draft)
router.delete('/:id', isAuthenticated, isAdmin, (req, res) => {
  const order = db().prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);

  if (!order) {
    req.flash('error_msg', 'Purchase Order tidak ditemukan');
    return res.redirect('/purchase-orders');
  }

  if (order.status !== 'draft') {
    req.flash('error_msg', 'Hanya PO dengan status draft yang dapat dihapus');
    return res.redirect('/purchase-orders');
  }

  try {
    db().prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);
    req.flash('success_msg', 'Purchase Order berhasil dihapus');
  } catch (error) {
    console.error('Error deleting PO:', error);
    req.flash('error_msg', 'Gagal menghapus Purchase Order');
  }

  res.redirect('/purchase-orders');
});

module.exports = router;
