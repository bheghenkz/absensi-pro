import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Project from "./pages/Project";
import Gedung from "./pages/Gedung";
import Karyawan from "./pages/Karyawan";
import Riwayat from "./pages/Riwayat";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/project"
        element={
          <ProtectedRoute allowedRole="admin">
            <Project />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/gedung"
        element={
          <ProtectedRoute allowedRole="admin">
            <Gedung />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/karyawan"
        element={
          <ProtectedRoute allowedRole="admin">
            <Karyawan />
          </ProtectedRoute>
        }
      />

      {/* WORKER */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRole="worker">
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/riwayat"
        element={
          <ProtectedRoute allowedRole="worker">
            <Riwayat />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
