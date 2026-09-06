import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ChatView from "./ChatView";
import AdminLogin from "./admin/AdminLogin";
import { AdminDashboard } from "./admin/AdminDashboard";
import ProtectedRoute from "./admin/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Chatbot */}
        <Route path="/" element={<ChatView />} />
        
        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Protected Admin Dashboard */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
