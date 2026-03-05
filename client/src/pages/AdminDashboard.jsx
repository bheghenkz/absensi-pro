import { useEffect, useState } from "react";
import api from "../api";
import { showToast, showAlert, showConfirm } from "../utils/alert";
import Layout from "../components/Layout";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [absen, setAbsen] = useState([]);
  const [projects, setProjects] = useState([]);
  // ================= COMPANY =================
  const [companies, setCompanies] = useState([]);
  const [namaPerusahaan, setNamaPerusahaan] = useState("");
  const [alamatPerusahaan, setAlamatPerusahaan] = useState("");
  const [teleponPerusahaan, setTeleponPerusahaan] = useState("");
  const [emailPerusahaan, setEmailPerusahaan] = useState("");
  const [logoPerusahaan, setLogoPerusahaan] = useState(null);
  const [activeCompany, setActiveCompany] = useState(null);
  // ================= PROJECT & BUILDING STATE =================
  const [namaProject, setNamaProject] = useState("");

  const [buildingId, setBuildingId] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [selectedProjectBuilding, setSelectedProjectBuilding] = useState("");
  const [namaGedung, setNamaGedung] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("");

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");
  const [projectId, setProjectId] = useState("");
  const [foto, setFoto] = useState(null); // ✅ TAMBAH FOTO

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const loadCompanies = async () => {
      try {
        const res = await api.get("/admin/company", tokenHeader());
        setCompanies(res.data);
      } catch (err) {
        console.error(err);
      }
    };

  const tambahCompany = async () => {
     try {
        const formData = new FormData();
        formData.append("nama_perusahaan", namaPerusahaan);
        formData.append("alamat", alamatPerusahaan);
        formData.append("telepon", teleponPerusahaan);
        formData.append("email", emailPerusahaan);
        if (logoPerusahaan) {
          formData.append("logo", logoPerusahaan);
        }
        await api.post("/admin/company", formData, tokenHeader());
        showToast("success", "Perusahaan berhasil ditambahkan");
        setNamaPerusahaan("");
        setAlamatPerusahaan("");
        setTeleponPerusahaan("");
        setEmailPerusahaan("");
        setLogoPerusahaan(null);
        loadCompanies();
      } catch (err) {
        showAlert("error", "Gagal tambah perusahaan", "Terjadi kesalahan");
      }
    };

  const activateCompany = async (id) => {
    await api.put(`/admin/company/${id}/activate`, {}, tokenHeader());
    showToast("success", "Perusahaan diaktifkan");
    loadCompanies();
    loadActiveCompany(); // 🔥 TAMBAH INI
  };

  const deleteCompany = async (id) => {
    await api.delete(`/admin/company/${id}`, tokenHeader());
    showToast("success", "Perusahaan dihapus");
    loadCompanies();
  };
  
  const loadActiveCompany = async () => {
    try {
      const res = await api.get("/company");
      setActiveCompany(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadAbsensi();
    loadProjects();
    loadCompanies();   // 🔥 TAMBAH INI
    loadActiveCompany(); // 🔥 TAMBAH INI
  }, []);

  const tokenHeader = () => ({
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });

  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users", tokenHeader());
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await api.get("/admin/projects", tokenHeader());
      console.log("DATA PROJECT:", res.data); // 🔥 TAMBAH INI
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAbsensi = async () => {
    try {
      let url = "/admin/absensi?";
      if (startDate) url += `start=${startDate}&`;
      if (endDate) url += `end=${endDate}&`;
      if (filterProject) url += `project_id=${filterProject}`;

      const res = await api.get(url, tokenHeader());
      setAbsen(res.data);
    } catch (err) {
      console.error(err);
    }
  };


// ================= PROJECT =================
const tambahProject = async () => {

  if (!namaProject) {
    return showAlert(
  "warning",
  "Nama Project Kosong",
  "Nama project wajib diisi."
);
  }

  try {
    await api.post(
      "/admin/create-project",
      { nama_proyek: namaProject },
      tokenHeader()
    );

    showToast("success", "Project berhasil ditambahkan");

    setNamaProject("");

    await loadProjects();   // 🔥 WAJIB

  } catch (err) {
    showAlert(
  "error",
  "Gagal Tambah Project ❌",
  err.response?.data?.error || "Terjadi kesalahan saat menambahkan project."
);
  }
};

const hapusProject = async (id) => {
  const result = await showConfirm(
    "Yakin hapus project ini?",
    "Data tidak bisa dikembalikan!"
  );

  if (!result.isConfirmed) return;

  try {
    await api.delete(`/admin/delete-project/${id}`, tokenHeader());
    showToast("success", "Project berhasil dihapus");
    loadProjects();
  } catch (err) {
    showAlert(
  "error",
  "Gagal Hapus Project ❌",
  err.response?.data?.error || "Terjadi kesalahan saat menghapus project."
);
  }
};

// ================= BUILDING =================
const loadBuildings = async (projectId) => {
  if (!projectId) {
    setBuildings([]);
    return;
  }

  try {
    const res = await api.get(
      `/admin/buildings/${projectId}`,
      tokenHeader()
    );
    setBuildings(res.data);
  } catch (err) {
    console.error(err);
  }
};

const tambahBuilding = async () => {
  if (!selectedProjectBuilding) {
    return showAlert(
  "warning",
  "Project Belum Dipilih",
  "Silakan pilih project terlebih dahulu."
);
  }

  if (!namaGedung || !latitude || !longitude || !radius) {
    return showAlert(
  "warning",
  "Data Gedung Belum Lengkap",
  "Semua field gedung wajib diisi."
);
  }

  try {
    await api.post(
      "/admin/create-building",
      {
        project_id: selectedProjectBuilding,
        nama_gedung: namaGedung,
        latitude,
        longitude,
        radius,
      },
      tokenHeader()
    );

    showToast("success", "Gedung berhasil ditambahkan");

    setNamaGedung("");
    setLatitude("");
    setLongitude("");
    setRadius("");

    loadBuildings(selectedProjectBuilding);
  } catch (err) {
    showAlert(
  "error",
  "Gagal Tambah Gedung ❌",
  err.response?.data?.error || "Terjadi kesalahan saat menambahkan gedung."
);
  }
};

// ================= GPS AUTO LOCATION =================
const ambilLokasiSekarang = () => {
  if (!navigator.geolocation) {
    return showAlert(
    "error",
    "Browser Tidak Mendukung GPS",
    "Perangkat ini tidak mendukung fitur lokasi."
    );
  }  
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log("Coords:", position.coords);

      setLatitude(position.coords.latitude.toString());
      setLongitude(position.coords.longitude.toString());

      showToast("success", "Lokasi berhasil diambil 📍");
    },
    (error) => {
      console.log("Error:", error);
      showAlert(
  "error",
  "Gagal Ambil Lokasi ❌",
  "Pastikan GPS aktif dan izin lokasi sudah diizinkan di browser."
);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0   //  ini penting supaya tidak pakai cache
    }
  );
};

