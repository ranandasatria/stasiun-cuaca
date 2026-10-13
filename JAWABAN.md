# JAWABAN.md

Jawaban pertanyaan desain (Bagian A, B, C, D, E, G) dan esai singkat (Bagian 5).

---

## Bagian A — Device Management

### 1. Apa yang terjadi pada data historis ketika sebuah device di-decommission? Kenapa?

Data historis **tetap disimpan**, tidak dihapus. Decommission hanya mengubah status device menjadi `DECOMMISSIONED` (terminal) dan melakukan **soft delete** (`deleted_at` diisi). Baris di `sensor_readings` dan `reading_aggregates` tetap utuh dan tetap bisa di-query. Alasannya: data iklim jangka panjang masih dibutuhkan untuk analisis dan audit; menghapusnya akan membuat agregat harian dan chart historis berlubang. Jadi device "hilang" dari daftar aktif, tetapi datanya tetap bisa ditelusuri.

### 2. Bagaimana membedakan "device mati" dengan "device hidup tapi jaringan putus"?

Tidak bisa dipastikan 100% dari sisi backend, jadi jawabannya jujur: digabungkan dari beberapa sinyal. Sistem menghitung `last_seen_at` dan metadata terakhir (`last_battery_v`, `last_rssi`, `last_fw_version`). Jika device diam tetapi baterai dan RSSI terakhir masih bagus, kemungkinan besar jaringan yang putus. Jika sebelum diam ada tren baterai turun atau uptime device sudah sangat lama, kemungkinan besar device mati atau kehabisan daya. Sistem menampilkan `last_seen` + data pendukung dan **tidak mengklaim** penyebab pastinya; kepastian penuh butuh kunjungan lapangan atau jalur out-of-band.

---

## Bagian B — Sensor Management

### 1. Sensor suhu device A dipindah ke device B pada 1 Juni. Bagaimana skema menjamin data sebelum 1 Juni tetap terhubung ke device A?

Karena pemasangan tidak disimpan sebagai kolom di tabel `sensor`, melainkan di tabel relasi `sensor_installation` (`sensor_id`, `device_id`, `installed_at`, `removed_at`). Saat sensor pindah, baris lama **ditutup** (`removed_at` diisi), lalu dibuat baris baru untuk device B. Setiap baris `sensor_reading` menyimpan `device_id` pada saat pembacaan itu ditulis, jadi data 15 Mei tetap milik device A dan data 2 Juni milik device B meskipun unit sensornya sama. Tabel instalasi yang menjelaskan sensor itu berada di device mana pada rentang waktu tertentu.

### 2. Nilai kalibrasi diubah hari ini. Apakah data lama ikut berubah?

**Tidak.** Kalibrasi bersifat append-only: setiap perubahan menulis baris baru di `sensor_calibration` dengan `effective_from`. Nilai mentah (`raw`) tidak pernah diubah, dan nilai terkoreksi (`corrected`) disimpan saat pemrosesan dengan kalibrasi yang berlaku pada waktu itu. Konsekuensinya, data lama tetap memakai kalibrasi lama. Konsekuensi yang perlu disadari: jika ditampilkan berdampingan, akan terlihat "lompatan" nilai saat kalibrasi berubah, sehingga frontend sebaiknya menandai kapan kalibrasi berubah.

---

## Bagian C — ERD

### Tabel mana yang tumbuh paling cepat? Perkiraan jumlah row per tahun?

`sensor_reading`. Perhitungan untuk 50 device x 7 sensor x 1 pembacaan/menit:
- per menit: 50 x 7 = 350 baris
- per hari: 350 x 1440 = 504.000 baris
- per tahun: 504.000 x 365 = **183.960.000 baris** (± 184 juta).

### Strategi menghadapi pertumbuhan itu

Memakai PostgreSQL biasa dengan: (1) **composite index** `(device_id, ts DESC)` dan `(sensor_id, ts DESC)`; (2) **tabel agregat** `reading_aggregates` per jam sehingga chart rentang panjang tidak menyentuh data mentah; (3) **retention/downsampling** untuk data mentah yang sangat lama. Trade-off: query lintas bulan sedikit lebih rumit dan butuh job rollup berkala, tetapi tanpa ketergantungan ekstensi tambahan. Alternatif produksi: TimescaleDB (hypertable + continuous aggregate + retention) yang mengotomatiskan ketiganya.

