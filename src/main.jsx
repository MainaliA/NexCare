import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import App from './App.jsx'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PatientDashboard from './pages/patient/Dashboard'
import PatientChat from './pages/patient/Chat'
import DoctorDashboard from './pages/doctor/Dashboard'
import PatientDetail from './pages/doctor/PatientDetail'
import NewAppointment from './pages/doctor/NewAppointment'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Original demo — untouched */}
          <Route path="/" element={<App />} />

          {/* Auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Authenticated app */}
          <Route element={<Layout />}>
            <Route path="/patient/dashboard" element={
              <ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>
            } />
            <Route path="/patient/chat/:appointmentId" element={
              <ProtectedRoute role="patient"><PatientChat /></ProtectedRoute>
            } />
            <Route path="/doctor/dashboard" element={
              <ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>
            } />
            <Route path="/doctor/patients/:id" element={
              <ProtectedRoute role="doctor"><PatientDetail /></ProtectedRoute>
            } />
            <Route path="/doctor/appointments/new" element={
              <ProtectedRoute role="doctor"><NewAppointment /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
