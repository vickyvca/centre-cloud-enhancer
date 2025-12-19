const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const crypto = require('crypto');
const { LocalDatabase } = require('./database');
const { LicenseManager } = require('./license');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let db;
let licenseManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    show: false
  });

  // Initialize database
  db = new LocalDatabase();
  db.init();

  // Initialize license manager
  licenseManager = new LicenseManager();

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (db) db.close();
  });

  // Remove menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }
}

// ==================== IPC Handlers ====================

// Auth handlers
ipcMain.handle('auth:login', async (event, email, password) => {
  try {
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const user = db.selectOne('users', { email });
    
    if (!user || user.password_hash !== passwordHash) {
      return { error: { message: 'Email atau password salah' } };
    }
    
    const profile = db.selectOne('profiles', { id: user.id });
    const roleData = db.selectOne('user_roles', { user_id: user.id });
    
    return {
      data: {
        user: { id: user.id, email: user.email },
        profile,
        role: roleData?.role || 'kasir'
      }
    };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('auth:register', async (event, email, password, username, fullName) => {
  try {
    const existing = db.selectOne('users', { email });
    if (existing) {
      return { error: { message: 'Email sudah terdaftar' } };
    }
    
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const userId = crypto.randomUUID();
    
    db.insert('users', { id: userId, email, password_hash: passwordHash });
    db.insert('profiles', { id: userId, username, full_name: fullName });
    db.insert('user_roles', { id: crypto.randomUUID(), user_id: userId, role: 'kasir' });
    
    return {
      data: {
        user: { id: userId, email },
        profile: { username, full_name: fullName },
        role: 'kasir'
      }
    };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('auth:getProfile', async (event, userId) => {
  try {
    const profile = db.selectOne('profiles', { id: userId });
    const roleData = db.selectOne('user_roles', { user_id: userId });
    return { data: { profile, role: roleData?.role } };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('auth:updateProfile', async (event, userId, updates) => {
  try {
    db.update('profiles', { ...updates, updated_at: new Date().toISOString() }, { id: userId });
    const profile = db.selectOne('profiles', { id: userId });
    return { data: profile };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

// License handlers
ipcMain.handle('license:getHWID', async () => {
  return licenseManager.getHWID();
});

ipcMain.handle('license:check', async () => {
  return licenseManager.checkStoredLicense(db);
});

ipcMain.handle('license:activate', async (event, licenseKey) => {
  return licenseManager.activateLicense(db, licenseKey);
});

// Generic database handlers
ipcMain.handle('db:select', async (event, table, where, orderBy) => {
  try {
    // Handle special cases for joins
    if (table === 'items_with_categories') {
      const items = db.query(`
        SELECT items.*, categories.name as category_name 
        FROM items 
        LEFT JOIN categories ON items.category_id = categories.id
        ORDER BY items.name
      `);
      return { data: items.map(i => ({ ...i, categories: i.category_name ? { name: i.category_name } : null })) };
    }
    
    if (table === 'purchases_with_supplier') {
      const purchases = db.query(`
        SELECT purchases.*, suppliers.name as supplier_name 
        FROM purchases 
        LEFT JOIN suppliers ON purchases.supplier_id = suppliers.id
        ORDER BY purchases.created_at DESC
      `);
      return { data: purchases.map(p => ({ ...p, suppliers: p.supplier_name ? { name: p.supplier_name } : null })) };
    }

    if (table === 'returns_with_sale') {
      const returns = db.query(`
        SELECT returns.*, sales.invoice_no as sale_invoice_no 
        FROM returns 
        LEFT JOIN sales ON returns.sale_id = sales.id
        ORDER BY returns.created_at DESC
      `);
      return { data: returns.map(r => ({ ...r, sales: r.sale_invoice_no ? { invoice_no: r.sale_invoice_no } : null })) };
    }
    
    const data = db.select(table, where || {}, orderBy);
    return { data };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('db:selectOne', async (event, table, where) => {
  try {
    const data = db.selectOne(table, where);
    return { data };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('db:insert', async (event, table, data) => {
  try {
    const result = db.insert(table, data);
    return { data: result };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('db:update', async (event, table, data, where) => {
  try {
    db.update(table, data, where);
    const result = db.selectOne(table, where);
    return { data: result };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('db:delete', async (event, table, where) => {
  try {
    db.delete(table, where);
    return { data: true };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('db:query', async (event, sql, params) => {
  try {
    const data = db.query(sql, params || []);
    return { data };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('db:run', async (event, sql, params) => {
  try {
    const result = db.run(sql, params || []);
    return { data: result };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

// User management (admin only)
ipcMain.handle('users:list', async () => {
  try {
    const users = db.query(`
      SELECT users.id, users.email, users.created_at,
             profiles.username, profiles.full_name,
             user_roles.role
      FROM users
      LEFT JOIN profiles ON users.id = profiles.id
      LEFT JOIN user_roles ON users.id = user_roles.user_id
      ORDER BY users.created_at DESC
    `);
    return { data: users };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('users:updateRole', async (event, userId, role) => {
  try {
    db.update('user_roles', { role }, { user_id: userId });
    return { data: true };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

ipcMain.handle('users:delete', async (event, userId) => {
  try {
    db.delete('user_roles', { user_id: userId });
    db.delete('profiles', { id: userId });
    db.delete('users', { id: userId });
    return { data: true };
  } catch (error) {
    return { error: { message: error.message } };
  }
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
