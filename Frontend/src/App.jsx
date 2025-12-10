import { useState } from "react";

import Login from "./components/Login";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState("");

  

  // ✅ แก้ไข: รับค่า email และ role ที่ส่งมาจาก Login.jsx
  function handleLoginSuccess(email, userRole) {
    setUserEmail(email);
    setRole(userRole); // เซ็ต Role ตามที่ Database ส่งมา
    setIsLoggedIn(true);
    
    console.log("App Login:", email, "| Role:", userRole); // เช็คค่าใน Console
  }

  // Logout
  function handleLogout() {
    setUserEmail("");
    setRole("");
    setIsLoggedIn(false);
  }

  
  function renderDashboard() {
    if (role === "teacher") {
      return <TeacherDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} />;
    }

    if (role === "admin") {
      return <AdminDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} />;
    }

    
    return <StudentDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} />;
  }

  return (
    <>
      {isLoggedIn ? (
        renderDashboard()
      ) : (
        <Login 
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}