// ======================================================
// SISTEM ABSENSI ENTERPRISE - FULL FINAL STABLE
// ======================================================
require("dotenv").config({ quiet: true });
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error("❌ JWT_SECRET tidak ditemukan di .env");
  process.exit(1);
}
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const ExcelJS = require("exceljs");
const multer = require("multer");
const fs = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
// ================= FACE RECOGNITION =================
// ================= FACE RECOGNITION =================
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
const FACE_THRESHOLD = 0.45;

// Load models saat server start
async function loadFaceModels() {
  const modelPath = path.join(__dirname, "models");

  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

  console.log("✅ Models loaded");
}
const app = express();
const router = express.Router();
app.set("trust proxy", 1);
// ================= SECURITY =================
app.use(express.json({ limit: "5mb" }));
app.use(cors());
app.use(helmet());

const PORT = process.env.PORT || 5000;

// ================= RATE LIMIT LOGIN =================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
});

const absenLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 3,
  message: { error: "Terlalu banyak request absen. Tunggu 10 detik." },
});

async function logActivity(userId, activity, req) {
  await pool.query(
    `INSERT INTO logs (user_id, activity, ip_address, user_agent)
     VALUES ($1,$2,$3,$4)`,
    [userId, activity, req.ip, req.headers["user-agent"]]
  );
}
// ================= UPLOAD FOLDER =================
const uploadPath = "/var/www/absensi/uploads";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname
      .replace(/\s+/g, "_")              // ganti spasi
      .replace(/[^a-zA-Z0-9._-]/g, "");  // hapus karakter aneh

    cb(null, Date.now() + "-" + safeName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Hanya file gambar diperbolehkan"));
    } else {
      cb(null, true);
    }
  },
});

// ================= STATIC UPLOAD =================
app.use(
  "/uploads",
  express.static("/var/www/absensi/uploads")
);

// ================= STATIC MODELS =================
app.use(
  "/models",
  express.static(path.join(__dirname, "models"))
);
// ================= DATABASE =================
const pool = new Pool({
  user: process.env.DB_USER || "absensi_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "absensi",
  password: process.env.DB_PASS || "absensi123",
  port: process.env.DB_PORT || 5432,
});

// ================= AUTO CREATE ADMIN =================
async function createAdminIfNotExists() {
  const check = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    ["zukatsuzuka@gmail.com"]
  );

  if (check.rows.length === 0) {
    const hash = await bcrypt.hash("123456", 10);

    await pool.query(
      "INSERT INTO users (nama,email,password,role) VALUES ($1,$2,$3,$4)",
      ["Zuka Admin", "zukatsuzuka@gmail.com", hash, "admin"]
    );

    console.log("✅ Admin dibuat otomatis");
  }
}

