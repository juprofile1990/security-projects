import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute, ResponderRoute } from "./components/RoleRoute";
import { Login } from "./pages/Login";
import { Incidents } from "./pages/Incidents";
import { NewIncident } from "./pages/NewIncident";
import { IncidentDetail } from "./pages/IncidentDetail";
import { Assets } from "./pages/Assets";
import { AuditLogs } from "./pages/AuditLogs";
import { Dashboard } from "./pages/Dashboard";
import { MitreMap } from "./pages/MitreMap";
import { Correlation } from "./pages/Correlation";

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="incidents" element={<Incidents />} />
              <Route element={<ResponderRoute />}>
                <Route path="incidents/new" element={<NewIncident />} />
              </Route>
              <Route path="incidents/:id" element={<IncidentDetail />} />
              <Route path="assets" element={<Assets />} />
              <Route path="mitre-map" element={<MitreMap />} />
              <Route path="correlation" element={<Correlation />} />
              <Route element={<AdminRoute />}>
                <Route path="audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
