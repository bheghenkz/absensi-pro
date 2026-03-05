import { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";
import { showToast, showAlert } from "../utils/alert";

export default function Gedung() {
  const [projects, setProjects] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  const [namaGedung, setNamaGedung] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("");

  const tokenHeader = () => ({
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await api.get("/admin/projects", tokenHeader());
      setProjects(res.data);
    } catch (err) {
      showAlert("error", "Gagal Load Project ❌", "Tidak dapat mengambil data project.");
    }
  };

  const loadBuildings = async (projectId) => {
    if (!projectId) return;
    try {
      const res = await api.get(
        `/admin/buildings/${projectId}`,
        tokenHeader()
      );
      setBuildings(res.data);
    } catch (err) {
      showAlert("error", "Gagal Load Gedung ❌", "Tidak dapat mengambil data gedung.");
    }
  };

  const ambilLokasi = () => {
    if (!navigator.geolocation) {
      return showAlert("error", "Browser Tidak Support ❌", "Browser tidak mendukung GPS.");
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        showToast("success", "Lokasi berhasil diambil 📍");
      },
      () => {
        showAlert("error", "Gagal Ambil Lokasi ❌", "Pastikan GPS aktif dan izin lokasi diberikan.");
      }
    );
  };

  const tambahGedung = async () => {
    if (!selectedProject)
      return showAlert("warning", "Project Belum Dipilih ⚠️", "Silakan pilih project terlebih dahulu.");

    if (!namaGedung || !latitude || !longitude || !radius)
      return showAlert("warning", "Data Belum Lengkap ⚠️", "Semua field harus diisi.");

    try {
      await api.post(
        "/admin/create-building",
        {
          project_id: selectedProject,
          nama_gedung: namaGedung,
          latitude,
          longitude,
          radius,
        },
        tokenHeader()
      );

      showToast("success", "Gedung berhasil ditambahkan 🎉");

      setNamaGedung("");
      setLatitude("");
      setLongitude("");
      setRadius("");

      loadBuildings(selectedProject);
    } catch (err) {
      showAlert("error", "Gagal Tambah Gedung ❌", "Terjadi kesalahan saat menambah gedung.");
    }
  };

  return (
    <Layout>
      <div style={{ padding: 20 }}>

        <div style={{
          background: "#fff",
          padding: 20,
          borderRadius: 16,
          boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
          marginBottom: 20
        }}>
          <h2 style={{ marginBottom: 20 }}>Manajemen Gedung</h2>

          <div style={{ marginBottom: 15 }}>
            <select
              value={selectedProject}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedProject(value);
                loadBuildings(value);
              }}
              style={inputStyle}
            >
              <option value="">Pilih Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_proyek}
                </option>
              ))}
            </select>
          </div>

          <input
            style={inputStyle}
            placeholder="Nama Gedung"
            value={namaGedung}
            onChange={(e) => setNamaGedung(e.target.value)}
          />

          <input
            style={inputStyle}
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />

          <input
            style={inputStyle}
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />

          <input
            style={inputStyle}
            placeholder="Radius (meter)"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              onClick={ambilLokasi}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                border: "none",
                background: "#e5e7eb",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Ambil Lokasi GPS
            </button>

            <button
              onClick={tambahGedung}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Tambah Gedung
            </button>
          </div>
        </div>

        <div style={{
          background: "#fff",
          padding: 20,
          borderRadius: 16,
          boxShadow: "0 8px 20px rgba(0,0,0,0.05)"
        }}>
          <h3 style={{ marginBottom: 15 }}>Daftar Gedung</h3>

          {buildings.length === 0 && (
            <p style={{ color: "#666" }}>Belum ada gedung</p>
          )}

          {buildings.map((b) => (
            <div
              key={b.id}
              style={{
                padding: 12,
                borderBottom: "1px solid #eee",
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {b.nama_gedung}
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>
                Radius: {b.radius} meter
              </div>
            </div>
          ))}
        </div>

      </div>
    </Layout>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #ddd",
  fontSize: 14,
  outline: "none"
};
