import { useState } from "react";
import { ChevronDown, LogOut, User, Users, BookOpen, Settings } from "lucide-react";
import UserManagementModal from "./admin/UserManagementModal";

export default function AdminDashboard({ setIsLoggedIn, userEmail }) {
  const [openProfile, setOpenProfile] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 relative">

      {/* NAVBAR */}
      <nav className="w-full bg-[#00796b] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center text-xs font-semibold">
            Admin
          </div>
          <h1 className="text-lg font-semibold">System Control Panel</h1>
        </div>

        {/* PROFILE */}
        <div className="relative">
          <div
            onClick={() => setOpenProfile(!openProfile)}
            className="cursor-pointer flex items-center gap-2 hover:opacity-80"
          >
            <span>{userEmail}</span>
            <ChevronDown size={20} />
          </div>

          {openProfile && (
            <div className="absolute right-0 mt-2 w-44 bg-white text-black rounded-lg shadow-lg overflow-hidden z-50">
              <button className="w-full px-4 py-3 hover:bg-gray-100 flex items-center gap-2">
                <User size={18} /> Profile
              </button>
              <button
                className="w-full px-4 py-3 text-red-600 hover:bg-gray-100 flex items-center gap-2"
                onClick={() => setIsLoggedIn(false)}
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* DASHBOARD CARDS */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">

        {/* Manage Users Card (Clickable) */}
        <div
          onClick={() => setShowUserModal(true)}
          className="bg-white rounded-xl shadow-md border p-5 hover:shadow-xl hover:-translate-y-1 transition cursor-pointer"
        >
          <Users size={40} className="text-teal-700" />
          <h3 className="text-xl font-semibold mt-3">Manage Users</h3>
          <p className="text-gray-600 text-sm mt-1">Students, Teachers, Admins</p>
        </div>

        {/* Add more dashboard cards here in the future */}
      </div>

      {/* --- USER MANAGEMENT MODAL --- */}
      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
      />

    </div>
  );
}
