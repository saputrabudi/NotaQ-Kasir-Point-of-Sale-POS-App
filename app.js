const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');

// Import database
const database = require('./config/database');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// EJS setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Session setup
app.use(session({
  secret: 'aplikasi-kasir-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Flash messages
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await database.init();
    console.log('Database initialized successfully');
    
    // Import routes after database is initialized
    const authRoutes = require('./routes/auth');
    const dashboardRoutes = require('./routes/dashboard');
    const productRoutes = require('./routes/products');
    const categoryRoutes = require('./routes/categories');
    const salesRoutes = require('./routes/sales');
    const stockRoutes = require('./routes/stock');
    const purchaseOrderRoutes = require('./routes/purchase-orders');
    const supplierRoutes = require('./routes/suppliers');
    const reportRoutes = require('./routes/reports');
    const userRoutes = require('./routes/users');
    const paymentSettingsRoutes = require('./routes/payment-settings');
    
    // Routes
    app.use('/', authRoutes);
    app.use('/dashboard', dashboardRoutes);
    app.use('/products', productRoutes);
    app.use('/categories', categoryRoutes);
    app.use('/sales', salesRoutes);
    app.use('/stock', stockRoutes);
    app.use('/purchase-orders', purchaseOrderRoutes);
    app.use('/suppliers', supplierRoutes);
    app.use('/reports', reportRoutes);
    app.use('/users', userRoutes);
    app.use('/payment-settings', paymentSettingsRoutes);
    
    // API routes for AJAX
    app.use('/api/products', require('./routes/api/products'));
    
    // 404 handler
    app.use((req, res) => {
      res.status(404).render('errors/404', { title: '404 - Halaman Tidak Ditemukan' });
    });
    
    // Error handler
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).render('errors/500', { title: '500 - Server Error' });
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
