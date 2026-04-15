const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Sales report
router.get('/sales', isAuthenticated, isAdmin, (req, res) => {
  const period = req.query.period || 'daily';
  const dateFrom = req.query.date_from || '';
  const dateTo = req.query.date_to || '';

  let dateFilter = '';
  const params = [];

  if (dateFrom && dateTo) {
    dateFilter = 'AND DATE(s.created_at) BETWEEN DATE(?) AND DATE(?)';
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    dateFilter = 'AND DATE(s.created_at) >= DATE(?)';
    params.push(dateFrom);
  } else if (dateTo) {
    dateFilter = 'AND DATE(s.created_at) <= DATE(?)';
    params.push(dateTo);
  }

  // Summary
  const summary = db().prepare(`
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(total), 0) as total_sales,
      COALESCE(AVG(total), 0) as avg_transaction
    FROM sales s
    WHERE 1=1 ${dateFilter}
  `).get(...params);

  // Sales by period
  let groupBy, selectDate;
  if (period === 'daily') {
    groupBy = "DATE(s.created_at)";
    selectDate = "DATE(s.created_at) as period";
  } else if (period === 'weekly') {
    groupBy = "strftime('%Y-%W', s.created_at)";
    selectDate = "strftime('%Y Minggu %W', s.created_at) as period";
  } else {
    groupBy = "strftime('%Y-%m', s.created_at)";
    selectDate = "strftime('%Y-%m', s.created_at) as period";
  }

  const salesByPeriod = db().prepare(`
    SELECT 
      ${selectDate},
      COUNT(*) as transactions,
      SUM(total) as total
    FROM sales s
    WHERE 1=1 ${dateFilter}
    GROUP BY ${groupBy}
    ORDER BY period DESC
    LIMIT 30
  `).all(...params);

  // Top products
  const topProducts = db().prepare(`
    SELECT 
      p.name,
      p.barcode,
      SUM(si.qty) as total_qty,
      SUM(si.subtotal) as total_sales
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE 1=1 ${dateFilter}
    GROUP BY p.id
    ORDER BY total_qty DESC
    LIMIT 10
  `).all(...params);

  // Sales by payment method
  const salesByMethod = db().prepare(`
    SELECT 
      payment_method,
      COUNT(*) as transactions,
      SUM(total) as total
    FROM sales s
    WHERE 1=1 ${dateFilter}
    GROUP BY payment_method
  `).all(...params);

  // Sales by cashier
  const salesByCashier = db().prepare(`
    SELECT 
      u.name as cashier_name,
      COUNT(*) as transactions,
      SUM(s.total) as total
    FROM sales s
    JOIN users u ON s.user_id = u.id
    WHERE 1=1 ${dateFilter}
    GROUP BY s.user_id
    ORDER BY total DESC
  `).all(...params);

  res.render('reports/sales', {
    title: 'Laporan Penjualan',
    summary,
    salesByPeriod,
    topProducts,
    salesByMethod,
    salesByCashier,
    period,
    dateFrom,
    dateTo
  });
});

// Stock report
router.get('/stock', isAuthenticated, isAdmin, (req, res) => {
  // Stock summary
  const summary = db().prepare(`
    SELECT 
      COUNT(*) as total_products,
      SUM(stock) as total_stock,
      SUM(stock * buy_price) as stock_value,
      SUM(CASE WHEN stock <= min_stock AND stock > 0 THEN 1 ELSE 0 END) as low_stock,
      SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) as out_of_stock
    FROM products
  `).get();

  // Stock by category
  const stockByCategory = db().prepare(`
    SELECT 
      COALESCE(c.name, 'Tanpa Kategori') as category_name,
      COUNT(p.id) as product_count,
      SUM(p.stock) as total_stock,
      SUM(p.stock * p.buy_price) as stock_value
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    GROUP BY p.category_id
    ORDER BY stock_value DESC
  `).all();

  // Low stock products
  const lowStockProducts = db().prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock <= p.min_stock
    ORDER BY p.stock ASC
    LIMIT 20
  `).all();

  // Recent stock movements
  const recentMovements = db().prepare(`
    SELECT sa.*, p.name as product_name, u.name as user_name
    FROM stock_adjustments sa
    JOIN products p ON sa.product_id = p.id
    JOIN users u ON sa.user_id = u.id
    ORDER BY sa.created_at DESC
    LIMIT 20
  `).all();

  res.render('reports/stock', {
    title: 'Laporan Stok',
    summary,
    stockByCategory,
    lowStockProducts,
    recentMovements
  });
});

// Profit report
router.get('/profit', isAuthenticated, isAdmin, (req, res) => {
  const dateFrom = req.query.date_from || '';
  const dateTo = req.query.date_to || '';

  let dateFilter = '';
  const params = [];

  if (dateFrom && dateTo) {
    dateFilter = 'AND DATE(s.created_at) BETWEEN DATE(?) AND DATE(?)';
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    dateFilter = 'AND DATE(s.created_at) >= DATE(?)';
    params.push(dateFrom);
  } else if (dateTo) {
    dateFilter = 'AND DATE(s.created_at) <= DATE(?)';
    params.push(dateTo);
  }

  // Calculate profit
  const profitData = db().prepare(`
    SELECT 
      p.id,
      p.name,
      p.barcode,
      SUM(si.qty) as qty_sold,
      SUM(si.subtotal) as total_sales,
      SUM(si.qty * p.buy_price) as total_cost,
      SUM(si.subtotal) - SUM(si.qty * p.buy_price) as profit
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE 1=1 ${dateFilter}
    GROUP BY p.id
    ORDER BY profit DESC
  `).all(...params);

  // Summary
  const summary = {
    totalSales: profitData.reduce((sum, p) => sum + p.total_sales, 0),
    totalCost: profitData.reduce((sum, p) => sum + p.total_cost, 0),
    totalProfit: profitData.reduce((sum, p) => sum + p.profit, 0)
  };

  res.render('reports/profit', {
    title: 'Laporan Keuntungan',
    profitData,
    summary,
    dateFrom,
    dateTo
  });
});

module.exports = router;
