import { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";
import Swal from "sweetalert2";
import { showToast, showAlert } from "../utils/alert";

export default function Karyawan() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");
  const [projectId, setProjectId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);

  const tokenHeader = () => ({
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users", tokenHeader());
      setUsers(res.data);
    } catch {
      showAlert("error", "Gagal Load Users ❌", "Tidak dapat mengambil data karyawan.");
    }
  };

  const loadProjects = async () => {
    try {
      const res = await api.get("/admin/projects", tokenHeader());
      setProjects(res.data);
    } catch {
      showAlert("error", "Gagal Load Project ❌", "Tidak dapat mengambil data project.");
    }
  };

  const loadBuildings = async (projectId) => {
    if (!projectId) return setBuildings([]);
    try {
      const res = await api.get(`/admin/buildings/${projectId}`, tokenHeader());
      setBuildings(res.data);
    } catch {
      showAlert("error", "Gagal Load Gedung ❌", "Tidak dapat mengambil data gedung.");
    }
  };

  const tambahKaryawan = async () => {
    if (!nama || !email || !password)
      return showAlert("warning", "Data Belum Lengkap ⚠️", "Semua field wajib diisi.");

    if (!foto)
      return showAlert("warning", "Foto Wajib Upload ⚠️", "Silakan upload foto karyawan.");

    if (!projectId || !buildingId)
      return showAlert("warning", "Project & Gedung Belum Dipilih ⚠️", "Silakan pilih project dan gedung.");

    try {
      const formData = new FormData();
      formData.append("nama", nama);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", role);
      formData.append("project_id", projectId);
      formData.append("building_id", buildingId);
      formData.append("foto", foto);

      await api.post("/admin/create-user", formData, tokenHeader());

      showToast("success", "Karyawan berhasil ditambahkan 🎉");

      setNama("");
      setEmail("");
      setPassword("");
      setRole("worker");
      setProjectId("");
      setBuildingId("");
      setFoto(null);
      setPreview(null);

      loadUsers();
    } catch (err) {
      showAlert(
        "error",
        "Gagal Tambah Karyawan ❌",
        err.response?.data?.error || "Terjadi kesalahan saat menambah karyawan."
      );
    }
  };

  const hapusKaryawan = async (id) => {
    const result = await Swal.fire({
      title: "Yakin hapus karyawan?",
      text: "Data yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/admin/delete-user/${id}`, tokenHeader());
      showToast("success", "Karyawan berhasil dihapus 🗑️");
      loadUsers();
    } catch {
      showAlert("error", "Gagal Hapus ❌", "Terjadi kesalahan saat menghapus karyawan.");
    }
  };

  return (
    <Layout>
      <div style={{ padding: 20 }}>
        <h2>Manajemen Karyawan</h2>

        {/* FORM */}
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 15,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <input placeholder="Nama" value={nama} onChange={(e) => setNama(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setBuildingId("");
              loadBuildings(e.target.value);
            }}
          >
            <option value="">Pilih Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.nama_proyek}</option>
            ))}
          </select>

          <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            <option value="">Pilih Gedung</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.nama_gedung}</option>
            ))}
          </select>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              setFoto(file);
              setPreview(URL.createObjectURL(file));
            }}
          />

          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          )}

          <button
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              fontWeight: "bold",
            }}
            onClick={tambahKaryawan}
          >
            Tambah Karyawan
          </button>
        </div>

        {/* LIST */}
        <div style={{ marginTop: 30 }}>
          <h3>Daftar Karyawan</h3>

          {users.length === 0 && <p>Belum ada karyawan</p>}

          {users.map((u) => (
            <div
              key={u.id}
              style={{
                background: "#fff",
                padding: 15,
                borderRadius: 15,
                marginBottom: 15,
                boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                {u.foto && (
                  <img
                    src={`/uploads/${u.foto}`}
                    alt="foto"
                    width="60"
                    height="60"
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                )}

                <div style={{ flex: 1 }}>
                  <strong>{u.nama}</strong><br />
                  <small>{u.email}</small><br />
                  <span
                    style={{
                      background: u.role === "admin" ? "#22c55e" : "#3b82f6",
                      color: "#fff",
                      padding: "3px 8px",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  >
                    {u.role}
                  </span>
                </div>

                {u.role !== "admin" && (
                  <button
                    onClick={() => hapusKaryawan(u.id)}
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 8,
                    }}
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
