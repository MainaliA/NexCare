import { useState } from "react";

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const demoText =
    "Patient discharged after evaluation for hypertension. Started on Lisinopril 10 mg once daily. Follow up with primary care physician in 2 weeks. Monitor blood pressure daily. Seek medical attention for chest pain or severe headache.";

  const demoResult = {
    summary:
      "The patient was treated for high blood pressure and was prescribed Lisinopril to help lower it.",
    medications: ["Lisinopril 10 mg once daily"],
    steps: [
      "Follow up with primary care physician in 2 weeks",
      "Monitor blood pressure daily",
      "Seek medical attention for chest pain or severe headache",
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-3xl font-bold">NexCare</h1>
          <p className="text-slate-400">
            AI assistant that simplifies medical information for patients and caregivers
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-10 grid gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <div className="rounded-xl bg-slate-900 p-6 border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Medical Document</h2>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-64 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm"
            placeholder="Paste medical notes, discharge summary, or lab results here..."
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setResult(demoResult);
                  setLoading(false);
                }, 1200);
              }}
              className="bg-white text-black px-4 py-2 rounded-lg font-medium"
            >
              Simplify
            </button>

            <button
              onClick={() => setText(demoText)}
              className="border border-slate-700 px-4 py-2 rounded-lg"
            >
              Load Example
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-lg">Plain Language Summary</h3>
            <p className="text-slate-300 text-sm mt-2">
              {loading
                ? "Analyzing medical document..."
                : result
                ? result.summary
                : "AI explanation will appear here."}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-lg">Medications</h3>
            {result ? (
              <ul className="text-slate-300 text-sm mt-2 space-y-1">
                {result.medications.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-300 text-sm mt-2">
                Extracted medications will appear here.
              </p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-lg">Next Steps</h3>
            {result ? (
              <ul className="text-slate-300 text-sm mt-2 space-y-1">
                {result.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-300 text-sm mt-2">
                Follow-up actions will appear here.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


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
