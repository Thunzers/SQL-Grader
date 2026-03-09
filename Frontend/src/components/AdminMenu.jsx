import { useState, useEffect } from "react"; 
import { ChevronDown, LogOut, User, Users, BookOpen, BarChart3, Loader2, ClipboardList, ArrowLeft } from "lucide-react";
import UserManagementModal from "./admin/UserManagementModal";
import axios from "axios"; 

// --- ส่วนประกอบย่อยสำหรับแสดงตาราง Log ---
function LogTable({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/admin/logs");
        setLogs(response.data);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium">
        <ArrowLeft size={20} /> Back to Dashboard
      </button>
      <div className="bg-white rounded-xl shadow-md border overflow-hidden">
        <div className="p-5 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">User Activity Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-6 py-3 border-b">Time</th>
                <th className="px-6 py-3 border-b">Student</th>
                <th className="px-6 py-3 border-b">Action</th>
                <th className="px-6 py-3 border-b">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-10"><Loader2 className="animate-spin mx-auto text-teal-600" /></td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.created_at).toLocaleString('th-TH')}</td>
                  <td className="px-6 py-4 font-medium">{log.name} {log.surname}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{log.action}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{log.details || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ setIsLoggedIn, userEmail }) {
  const [openProfile, setOpenProfile] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [view, setView] = useState("dashboard"); // เพิ่ม State สำหรับสลับหน้า
  
  const [stats, setStats] = useState({ totalUsers: 0, totalExercises: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5000/api/admin/stats");
        if (isMounted) {
          setStats({
            totalUsers: response.data.totalUsers || 0,
            totalExercises: response.data.totalExercises || 0
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  // เงื่อนไขการสลับหน้าจอ
  if (view === "logs") {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="w-full bg-[#00796b] text-white px-6 py-4 shadow-md">
          <h1 className="text-lg font-semibold">System Control Panel / Logs</h1>
        </nav>
        <LogTable onBack={() => setView("dashboard")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* NAVBAR */}
      <nav className="w-full bg-[#00796b] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center text-xs font-semibold">Admin</div>
          <h1 className="text-lg font-semibold">System Control Panel</h1>
        </div>

        <div className="relative">
          <div onClick={() => setOpenProfile(!openProfile)} className="cursor-pointer flex items-center gap-2 hover:opacity-80">
            <span>{userEmail}</span>
            <ChevronDown size={20} />
          </div>
          {openProfile && (
            <div className="absolute right-0 mt-2 w-44 bg-white text-black rounded-lg shadow-lg overflow-hidden z-50">
              <button className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-100"><User size={18} /> Profile</button>
              <button className="w-full px-4 py-3 flex items-center gap-2 text-red-600 hover:bg-gray-100" onClick={() => setIsLoggedIn(false)}><LogOut size={18} /> Logout</button>
            </div>
          )}
        </div>
      </nav>

      {/* DASHBOARD CARDS */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8"> {/* ปรับจาก 3 เป็น 4 columns */}

        <div className="bg-white rounded-xl shadow-md border p-5 transition hover:shadow-lg min-h-[140px] flex flex-col justify-center">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-gray-700">Total Users</h3>
              {loading ? <Loader2 className="animate-spin text-teal-600 mt-2" size={24} /> : <p className="text-3xl font-bold text-teal-700 mt-2">{Number(stats.totalUsers).toLocaleString()}</p>}
            </div>
            <BarChart3 size={40} className="text-gray-200" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border p-5 transition hover:shadow-lg min-h-[140px] flex flex-col justify-center">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-gray-700">Exercises</h3>
              {loading ? <Loader2 className="animate-spin text-teal-600 mt-2" size={24} /> : <p className="text-3xl font-bold text-teal-700 mt-2">{Number(stats.totalExercises).toLocaleString()}</p>}
            </div>
            <BookOpen size={40} className="text-gray-200" />
          </div>
        </div>

        {/* Card ใหม่: ดู Log การใช้งาน */}
        <div
          onClick={() => setView("logs")}
          className="bg-white rounded-xl shadow-md border p-5 hover:shadow-xl hover:-translate-y-1 transition cursor-pointer flex flex-col justify-center min-h-[140px]"
        >
          <ClipboardList size={40} className="text-orange-500" />
          <h3 className="text-xl font-semibold mt-3 text-gray-700">User Logs</h3>
          <p className="text-gray-600 text-sm mt-1">View activity history</p>
        </div>

        <div onClick={() => setShowUserModal(true)} className="bg-white rounded-xl shadow-md border p-5 hover:shadow-xl hover:-translate-y-1 transition cursor-pointer flex flex-col justify-center min-h-[140px]">
          <Users size={40} className="text-teal-700" />
          <h3 className="text-xl font-semibold mt-3 text-gray-700">Manage Users</h3>
          <p className="text-gray-600 text-sm mt-1">Edit, Delete or Create accounts</p>
        </div>

      </div>

      <UserManagementModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} />
    </div>
  );
}