import api from "../api";
import { useState, useRef, useEffect } from "react";
import { showToast, showAlert, showConfirm } from "../utils/alert";
import * as faceapi from "face-api.js";
import { useNavigate } from "react-router-dom";

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [faceValid, setFaceValid] = useState(false);
  const endpointRef = useRef("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [countdown, setCountdown] = useState(0);
  // ================= TAMBAHAN =================
  const [faceCentered, setFaceCentered] = useState(false);
  const [brightnessOk, setBrightnessOk] = useState(true);
  const [gpsReady, setGpsReady] = useState(false);
  const [coords, setCoords] = useState(null);
  const [company, setCompany] = useState(null);
  const navigate = useNavigate();
  const handleLogout = async () => {
  const confirmed = await showConfirm(
    "Logout?",
    "Yakin ingin keluar dari akun ini?"
  );

  if (!confirmed) return;

  localStorage.removeItem("token");
  navigate("/");
};

  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [absenHariIni, setAbsenHariIni] = useState(null);
  const loadAbsenHariIni = async () => {
  try {
    const res = await api.get("/absen-hari-ini", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    setAbsenHariIni(res.data);
  } catch (err) {
    console.error(err);
  }
};
  
  useEffect(() => {
  const loadCompany = async () => {
    try {
      const res = await api.get("/company");
      setCompany(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  loadCompany();
}, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      const date = now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const time = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setCurrentDate(date);
      setCurrentTime(time);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      loadProfile();
      loadAbsenHariIni();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/employee/me", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });

      setUser(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const stableStartRef = useRef(null);
  const capturedRef = useRef(false);

  /* ================= GPS ================= */
useEffect(() => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      if (accuracy > 120) {
        showAlert(
          "warning",
          "GPS Belum Stabil 📍",
          "Sinyal GPS belum akurat. Silakan tunggu beberapa detik lalu reload halaman."
        );
        return;
      }

      setCoords({ latitude, longitude, accuracy });
      setGpsReady(true);
    },
    () =>
      showAlert(
        "error",
        "GPS Tidak Terdeteksi ❌",
        "Tidak dapat mengambil lokasi Anda. Pastikan GPS aktif dan izin lokasi diizinkan."
      ),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}, []);

  /* ================= LOAD MODEL ================= */
  useEffect(() => {
    const loadModel = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      setModelsLoaded(true);
    };
    loadModel();
    return () => stopCamera();
  }, []);

  /* ================= START CAMERA ================= */
  const startCamera = async (ep) => {
  try {

    if (!modelsLoaded) {
      return showToast("info", "Menyiapkan sistem pengenalan wajah...");
    }

    if (!gpsReady) {
      return showToast("info", "Menunggu GPS siap...");
    }

    endpointRef.current = ep;

    setShowCamera(true);

    capturedRef.current = false;
    stableStartRef.current = null;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;

    videoRef.current.onloadedmetadata = () => {
      videoRef.current.play();
      detectFace();
    };

  } catch (err) {

    console.error(err);

    showAlert(
      "error",
      "Kamera tidak bisa dibuka",
      "Pastikan izin kamera diaktifkan"
    );

    setShowCamera(false);

  }
};

  /* ================= FACE DETECTION ================= */
  const detectFace = async () => {

  if (capturedRef.current) return;

  try {

    if (!videoRef.current || videoRef.current.readyState !== 4) {
      animationRef.current = requestAnimationFrame(detectFace);
      return;
    }

    if (!overlayRef.current) {
      animationRef.current = requestAnimationFrame(detectFace);
      return;
    }

    const detection = await faceapi.detectSingleFace(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.5,
      })
    );

    const canvas = overlayRef.current;
    const ctx = canvas.getContext("2d");
    /* ================= BRIGHTNESS CHECK ================= */
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = videoRef.current.videoWidth;
    tempCanvas.height = videoRef.current.videoHeight;

    tempCtx.drawImage(videoRef.current, 0, 0);

    const frame = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );

    let total = 0;

    for (let i = 0; i < frame.data.length; i += 4) {
      total += frame.data[i];
    }

    const brightness = total / (frame.data.length / 4);

    setBrightnessOk(brightness > 60);
    const rect = videoRef.current.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection && detection.score > 0.7) {

      const { x, y, width, height } = detection.box;

      const scaleX = canvas.width / videoRef.current.videoWidth;
      const scaleY = canvas.height / videoRef.current.videoHeight;

      const centerX = (x + width / 2) * scaleX;
      const centerY = (y + height / 2) * scaleY;
      /* ================= FACE CENTER CHECK ================= */
      const frameCenterX = canvas.width / 2;
      const frameCenterY = canvas.height / 2;

      const offsetX = Math.abs(centerX - frameCenterX);
      const offsetY = Math.abs(centerY - frameCenterY);

      const centered = offsetX < 80 && offsetY < 100;

      setFaceCentered(centered);

      const faceWidth = width * scaleX;
      const faceHeight = height * scaleY;

      /* ================= FACE OVAL ================= */

      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        faceWidth * 0.55,
        faceHeight * 0.75,
        0,
        0,
        2 * Math.PI
      );

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#22c55e";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 15;
      ctx.stroke();

      /* ================= SCAN LINE ================= */

      const scanY =
        centerY -
        faceHeight * 0.6 +
        (Date.now() % 2000) / 2000 * (faceHeight * 1.2);

      ctx.beginPath();
      ctx.moveTo(centerX - faceWidth * 0.5, scanY);
      ctx.lineTo(centerX + faceWidth * 0.5, scanY);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#22c55e";
      ctx.stroke();

      ctx.shadowBlur = 0;

      setFaceValid(centered && brightnessOk);
      setConfidence(detection.score.toFixed(2));

      if (!stableStartRef.current) {
        stableStartRef.current = Date.now();
      }

      const elapsed = Date.now() - stableStartRef.current;
      const remaining = Math.max(0, 3 - elapsed / 1000);

      setCountdown(remaining.toFixed(1));

      if (elapsed > 3000 && centered && brightnessOk && !capturedRef.current) {

        capturedRef.current = true;

        cancelAnimationFrame(animationRef.current);

        captureAndSend();

        return;
      }

    } else {

      setFaceValid(false);
      stableStartRef.current = null;

    }

  } catch (err) {

    console.error("Face detection error:", err);

  }

  animationRef.current = requestAnimationFrame(detectFace);
};

