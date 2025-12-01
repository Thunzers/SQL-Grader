import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login({ setIsLoggedIn, setUserEmail, setRole }) {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Google Login Initialization
  useEffect(() => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id:
        "34276681645-qljcgh9b3fgub935akbstuduj3f43p5v.apps.googleusercontent.com",
      callback: handleCredentialResponse,
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

  // Google Login Response
  function handleCredentialResponse(response) {
    const token = response.credential;
    const data = JSON.parse(atob(token.split(".")[1]));

    const email = data.email;

    // เช็คโดเมน
    if (!email.endsWith("@silpakorn.edu")) {
      alert("อนุญาตเฉพาะอีเมล @silpakorn.edu เท่านั้น");
      return;
    }

    // ⭐ เก็บ email
    setUserEmail(email);

    // ⭐ ระบุ role
    if (email.includes("student")) {
      setRole("student");
      navigate("/student");
    } 
    else if (email.includes("teacher")) {
      setRole("teacher");
      navigate("/teacher");
    } 
    else {
      setRole("admin");
      navigate("/admin");
    }

    // ⭐ เซ็ต Login
    setIsLoggedIn(true);
  }

  return (
    <div className="flex h-screen font-sans">

      {/* Left Section */}
      <div className="w-1/2 flex flex-col justify-center items-center bg-white">
        <h1 className="text-9xl font-semibold text-teal-700">Grader</h1>
        <h2 className="text-9xl font-semibold text-teal-700 mt-2">SQL</h2>
      </div>

      {/* Right Section */}
      <div className="w-1/2 bg-[#00796b] flex flex-col justify-center items-center text-white">

        {/* Login Form */}
        <form className="w-80 flex flex-col space-y-6">

          {/* Username */}
          <input
            type="text"
            placeholder="ชื่อผู้ใช้"
            className="
              w-full p-3 rounded-xl border border-gray-300
              bg-white text-black focus:outline-none
            "
          />

          {/* Password */}
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="รหัสผ่าน"
              className="
                w-full p-3 rounded-xl border border-gray-300
                bg-white text-black focus:outline-none pr-12
              "
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-black hover:text-gray-700 transition"
            >
              {showPassword ? <Eye size={22} /> : <EyeOff size={22} />}
            </button>
          </div>

          {/* Forgot Password */}
          <div className="w-full text-right -mt-4 text-sm">
            <a href="#" className="text-white/80 hover:underline">
              Forgot password?
            </a>
          </div>

          {/* Normal Login Button */}
          <button
            type="button"
            onClick={() => {
              const email = "localstudent@silpakorn.edu";

              setUserEmail(email);

              // ⭐ ตั้ง role แบบจำลอง
              setRole("student");
              setIsLoggedIn(true);
              navigate("/student");
            }}
            className="
              w-full bg-white text-black py-3 rounded-xl font-semibold
              hover:bg-gray-100 transition
            "
          >
            เข้าสู่ระบบ/Login
          </button>
        </form>

        {/* Google Login */}
        <div className="mt-10 text-sm text-white/80">
          Log in using your account on:
        </div>

        <div id="googleLogin" className="mt-4"></div>
      </div>
    </div>
  );
}
