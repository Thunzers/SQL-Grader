import { useState, useEffect } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";

export default function Dashboard({ setIsLoggedIn, userEmail }) {
  const [openProfile, setOpenProfile] = useState(false);
  
  // 1. สร้าง State สำหรับเก็บข้อมูลวิชาเรียน
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. ใช้ useEffect ดึงข้อมูลจาก Python Backend เมื่อหน้าเว็บโหลด
  useEffect(() => {
    fetch("http://localhost:3000/api/classes")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Loaded classes:", data);
        setClasses(data); // บันทึกข้อมูลลง State
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching classes:", error);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white">

      {/* TOP NAVBAR */}
      <nav className="w-full bg-[#00796b] text-white px-6 py-4 flex justify-between items-center shadow-md">
        
        {/* Logo + Menu */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/40 rounded-full flex flex-col items-center justify-center text-xs font-semibold">
              <span>Grader</span>
              <span>SQL</span>
            </div>
          </div>
        {/*   ---------------------------------------------------------------------------------------
          <div className="flex gap-6 text-sm opacity-80">
            <button className="hover:opacity-100 transition">Community</button>
            <button className="hover:opacity-100 transition">Support</button>
          </div> */ }
        </div>

        {/* User Profile */}
        <div className="relative">
          <div
            onClick={() => setOpenProfile(!openProfile)}
            className="cursor-pointer flex items-center gap-2 hover:opacity-80 transition"
          >
            <span className="text-sm">{userEmail}</span>
            <ChevronDown size={20} />
          </div>

          {openProfile && (
            <div className="absolute right-0 mt-2 w-44 bg-white text-black rounded-lg shadow-lg overflow-hidden z-50">
              <button className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-100">
                <User size={18} /> Profile
              </button>
              <button
                className="w-full px-4 py-3 flex items-center gap-2 text-red-600 hover:bg-gray-100"
                onClick={() => setIsLoggedIn(false)}
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* TAB */}
      <div className="px-6 pt-4">
        <div className="border-b text-gray-700">
          <button className="pb-2 border-b-2 border-black font-semibold">
            Current
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-6 mt-6">

        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Published Classes</h2>
            <p className="text-sm text-gray-600">
              These classes are available to students.
            </p>
          </div>

          {/* Dropdown term/year */}
          <select className="border border-gray-300 px-4 py-2 rounded-lg shadow-sm">
            <option>1/2025</option>
            <option>2/2025</option>
          </select>
        </div>

        {/* CLASS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">

          {/* Loading State */}
          {isLoading && (
            <div className="col-span-full text-center py-10 text-gray-500">
              กำลังโหลดข้อมูลวิชาจาก Database...
            </div>
          )}

          {/* Empty State */}
          {!isLoading && classes.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              ไม่พบวิชาเรียนในระบบ (ตรวจสอบ Database หรือ Server)
            </div>
          )}

          {/* Loop Data */}
          {classes.map((c) => (
            <div
              key={c.id || c.code} 
              className="bg-white rounded-xl shadow border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
            >
              {/* HEADER BLOCK */}
              <div className="h-32 p-4 w-full bg-teal-600 text-white flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold">{c.code}</h3>
                  <p className="text-sm opacity-80">{c.name}</p>
                </div>
                <div className="flex gap-2">
                  <span className="bg-green-500 text-white px-2 py-1 text-xs rounded">
                    Active
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between px-4 py-3 text-sm text-gray-800">
                <span>Section {c.section}</span>
                {/* แก้ sem เป็น semester ให้ตรงกับ Database */}
                <span>Semester {c.semester}</span>
              </div>
            </div>
          ))}

        </div>
      </div>

    </div>
  );
}