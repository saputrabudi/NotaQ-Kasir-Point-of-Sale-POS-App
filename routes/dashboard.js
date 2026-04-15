const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, (req, res) => {
  // Get statistics
  const today = new Date().toISOString().split('T')[0];
  
  // Total sales today
  const salesToday = db().prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total 
    FROM sales 
    WHERE DATE(created_at) = DATE(?)
  `).get(today);

  // Total products
  const totalProducts = db().prepare('SELECT COUNT(*) as count FROM products').get();

  // Low stock products
  const lowStock = db().prepare(`
    SELECT COUNT(*) as count FROM products WHERE stock <= min_stock
  `).get();

  // Recent sales
  const recentSales = db().prepare(`
    SELECT s.*, u.name as user_name 
    FROM sales s 
    LEFT JOIN users u ON s.user_id = u.id 
    ORDER BY s.created_at DESC 
    LIMIT 5
  `).all();

  // Top products today
  const topProducts = db().prepare(`
    SELECT p.name, SUM(si.qty) as total_qty, SUM(si.subtotal) as total_sales
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at) = DATE(?)
    GROUP BY p.id
    ORDER BY total_qty DESC
    LIMIT 5
  `).all(today);

  // Pending POs
  const pendingPOs = db().prepare(`
    SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('draft', 'ordered')
  `).get();

  res.render('dashboard/index', {
    title: 'Dashboard',
    salesToday,
    totalProducts,
    lowStock,
    recentSales,
    topProducts,
    pendingPOs
  });
});

module.exports = router;
