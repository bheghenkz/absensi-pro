import { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";
import Swal from "sweetalert2";
import { showToast, showAlert } from "../utils/alert";

export default function Project() {
  const [projects, setProjects] = useState([]);
  const [namaProject, setNamaProject] = useState("");
  const [loading, setLoading] = useState(false);

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

  const tambahProject = async () => {
    if (!namaProject)
      return showAlert("warning", "Nama Project Kosong ⚠️", "Nama project wajib diisi.");

    try {
      setLoading(true);

      await api.post(
        "/admin/create-project",
        { nama_proyek: namaProject },
        tokenHeader()
      );

      showToast("success", "Project berhasil ditambahkan 🎉");

      setNamaProject("");
      loadProjects();
    } catch (err) {
      showAlert(
        "error",
        "Gagal Tambah Project ❌",
        err.response?.data?.error || "Terjadi kesalahan saat menambah project."
      );
    } finally {
      setLoading(false);
    }
  };

  const hapusProject = async (id) => {
    const result = await Swal.fire({
      title: "Yakin hapus project?",
      text: "Semua data terkait project ini bisa terpengaruh.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/admin/delete-project/${id}`, tokenHeader());
      showToast("success", "Project berhasil dihapus 🗑️");
      loadProjects();
    } catch (err) {
      showAlert(
        "error",
        "Gagal Hapus Project ❌",
        err.response?.data?.error || "Terjadi kesalahan saat menghapus project."
      );
    }
  };

  return (
    <Layout>
      <div style={wrapper}>
        <h2 style={title}>Manajemen Project</h2>

        {/* FORM CARD */}
        <div style={card}>
          <input
            style={input}
            placeholder="Masukkan nama project"
            value={namaProject}
            onChange={(e) => setNamaProject(e.target.value)}
          />

          <button
            style={{
              ...primaryButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onClick={tambahProject}
            disabled={loading}
          >
            {loading ? "Menambahkan..." : "+ Tambah Project"}
          </button>
        </div>

        {/* LIST PROJECT */}
        <div style={{ marginTop: 25 }}>
          {projects.length === 0 && (
            <div style={emptyState}>Belum ada project</div>
          )}

          {projects.map((p) => (
            <div key={p.id} style={projectCard}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {p.nama_proyek}
                </div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  ID: {p.id}
                </div>
              </div>

              <button
                style={dangerButton}
                onClick={() => hapusProject(p.id)}
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

/* ======================
   MODERN MOBILE STYLE
   ====================== */

const wrapper = {
  maxWidth: "650px",
  margin: "0 auto",
  padding: "20px 20px 90px",
};

const title = {
  marginBottom: "20px",
};

const card = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const input = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontSize: "14px",
  outline: "none",
};

const primaryButton = {
  padding: "14px",
  background: "linear-gradient(90deg,#2563eb,#1d4ed8)",
  color: "white",
  border: "none",
  borderRadius: "14px",
  fontWeight: "600",
};

const projectCard = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "18px",
  marginBottom: "15px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
};

const dangerButton = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};

const emptyState = {
  textAlign: "center",
  padding: "30px",
  background: "#ffffff",
  borderRadius: "18px",
  opacity: 0.6,
};
