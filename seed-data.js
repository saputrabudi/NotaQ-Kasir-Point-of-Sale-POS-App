// Seed sample data
const database = require('./config/database');

async function seedData() {
  await database.init();
  const db = database.getDb();
  
  console.log('Seeding sample data...');
  
  // Add sample products
  const products = [
    { barcode: '8991102111102', name: 'Indomie Goreng', category_id: 1, buy_price: 2500, sell_price: 3500, stock: 100 },
    { barcode: '8991102111119', name: 'Indomie Soto', category_id: 1, buy_price: 2500, sell_price: 3500, stock: 80 },
    { barcode: '8997035600010', name: 'Aqua 600ml', category_id: 2, buy_price: 2000, sell_price: 3000, stock: 150 },
    { barcode: '8996001600146', name: 'Teh Botol Sosro 450ml', category_id: 2, buy_price: 3500, sell_price: 5000, stock: 60 },
    { barcode: '8998866200318', name: 'Coca Cola 390ml', category_id: 2, buy_price: 5000, sell_price: 7000, stock: 48 },
    { barcode: '8991102120104', name: 'Chitato Ayam Bawang', category_id: 3, buy_price: 8000, sell_price: 10000, stock: 30 },
    { barcode: '8991102120111', name: 'Lays Classic', category_id: 3, buy_price: 9000, sell_price: 12000, stock: 25 },
    { barcode: '8999999043117', name: 'Oreo Original', category_id: 3, buy_price: 7000, sell_price: 9000, stock: 40 },
    { barcode: '8998989110014', name: 'Gudang Garam Filter', category_id: 4, buy_price: 25000, sell_price: 28000, stock: 50 },
    { barcode: '8999909009103', name: 'Sampoerna Mild', category_id: 4, buy_price: 28000, sell_price: 31000, stock: 45 },
    { barcode: '8999999537074', name: 'Rinso Cair 800ml', category_id: 5, buy_price: 15000, sell_price: 18000, stock: 20 },
    { barcode: '8999999032852', name: 'Lifebuoy Sabun Cair 250ml', category_id: 5, buy_price: 12000, sell_price: 15000, stock: 25 },
    { barcode: '8998866102018', name: 'Pulpen Standard', category_id: 6, buy_price: 2000, sell_price: 3000, stock: 100 },
    { barcode: '8998866102025', name: 'Buku Tulis 58 Lembar', category_id: 6, buy_price: 3000, sell_price: 5000, stock: 50 },
  ];
  
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (barcode, name, category_id, buy_price, sell_price, stock, min_stock)
    VALUES (?, ?, ?, ?, ?, ?, 10)
  `);
  
  products.forEach(p => {
    try {
      insertProduct.run(p.barcode, p.name, p.category_id, p.buy_price, p.sell_price, p.stock);
    } catch (e) {
      // Ignore duplicates
    }
  });
  
  console.log(`Added ${products.length} sample products`);
  
  // Add sample supplier
  const existingSupplier = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
  if (existingSupplier.count === 0) {
    db.prepare(`
      INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)
    `).run('PT. Distributor Utama', '021-12345678', 'Jl. Raya Industri No. 123, Jakarta');
    
    db.prepare(`
      INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)
    `).run('CV. Sumber Makmur', '022-87654321', 'Jl. Pasar Baru No. 45, Bandung');
    
    console.log('Added 2 sample suppliers');
  }
  
  // Add sample kasir user
  const bcrypt = require('bcryptjs');
  const existingKasir = db.prepare("SELECT id FROM users WHERE username = 'kasir1'").get();
  if (!existingKasir) {
    const hashedPassword = bcrypt.hashSync('kasir123', 10);
    db.prepare(`
      INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)
    `).run('kasir1', hashedPassword, 'Kasir Satu', 'kasir');
    console.log('Added sample kasir user (username: kasir1, password: kasir123)');
  }
  
  console.log('Sample data seeded successfully!');
  process.exit(0);
}

seedData().catch(err => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
