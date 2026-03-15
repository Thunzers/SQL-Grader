import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import Login from "./components/Login";
import StudentDashboard from "./components/StudentMenu";
import TeacherDashboard from "./components/TeacherMenu";
import AdminDashboard from "./components/AdminMenu";
import AssignmentDetail from "./components/AssignmentDetail";
import ExerciseSolve from "./components/ExerciseSolve";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load session from localStorage on initial render
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem("session");
    return saved ? JSON.parse(saved).isLoggedIn : false;
  });
  const [userEmail, setUserEmail] = useState(() => {
    const saved = localStorage.getItem("session");
    return saved ? JSON.parse(saved).userEmail : "";
  });
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem("session");
    return saved ? JSON.parse(saved).role : "";
  });
  const [userId, setUserId] = useState(() => {
    const saved = localStorage.getItem("session");
    return saved ? (JSON.parse(saved).userId || localStorage.getItem("user_id") || "") : "";
  });

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem("session", JSON.stringify({ isLoggedIn, userEmail, role, userId }));
    } else {
      localStorage.removeItem("session");
    }
  }, [isLoggedIn, userEmail, role, userId]);

  // Sync role with backend on mount/refresh
  useEffect(() => {
    const fetchProfile = async () => {
      if (isLoggedIn && userEmail) {
        try {
          const res = await fetch(`http://localhost:5000/api/users/profile?email=${userEmail}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              let updated = false;
              if (data.user.role !== role) {
                setRole(data.user.role);
                updated = true;
              }
              if (data.user.user_id !== userId) {
                setUserId(data.user.user_id);
                updated = true;
              }

              if (updated) {
                const currentSession = JSON.parse(localStorage.getItem("session") || "{}");
                localStorage.setItem("session", JSON.stringify({ 
                  ...currentSession, 
                  role: data.user.role,
                  userId: data.user.user_id 
                }));
              }
            }
          }
        } catch (error) {
          console.error("Error syncing profile:", error);
        }
      }
    };
    fetchProfile();
  }, [isLoggedIn, userEmail]);

  function handleLoginSuccess(email, userRole, uId) {
    setUserEmail(email);
    setRole(userRole);
    setUserId(uId);
    setIsLoggedIn(true);

    // Redirect based on role
    if (userRole === "teacher") navigate("/teacher");
    else if (userRole === "admin") navigate("/admin");
    else navigate("/student");
  }

  function handleLogout() {
    setUserEmail("");
    setRole("");
    setUserId("");
    setIsLoggedIn(false);
    navigate("/login");
  }

  // Protected Route Wrapper
  function ProtectedRoute({ children, allowedRole }) {
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (allowedRole && role !== allowedRole) {
      // Create a simple unauthorized view or redirect to own dashboard
      if (role === 'teacher') return <Navigate to="/teacher" replace />;
      if (role === 'admin') return <Navigate to="/admin" replace />;
      return <Navigate to="/student" replace />;
    }
    return children;
  }

  // Effect to handle initial redirect if logged in but at root
  useEffect(() => {
    if (isLoggedIn && location.pathname === '/') {
      if (role === "teacher") navigate("/teacher");
      else if (role === "admin") navigate("/admin");
      else navigate("/student");
    } else if (!isLoggedIn && location.pathname !== '/login') {
      // Optional: Redirect to login if trying to access deep link while logged out (handled by ProtectedRoute generally, but good for root)
      // navigate("/login");
    }
  }, [isLoggedIn, role, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/login" element={
        !isLoggedIn ?
          <Login onLoginSuccess={handleLoginSuccess} /> :
          <Navigate to={role === 'teacher' ? '/teacher' : role === 'admin' ? '/admin' : '/student'} />
      } />

      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRole="student">
          <StudentDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} userId={userId} />
        </ProtectedRoute>
      } />
      <Route path="/assignment/:assignmentId" element={
        <ProtectedRoute allowedRole="student">
          <AssignmentDetail userId={userId} />
        </ProtectedRoute>
      } />
      <Route path="/exercise/:exerciseId" element={
        <ProtectedRoute allowedRole="student">
          <ExerciseSolve userId={userId} />
        </ProtectedRoute>
      } />

      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRole="teacher">
          <TeacherDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} userId={userId} />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="admin">
          <AdminDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} userId={userId} />
        </ProtectedRoute>
      } />

      {/* Default Catch-all */}
      <Route path="*" element={<Navigate to={isLoggedIn ? (role === 'teacher' ? '/teacher' : role === 'admin' ? '/admin' : '/student') : '/login'} />} />
    </Routes>
  );
}