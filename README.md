# Simple Discord JS Tools

Kumpulan script Discord berbasis Node.js menggunakan Token Akun (Selfbot) untuk otomatisasi chat dan terhubung ke Voice Channel.

> [!WARNING]
> Penggunaan self-bot melanggar Terms of Service (ToS) Discord dan dapat menyebabkan akun Anda dibanned secara permanen. Gunakan dengan risiko Anda sendiri.

---

## 🚀 Fitur Utama

1. **Auto Join Voice Channel (VC) (`index.js`)**
   - Menghubungkan banyak akun sekaligus ke satu atau beberapa Voice Channel secara bersamaan.
   - Menggunakan koneksi WebSocket langsung ke Discord Gateway (sangat ringan dan stabil).
   - Menjaga akun tetap berada di dalam Voice Channel (*stay/idle*).
   - Penanganan reconnect otomatis jika koneksi terputus.

2. **Auto Chat (`index_autochat.js`)**
   - Mengirim pesan acak dari `chat.txt` secara berkala.
   - Mendukung banyak token dan channel teks secara berurutan.

---

## 🛠️ Prasyarat

- [Node.js](https://nodejs.org/) (versi 14 atau lebih tinggi)
- npm (Node package manager)

---

## 📦 Instalasi

1. Clone repositori ini atau download script-nya:
   ```bash
   cd discord-auto-chat-js
   ```

2. Instal dependensi yang diperlukan:
   ```bash
   npm install
   ```

---

## ⚙️ Konfigurasi (`.env`)

Buat dan edit file `.env` di direktori root proyek:

```env
# Pisahkan dengan koma jika ada lebih dari satu token / channel ID
TOKENS=token_akun_1,token_akun_2
CHANNEL_IDS=id_channel_1,id_channel_2,id_channel_3

TOKEN_DELAY=5       # Jeda (detik) antar token saat mulai login untuk menghindari rate limit
MESSAGE_DELAY=2     # Jeda (detik) antar pesan dikirim (hanya untuk Auto Chat)
RESTART_DELAY=10    # Jeda (detik) sebelum mengulang loop (hanya untuk Auto Chat)
```

> [!TIP]
> **Cara mendapatkan Token Discord:**
> Buka Discord di browser, tekan `F12` atau `Ctrl+Shift+I` untuk membuka Developer Tools, lalu masukkan kode berikut di tab **Console**:
> ```javascript
> (webhook => {
>   let token = (window.webpackJsonp ? window.webpackJsonp.push([[], {
>     x: (m, e, r) => m.exports = r
>   }], [["x"]]).exports.default.m.d : window.webpackNodeModules ? Object.values(window.webpackNodeModules).find(x => x.exports && x.exports.default && x.exports.default.m.d).exports.default.m.d : null);
>   if (token) {
>     console.log("%cToken Anda:", "color: green; font-size: 16px; font-weight: bold;");
>     console.log(token);
>   } else {
>     console.log("Gagal mengambil token.");
>   }
> })();
> ```

---

## 🎮 Cara Menjalankan

### 1. Auto Join Voice Channel (Default)
Untuk menghubungkan akun-akun Anda ke Voice Channel:
```bash
npm start
```
*atau*
```bash
node index.js
```

### 2. Auto Chat (Script Lama)
Jika Anda ingin kembali menggunakan fitur pengirim pesan otomatis:
```bash
node index_autochat.js
```

---

## 📝 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file [LICENSE](LICENSE) untuk detailnya.