/* ================= CAPTURE ================= */
const captureAndSend = async () => {

  if (loading) return;

  setLoading(true);

  try {

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );

    const formData = new FormData();

    formData.append("latitude", coords.latitude);
    formData.append("longitude", coords.longitude);
    formData.append("accuracy", coords.accuracy);
    formData.append("foto", blob);

    const res = await api.post(endpointRef.current, formData, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    if (res.data?.error) {
      throw new Error(res.data.error);
    }

    const message =
      res.data?.message ||
      (endpointRef.current === "/absen-masuk"
        ? "Absen masuk berhasil"
        : "Absen pulang berhasil");

    showToast("success", message);

    await loadAbsenHariIni();

    setTimeout(() => {
      window.location.reload();
    }, 1200);

  } catch (err) {

    console.error(err);

    const errorMessage =
      err.response?.data?.error ||
      err.message ||
      "Absensi gagal";

    showToast("error", errorMessage);

  } finally {

    stopCamera();

    setLoading(false);

  }
};
  /* ================= STOP CAMERA ================= */
  const stopCamera = () => {

  if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
  }

  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
  }

  stableStartRef.current = null;
  capturedRef.current = false;

  setShowCamera(false);
  setFaceValid(false);
};
  /* ================= UI ================= */

  return (
  <div style={containerStyle}>

    {/* HEADER COMPANY */}
    <div style={{ width: "360px", marginBottom: "15px" }}>
      <div
        style={{
          padding: "14px 18px",
          borderRadius: "25px",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          color: "white",
        }}
      >
        {/* LOGO */}
        <div
          style={{
            height: "48px",
            width: "48px",
            borderRadius: "14px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px",
          }}
        >
          {company?.logo && (
            <img
              src={`/uploads/${company.logo}`}
              alt="logo"
              style={{
                maxHeight: "100%",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          )}
        </div>

        {/* COMPANY TEXT */}
        <div>
          <div
            style={{
              fontWeight: "700",
              fontSize: "15px",
              letterSpacing: "0.5px",
            }}
          >
            {company?.nama_perusahaan}
          </div>

          <div
            style={{
              fontSize: "11px",
              opacity: 0.7,
              marginTop: "2px",
            }}
          >
            Absensi Online
          </div>
        </div>
      </div>
    </div>

    {/* LOGOUT BUTTON */}
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 999,
      }}
    >
      <button
        onClick={handleLogout}
        style={{
          padding: "8px 14px",
          borderRadius: "14px",
          border: "none",
          background: "#ef4444",
          color: "white",
          fontWeight: "600",
          fontSize: "12px",
          cursor: "pointer",
          boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
        }}
      >
        Logout
      </button>
    </div>

    {/* DATE TIME */}
    {!showCamera && (
      <div style={dateTimeWrapper}>
        <div style={dateText}>{currentDate}</div>
        <div style={timeText}>{currentTime} WIB</div>
      </div>
    )}

    {/* ================= DASHBOARD ================= */}

    {!showCamera ? (
      <div style={premiumCard}>

        {/* PROFILE */}
        {user ? (
          <div style={profileHeader}>
            <img
              src={
                user.foto
                  ? `/uploads/${user.foto}`
                  : `https://ui-avatars.com/api/?name=${user.nama}`
              }
              alt="avatar"
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid rgba(255,255,255,0.3)",
                boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
              }}
            />

            <div>
              <div style={nameText}>{user.nama}</div>
              <div style={projectText}>
                {user.nama_proyek || "Belum ada project"}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", opacity: 0.6 }}>
            Loading profile...
          </div>
        )}

        {/* GPS STATUS */}
        <div style={gpsBadge(gpsReady)}>
          {gpsReady ? "📍 Lokasi Siap" : "⏳ Mengambil Lokasi..."}
        </div>

        {/* BUTTON ABSEN */}
        <button
          style={premiumGreenBtn}
          onClick={() => startCamera("/absen-masuk")}
          disabled={!gpsReady}
        >
          Absen Masuk
        </button>

        <button
          style={premiumBlueBtn}
          onClick={() => startCamera("/absen-pulang")}
          disabled={!gpsReady}
        >
          Absen Pulang
        </button>

        <button
          style={premiumDarkBtn}
          onClick={() => navigate("/employee/riwayat")}
        >
          Riwayat Absensi
        </button>

      </div>
    ) : (

      /* ================= CAMERA ================= */

      <div style={premiumCard}>

        <h3 style={{ marginBottom: 15 }}>Face Scan</h3>

        <div
          style={{
            position: "relative",
            width: "100%",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              display: "block",
              borderRadius: "18px",
              border: faceValid
                ? "4px solid #22c55e"
                : "4px solid #ef4444",
            }}
          />

          <canvas
            ref={overlayRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* STATUS FACE */}
        <div style={{ marginTop: 15 }}>
          {!brightnessOk && "💡 Ruangan terlalu gelap"}
          {brightnessOk && !faceCentered && "🎯 Posisikan wajah di tengah"}
          {faceValid && `✅ Wajah terdeteksi (${confidence})`}
        </div>

        {/* COUNTDOWN */}
        {faceValid && !capturedRef.current && (
          <h1 style={{ fontSize: 45, color: "#22c55e" }}>
            {countdown}
          </h1>
        )}

        {/* LOADING */}
        {loading && <p>⏳ Memproses absensi...</p>}

        {/* CANCEL */}
        <button
          style={premiumRedBtn}
          onClick={stopCamera}
        >
          Batal
        </button>

        <canvas ref={canvasRef} style={{ display: "none" }} />

      </div>

    )}

  </div>
);
}
/* ================= PREMIUM STYLE ================= */

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "center",
  paddingTop: "60px",
  background: "linear-gradient(160deg,#0f172a,#1e293b,#0f172a)",
  fontFamily: "Inter, sans-serif",
  paddingLeft: "20px",
  paddingRight: "20px",
};