// ================= AUTH =================
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Token tidak ada" });

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    console.log("TOKEN VALID:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("TOKEN ERROR:", err.message);
    res.status(403).json({ error: "Token tidak valid" });
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ================= LOGIN =================
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0)
      return res.status(404).json({ error: "User tidak ditemukan" });

    const valid = await bcrypt.compare(password, user.rows[0].password);
    if (!valid)
      return res.status(401).json({ error: "Password salah" });

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role: user.rows[0].role });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CREATE USER =================
router.post(
  "/admin/create-user",
  verifyToken,
  isAdmin,
  (req, res, next) => {
    upload.single("foto")(req, res, function (err) {
      if (err) {
        console.log("MULTER ERROR:", err);
        return res.status(400).json({ error: "Upload gagal: " + err.message });
      }
      next();
    });
  },
  async (req, res) => {
    console.log("========== CREATE USER HIT ==========");
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    try {
      const { nama, email, password, role, project_id, building_id } = req.body;

      // ================= VALIDASI =================
      if (!nama || !email || !password) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Foto karyawan wajib diupload" });
      }

      // ================= CEK EMAIL DUPLIKAT =================
      const check = await pool.query(
        "SELECT id FROM users WHERE email=$1",
        [email.trim()]
      );

      if (check.rows.length > 0) {
        return res.status(400).json({ error: "Email sudah ada" });
      }

      // ================= HASH PASSWORD =================
      const hash = await bcrypt.hash(password, 10);

      // ================= LOAD FOTO =================
      const imagePath = req.file.path;
      console.log("IMAGE PATH:", imagePath);

      const img = await canvas.loadImage(imagePath);
      console.log("IMAGE LOADED SUCCESS");

      // ================= FACE DETECTION =================
      const detection = await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      console.log("DETECTION RESULT:", detection);

      if (!detection) {
        console.log("❌ WAJAH TIDAK TERDETEKSI");

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }

        return res.status(400).json({
          error: "Wajah tidak terdeteksi. Gunakan foto yang jelas dan terang."
        });
      }

      // ================= DESCRIPTOR =================
      const descriptor = Array.from(detection.descriptor);

      console.log("DESCRIPTOR LENGTH:", descriptor.length);

      if (descriptor.length !== 128) {
        console.log("❌ DESCRIPTOR TIDAK 128");
        return res.status(500).json({
          error: "Descriptor tidak valid"
        });
      }

      // ================= INSERT USER =================
      await pool.query(
        `INSERT INTO users 
        (nama, email, password, role, foto, project_id, building_id, face_descriptor)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          nama.trim(),
          email.trim(),
          hash,
          role || "worker",
          req.file.filename,
          project_id || null,
          building_id || null,
          descriptor
        ]
      );

      console.log("✅ USER BERHASIL DISIMPAN DENGAN DESCRIPTOR");

      res.json({
        message: "User + face descriptor berhasil dibuat"
      });

    } catch (err) {
      console.error("CREATE USER ERROR:", err);

      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        error: "Terjadi kesalahan server"
      });
    }
  }
);
// ================= ABSEN MASUK =================
router.post(
  "/absen-masuk",
  verifyToken,
  absenLimiter,
  upload.single("foto"),
  async (req, res) => {
    let fotoPath;

    try {
      if (!req.file)
        return res.status(400).json({ error: "Foto wajib diupload" });

      fotoPath = req.file.path;

      const { latitude, longitude, accuracy } = req.body;

      if (!latitude || !longitude || !accuracy) {
        fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Data lokasi tidak lengkap" });
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const acc = parseFloat(accuracy);

      if (isNaN(lat) || isNaN(lon) || isNaN(acc)) {
        fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Data tidak valid" });
      }

      if (acc > 120) {
        fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Akurasi GPS terlalu rendah" });
      }

      // ================= CEK SUDAH ABSEN DULU =================
      const cekAbsen = await pool.query(
        `SELECT id FROM absensi
         WHERE user_id = $1
         AND tanggal = CURRENT_DATE`,
        [req.user.id]
      );

      if (cekAbsen.rows.length > 0) {
        fs.unlinkSync(fotoPath);
        return res.status(400).json({
          error: "Anda sudah absen hari ini"
        });
      }

      // ================= GET USER =================
      const userResult = await pool.query(
        "SELECT building_id, face_descriptor FROM users WHERE id=$1",
        [req.user.id]
      );

      if (!userResult.rows[0]) {
        fs.unlinkSync(fotoPath);
        return res.status(404).json({ error: "User tidak ditemukan" });
      }

      const userData = userResult.rows[0];

      if (!userData.building_id) {
        fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "User belum di-assign ke gedung" });
      }

      if (!userData.face_descriptor) {
        fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "User belum memiliki data wajah" });
      }

      // ================= GET BUILDING =================
      const buildingResult = await pool.query(
        "SELECT latitude, longitude, radius, project_id FROM buildings WHERE id=$1",
        [userData.building_id]
      );

      if (buildingResult.rows.length === 0) {
        fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Gedung tidak ditemukan" });
      }

      const building = buildingResult.rows[0];

      // ================= GEOFENCE =================
      const jarak = haversine(
        lat,
        lon,
        parseFloat(building.latitude),
        parseFloat(building.longitude)
      );

      if (jarak > Number(building.radius)) {
        fs.unlinkSync(fotoPath);
        return res.status(403).json({
          error: "Anda berada di luar radius gedung"
        });
      }

      // ================= FACE MATCH =================
      const img = await canvas.loadImage(fotoPath);

      const detection = await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Wajah tidak terdeteksi" });
      }

      const distance = faceapi.euclideanDistance(
        detection.descriptor,
        userData.face_descriptor
      );

      if (distance > FACE_THRESHOLD) {
        fs.unlinkSync(fotoPath);
        return res.status(403).json({ error: "Wajah tidak cocok" });
      }

      // ================= INSERT =================
      await pool.query(
        `INSERT INTO absensi
         (user_id,tanggal,jam_masuk,latitude,longitude,foto_masuk,status,project_id,building_id,total_jam,lembur_jam)
         VALUES ($1,CURRENT_DATE,NOW(),$2,$3,$4,$5,$6,$7,0,0)`,
        [
          req.user.id,
          lat,
          lon,
          req.file.filename,
          "Hadir",
          building.project_id,
          userData.building_id
        ]
      );

      await logActivity(req.user.id, "Absen Masuk", req);

      return res.status(200).json({
         success: true,
         message: "Absen masuk berhasil"
      });

    } catch (err) {
      console.error("ABSEN MASUK ERROR:", err);

      // Backup protection dari UNIQUE constraint
      if (err.code === "23505") {
        if (fotoPath && fs.existsSync(fotoPath)) {
          fs.unlinkSync(fotoPath);
        }
        return res.status(400).json({ error: "Sudah absen hari ini" });
      }

      if (fotoPath && fs.existsSync(fotoPath)) {
        fs.unlinkSync(fotoPath);
      }

      res.status(500).json({ error: "Server error" });
    }
  }
);
// ================= ABSEN PULANG =================
router.post(
  "/absen-pulang",
  verifyToken,
  absenLimiter,
  upload.single("foto"),
  async (req, res) => {

    let fotoPath;

    try {
      if (!req.file)
        return res.status(400).json({ error: "Foto wajib diupload" });

      fotoPath = req.file.path;

      const { latitude, longitude, accuracy } = req.body;

      if (!latitude || !longitude || !accuracy) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Data lokasi tidak lengkap" });
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const acc = parseFloat(accuracy);

      if (isNaN(lat) || isNaN(lon) || isNaN(acc)) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Data lokasi tidak valid" });
      }

      if (acc > 150) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Akurasi GPS terlalu rendah" });
      }

      // ================= CEK ABSEN HARI INI =================
      const absensiData = await pool.query(
        `SELECT id, jam_masuk, jam_pulang, building_id
         FROM absensi
         WHERE user_id=$1
         AND tanggal = CURRENT_DATE
         FOR UPDATE`,
        [req.user.id]
      );

      if (absensiData.rows.length === 0) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Anda belum absen masuk hari ini" });
      }

      const absensi = absensiData.rows[0];

      if (absensi.jam_pulang) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Anda sudah absen pulang hari ini" });
      }

      // ================= GET BUILDING =================
      const buildingResult = await pool.query(
        "SELECT latitude, longitude, radius FROM buildings WHERE id=$1",
        [absensi.building_id]
      );

      if (buildingResult.rows.length === 0) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Gedung tidak ditemukan" });
      }

      const building = buildingResult.rows[0];

      // ================= GEOFENCE =================
      const jarak = haversine(
        lat,
        lon,
        parseFloat(building.latitude),
        parseFloat(building.longitude)
      );

      if (jarak > Number(building.radius)) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(403).json({ error: "Anda berada di luar radius gedung" });
      }

      // ================= GET USER FACE =================
      const userData = await pool.query(
        "SELECT face_descriptor FROM users WHERE id=$1",
        [req.user.id]
      );

      if (!userData.rows[0] || !userData.rows[0].face_descriptor) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "User belum memiliki data wajah" });
      }

      // ================= FACE MATCH =================
      const img = await canvas.loadImage(fotoPath);

      const detection = await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        return res.status(400).json({ error: "Wajah tidak terdeteksi" });
      }

      const distance = faceapi.euclideanDistance(
        detection.descriptor,
        userData.rows[0].face_descriptor
      );

      if (distance > FACE_THRESHOLD) {
        if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        await logActivity(req.user.id, "Gagal Absen Pulang - Face Tidak Cocok", req);
        return res.status(403).json({ error: "Wajah tidak cocok" });
      }

      // ================= HITUNG TOTAL JAM =================
      const jamMasuk = new Date(absensi.jam_masuk);
      const jamPulang = new Date();

      const diffMs = jamPulang - jamMasuk;
      const totalJam = diffMs / (1000 * 60 * 60);

      let status = "Hadir";
      let lemburJam = 0;

      if (totalJam < 4) {
        status = "Setengah Hari";
      } else if (totalJam >= 8) {
        status = "Lembur";
        lemburJam = totalJam - 8;
      }

      // ================= UPDATE ABSENSI =================
      const result = await pool.query(
        `UPDATE absensi
         SET jam_pulang = NOW(),
             latitude_pulang = $2,
             longitude_pulang = $3,
             foto_pulang = $4,
             total_jam = $5,
             lembur_jam = $6,
             status = $7
         WHERE id = $1
         RETURNING total_jam, lembur_jam, status`,
        [
          absensi.id,
          lat,
          lon,
          req.file.filename,
          totalJam,
          lemburJam,
          status
        ]
      );

      await logActivity(req.user.id, "Absen Pulang", req);

      return res.status(200).json({
        success: true,
        message: "Absen pulang berhasil",
        total_jam: result.rows[0].total_jam,
        lembur_jam: result.rows[0].lembur_jam,
        status: result.rows[0].status
      });

    } catch (err) {

      console.error("ABSEN PULANG ERROR:", err);

      if (fotoPath && fs.existsSync(fotoPath)) {
        fs.unlinkSync(fotoPath);
      }

      res.status(500).json({ error: "Server error" });
    }
  }
);
// ================= ADMIN DASHBOARD =================
router.get("/admin/dashboard", verifyToken, isAdmin, async (req, res) => {
  try {
    // Ambil tanggal dari database (hindari bug timezone)
    const todayResult = await pool.query("SELECT CURRENT_DATE");
    const today = todayResult.rows[0].current_date;

    const totalUser = await pool.query(
      "SELECT COUNT(*) FROM users"
    );

    const totalAbsen = await pool.query(
      "SELECT COUNT(*) FROM absensi"
    );

    const hadir = await pool.query(
      "SELECT COUNT(*) FROM absensi WHERE tanggal = $1",
      [today]
    );

    // 🔥 TAMBAHAN UNTUK CHART
    const statusData = await pool.query(
      `SELECT status, COUNT(*) 
       FROM absensi 
       WHERE tanggal = $1 
       GROUP BY status`,
      [today]
    );

    let normal = 0;
    let lembur = 0;
    let setengah = 0;

    statusData.rows.forEach(row => {
      if (row.status === "Normal") normal = parseInt(row.count);
      if (row.status === "Lembur") lembur = parseInt(row.count);
      if (row.status === "Setengah Hari") setengah = parseInt(row.count);
    });

    res.json({
      total_user: parseInt(totalUser.rows[0].count),
      total_absensi: parseInt(totalAbsen.rows[0].count),
      hadir_hari_ini: parseInt(hadir.rows[0].count),

      // 🔥 kirim ke frontend
      normal,
      lembur,
      setengah_hari: setengah
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= ADD PROJECT =================
router.post("/admin/create-project", verifyToken, isAdmin, async (req, res) => {
  try {
    let { nama_proyek } = req.body;

    if (!nama_proyek)
      return res.status(400).json({ error: "Nama proyek wajib diisi" });

    nama_proyek = nama_proyek.trim();

    await pool.query(
      `INSERT INTO projects (nama_proyek)
       VALUES ($1)`,
      [nama_proyek]
    );

    res.json({ message: "Project berhasil ditambahkan" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
// ================= DELETE PROJECT =================
// Hanya bisa dihapus jika tidak memiliki building
// Endpoint: DELETE /api/admin/delete-project/:id
router.delete("/admin/delete-project/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    // 🔹 Ambil ID dari parameter URL
    const projectId = parseInt(req.params.id);

    // 🔹 Validasi ID harus angka
    if (isNaN(projectId))
      return res.status(400).json({ error: "ID tidak valid" });

    // 🔹 Cek apakah project masih memiliki building
    // Jika masih ada building, project tidak boleh dihapus
    const buildingCheck = await pool.query(
      "SELECT id FROM buildings WHERE project_id = $1 LIMIT 1",
      [projectId]
    );

    if (buildingCheck.rows.length > 0) {
      return res.status(400).json({
        error: "Project tidak bisa dihapus karena masih memiliki building"
      });
    }

    // 🔹 Hapus project jika tidak ada building terkait
    const result = await pool.query(
      "DELETE FROM projects WHERE id = $1 RETURNING *",
      [projectId]
    );

    // 🔹 Jika project tidak ditemukan
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Project tidak ditemukan" });

    // 🔹 Berhasil dihapus
    res.json({ message: "Project berhasil dihapus" });

  } catch (err) {
    console.error("Error delete project:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= LIST PROJECT =================
// ================= LIST PROJECT =================
router.get("/admin/projects", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nama_proyek FROM projects ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("LIST PROJECT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= TOTAL WORKER =================
router.get("/admin/total-worker", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role='worker'"
    );

    res.json({ total: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= EXPORT FULL =================
router.get("/admin/export-full", verifyToken, isAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT u.nama, a.tanggal, a.jam_masuk, a.jam_pulang,
            a.total_jam, a.lembur_jam
     FROM absensi a
     JOIN users u ON a.user_id=u.id
     ORDER BY a.tanggal DESC`
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Absensi");

  sheet.columns = [
    { header: "Nama", key: "nama", width: 20 },
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "Jam Masuk", key: "jam_masuk", width: 20 },
    { header: "Jam Pulang", key: "jam_pulang", width: 20 },
    { header: "Total Jam", key: "total_jam", width: 15 },
    { header: "Lembur", key: "lembur_jam", width: 15 },
  ];

  result.rows.forEach(row => sheet.addRow(row));

  res.setHeader("Content-Disposition", "attachment; filename=absensi.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  await workbook.xlsx.write(res);
  res.end();
});

