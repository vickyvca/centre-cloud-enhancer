# Panduan Setup Electron untuk NexaPOS

## Langkah-langkah Compile ke Windows Native

### 1. Persiapan Awal

**Clone/Download Project:**
```bash
# Jika dari GitHub
git clone <repo-url>
cd nexapos
```

### 2. Install Dependencies

```bash
# Install dependencies utama
npm install

# Install Electron dan build tools (sebagai devDependencies)
npm install --save-dev electron electron-builder concurrently wait-on
```

### 3. Update package.json

Tambahkan scripts dan konfigurasi berikut ke `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win"
  },
  "build": {
    "appId": "com.nexapos.app",
    "productName": "NexaPOS",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "public/favicon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "public/favicon.ico",
      "uninstallerIcon": "public/favicon.ico",
      "installerHeaderIcon": "public/favicon.ico"
    }
  }
}
```

### 4. Build untuk Windows

```bash
# Development mode (testing)
npm run electron:dev

# Build installer Windows (.exe)
npm run electron:build:win
```

### 5. Hasil Build

Setelah build selesai, file installer akan ada di folder `release/`:
- `NexaPOS Setup x.x.x.exe` - Installer untuk Windows

---

## Struktur Folder Electron

```
project/
├── electron/
│   ├── main.js       # Entry point Electron
│   ├── preload.js    # Preload script
│   └── package.json  # Electron package info
├── src/              # Source code React
├── dist/             # Build output (auto-generated)
└── release/          # Electron build output (auto-generated)
```

---

## Catatan Penting

### Koneksi Database
- Aplikasi tetap membutuhkan koneksi internet untuk akses ke Supabase
- Untuk mode offline penuh, perlu implementasi SQLite lokal (opsional)

### Icon Aplikasi
- Siapkan icon `.ico` dengan ukuran 256x256 di folder `public/`
- Ganti `public/favicon.ico` dengan icon yang diinginkan

### Troubleshooting

**Error: Cannot find module 'electron'**
```bash
npm install --save-dev electron
```

**Error: Build failed**
```bash
# Clear cache dan rebuild
rm -rf node_modules dist release
npm install
npm run electron:build:win
```

**App blank putih:**
- Sudah diperbaiki! Pastikan menggunakan code terbaru
- Cek bahwa `vite.config.ts` punya `base: "./"` 
- Cek bahwa `App.tsx` pakai `HashRouter` bukan `BrowserRouter`
- Cek console Electron dengan `Ctrl+Shift+I`

---

## Commands Cheat Sheet

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Jalankan Vite dev server |
| `npm run electron:dev` | Jalankan Electron dalam mode development |
| `npm run electron:build:win` | Build installer Windows |

---

## Performa Tips

1. **Disable DevTools di Production**: Sudah di-handle di `main.js`
2. **Minimize Bundle**: Pastikan tidak ada console.log yang tidak perlu
3. **Icon Size**: Gunakan icon .ico dengan ukuran proper (256x256)

---

Selamat! Aplikasi NexaPOS siap digunakan sebagai aplikasi desktop Windows 🎉
