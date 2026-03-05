import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { showToast, showAlert } from "../utils/alert";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return showToast("warning", "Email dan password harus diisi");
    }

    try {
      setLoading(true);

      const res = await api.post("/login", { email, password });
      const { token, role } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      showToast("success", "Login berhasil");

      // Delay biar toast sempat tampil
      setTimeout(() => {
        if (role === "admin") {
          navigate("/admin");
        } else if (role === "worker") {
          navigate("/employee");
        } else {
          showAlert("error", "Role tidak dikenali", "");
        }
      }, 800);

    } catch (err) {
      console.log("LOGIN ERROR:", err.response?.data || err.message);

      showAlert(
        "error",
        "Login gagal",
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Email atau password salah"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#eef2f7 0%,#dfe6f0 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          padding: 30,
          borderRadius: 20,
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h2
          style={{
            marginBottom: 25,
            fontSize: 24,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Login Absensi
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: 10,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Loading..." : "Login"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  marginBottom: 16,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  fontSize: 14,
  outline: "none",
};