// ================= EXPORT BULANAN =================
router.get("/admin/export-bulanan", verifyToken, isAdmin, async (req, res) => {
  try {
    const { bulan, tahun } = req.query;

    if (!bulan || !tahun)
      return res.status(400).json({ error: "Bulan & tahun wajib diisi" });

    const result = await pool.query(
      `SELECT u.nama, a.tanggal, a.jam_masuk, a.jam_pulang,
              a.total_jam, a.lembur_jam
       FROM absensi a
       JOIN users u ON a.user_id=u.id
       WHERE EXTRACT(MONTH FROM a.tanggal)=$1
       AND EXTRACT(YEAR FROM a.tanggal)=$2
       ORDER BY a.tanggal DESC`,
      [bulan, tahun]
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Absensi Bulanan");

    sheet.columns = [
      { header: "Nama", key: "nama", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 15 },
      { header: "Jam Masuk", key: "jam_masuk", width: 20 },
      { header: "Jam Pulang", key: "jam_pulang", width: 20 },
      { header: "Total Jam", key: "total_jam", width: 15 },
      { header: "Lembur", key: "lembur_jam", width: 15 },
    ];

    result.rows.forEach(row => sheet.addRow(row));

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=absensi-${bulan}-${tahun}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= EXPORT PER WORKER =================
router.get("/admin/export-worker", verifyToken, isAdmin, async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id)
      return res.status(400).json({ error: "user_id wajib diisi" });

    const result = await pool.query(
      `SELECT u.nama, a.tanggal, a.jam_masuk, a.jam_pulang,
              a.total_jam, a.lembur_jam
       FROM absensi a
       JOIN users u ON a.user_id=u.id
       WHERE a.user_id=$1
       ORDER BY a.tanggal DESC`,
      [user_id]
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Absensi Worker");

    sheet.columns = [
      { header: "Nama", key: "nama", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 15 },
      { header: "Jam Masuk", key: "jam_masuk", width: 20 },
      { header: "Jam Pulang", key: "jam_pulang", width: 20 },
      { header: "Total Jam", key: "total_jam", width: 15 },
      { header: "Lembur", key: "lembur_jam", width: 15 },
    ];

    result.rows.forEach(row => sheet.addRow(row));

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=absensi-worker-${user_id}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= LIST USERS =================
router.get("/admin/users", verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT 
        u.id,
        u.nama,
        u.email,
        u.role,
        u.foto,
        u.project_id,
        p.nama_proyek
      FROM users u
      LEFT JOIN projects p ON u.project_id = p.id
      ORDER BY u.id DESC
    `);

    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= employee USER =================
router.get("/employee/me", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nama, u.email, u.foto, 
              p.nama_proyek
       FROM users u
       LEFT JOIN projects p ON u.project_id = p.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Gagal ambil data user" });
  }
});
// ================= RIWAYAT ABSENSI USER =================
router.get("/absensi-saya", verifyToken, async (req, res) => {
  try {

    console.log("USER LOGIN:", req.user);

    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        tanggal,
        jam_masuk,
        jam_pulang,
        status
      FROM absensi
      WHERE user_id = $1
      ORDER BY tanggal DESC
      `,
      [userId]
    );

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (err) {
    console.error("ERROR RIWAYAT:", err);
    return res.status(500).json({
      success: false,
      error: "Gagal mengambil riwayat",
    });
  }
});
// ================= DELETE USER =================
router.delete("/admin/delete-user/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [req.params.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    if (user.rows[0].role === "admin") {
      return res.status(403).json({ error: "Tidak bisa hapus sesama admin" });
    }

    await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);

    res.json({ message: "User berhasil dihapus" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
// ================= LIST ABSENSI =================
router.get("/admin/absensi", verifyToken, isAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;

    let query = `
      SELECT 
        a.id,
        u.nama,
        p.nama_proyek,
        to_char(a.tanggal, 'YYYY-MM-DD') AS tanggal,
        to_char(a.jam_masuk, 'YYYY-MM-DD"T"HH24:MI:SS') AS jam_masuk,
        to_char(a.jam_pulang, 'YYYY-MM-DD"T"HH24:MI:SS') AS jam_pulang,
        COALESCE(a.status, '-') AS status,
        COALESCE(a.total_jam, 0) AS total_jam,
        COALESCE(a.lembur_jam, 0) AS lembur_jam
      FROM absensi a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
    `;

    const conditions = [];
    const values = [];

    if (start) {
      values.push(start);
      conditions.push(`a.tanggal >= $${values.length}`);
    }

    if (end) {
      values.push(end);
      conditions.push(`a.tanggal <= $${values.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY a.tanggal DESC, a.jam_masuk DESC";

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    console.error("LIST ABSENSI ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= ADD BUILDING =================
router.post("/admin/create-building", verifyToken, isAdmin, async (req, res) => {
  try {
    let { project_id, nama_gedung, latitude, longitude, radius } = req.body;

    if (!project_id || !nama_gedung || !latitude || !longitude)
      return res.status(400).json({ error: "Data gedung tidak lengkap" });

    const projectId = parseInt(project_id);
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius || 50);

    if (isNaN(projectId) || isNaN(lat) || isNaN(lon) || isNaN(rad))
      return res.status(400).json({ error: "Data tidak valid" });

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180)
      return res.status(400).json({ error: "Koordinat tidak valid" });

    if (rad <= 0 || rad > 10000)
      return res.status(400).json({ error: "Radius tidak masuk akal" });

    const project = await pool.query(
      "SELECT id FROM projects WHERE id=$1",
      [projectId]
    );

    if (project.rows.length === 0)
      return res.status(404).json({ error: "Project tidak ditemukan" });

    await pool.query(
      `INSERT INTO buildings (project_id, nama_gedung, latitude, longitude, radius)
       VALUES ($1,$2,$3,$4,$5)`,
      [projectId, nama_gedung.trim(), lat, lon, rad]
    );

    res.json({ message: "Gedung berhasil ditambahkan" });

  } catch (err) {
    console.error("ADD BUILDING ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= LIST BUILDINGS =================
router.get("/admin/buildings/:project_id", verifyToken, isAdmin, async (req, res) => {
  try {
    const projectId = parseInt(req.params.project_id);

    if (isNaN(projectId))
      return res.status(400).json({ error: "Project tidak valid" });

    const result = await pool.query(
      `SELECT id, nama_gedung, latitude, longitude, radius
       FROM buildings
       WHERE project_id=$1
       ORDER BY id DESC`,
      [projectId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= DELETE BUILDING =================
// Hanya bisa dihapus jika belum pernah dipakai di absensi
// Endpoint: DELETE /api/admin/delete-building/:id

router.delete("/admin/delete-building/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    // 🔹 Ambil ID dari parameter
    const id = parseInt(req.params.id);

    // 🔹 Validasi ID harus angka
    if (isNaN(id))
      return res.status(400).json({ error: "ID tidak valid" });

    // 🔹 Cek apakah gedung ada
    const buildingCheck = await pool.query(
      "SELECT id FROM buildings WHERE id = $1",
      [id]
    );

    if (buildingCheck.rows.length === 0)
      return res.status(404).json({ error: "Gedung tidak ditemukan" });

    // 🔹 Cek apakah gedung sudah dipakai di absensi
    const absensiCheck = await pool.query(
      "SELECT id FROM absensi WHERE building_id = $1 LIMIT 1",
      [id]
    );

    if (absensiCheck.rows.length > 0) {
      return res.status(400).json({
        error: "Gedung tidak bisa dihapus karena sudah digunakan di absensi"
      });
    }

    // 🔹 Hapus gedung
    await pool.query("DELETE FROM buildings WHERE id = $1", [id]);

    res.json({ message: "Gedung berhasil dihapus" });

  } catch (err) {
    console.error("Error delete building:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= CREATE COMPANY =================
router.post(
  "/admin/company",
  verifyToken,
  isAdmin,
  upload.single("logo"),
  async (req, res) => {
    try {
      const { nama_perusahaan, alamat, telepon, email } = req.body;
      const logo = req.file ? req.file.filename : null;

      const result = await pool.query(
        `INSERT INTO company_settings
        (nama_perusahaan, logo, alamat, telepon, email)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *`,
        [nama_perusahaan, logo, alamat, telepon, email]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("CREATE COMPANY ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);
// ================= GET ALL COMPANY =================
router.get("/admin/company", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM company_settings WHERE deleted_at IS NULL ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
// ================= UPDATE COMPANY =================
router.put(
  "/admin/company/:id",
  verifyToken,
  isAdmin,
  upload.single("logo"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nama_perusahaan, alamat, telepon, email } = req.body;
      const logo = req.file ? req.file.filename : null;

      let query = `
        UPDATE company_settings
        SET nama_perusahaan=$1,
            alamat=$2,
            telepon=$3,
            email=$4,
            updated_at=NOW()
      `;

      const values = [nama_perusahaan, alamat, telepon, email];

      if (logo) {
        query += `, logo=$5 WHERE id=$6`;
        values.push(logo, id);
      } else {
        query += ` WHERE id=$5`;
        values.push(id);
      }

      await pool.query(query, values);

      res.json({ message: "Company updated" });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  }
);
// ================= DELETE COMPANY =================
router.delete("/admin/company/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "UPDATE company_settings SET deleted_at=NOW() WHERE id=$1",
      [id]
    );

    res.json({ message: "Company deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
// ================= SET ACTIVE COMPANY =================
router.put("/admin/company/:id/activate", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE company_settings SET is_active=false");
    await pool.query(
      "UPDATE company_settings SET is_active=true WHERE id=$1",
      [id]
    );

    res.json({ message: "Company activated" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/company", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM company_settings WHERE is_active=true LIMIT 1"
    );

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
// ================= REGISTER ROUTER =================
app.use("/api", router);

// ================= GLOBAL ERROR (PINDAH KE ATAS) =================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return res.status(400).json({ error: err.message });

  if (err)
    return res.status(400).json({ error: err.message });

  next();
});

// ================= SERVE FRONTEND =================
app.use(express.static(path.join(__dirname, "client/dist")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});
// ================= START =================
async function startServer() {
  try {
    await loadFaceModels();        // load model dulu
    await createAdminIfNotExists(); // buat admin kalau belum ada

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server jalan di port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Gagal start server:", err);
    process.exit(1);
  }
}

startServer();