const premiumCard = {
  width: "360px",
  padding: "30px",
  borderRadius: "25px",
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const profileHeader = {
  display: "flex",
  alignItems: "center",
  gap: "15px",
};

const avatarPremium = {
  width: "55px",
  height: "55px",
  borderRadius: "50%",
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  fontWeight: "bold",
  boxShadow: "0 10px 25px rgba(34,197,94,0.5)",
};

const nameText = {
  fontSize: "18px",
  fontWeight: "600",
};

const projectText = {
  fontSize: "13px",
  opacity: 0.7,
};

const gpsBadge = (ready) => ({
  padding: "8px 14px",
  borderRadius: "20px",
  fontSize: "13px",
  textAlign: "center",
  background: ready
    ? "rgba(34,197,94,0.15)"
    : "rgba(255,255,255,0.1)",
  color: ready ? "#22c55e" : "#cbd5e1",
});

const premiumButtonBase = {
  padding: "14px",
  borderRadius: "14px",
  border: "none",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};

const premiumGreenBtn = {
  ...premiumButtonBase,
  background: "linear-gradient(90deg,#22c55e,#16a34a)",
  color: "white",
};

const premiumBlueBtn = {
  ...premiumButtonBase,
  background: "linear-gradient(90deg,#3b82f6,#2563eb)",
  color: "white",
};

const premiumDarkBtn = {
  ...premiumButtonBase,
  background: "rgba(255,255,255,0.08)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.1)",
};

const premiumRedBtn = {
  ...premiumButtonBase,
  background: "#ef4444",
  color: "white",
};

const dateTimeWrapper = {
  textAlign: "center",
  marginBottom: "35px",
  color: "white",
};

const dateText = {
  fontSize: "13px",
  opacity: 0.6,
  marginBottom: "4px",
  letterSpacing: "0.3px",
};

const timeText = {
  fontSize: "24px",
  fontWeight: "600",
  letterSpacing: "1px",
  textShadow: "0 0 8px rgba(255,255,255,0.15)",
};
