import { useState, useEffect } from "react";
import { ChevronDown, LogOut, User, Users, Settings, BookOpen, X, Save, UserPlus, Upload, Trash2 } from "lucide-react";

export default function AdminDashboard({ setIsLoggedIn, userEmail }) {
  const [openProfile, setOpenProfile] = useState(false);


  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // States for Add Single User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [addingUser, setAddingUser] = useState(false);

  // States for Bulk Upload Modal
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  // States for Delete User Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);


  const fetchUsers = async () => {
    setLoading(true);
    try {
      
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();
      const usersData = Array.isArray(data)
        ? data.slice().sort((a, b) => Number(a.id) - Number(b.id))
        : data;
      setUsers(usersData);
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

  // Function to Add Single User
  const handleAddSingleUser = async (e) => {
    e.preventDefault();

    if (!newUserEmail.trim()) {
      alert("กรุณากรอกอีเมล");
      return;
    }

    setAddingUser(true);

    try {
      const response = await fetch('http://localhost:5000/api/users/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          role: newUserRole
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("เพิ่มผู้ใช้สำเร็จ!");
        setShowAddUserModal(false);
        setNewUserEmail("");
        setNewUserRole("student");
        fetchUsers(); // Refresh user list
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้");
      }
    } catch (error) {
      console.error("Error adding user:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setAddingUser(false);
    }
  };

  // Function to Handle Bulk Upload
  const handleBulkUpload = async (e) => {
    e.preventDefault();

    if (!uploadFile) {
      alert("กรุณาเลือกไฟล์ Excel");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('http://localhost:5000/api/users/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadResult(data);
        alert(`อัปโหลดสำเร็จ! เพิ่ม: ${data.summary.added}, ข้าม: ${data.summary.skipped}`);
        fetchUsers(); // Refresh user list
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการอัปโหลด");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
    } finally {
      setUploading(false);
    }
  };

  // Reset bulk upload modal
  const resetBulkUpload = () => {
    setUploadFile(null);
    setUploadResult(null);
    setShowBulkUploadModal(false);
  };

  // Function to Open Delete Confirmation
  const openDeleteConfirm = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  // Function to Handle Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert("ลบผู้ใช้สำเร็จ!");
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        fetchUsers(); // Refresh user list
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการลบผู้ใช้");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setDeleting(false);
    }
  };

  // Function to Cancel Delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
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

            {/* Action Buttons - ใต้ Header */}
            <div className="px-6 pt-4 flex gap-3">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition font-semibold"
              >
                <UserPlus size={20} /> เพิ่มผู้ใช้
              </button>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition font-semibold"
              >
                <Upload size={20} /> อัปโหลด Excel
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
                      <th className="p-3 font-semibold text-gray-700">Change Role</th>
                      <th className="p-3 font-semibold text-gray-700"></th>
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
                        <td className="p-3">
                          <button
                            onClick={() => openDeleteConfirm(user)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition text-sm"
                            title="ลบผู้ใช้"
                          >
                            <Trash2 size={16} /> ลบ
                          </button>
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

      {/* --- ADD SINGLE USER MODAL --- */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">

            {/* Modal Header */}
            <div className="bg-teal-700 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UserPlus size={22} /> เพิ่มผู้ใช้ใหม่
              </h2>
              <button onClick={() => setShowAddUserModal(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={22} />
              </button>
            </div>

            {/* Modal Body (Form) */}
            <form onSubmit={handleAddSingleUser} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="example@silpakorn.edu"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  บทบาท
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:bg-teal-300"
                >
                  {addingUser ? "กำลังเพิ่ม..." : "เพิ่มผู้ใช้"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- BULK UPLOAD MODAL --- */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">

            {/* Modal Header */}
            <div className="bg-indigo-700 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Upload size={22} /> อัปโหลดผู้ใช้จาก Excel
              </h2>
              <button onClick={resetBulkUpload} className="hover:bg-white/20 p-1 rounded-full">
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">คำแนะนำ:</h3>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li>ไฟล์ Excel ต้องมีคอลัมน์ <strong>email</strong> (จำเป็น)</li>
                  <li>คอลัมน์ <strong>role</strong> (ไม่บังคับ) - ถ้าไม่ระบุจะเป็น student</li>
                  <li>Role ที่ใช้ได้: student, teacher, admin</li>
                  <li>อีเมลที่มีอยู่แล้วในระบบจะถูกข้าม</li>
                </ul>
              </div>

              {/* File Upload Form */}
              <form onSubmit={handleBulkUpload}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    เลือกไฟล์ Excel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                  {uploadFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      ไฟล์ที่เลือก: <strong>{uploadFile.name}</strong>
                    </p>
                  )}
                </div>

                {/* Upload Result Summary */}
                {uploadResult && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-green-900 mb-2">ผลการอัปโหลด:</h3>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>ทั้งหมด: {uploadResult.summary.total_processed} รายการ</p>
                      <p>เพิ่มสำเร็จ: {uploadResult.summary.added} รายการ</p>
                      <p>ข้าม: {uploadResult.summary.skipped} รายการ</p>
                      <p>ข้อผิดพลาด: {uploadResult.summary.errors} รายการ</p>
                    </div>

                    {uploadResult.skipped_users.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-yellow-800">
                          รายการที่ข้าม ({uploadResult.skipped_users.length})
                        </summary>
                        <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
                          {uploadResult.skipped_users.map((user, idx) => (
                            <li key={idx}>{user.email} - {user.reason}</li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {uploadResult.errors.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-red-800">
                          ข้อผิดพลาด ({uploadResult.errors.length})
                        </summary>
                        <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                          {uploadResult.errors.map((error, idx) => (
                            <li key={idx}>{error.email} - {error.error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetBulkUpload}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition font-semibold"
                  >
                    ปิด
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:bg-indigo-300"
                  >
                    {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">

            {/* Modal Header */}
            <div className="bg-red-600 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trash2 size={22} /> ยืนยันการลบผู้ใช้
              </h2>
              <button onClick={cancelDelete} className="hover:bg-white/20 p-1 rounded-full">
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-900 font-semibold mb-2">คำเตือน!</p>
                <p className="text-sm text-red-800">
                  คุณต้องการลบผู้ใช้นี้หรือไม่?
                </p>
              </div>

                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">ID: <strong>#{userToDelete.id}</strong></p>
                  <p className="text-sm text-gray-600">Email: <strong>{userToDelete.email}</strong></p>
                  <p className="text-sm text-gray-600">Role: <strong>{userToDelete.role}</strong></p>
                </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition font-semibold disabled:bg-gray-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:bg-red-300 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>กำลังลบ...</>
                  ) : (
                    <>
                      <Trash2 size={18} /> ยืนยันลบ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}