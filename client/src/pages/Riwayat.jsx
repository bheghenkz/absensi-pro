import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Riwayat() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Token tidak ditemukan, silakan login ulang");
        setLoading(false);
        return;
      }

      const res = await api.get("/absensi-saya", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      if (res.data.success && Array.isArray(res.data.data)) {
        setData(res.data.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Error riwayat:", err);
      alert("Gagal ambil riwayat");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTanggal = (tanggal) => {
    if (!tanggal) return "-";

    const date = new Date(tanggal);

    const hari = date.toLocaleDateString("id-ID", {
      weekday: "long",
      timeZone: "Asia/Jakarta",
    });

    const tgl = date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    return `${hari}, ${tgl}`;
  };

  const formatJam = (jam) => {
    if (!jam) return "-";

    return (
      new Date(jam).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB"
    );
  };

  return (
    <div style={{ padding: 20 }}>
      
      {/* 🔥 HEADER + TOMBOL */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 20 
      }}>
        <h2>Riwayat Absensi</h2>

        <button
          onClick={() => navigate("/employee")}
          style={{
            padding: "8px 14px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          ⬅ Kembali
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="8"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#fff",
            }}
          >
            <thead style={{ background: "#f0f0f0" }}>
              <tr>
                <th>Tanggal</th>
                <th>Jam Masuk</th>
                <th>Jam Pulang</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, i) => (
                  <tr key={i}>
                    <td>{formatTanggal(item.tanggal)}</td>
                    <td>{formatJam(item.jam_masuk)}</td>
                    <td>{formatJam(item.jam_pulang)}</td>
                    <td>{item.status || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
