const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Database file path
const dbDir = path.join(__dirname, '..', 'database');
const dbPath = path.join(dbDir, 'kasir.db');

// Create database directory if not exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let SQL = null;

// Initialize database
async function initDatabase() {
  SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  createTables();
  seedDefaultUser();
  seedDefaultCategories();
  saveDatabase();
  
  return db;
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Create tables
function createTables() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'kasir')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      category_id INTEGER,
      buy_price REAL DEFAULT 0,
      sell_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // Suppliers table
  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sales table
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      total REAL DEFAULT 0,
      payment REAL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Sale items table
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Purchase orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'ordered', 'received', 'cancelled')),
      total REAL DEFAULT 0,
      notes TEXT,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      received_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // PO items table
  db.run(`
    CREATE TABLE IF NOT EXISTS po_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Stock adjustments table
  db.run(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      qty_before INTEGER NOT NULL,
      qty_after INTEGER NOT NULL,
      adjustment INTEGER NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Payment settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_type TEXT NOT NULL UNIQUE,
      qris_string TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables created successfully');
}

// Seed default users (admin & kasir)
function seedDefaultUser() {
  const result = db.exec("SELECT id FROM users WHERE username = 'admin'");

  if (result.length === 0) {
    const hashedAdmin = bcrypt.hashSync('admin123', 10);
    db.run(
      `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
      ['admin', hashedAdmin, 'Administrator', 'admin']
    );
    console.log('Default admin user created (username: admin, password: admin123)');
  }

  const kasirResult = db.exec("SELECT id FROM users WHERE username = 'kasir'");
  if (kasirResult.length === 0) {
    const hashedKasir = bcrypt.hashSync('kasir123', 10);
    db.run(
      `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
      ['kasir', hashedKasir, 'Kasir', 'kasir']
    );
    console.log('Default kasir user created (username: kasir, password: kasir123)');
  }
}

// Seed default categories
function seedDefaultCategories() {
  const result = db.exec('SELECT COUNT(*) as count FROM categories');
  const count = result.length > 0 ? result[0].values[0][0] : 0;
  
  if (count === 0) {
    const categories = ['Makanan', 'Minuman', 'Snack', 'Rokok', 'Toiletries', 'Lainnya'];
    categories.forEach(cat => {
      db.run('INSERT INTO categories (name) VALUES (?)', [cat]);
    });
    console.log('Default categories created');
  }
}

// Flag: jangan panggil saveDatabase() saat di dalam transaction (sql.js: export() mengakhiri transaksi)
let inTransaction = false;

// Database wrapper with better-sqlite3 compatible API
class DatabaseWrapper {
  prepare(sql) {
    return new StatementWrapper(sql, db, saveDatabase);
  }
  
  exec(sql) {
    db.run(sql);
    if (!inTransaction) saveDatabase();
  }
  
  transaction(fn) {
    return (...args) => {
      db.run('BEGIN TRANSACTION');
      inTransaction = true;
      try {
        const result = fn(...args);
        inTransaction = false;
        db.run('COMMIT');
        saveDatabase();
        return result;
      } catch (error) {
        inTransaction = false;
        try {
          db.run('ROLLBACK');
        } catch (rollbackErr) {
          if (!rollbackErr.message || !rollbackErr.message.includes('no transaction is active')) {
            console.error('Rollback error:', rollbackErr);
          }
        }
        throw error;
      }
    };
  }
}

class StatementWrapper {
  constructor(sql, database, save) {
    this.sql = sql;
    this.database = database;
    this.save = save;
  }
  
  run(...params) {
    this.database.run(this.sql, params);
    if (!inTransaction) this.save();
    
    // Get last insert rowid
    const result = this.database.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid = result.length > 0 ? result[0].values[0][0] : 0;
    
    return { lastInsertRowid };
  }
  
  get(...params) {
    const stmt = this.database.prepare(this.sql);
    stmt.bind(params);
    
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      const row = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }
  
  all(...params) {
    const stmt = this.database.prepare(this.sql);
    stmt.bind(params);
    
    const rows = [];
    const columns = stmt.getColumnNames();
    
    while (stmt.step()) {
      const values = stmt.get();
      const row = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      rows.push(row);
    }
    stmt.free();
    return rows;
  }
}

// Export
let dbWrapper = null;

module.exports = {
  async init() {
    await initDatabase();
    dbWrapper = new DatabaseWrapper();
    return dbWrapper;
  },
  getDb() {
    return dbWrapper;
  }
};
