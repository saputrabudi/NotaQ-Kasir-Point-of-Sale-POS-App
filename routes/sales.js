const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdminOrKasir } = require('../middleware/auth');

// Generate invoice number
const generateInvoiceNo = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const lastSale = db().prepare(`
    SELECT invoice_no FROM sales 
    WHERE invoice_no LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`INV${year}${month}${day}%`);

  let sequence = 1;
  if (lastSale) {
    const lastSeq = parseInt(lastSale.invoice_no.slice(-4));
    sequence = lastSeq + 1;
  }

  return `INV${year}${month}${day}${String(sequence).padStart(4, '0')}`;
};

// POS page
router.get('/pos', isAuthenticated, isAdminOrKasir, (req, res) => {
  const categories = db().prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('sales/pos', {
    title: 'Kasir (POS)',
    categories
  });
});

// Create sale
router.post('/', isAuthenticated, isAdminOrKasir, (req, res) => {
  const { items, payment, payment_method } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Keranjang kosong' });
  }

  try {
    const invoiceNo = generateInvoiceNo();
    let total = 0;

    // Calculate total
    items.forEach(item => {
      total += item.qty * item.price;
    });

    const changeAmount = parseFloat(payment) - total;

    if (changeAmount < 0) {
      return res.status(400).json({ success: false, message: 'Pembayaran kurang' });
    }

    // Begin transaction
    const insertSale = db().prepare(`
      INSERT INTO sales (invoice_no, user_id, total, payment, change_amount, payment_method)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db().prepare(`
      INSERT INTO sale_items (sale_id, product_id, qty, price, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateStock = db().prepare(`
      UPDATE products SET stock = stock - ? WHERE id = ?
    `);

    const transaction = db().transaction(() => {
      const result = insertSale.run(
        invoiceNo,
        req.session.user.id,
        total,
        parseFloat(payment),
        changeAmount,
        payment_method || 'cash'
      );

      const saleId = result.lastInsertRowid;

      items.forEach(item => {
        insertItem.run(saleId, item.product_id, item.qty, item.price, item.qty * item.price);
        updateStock.run(item.qty, item.product_id);
      });

      return saleId;
    });

    const saleId = transaction();

    // Get sale data for response
    const sale = db().prepare(`
      SELECT s.*, u.name as cashier_name 
      FROM sales s 
      LEFT JOIN users u ON s.user_id = u.id 
      WHERE s.id = ?
    `).get(saleId);

    const saleItems = db().prepare(`
      SELECT si.*, p.name as product_name, p.barcode 
      FROM sale_items si 
      LEFT JOIN products p ON si.product_id = p.id 
      WHERE si.sale_id = ?
    `).all(saleId);

    res.json({
      success: true,
      message: 'Transaksi berhasil',
      data: {
        sale,
        items: saleItems
      }
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan transaksi' });
  }
});

// Sales history
router.get('/history', isAuthenticated, isAdminOrKasir, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const dateFrom = req.query.date_from || '';
  const dateTo = req.query.date_to || '';

  let whereClause = '1=1';
  const params = [];

  // If kasir, only show their own sales
  if (req.session.user.role === 'kasir') {
    whereClause += ' AND s.user_id = ?';
    params.push(req.session.user.id);
  }

  if (search) {
    whereClause += ' AND s.invoice_no LIKE ?';
    params.push(`%${search}%`);
  }

  if (dateFrom) {
    whereClause += ' AND DATE(s.created_at) >= DATE(?)';
    params.push(dateFrom);
  }

  if (dateTo) {
    whereClause += ' AND DATE(s.created_at) <= DATE(?)';
    params.push(dateTo);
  }

  const countQuery = `SELECT COUNT(*) as total FROM sales s WHERE ${whereClause}`;
  const totalCount = db().prepare(countQuery).get(...params);
  const totalPages = Math.ceil(totalCount.total / limit);

  const sales = db().prepare(`
    SELECT s.*, u.name as cashier_name 
    FROM sales s 
    LEFT JOIN users u ON s.user_id = u.id 
    WHERE ${whereClause}
    ORDER BY s.created_at DESC 
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.render('sales/history', {
    title: 'Riwayat Penjualan',
    sales,
    currentPage: page,
    totalPages,
    search,
    dateFrom,
    dateTo
  });
});

// View invoice
router.get('/:id', isAuthenticated, isAdminOrKasir, (req, res) => {
  const sale = db().prepare(`
    SELECT s.*, u.name as cashier_name 
    FROM sales s 
    LEFT JOIN users u ON s.user_id = u.id 
    WHERE s.id = ?
  `).get(req.params.id);

  if (!sale) {
    req.flash('error_msg', 'Transaksi tidak ditemukan');
    return res.redirect('/sales/history');
  }

  const items = db().prepare(`
    SELECT si.*, p.name as product_name, p.barcode 
    FROM sale_items si 
    LEFT JOIN products p ON si.product_id = p.id 
    WHERE si.sale_id = ?
  `).all(req.params.id);

  res.render('sales/invoice', {
    title: `Invoice ${sale.invoice_no}`,
    sale,
    items,
    layout: 'layouts/print'
  });
});

// Get invoice data for print (AJAX)
router.get('/:id/data', isAuthenticated, isAdminOrKasir, (req, res) => {
  const sale = db().prepare(`
    SELECT s.*, u.name as cashier_name 
    FROM sales s 
    LEFT JOIN users u ON s.user_id = u.id 
    WHERE s.id = ?
  `).get(req.params.id);

  if (!sale) {
    return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
  }

  const items = db().prepare(`
    SELECT si.*, p.name as product_name, p.barcode 
    FROM sale_items si 
    LEFT JOIN products p ON si.product_id = p.id 
    WHERE si.sale_id = ?
  `).all(req.params.id);

  res.json({ success: true, data: { sale, items } });
});

module.exports = router;