### Wide vs narrow?

Memakai **narrow** (satu baris per sensor). Wide hemat row, tetapi kaku: sensor error menyisakan null, dan menambah tipe sensor baru memaksa migrasi kolom. Narrow lebih fleksibel, mudah divalidasi per sensor, dan tahan terhadap perubahan requirement (mis. satu device punya dua sensor suhu). Harga dari narrow (row lebih banyak) diatasi dengan index, agregat, dan retention.

---

## Bagian D — Skema Alur Data

### 1. Idempotensi

Kunci unik `UNIQUE(device_id, ts, sensor_type)` di `sensor_reading` + `createMany({ skipDuplicates: true })`. Payload yang sama dikirim berkali-kali hanya tersimpan sekali; sisanya dilaporkan sebagai `duplicates` (bukan error). Di dalam satu batch, duplikat juga dibuang lebih dulu oleh fungsi murni `dedupReadings`.

### 2. Data terlambat & tidak berurutan

Device offline 3 jam lalu mengirim 180 record sekaligus lewat `POST /ingest/telemetry/batch`. Backend menyimpannya dengan `device_time` asli (bukan waktu terima), lalu menghitung ulang bucket jam yang tersentuh (repair). Efeknya, agregat jam yang tadinya sudah dihitung akan diperbarui.

### 3. Backpressure

Strategi berlapis: **batching** (satu INSERT banyak baris, bukan per baris), **bulk insert** (`createMany`), batas ukuran batch (500), dan pembatasan laju per device. Untuk skala lebih besar, antrean (Redis Stream/Kafka) + worker pool agar endpoint bisa menjawab cepat lalu diproses di latar.

### 4. Perbedaan waktu

`device_time` (`ts` dari device) adalah acuan time-series karena itu waktu kejadian sebenarnya. `server_time` disimpan sebagai waktu terima untuk audit dan deteksi keterlambatan. Clock drift device ditangani dengan memberi flag `FUTURE_TS` jika waktu device terlalu maju (> 15 menit dari server).

### 5. Timezone

Semua timestamp disimpan **UTC**. Konversi ke WIB (Asia/Jakarta) hanya dilakukan saat **menampilkan** (lapisan API/frontend), bukan saat menyimpan.

### 6. Kegagalan

Jika DB down saat payload masuk, backend mengembalikan 500/503 (bukan sukses), sehingga device menyimpan ulang ke buffer lokal dan mencoba lagi. Tidak ada data yang diam-diam hilang. Ketahanan penuh (antrean persisten) didokumentasikan sebagai langkah berikutnya.

---

## Bagian E — API

### 1. Mencegah response GET /api/v1/readings membengkak

Empat lapis: (a) `from` dan `to` **wajib**; (b) batas maksimum ± 1000 titik per respons; (c) **paksa agregasi** — jika rentang terlalu besar, interval otomatis dinaikkan (raw -> 1m -> 1h -> 1d); (d) untuk time-series memakai **cursor** (`next_cursor`), bukan offset.

### 2. Autentikasi device vs dashboard

Berbeda. Device memakai **API key** (`X-Device-Key`, disimpan sebagai hash) karena device tidak bisa login interaktif. Dashboard memakai **JWT** (umur pendek) karena sesi manusia harus bisa dicabut dan dibatasi per peran. CORS bukan autentikasi; ia hanya aturan browser dan tetap dikonfigurasi terpisah.

### 3. Rate limiting

Kunci rate limit adalah **`device_id`** (bukan IP), karena banyak device bisa berada di belakang satu NAT dan satu penyerang bisa memalsukan banyak IP. Contoh: 60 permintaan/menit untuk telemetry, 10/menit untuk batch. Jika dilanggar, balas **429** dengan header `Retry-After`.

---

## Bagian G — Frontend

### 1. Berapa titik data yang wajar dirender dalam satu chart?

Sekitar **200–1000 titik** per chart; di atas itu mata tidak bisa membedakannya dan browser melambat. Untuk rentang 1 tahun, backend dipaksa memakai interval `1d` sehingga hanya ± 365 titik. Frontend memilih interval sesuai rentang (24 jam/7 hari -> `1h`, 30 hari -> `1d`) dan tidak menarik data mentah lalu mengagregasi di browser.

### 2. Bagaimana menampilkan gap data (device offline 3 jam)?

