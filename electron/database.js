const path = require('path');
const { app } = require('electron');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('better-sqlite3 not found, falling back to sql.js');
}

class LocalDatabase {
  constructor() {
    this.db = null;
    this.dbPath = path.join(app.getPath('userData'), 'nexapos.db');
  }

  init() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.createTables();
    this.seedDefaultData();
    console.log('Database initialized at:', this.dbPath);
  }

  createTables() {
    this.db.exec(`
      -- Users table (local auth)
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Profiles table
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        full_name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- User roles table
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'kasir',
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Categories table
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Suppliers table
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Items table
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        code TEXT,
        barcode TEXT,
        name TEXT NOT NULL,
        category_id TEXT,
        unit TEXT DEFAULT 'pcs',
        buy_price REAL DEFAULT 0,
        sell_price REAL DEFAULT 0,
        sell_price_lv2 REAL DEFAULT 0,
        sell_price_lv3 REAL DEFAULT 0,
        discount_pct REAL DEFAULT 0,
        stock REAL DEFAULT 0,
        min_stock REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      -- Sales table
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        invoice_no TEXT NOT NULL,
        date TEXT DEFAULT (date('now')),
        customer_name TEXT,
        price_level INTEGER DEFAULT 1,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        grand_total REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        paid_amount REAL DEFAULT 0,
        change_amount REAL DEFAULT 0,
        cashier_id TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Sale items table
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        qty REAL NOT NULL,
        price REAL NOT NULL,
        discount_pct REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      -- Purchases table
      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        invoice_no TEXT NOT NULL,
        date TEXT DEFAULT (date('now')),
        supplier_id TEXT,
        total REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      );

      -- Purchase items table
      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        qty REAL NOT NULL,
        price REAL NOT NULL,
        subtotal REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (purchase_id) REFERENCES purchases(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      -- Returns table
      CREATE TABLE IF NOT EXISTS returns (
        id TEXT PRIMARY KEY,
        return_no TEXT NOT NULL,
        date TEXT DEFAULT (date('now')),
        sale_id TEXT,
        total REAL DEFAULT 0,
        notes TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      );

      -- Return items table
      CREATE TABLE IF NOT EXISTS return_items (
        id TEXT PRIMARY KEY,
        return_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        qty REAL NOT NULL,
        price REAL NOT NULL,
        subtotal REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (return_id) REFERENCES returns(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      -- Stock moves table
      CREATE TABLE IF NOT EXISTS stock_moves (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        qty REAL NOT NULL,
        type TEXT NOT NULL,
        reference_id TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      -- App license table
      CREATE TABLE IF NOT EXISTS app_license (
        id TEXT PRIMARY KEY,
        license_key TEXT NOT NULL,
        hwid TEXT,
        is_active INTEGER DEFAULT 1,
        license_type TEXT DEFAULT 'TRIAL',
        expire_date TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  seedDefaultData() {
    // Check if admin exists
    const adminExists = this.db.prepare('SELECT id FROM users WHERE email = ?').get('admin@nexapos.local');
    
    if (!adminExists) {
      const crypto = require('crypto');
      const adminId = crypto.randomUUID();
      const passwordHash = crypto.createHash('sha256').update('admin123').digest('hex');
      
      this.db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(
        adminId, 'admin@nexapos.local', passwordHash
      );
      
      this.db.prepare('INSERT INTO profiles (id, username, full_name) VALUES (?, ?, ?)').run(
        adminId, 'admin', 'Administrator'
      );
      
      this.db.prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)').run(
        crypto.randomUUID(), adminId, 'admin'
      );
      
      console.log('Default admin created: admin@nexapos.local / admin123');
    }
  }

  // Generic query methods
  select(table, where = {}, orderBy = null) {
    let sql = `SELECT * FROM ${table}`;
    const params = [];
    
    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    return this.db.prepare(sql).all(...params);
  }

  selectOne(table, where) {
    const results = this.select(table, where);
    return results[0] || null;
  }

  insert(table, data) {
    const crypto = require('crypto');
    if (!data.id) {
      data.id = crypto.randomUUID();
    }
    
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    this.db.prepare(sql).run(...values);
    
    return this.selectOne(table, { id: data.id });
  }

  update(table, data, where) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const params = [...Object.values(data), ...Object.values(where)];
    
    return this.db.prepare(sql).run(...params);
  }

  delete(table, where) {
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    
    return this.db.prepare(sql).run(...Object.values(where));
  }

  // Custom query
  query(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  run(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = { LocalDatabase };
