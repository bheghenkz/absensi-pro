import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Folder, Building2, Users, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { showToast } from "../utils/alert";
import api from "../api";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);

  const [isMobile, setIsMobile] = useState(
    window.matchMedia("(max-width: 1024px)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const listener = () => setIsMobile(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // 🔥 LOAD ACTIVE COMPANY
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

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Yakin ingin logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Logout",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem("token");
    localStorage.removeItem("role");

    showToast("success", "Berhasil logout");

    setTimeout(() => {
      navigate("/");
    }, 700);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#eef2f7 0%,#dfe6f0 100%)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          minHeight: "100vh",
          position: "relative",
        }}
      >
        {/* LOGOUT BUTTON */}
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 1000,
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "14px",
              border: "none",
              background: "#ef4444",
              color: "#fff",
              fontWeight: 600,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* 🔥 COMPANY HEADER */}
        <div
          style={{
            paddingTop: "20px",
            paddingBottom: "10px",
            paddingLeft: "16px",
            paddingRight: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "14px 16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {company?.logo && (
              <img
                src={`/uploads/${company.logo}`}
                alt="logo"
                style={{
                  height: "42px",
                  width: "42px",
                  objectFit: "contain",
                  borderRadius: "10px",
                }}
              />
            )}

            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>
                {company?.nama_perusahaan || "Sistem Absensi"}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                {company?.email || "Enterprise Attendance System"}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div
          style={{
            padding: "10px 16px 120px",
          }}
        >
          {children}
        </div>

        {/* FLOATING NAV */}
        {isMobile && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "92%",
              maxWidth: "460px",
              background: "#ffffff",
              borderRadius: "28px",
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              padding: "14px 0",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <NavItem
              to="/admin"
              icon={<Home size={20} />}
              label="Dashboard"
              active={isActive("/admin")}
            />
            <NavItem
              to="/admin/project"
              icon={<Folder size={20} />}
              label="Project"
              active={location.pathname.includes("project")}
            />
            <NavItem
              to="/admin/gedung"
              icon={<Building2 size={20} />}
              label="Gedung"
              active={location.pathname.includes("gedung")}
            />
            <NavItem
              to="/admin/karyawan"
              icon={<Users size={20} />}
              label="Karyawan"
              active={location.pathname.includes("karyawan")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textDecoration: "none",
        fontSize: "12px",
        fontWeight: 600,
        color: active ? "#2563eb" : "#6b7280",
      }}
    >
      <div
        style={{
          marginBottom: "6px",
          background: active ? "#e0edff" : "transparent",
          padding: "8px",
          borderRadius: "16px",
          transition: "all 0.2s ease",
        }}
      >
        {icon}
      </div>
      {label}
    </Link>
  );
}
