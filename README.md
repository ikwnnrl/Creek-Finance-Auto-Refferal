# Creek-Finance-Auto-Refferal

# 🤖 Creek Finance Referral Auto Register Bot

Skrip **Node.js** otomatis untuk melakukan **registrasi massal akun Creek Finance** menggunakan berbagai **referral code**.  
Setiap akun dibuat menggunakan wallet baru (SUI Ed25519) dan dapat dijalankan melalui proxy dan user-agent acak agar tampak natural.

---

## 🚀 Fitur Utama

- **Auto Wallet Generator**  
  Membuat wallet baru secara otomatis menggunakan `Ed25519Keypair`.

- **Auto Registration via Referral Code**  
  Mengirim request registrasi ke endpoint API `https://api-test.creek.finance/api/user/connect` dengan wallet address dan kode referral.

- **Support Proxy & User-Agent Randomization**  
  - Mendukung format proxy: `http://user:pass@ip:port` atau `socks5://ip:port`.  
  - Memilih *user-agent* secara acak dari file `user_agents.txt`.

- **Multi-Code + Fixed Wallet per Code**  
  Dapat mengatur jumlah wallet yang akan dibuat untuk setiap kode referral.

- **Auto Retry & Delay Randomized**  
  Mengatur jeda acak antar wallet (10–30 detik) dan antar kode referral (60–120 detik).

- **Output Log Lengkap**  
  Semua hasil tersimpan ke file output:
  - `generated.txt` → daftar private key yang dibuat  
  - `codereff.txt` → kode referral baru hasil registrasi  
  - `proxy_mapping.txt` → pasangan wallet dan proxy yang digunakan

---

## ⚙️ Persyaratan

### 1. Instalasi Modul
Pastikan Node.js versi **18+** sudah terinstal, lalu jalankan:
```bash
npm install @mysten/sui.js axios http-proxy-agent https-proxy-agent
```

### 2. Struktur File
Buat file berikut di folder yang sama dengan `index.js`:

| File | Keterangan |
|------|-------------|
| `code.txt` | Daftar kode referral Creek Finance (1 per baris). |
| `proxy.txt` | (Opsional) Daftar proxy yang akan digunakan. |
| `user_agents.txt` | (Opsional) Daftar user-agent browser (1 per baris). |

---

## 📄 Contoh Isi File

### `code.txt`
```
ABC123
DEF456
GHI789
```

### `proxy.txt`
```
http://user:pass@123.45.67.89:8080
socks5://98.76.54.32:1080
```

### `user_agents.txt`
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15
Mozilla/5.0 (Linux; Android 12; Pixel 6) Chrome/119.0.0.0 Mobile Safari/537.36
```

---

## 🧩 Cara Menjalankan

1. Jalankan skrip:
   ```bash
   node index.js
   ```

2. Saat diminta input:
   ```
   💬 Masukkan jumlah wallet per code:
   ```
   Masukkan jumlah wallet yang ingin dibuat untuk tiap referral code (misalnya `5`).

3. Bot akan:
   - Membuat wallet baru (`Ed25519Keypair`)
   - Mengirim request registrasi ke API Creek Finance
   - Menyimpan hasil di file:
     ```
     generated.txt
     codereff.txt
     proxy_mapping.txt
     ```

---

## 🧠 Alur Kerja Program

1. Membaca file konfigurasi (`user_agents.txt`, `proxy.txt`, `code.txt`).
2. Menanyakan jumlah wallet per referral code.
3. Untuk setiap kode referral:
   - Mengulangi proses pembuatan wallet sesuai jumlah yang diminta.
   - Setiap wallet akan:
     - Didaftarkan ke API Creek Finance.
     - Menyimpan hasil (private key & kode referral baru).
   - Menggunakan proxy (jika tersedia) dan user-agent acak.
4. Menampilkan hasil total setelah semua referral code selesai.

---

## 📊 Contoh Output Terminal

```
╔═══════════════════════════════════════════════╗
║     AUTO REGISTRASI REFERRAL - CREEK.FI      ║
║         (Fixed Wallets Per Code)              ║
╚═══════════════════════════════════════════════╝

📱 Loading User Agents...
✓ Loaded 5 user agents

🌐 Loading Proxies...
✓ Loaded 3 proxies

💬 Masukkan jumlah wallet per code: 3

📋 Konfigurasi:
   Jumlah per Code: 3 wallets
   Total Codes: 2
   Total Wallets: 6
   Proxies: 3

📝 Referral Codes:
   1. ABC123
   2. DEF456
```

```
[Wallet 1/3] Global: 1
🌐 Proxy: http://user:pass@123.45.67.89:8080
📍 Address: 0x8f7a92bd9e1e0...
📝 Registrasi...
✓ Registrasi berhasil!
   Wallet: 0x8f7a92bd9e...
✅ Wallet berhasil!
```

---

## ⚠️ Peringatan Penting

> ⚡ **Gunakan dengan bijak!**  
> - Skrip ini mengirim request langsung ke endpoint API Creek Finance.  
> - Jangan gunakan untuk spam atau aktivitas tidak sah.  
> - Private key hasil wallet baru akan tersimpan di file `generated.txt`.  
> - **Jangan pernah membagikan file ini ke pihak lain!**

---

## 🔧 Troubleshooting

| Masalah | Penyebab | Solusi |
|----------|-----------|--------|
| `Cannot find module '@mysten/sui.js'` | Modul belum diinstal | Jalankan `npm install @mysten/sui.js` |
| `code.txt kosong` | File tidak berisi kode referral | Tambahkan referral code yang valid |
| `Proxy connection failed` | Proxy tidak aktif / salah format | Periksa format proxy |
| `Error: timeout` | API lambat / limit koneksi | Tambahkan delay antar wallet |

---

## 📂 Output File

| File | Isi | Deskripsi |
|------|------|-----------|
| `generated.txt` | Daftar private key wallet yang dibuat | Output hasil pembuatan wallet |
| `codereff.txt` | Kode referral baru hasil registrasi | Disimpan satu per baris |
| `proxy_mapping.txt` | Daftar wallet ↔ proxy | Hanya dibuat bila file proxy tersedia |

---

## 👨‍💻 Pembuat
**Creek Finance Referral Bot**  
Dibuat oleh: **iwwwit**  
Lisensi: **MIT License**

---

## 🧩 Catatan Tambahan

Skrip ini dibuat untuk tujuan **otomatisasi edukatif** dan **pengujian API publik Creek Finance (Testnet)**.  
Gunakan secara etis dan sesuai ketentuan platform.
