# NexaPOS - Panduan Build Electron

## Langkah Build untuk Windows

### 1. Build Frontend React
```bash
npm install
npm run build
```

### 2. Setup Electron
```bash
cd electron
npm install
npm run rebuild
```

### 3. Build Installer Windows
```bash
npm run build:win
```

Hasil build ada di folder `release/`

---

## Troubleshooting

### Window tidak muncul tapi process ada

1. **Cek apakah folder `dist/` ada**
   ```bash
   ls dist/
   ```
   Jika tidak ada, jalankan `npm run build` di root folder.

2. **Cek log aplikasi**
   Jalankan dari command line untuk melihat error:
   ```bash
   cd electron
   npm start
   ```

3. **Rebuild better-sqlite3**
   ```bash
   cd electron
   npm run rebuild
   ```

### Error: Cannot find module 'better-sqlite3'

```bash
cd electron
npm install better-sqlite3
npm run rebuild
```

### Blank white screen

Pastikan `base: "./"` ada di vite.config.ts (sudah dikonfigurasi).

---

## Development Mode

Terminal 1 - Jalankan Vite dev server:
```bash
npm run dev
```

Terminal 2 - Jalankan Electron:
```bash
cd electron
npm run start:dev
```

---

## Struktur File

```
project/
├── dist/              # Build frontend (hasil npm run build)
├── electron/
│   ├── main.js        # Electron main process
│   ├── preload.js     # Preload script
│   ├── database.js    # SQLite database handler
│   ├── license.js     # License manager
│   ├── keygen.js      # License key generator (admin tool)
│   └── package.json   # Electron dependencies
├── release/           # Hasil build installer
└── src/               # Source code React
```

---

## Generate License Key

Untuk generate license key baru:

```bash
cd electron
node keygen.js <HWID> [LICENSE_TYPE] [EXPIRE_DAYS]

# Contoh:
node keygen.js ABC123DEF456GH89
node keygen.js ABC123DEF456GH89 PREMIUM 365
node keygen.js ABC123DEF456GH89 TRIAL 30
```

LICENSE_TYPE:
- `TRIAL` - License trial
- `FULL` - License full (default)
- `PREMIUM` - License premium

---

## Default Login

```
Email: admin@nexapos.local
Password: admin123
```