const hapusBuilding = async (id) => {
  const result = await showConfirm(
    "Yakin hapus gedung ini?",
    "Data gedung akan dihapus permanen!"
  );

  if (!result.isConfirmed) return;

  try {
    await api.delete(`/admin/delete-building/${id}`, tokenHeader());
    showToast("success", "Gedung berhasil dihapus");
    loadBuildings(selectedProjectBuilding);
  } catch (err) {
    showAlert(
  "error",
  "Gagal Hapus Gedung ❌",
  err.response?.data?.error || "Terjadi kesalahan saat menghapus gedung."
);
  }
};
  // ✅ UPDATE TAMBAH KARYAWAN PAKAI FORM DATA
  // ✅ UPDATE TAMBAH KARYAWAN PAKAI FORM DATA (FIXED)
const tambahKaryawan = async () => {
  try {
    if (!foto) {
      return showAlert(
  "warning",
  "Foto Wajib Diunggah",
  "Silakan upload foto terlebih dahulu sebelum menyimpan data."
);
    }

    if (!projectId || !buildingId) {
      return showAlert(
  "warning",
  "Project & Gedung Belum Dipilih",
  "Silakan pilih project dan gedung terlebih dahulu."
);
    }

    const formData = new FormData();
    formData.append("nama", nama);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);
    formData.append("project_id", projectId);
    formData.append("building_id", buildingId); // 🔥 WAJIB
    formData.append("foto", foto);

    await api.post("/admin/create-user", formData, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    showToast("success", "Karyawan berhasil ditambahkan");

    setNama("");
    setEmail("");
    setPassword("");
    setRole("worker");
    setProjectId("");
    setBuildingId("");
    setFoto(null);

    loadUsers();

  } catch (err) {
    console.error("Tambah karyawan error:", err.response?.data);
    showAlert(
  "error",
  "Gagal Tambah Karyawan ❌",
  err.response?.data?.error || "Terjadi kesalahan saat menambahkan karyawan."
);
  }
};

  const hapusKaryawan = async (id) => {
    const result = await showConfirm(
      "Yakin hapus karyawan ini?",
      "Data karyawan akan dihapus permanen!"
    );

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/admin/delete-user/${id}`, tokenHeader());
      showToast("success", "Karyawan berhasil dihapus");
      loadUsers();
    } catch {
      showAlert(
  "error",
  "Gagal Hapus Karyawan ❌",
  "Terjadi kesalahan saat menghapus karyawan."
);
    }
  };
//EXCELL

  const exportExcel = () => {
  if (absen.length === 0) {
    return showAlert(
      "info",
      "Tidak Ada Data",
      "Tidak ada data yang bisa diexport saat ini."
    );
  }

  const workbook = XLSX.utils.book_new();

  const uniqueDates = [
    ...new Set(absen.map((a) => a.tanggal?.split("T")[0])),
  ].sort((a, b) => new Date(a) - new Date(b));

  const days = uniqueDates.map((d) => new Date(d));

  const formatTanggal = (date) =>
    date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const periodeText = `${formatTanggal(days[0])} – ${formatTanggal(
    days[days.length - 1]
  )}`;

  const sheetData = [];

  // ================= HEADER =================
  sheetData.push([activeCompany?.nama_perusahaan || "NAMA PERUSAHAAN"]);
  sheetData.push(["ABSENSI KARYAWAN"]);
  sheetData.push([
    "Project :",
    filterProject
      ? projects.find((p) => p.id == filterProject)?.nama_proyek
      : "Semua Project",
  ]);
  sheetData.push(["Periode :", periodeText]);
  sheetData.push([]);

  // ================= HEADER TABEL =================
  const hariRow = ["NO", "NAMA"];
  days.forEach((d) => {
    hariRow.push(
      d.toLocaleDateString("id-ID", { weekday: "long" }).toUpperCase(),
      ""
    );
  });
  hariRow.push("TOTAL JAM");
  sheetData.push(hariRow);

  const tanggalRow = ["", ""];
  days.forEach((d) => {
    tanggalRow.push(formatTanggal(d), "");
  });
  tanggalRow.push("");
  sheetData.push(tanggalRow);

  const inOutRow = ["", ""];
  days.forEach(() => {
    inOutRow.push("IN", "OUT");
  });
  inOutRow.push("");
  sheetData.push(inOutRow);

  // ================= GROUP DATA =================
  const grouped = {};
  absen.forEach((a) => {
    if (!grouped[a.nama]) grouped[a.nama] = {};
    const cleanDate = a.tanggal?.split("T")[0];
    grouped[a.nama][cleanDate] = a;
  });

  let no = 1;

  Object.keys(grouped).forEach((nama) => {
    const row = [no++, nama];
    let totalJam = 0;

    days.forEach((d) => {
      const tgl = d.toISOString().split("T")[0];
      const data = grouped[nama][tgl];

      if (data?.total_jam) totalJam += Number(data.total_jam);

      row.push(
        data?.jam_masuk
          ? new Date(data.jam_masuk).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "OFF",
        data?.jam_pulang
          ? new Date(data.jam_pulang).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "OFF"
      );
    });

    row.push(totalJam.toFixed(2));
    sheetData.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // ================= LEBAR KOLOM =================
  worksheet["!cols"] = Array(sheetData[5].length).fill({ wch: 18 });

  worksheet["!rows"] = [
    { hpt: 50 },
    { hpt: 35 },
    { hpt: 22 },
    { hpt: 22 },
    { hpt: 15 },
    { hpt: 25 },
    { hpt: 25 },
    { hpt: 22 },
  ];

  worksheet["!freeze"] = { xSplit: 2, ySplit: 8 };

  // ================= MERGE =================
  const merges = [];

  // Judul full lebar
  merges.push(
    { s: { r: 0, c: 0 }, e: { r: 0, c: sheetData[5].length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: sheetData[5].length - 1 } }
  );

  // Project & Periode (tidak full lebar biar rapat)
  merges.push(
    { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } }
  );

  // Merge hari & tanggal
  days.forEach((_, index) => {
    const startCol = 2 + index * 2;
    merges.push(
      { s: { r: 5, c: startCol }, e: { r: 5, c: startCol + 1 } },
      { s: { r: 6, c: startCol }, e: { r: 6, c: startCol + 1 } }
    );
  });

  worksheet["!merges"] = merges;

  const range = XLSX.utils.decode_range(worksheet["!ref"]);

  const border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[addr]) continue;

      let style = {
        alignment: { horizontal: "center", vertical: "center" },
        border,
      };

      // HEADER TABEL
      if (R >= 5 && R <= 7) {
        style.fill = { fgColor: { rgb: "E7E6E6" } };
        style.font = { bold: true };
      }

      // DATA
      if (R >= 8) {
        const colIndex = C - 2;

        if (colIndex >= 0 && colIndex < days.length * 2) {
          const dayIndex = Math.floor(colIndex / 2);
          const dayNumber = days[dayIndex]?.getDay();

          if (colIndex % 2 === 0)
            style.fill = { fgColor: { rgb: "C6EFCE" } };

          if (colIndex % 2 === 1)
            style.fill = { fgColor: { rgb: "FFF2CC" } };

          if (dayNumber === 6)
            style.fill = { fgColor: { rgb: "FCE4D6" } };

          if (dayNumber === 0)
            style.fill = { fgColor: { rgb: "F8CBAD" } };
        }

        if (C === sheetData[5].length - 1) {
          style.fill = { fgColor: { rgb: "D9E1F2" } };
          style.font = { bold: true };
        }
      }

      // OFF
      if (worksheet[addr].v === "OFF") {
        style.fill = { fgColor: { rgb: "D9D9D9" } };
        style.font = { italic: true };
      }

      // Project & Periode rata kiri
      if (R === 2 || R === 3) {
        style.alignment = { horizontal: "left", vertical: "center" };
      }

      worksheet[addr].s = style;
    }
  }

  worksheet["A1"].s = {
    font: { bold: true, sz: 20 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  };

  worksheet["A2"].s = {
    font: { bold: true, sz: 16 },
    alignment: { horizontal: "center", vertical: "center" },
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, "ABSENSI");

  // ================= REKAP =================
  const rekapData = [["NAMA", "TOTAL JAM"]];
  Object.keys(grouped).forEach((nama) => {
    let totalJam = 0;
    days.forEach((d) => {
      const tgl = d.toISOString().split("T")[0];
      const data = grouped[nama][tgl];
      if (data?.total_jam) totalJam += Number(data.total_jam);
    });
    rekapData.push([nama, totalJam.toFixed(2)]);
  });

  const rekapSheet = XLSX.utils.aoa_to_sheet(rekapData);
  XLSX.utils.book_append_sheet(workbook, rekapSheet, "REKAP HADIR");

  XLSX.writeFile(workbook, `ABSENSI-${periodeText}.xlsx`);
};
//BATAS
  const totalKaryawan = users.length;
  const totalAdmin = users.filter((u) => u.role === "admin").length;
  const totalWorker = users.filter((u) => u.role === "worker").length;

  const today = new Date().toISOString().split("T")[0];
  const totalHariIni = absen.filter(
  (a) => a.tanggal?.split("T")[0] === today
).length;
  // ================= DATA GRAFIK =================
  const absenHariIni = absen.filter(a =>
     a.tanggal?.split("T")[0] === today
   );

  const statusCount = {
     Normal: absenHariIni.filter(a => a.status === "Normal").length,
     Lembur: absenHariIni.filter(a => a.status === "Lembur").length,
     "Setengah Hari": absenHariIni.filter(a => a.status === "Setengah Hari").length,
   };

  const chartData = {
    labels: ["Normal", "Lembur", "Setengah Hari"],
    datasets: [
      {
      label: "Jumlah Kehadiran",
      data: [
        statusCount.Normal,
        statusCount.Lembur,
        statusCount["Setengah Hari"]
      ],
      backgroundColor: [
        "#16a34a",
        "#9333ea",
        "#f59e0b"
      ],
      borderRadius: 6,
      },
    ],
  };

  return (
    <Layout>
      <div style={wrapperStyle}>
        <h1 style={{ marginBottom: "30px" }}>Dashboard Admin</h1>

        {/* MINI STAT */}
        <div style={statsGrid}>
          <StatCard title="Total Karyawan" value={totalKaryawan} />
          <StatCard title="Total Admin" value={totalAdmin} />
          <StatCard title="Total Worker" value={totalWorker} />
          <StatCard title="Absen Hari Ini" value={totalHariIni} />
        </div>
        {/* GRAFIK KEHADIRAN */}
<div style={cardStyle}>
  <h3>Grafik Kehadiran</h3>
  <div style={{ height: "300px" }}>
    <Bar
  data={chartData}
  options={{
    responsive: true,
    maintainAspectRatio: false, // 🔥 WAJIB TAMBAH INI
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  }}
/>
  </div>
</div>
        
         {/* ================= COMPANY SETTINGS ================= */}
<div style={cardStyle}>
  <h3>Company Settings</h3>

  <div style={columnStyle}>
    <input
      style={inputStyle}
      placeholder="Nama Perusahaan"
      value={namaPerusahaan}
      onChange={(e) => setNamaPerusahaan(e.target.value)}
    />
    <input
      style={inputStyle}
      placeholder="Alamat"
      value={alamatPerusahaan}
      onChange={(e) => setAlamatPerusahaan(e.target.value)}
    />
    <input
      style={inputStyle}
      placeholder="Telepon"
      value={teleponPerusahaan}
      onChange={(e) => setTeleponPerusahaan(e.target.value)}
    />
    <input
      style={inputStyle}
      placeholder="Email"
      value={emailPerusahaan}
      onChange={(e) => setEmailPerusahaan(e.target.value)}
    />
    <input
      type="file"
      style={inputStyle}
      onChange={(e) => setLogoPerusahaan(e.target.files[0])}
    />

    <button style={primaryButton} onClick={tambahCompany}>
      Tambah Perusahaan
    </button>
  </div>

  <div style={{ marginTop: "20px" }}>
    {companies.map((c) => (
      <div key={c.id} style={userCard}>
        <div>
          <strong>{c.nama_perusahaan}</strong><br />
          <small>{c.email}</small><br />
          <small>
            {c.is_active ? "🟢 Active" : "⚪ Inactive"}
          </small>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={successButton}
            onClick={() => activateCompany(c.id)}
          >
            Activate
          </button>

          <button
            style={dangerButton}
            onClick={() => deleteCompany(c.id)}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
</div>

        {/* SISA KODE KAMU (FILTER + TABEL ABSENSI) TIDAK DIUBAH */}
        {/* FILTER ABSENSI */}
        <div style={cardStyle}>
          <h3>Filter Absensi</h3>
          <div style={columnStyle}>
            <input style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input style={inputStyle} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

            <select style={inputStyle} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="">Semua Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_proyek}
                </option>
              ))}
            </select>

            <div style={buttonRow}>
              <button style={primaryButton} onClick={loadAbsensi}>Filter</button>
              <button style={successButton} onClick={exportExcel}>Export Excel</button>
            </div>
          </div>
        </div>

        {/* DATA ABSENSI */}
        <div style={cardStyle}>
          <h3>Data Absensi</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Nama</th>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Tanggal</th>
                  <th style={thStyle}>Jam Masuk</th>
                  <th style={thStyle}>Jam Pulang</th>
                  <th style={thStyle}>Total Jam</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
  {absen.map((a, index) => (
    <tr key={index}>
      <td style={tdStyle}>{a.nama}</td>

      <td style={tdStyle}>
        {a.nama_proyek || "-"}
      </td>

      <td style={tdStyle}>
        {a.tanggal || "-"}
      </td>

      {/* Jam Masuk */}
      <td style={tdStyle}>
        {a.jam_masuk
          ? new Date(a.jam_masuk).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-"}
      </td>

      {/* Jam Pulang */}
      <td style={tdStyle}>
        {a.jam_pulang
          ? new Date(a.jam_pulang).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-"}
      </td>

      {/* Total Jam */}
      <td style={tdStyle}>
        {a.total_jam ? a.total_jam.toFixed(2) + " jam" : "-"}
      </td>

      {/* Status */}
      <td
        style={{
          ...tdStyle,
          fontWeight: "bold",
          color:
            a.status === "Lembur"
              ? "#16a34a"
              : a.status === "Setengah Hari"
              ? "#f59e0b"
              : "#374151",
        }}
      >
        {a.status || "-"}
      </td>
    </tr>
  ))}
</tbody>
            </table>

            {absen.length === 0 && (
              <p style={{ textAlign: "center", marginTop: "15px", opacity: 0.6 }}>
                Belum ada data absensi
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: "13px", opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: "22px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}


/* ===========================
   CLEAN MOBILE APP UI
   =========================== */

const wrapperStyle = {
  width: "100%",
  maxWidth: "1000px",
  margin: "0 auto",
  padding: "20px 20px 90px",
  minHeight: "100vh",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
  marginBottom: "25px",
};

const statCard = {
  padding: "18px",
  borderRadius: "18px",
  background: "#ffffff",
  boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  textAlign: "left",
};

const cardStyle = {
  marginBottom: "20px",
  padding: "20px",
  borderRadius: "20px",
  background: "#ffffff",
  boxShadow: "0 6px 25px rgba(0,0,0,0.05)",
};

const columnStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const inputStyle = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  fontSize: "14px",
  backgroundColor: "#f9fafb",
  outline: "none",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const primaryButton = {
  padding: "14px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "600",
  flex: 1,
};

const successButton = {
  padding: "14px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "600",
  flex: 1,
};

const dangerButton = {
  padding: "10px 16px",
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "600",
};

const userCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "15px",
  padding: "16px",
  background: "#f9fafb",
  borderRadius: "16px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
  fontSize: "13px",
  background: "#ffffff",
};

const thStyle = {
  textAlign: "left",
  padding: "12px",
  backgroundColor: "#f3f4f6",
  fontWeight: "600",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
};

const rowStyle = {};