**Garis putus** (bukan nol, bukan interpolasi). Nol menyesatkan (seolah suhu 0), dan menyambung lurus seolah ada data padahal tidak. Frontend mengosongkan slot yang tidak ada datanya (`null`) dan chart dikonfigurasi tidak menyambung gap.

---

## Bagian 5 — Esai Singkat

**1. Kenapa data time-series sebaiknya tidak di-UPDATE, lebih baik append-only?**
Setiap pengukuran adalah fakta historis pada waktu tertentu yang tidak boleh berubah. UPDATE merusak audit, membuat agregat yang sudah dihitung tidak konsisten, dan menimbulkan rebutan lock saat tulis bersamaan. Jika ada koreksi, tambahkan baris revisi atau kalibrasi baru, bukan mengubah baris lama. Append-only juga membuat partisi dan kompresi lebih efisien.

**2. Apa itu hypertable dan continuous aggregate di TimescaleDB? Kalau hanya PostgreSQL biasa, bagaimana mencapai efek yang sama?**
Hypertable adalah tabel TimescaleDB yang otomatis terpartisi per waktu sehingga tampak sebagai satu tabel tetapi tersimpan sebagai banyak chunk kecil. Continuous aggregate adalah view materialisasi yang memperbarui ringkasan (mis. per jam) otomatis. Dengan PostgreSQL biasa, efek serupa dicapai lewat partisi deklaratif per bulan + tabel agregat + job rollup berkala (cron) + retention untuk membuang partisi lama.

**3. Jelaskan perbedaan menghitung rata-rata arah angin dengan rata-rata suhu.**
Suhu linear, jadi rata-rata cukup dijumlah lalu dibagi. Arah angin sirkular: rata-rata biasa dari 350° dan 10° menghasilkan 180° (selatan), padahal keduanya menunjuk utara. Cara yang benar: ubah tiap arah jadi vektor (sin, cos), rata-ratakan vektornya, lalu kembalikan dengan `atan2`. Kecepatan bisa dipakai sebagai bobot.

**4. Bandingkan insert satu per satu vs bulk insert/batching.**
Bulk jauh lebih cepat, sering 10–100x. Insert satu per satu membutuhkan satu round-trip dan satu commit per baris; bulk menggabungkan banyak baris dalam satu query/commit sehingga overhead jaringan dan fsync dibagi bersama. Untuk 350 baris/menit, batching + bulk insert adalah keharusan.

**5. Index apa yang dibuat di `sensor_reading` dan kenapa urutan kolomnya penting?**
`UNIQUE(device_id, ts, sensor_type)` untuk idempotensi, `INDEX(device_id, ts DESC)` untuk chart per device, dan `INDEX(sensor_id, ts DESC)` untuk analisis per unit sensor. Urutan penting karena index dibaca dari kiri ke kanan (leftmost prefix): kolom kesetaraan (`device_id`) harus di depan, kolom rentang/waktu (`ts`) di belakang. Jika dibalik, query per device tidak bisa memakai prefix index.

**6. Bagaimana mendeteksi sensor "macet" (nilai identik 6 jam)?**
Query/job yang menghitung jumlah nilai berbeda (atau STDDEV) dalam jendela 6 jam untuk satu sensor. Jika variasi nol atau sangat kecil padahal sensor lain berubah, tandai sebagai `STUCK`. Penyebabnya sensor beku atau kabel putus sehingga membaca nilai terakhir terus. Setelah terdeteksi, tampilkan peringatan maintenance.

**7. Alert curah hujan > 20 mm/jam ditaruh di lapisan mana?**
Di **worker backend**, setelah agregasi per jam, bukan di frontend atau firmware. Alasannya: backend punya data lengkap dan konsisten serta bisa mengirim notifikasi meskipun dashboard tutup. Setelah bucket jam dihitung, cek ambang, tulis ke tabel `alerts`, lalu kirim webhook/email. Aturan ambang dibuat konfigurabel.

**8. Risiko keamanan endpoint ingestion dan mitigasinya.**
Risiko: API key bocor (pemalsuan data), banjir request (DDoS / DB penuh), payload besar (habis memori), dan enumerasi device_id. Mitigasi: TLS wajib, API key per device dengan hashing + rotasi, rate limit per `device_id` (429), validasi skema ketat + batas ukuran batch (413), autentikasi terpisah dari user, logging dengan `request_id` tanpa menyimpan secret, dan IP allowlist bila memungkinkan.
