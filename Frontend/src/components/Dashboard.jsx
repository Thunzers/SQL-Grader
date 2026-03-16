import { useState } from "react";
import { Bell, User, ChevronDown, LogOut } from "lucide-react";

export default function Dashboard({ setIsLoggedIn, userEmail }) {
  const [openProfile, setOpenProfile] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 relative">

      {/* Navbar */}
      <div className="w-full bg-teal-600 text-white p-4 flex justify-between items-center shadow-md">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/40 rounded-full flex flex-col items-center justify-center text-xs font-semibold">
            <span>Grader</span>
            <span>SQL</span>
          </div>
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-6 text-xl relative">

          {/* Notification */}
          <Bell className="cursor-pointer hover:text-gray-200" />

          {/* Profile Dropdown */}
          <div className="relative">
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setOpenProfile(!openProfile)}
            >
              {/* แสดงอีเมล */}
              <span className="text-sm">{userEmail}</span>

              <User className="hover:text-gray-200" />
              <ChevronDown size={20} />
            </div>

            {/* Dropdown Menu */}
            {openProfile && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-md text-black overflow-hidden z-50">
                <button className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center gap-2">
                  <User size={18} /> Profile
                </button>
                <button
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                  onClick={() => setIsLoggedIn(false)} //LOGOUT
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
