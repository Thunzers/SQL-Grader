import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  // Google Login Initialization
  useEffect(() => {
    if (typeof window === 'undefined' || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: "673421095892-krkp5se2jipkdpmbdfohbk39etq1klcb.apps.googleusercontent.com",
      callback: handleGoogleLogin,
    });

    window.google.accounts.id.renderButton(
      document.getElementById("googleLogin"),
      {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        width: 250,
      }
    );
  }, []);

  const handleGoogleLogin = async (response) => {
    const token = response.credential;


    try {
      const res = await fetch("http://localhost:5000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token }),
      });

      const data = await res.json();

      if (data.success) {
        console.log("Google Login สำเร็จ:", data.email, "| Role:", data.role);

        // Save student_id to localStorage if user exists
        if (data.user_exists && data.student_id) {
          localStorage.setItem("student_id", data.student_id);
          localStorage.setItem("user_email", data.email);
          localStorage.setItem("user_role", data.role);
          console.log("Saved to localStorage:", data.student_id);
        }

        onLoginSuccess(data.email, data.role, data.student_id);
      } else {
        setErrorMsg(data.error || "Login failed (Unknown Error from Server)");
      }
    } catch (err) {
      console.error("Error logging in:", err);
      setErrorMsg("ไม่สามารถเชื่อมต่อ Server ได้ (โปรดตรวจสอบว่ารัน Server Python ที่ http://localhost:5000 อยู่)");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen font-sans">
      {/* Left Section */}
      <div className="w-1/2 flex flex-col justify-center items-center bg-white">
        <h1 className="text-9xl font-semibold text-teal-700">Grader</h1>
        <h2 className="text-9xl font-semibold text-teal-700 mt-2">SQL</h2>
      </div>

      {/* Right Section */}
      <div className="w-1/2 bg-[#00796b] flex flex-col justify-center items-center text-white">

        <div className="mt-10 text-sm text-white/80">
          Log in using your account on:
        </div>

        <div id="googleLogin" className="mt-4"></div>
      </div>
    </div>
  );
}