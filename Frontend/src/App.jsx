import { useState, useEffect } from "react";

import Login from "./components/Login";
import StudentDashboard from "./components/StudentMenu";
import TeacherDashboard from "./components/TeacherMenu";
import AdminDashboard from "./components/AdminMenu";

export default function App() {
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

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem("session", JSON.stringify({ isLoggedIn, userEmail, role }));
    } else {
      localStorage.removeItem("session");
    }
  }, [isLoggedIn, userEmail, role]);

  

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