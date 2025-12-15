import { useState, useEffect } from "react";
import { ChevronDown, LogOut, User, Users, Settings, BookOpen, X, Save } from "lucide-react";

export default function AdminDashboard({ setIsLoggedIn, userEmail }) {
  const [openProfile, setOpenProfile] = useState(false);
  
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);


  const fetchUsers = async () => {
    setLoading(true);
    try {
      
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  // เปลี่ยน Role
  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // อัปเดตข้อมูล
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        alert("เปลี่ยน Role สำเร็จ!");
      } else {
        alert("เกิดข้อผิดพลาดในการเปลี่ยน Role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  // เปิด Modal และดึงข้อมูล
  const openUserManagement = () => {
    setShowUserModal(true);
    fetchUsers();
  };

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
          onClick={openUserManagement}
          className="bg-white rounded-xl shadow-md border p-5 hover:shadow-xl hover:-translate-y-1 transition cursor-pointer"
        >
          <Users size={40} className="text-teal-700" />
          <h3 className="text-xl font-semibold mt-3">Manage Users</h3>
          <p className="text-gray-600 text-sm mt-1">Students, Teachers, Admins</p>
        </div>

        {/* Manage Classes */}
        <div className="bg-white rounded-xl shadow-md border p-5 hover:shadow-xl hover:-translate-y-1 transition cursor-pointer">
          <BookOpen size={40} className="text-indigo-700" />
          <h3 className="text-xl font-semibold mt-3">Manage Courses</h3>
          <p className="text-gray-600 text-sm mt-1">Create, Edit, Delete Classes</p>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-xl shadow-md border p-5 hover:shadow-xl hover:-translate-y-1 transition cursor-pointer">
          <Settings size={40} className="text-amber-700" />
          <h3 className="text-xl font-semibold mt-3">System Settings</h3>
          <p className="text-gray-600 text-sm mt-1">Configuration & Permissions</p>
        </div>
      </div>

      {/* --- USER MANAGEMENT MODAL --- */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-teal-700 text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users size={24} /> User Management
              </h2>
              <button onClick={() => setShowUserModal(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body (Table) */}
            <div className="p-6 overflow-y-auto">
              {loading ? (
                <p className="text-center py-4">Loading users...</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-3 font-semibold text-gray-700">ID</th>
                      <th className="p-3 font-semibold text-gray-700">Email</th>
                      <th className="p-3 font-semibold text-gray-700">Current Role</th>
                      <th className="p-3 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-gray-600">#{user.id}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                              user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 
                              'bg-green-100 text-green-700'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <select 
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}