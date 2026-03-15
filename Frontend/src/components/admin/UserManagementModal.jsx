import { useState, useEffect } from "react";
import { Users, X, UserPlus, Upload, Trash2 } from "lucide-react";
import AddUserModal from "./AddUserModal";
import BulkUploadModal from "./BulkUploadModal";
import ConfirmModal from "../ConfirmModal";

export default function UserManagementModal({ isOpen, onClose, mode = "admin" }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Child Modals State
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

    // Delete State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // Stores the user object directly or null
    const [deleting, setDeleting] = useState(false);

    // Fetch Users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const endpoint = mode === 'teacher' ? 'http://localhost:5000/api/users?role=student' : 'http://localhost:5000/api/users';
            const response = await fetch(endpoint);
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

    // Initial fetch when opened
    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    // Change Role
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
                setUsers(users.map(user =>
                    user.user_id === userId ? { ...user, role: newRole } : user
                ));
                alert("เปลี่ยน Role สำเร็จ!");
            } else {
                alert("เกิดข้อผิดพลาดในการเปลี่ยน Role");
            }
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    // Delete User Logic
    const handleDeleteUser = async () => {
        if (!showDeleteConfirm) return;
        const userToDelete = showDeleteConfirm;

        setDeleting(true);

        try {
            const response = await fetch(`http://localhost:5000/api/users/${userToDelete.user_id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (response.ok) {
                setShowDeleteConfirm(null);
                fetchUsers();
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col md:h-[80vh]">

                {/* Modal Header */}
                <div className="bg-teal-700 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users size={24} /> {mode === 'teacher' ? 'Student Management' : 'User Management'}
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pt-4 flex gap-3 shrink-0">
                    <button
                        onClick={() => setShowAddUserModal(true)}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition font-semibold"
                    >
                        เพิ่มผู้ใช้
                    </button>
                    <button
                        onClick={() => setShowBulkUploadModal(true)}
                        className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition font-semibold"
                    >
                        อัปโหลด Excel
                    </button>
                </div>

                {/* Modal Body (Table) */}
                <div className="p-6 overflow-y-auto grow">
                    {loading ? (
                        <p className="text-center py-4">Loading users...</p>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr className="bg-gray-100 border-b">
                                    <th className="p-3 font-semibold text-gray-700">User ID / Student ID</th>
                                    <th className="p-3 font-semibold text-gray-700">Name</th>
                                    <th className="p-3 font-semibold text-gray-700">Surname</th>
                                    <th className="p-3 font-semibold text-gray-700">Email</th>
                                    {mode === 'admin' && (
                                        <>
                                            <th className="p-3 font-semibold text-gray-700">Current Role</th>
                                            <th className="p-3 font-semibold text-gray-700">Change Role</th>
                                        </>
                                    )}
                                    <th className="p-3 font-semibold text-gray-700"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.user_id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 text-gray-600 font-mono">{user.user_id}</td>
                                        <td className="p-3">{user.name}</td>
                                        <td className="p-3">{user.surname}</td>
                                        <td className="p-3 text-sm">{user.email}</td>
                                        {mode === 'admin' && (
                                            <>
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
                                                        onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                                                        className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                    >
                                                        <option value="student">Student</option>
                                                        <option value="teacher">Teacher</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </td>
                                            </>
                                        )}
                                        <td className="p-3">
                                            <button
                                                onClick={() => setShowDeleteConfirm(user)}
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

            {/* Sub Modals */}
            <AddUserModal
                isOpen={showAddUserModal}
                onClose={() => setShowAddUserModal(false)}
                onUserAdded={fetchUsers}
                mode={mode}
            />

            <BulkUploadModal
                isOpen={showBulkUploadModal}
                onClose={() => setShowBulkUploadModal(false)}
                onUploadComplete={fetchUsers}
                mode={mode}
            />

            <ConfirmModal
                config={showDeleteConfirm ? {
                    title: "ยืนยันการลบผู้ใช้",
                    message: `คุณต้องการลบผู้ใช้ ${showDeleteConfirm.name} ${showDeleteConfirm.surname} (${showDeleteConfirm.user_id}) หรือไม่?`,
                    type: "danger",
                    confirmText: deleting ? "กำลังลบ..." : "ลบผู้ใช้",
                    cancelText: "ยกเลิก",
                    onConfirm: handleDeleteUser
                } : null}
                onClose={() => setShowDeleteConfirm(null)}
            />

        </div>
    );
}
