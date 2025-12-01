import { useState } from "react";

import Login from "./components/Login";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState("");

  // ฟังก์ชันกำหนด role จาก email
  function detectRole(email) {
    const prefix = email.split("@")[0].toLowerCase();

    if (prefix.includes("admin")) return "admin";
    if (prefix.includes("tch") || prefix.includes("teach")) return "teacher";
    if (prefix.includes("std") || prefix.includes("student")) return "student";

    return "student"; // default
  }

  // เมื่อ login สำเร็จ
  function handleLoginSuccess(email) {
    setUserEmail(email);
    setRole(detectRole(email));  // ⭐ ใช้ detectRole ใหม่
    setIsLoggedIn(true);
  }

  // Logout
  function handleLogout() {
    setUserEmail("");
    setRole("");
    setIsLoggedIn(false);
  }

  // เลือก dashboard
  function renderDashboard() {
    if (role === "student")
      return <StudentDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} />;

    if (role === "teacher")
      return <TeacherDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} />;

    if (role === "admin")
      return <AdminDashboard setIsLoggedIn={handleLogout} userEmail={userEmail} />;

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
