import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  
  // 1. State สำหรับเก็บค่าที่พิมพ์
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 2. State สำหรับจัดการสถานะการโหลดและ Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); 

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
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:3000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token }),
      });

      const data = await res.json();

      if (data.success) {
        console.log("Google Login สำเร็จ:", data.email);
        onLoginSuccess(data.email); 
      } else {
        setErrorMsg(data.error || "Login failed (Unknown Error from Server)"); 
      }
    } catch (err) {
      console.error("Error logging in:", err);
      setErrorMsg("ไม่สามารถเชื่อมต่อ Server ได้ (โปรดตรวจสอบว่ารัน Server Python ที่ http://localhost:3000 อยู่)");
    } finally {
      setIsLoading(false);
    }
  };

  // ⭐️ Manual Login (Mock) - แก้ไขส่วนนี้
  const handleManualLogin = async (e) => {
    e.preventDefault(); 
    setErrorMsg("");
    
    if (!email || !password) {
      setErrorMsg("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setIsLoading(true); 

    
    await new Promise(resolve => setTimeout(resolve, 1000)); 
      
    
    if (email.endsWith("@silpakorn.edu") || email === "admin" || email === "teacher") {
        console.log("Manual Login (Mock) สำเร็จ:", email);
        onLoginSuccess(email);
    } else {
        // อัปเดตข้อความ Error
        setErrorMsg("อนุญาตเฉพาะอีเมล @silpakorn.edu");
    }
      
    setIsLoading(false); 
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

        <form className="w-80 flex flex-col space-y-6" onSubmit={handleManualLogin}>

          <input
            type="text" 
            placeholder="อีเมล (@silpakorn.edu)" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none"
          />

          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="รหัสผ่าน"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none pr-12"
            />
            
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-black hover:text-gray-700 transition"
            >
              {showPassword ? <Eye size={22} /> : <EyeOff size={22} />}
            </button>
          </div>

          <div className="w-full text-right -mt-4 text-sm">
            <a href="#" className="text-white/80 hover:underline">
              Forgot password?
            </a>
          </div>

          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg text-sm text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-gray-100 transition
              ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ/Login"}
          </button>
        </form>

        <div className="mt-10 text-sm text-white/80">
          Log in using your account on:
        </div>

        <div id="googleLogin" className="mt-4"></div>
      </div>
    </div>
  );
}