// src/App.jsx
// ============================================================
// ROUTER SHELL — Replaces the current single-page demo
// Person B creates this first; everyone else adds their pages
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/patient/Dashboard";
import PatientChat from "./pages/patient/Chat";
import DoctorDashboard from "./pages/doctor/Dashboard";
import PatientDetail from "./pages/doctor/PatientDetail";
import NewAppointment from "./pages/doctor/NewAppointment";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes inside shared Layout */}
          <Route element={<Layout />}>
            {/* Patient routes */}
            <Route
              path="/patient/dashboard"
              element={
                <ProtectedRoute role="patient">
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/chat/:appointmentId"
              element={
                <ProtectedRoute role="patient">
                  <PatientChat />
                </ProtectedRoute>
              }
            />

            {/* Doctor routes */}
            <Route
              path="/doctor/dashboard"
              element={
                <ProtectedRoute role="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/patients/:id"
              element={
                <ProtectedRoute role="doctor">
                  <PatientDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/appointments/new"
              element={
                <ProtectedRoute role="doctor">
                  <NewAppointment />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all: redirect to login */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
