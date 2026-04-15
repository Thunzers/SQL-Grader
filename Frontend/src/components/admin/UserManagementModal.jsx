import { useState, useEffect, useMemo } from "react";
import { Users, X, UserPlus, Upload, Trash2, Search, Plus } from "lucide-react";
import AddUserModal from "./AddUserModal";
import BulkUploadModal from "./BulkUploadModal";
import ConfirmModal from "../ConfirmModal";

export default function UserManagementModal({ isOpen, onClose, mode = "admin", userId }) {
    const isTeacher = mode === "teacher";

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Teacher-mode: roster picker state
    const [showPicker, setShowPicker] = useState(false);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerLoading, setPickerLoading] = useState(false);

    // Admin-mode sub-modals
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

    // Delete / remove confirm
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const endpoint = isTeacher
                ? (userId
                    ? `http://localhost:5000/api/teachers/${userId}/students`
                    : null)
                : "http://localhost:5000/api/users";
            if (!endpoint) { setUsers([]); return; }
            const response = await fetch(endpoint);
            const data = await response.json();
            const usersData = Array.isArray(data)
                ? data.slice().sort((a, b) => String(a.user_id).localeCompare(String(b.user_id)))
                : data;
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
            alert("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableStudents = async () => {
        if (!isTeacher || !userId) return;
        setPickerLoading(true);
        try {
            const res = await fetch(
                `http://localhost:5000/api/teachers/${userId}/students/available`
            );
            const data = await res.json();
            setAvailableStudents(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Error fetching available students:", e);
        } finally {
            setPickerLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchUsers();
    }, [isOpen, userId]);

    const handleRoleChange = async (uid, newRole) => {
        try {
            const response = await fetch(`http://localhost:5000/api/users/${uid}/role`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            if (response.ok) {
                setUsers(users.map((u) =>
                    u.user_id === uid ? { ...u, role: newRole } : u
                ));
                alert("เปลี่ยน Role สำเร็จ!");
            } else {
                alert("เกิดข้อผิดพลาดในการเปลี่ยน Role");
            }
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    const handleDeleteUser = async () => {
        if (!showDeleteConfirm) return;
        const userToDelete = showDeleteConfirm;
        setDeleting(true);
        try {
            // Teacher mode: remove from MY roster (keeps account).
            // Admin mode: delete the account entirely.
            const endpoint = isTeacher
                ? `http://localhost:5000/api/teachers/${userId}/students/${userToDelete.user_id}`
                : `http://localhost:5000/api/users/${userToDelete.user_id}`;
            const response = await fetch(endpoint, { method: "DELETE" });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                setShowDeleteConfirm(null);
                fetchUsers();
            } else {
                alert(data.error || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
        } finally {
            setDeleting(false);
        }
    };

    const handleAddToRoster = async (studentId) => {
        if (!userId) return;
        try {
            const res = await fetch(
                `http://localhost:5000/api/teachers/${userId}/students`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_id: studentId }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { alert(data.error || "เพิ่มไม่สำเร็จ"); return; }
            fetchAvailableStudents();
            fetchUsers();
        } catch (e) {
            console.error(e);
            alert("เกิดข้อผิดพลาด");
        }
    };

    const openPicker = () => {
        setPickerSearch("");
        fetchAvailableStudents();
        setShowPicker(true);
    };

    const filteredAvailable = useMemo(() => {
        const q = pickerSearch.trim().toLowerCase();
        if (!q) return availableStudents;
        return availableStudents.filter((s) => (
            String(s.user_id).toLowerCase().includes(q) ||
            String(s.name || "").toLowerCase().includes(q) ||
            String(s.surname || "").toLowerCase().includes(q) ||
            String(s.email || "").toLowerCase().includes(q)
        ));
    }, [availableStudents, pickerSearch]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col md:h-[80vh]">

                <div className="bg-teal-700 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users size={24} /> {isTeacher ? "Student Management (My Roster)" : "User Management"}
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 pt-4 flex gap-3 shrink-0">
                    {isTeacher ? (
                        <button
                            onClick={openPicker}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition font-semibold"
                        >
                            <UserPlus size={16} /> เพิ่มนักศึกษาเข้ารายการของฉัน
                        </button>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>

                <div className="p-6 overflow-y-auto grow">
                    {loading ? (
                        <p className="text-center py-4">Loading users...</p>
                    ) : users.length === 0 ? (
                        <p className="text-center py-10 text-gray-500">
                            {isTeacher
                                ? "ยังไม่มีนักศึกษาในรายการ — กดปุ่มด้านบนเพื่อเพิ่ม"
                                : "ไม่มีผู้ใช้"}
                        </p>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr className="bg-gray-100 border-b">
                                    <th className="p-3 font-semibold text-gray-700">User ID / Student ID</th>
                                    <th className="p-3 font-semibold text-gray-700">Name</th>
                                    <th className="p-3 font-semibold text-gray-700">Surname</th>
                                    <th className="p-3 font-semibold text-gray-700">Email</th>
                                    {!isTeacher && (
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
                                        {!isTeacher && (
                                            <>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                        ${user.role === "admin" ? "bg-purple-100 text-purple-700" :
                                                            user.role === "teacher" ? "bg-blue-100 text-blue-700" :
                                                                "bg-green-100 text-green-700"}`}>
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
                                                title={isTeacher ? "เอาออกจากรายการ" : "ลบผู้ใช้"}
                                            >
                                                <Trash2 size={16} /> {isTeacher ? "เอาออก" : "ลบ"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Admin sub-modals */}
            {!isTeacher && (
                <>
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
                </>
            )}

            {/* Teacher roster picker */}
            {isTeacher && showPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                        <div className="bg-teal-700 text-white p-4 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <UserPlus size={20} /> เพิ่มนักศึกษาเข้ารายการของฉัน
                            </h3>
                            <button onClick={() => setShowPicker(false)} className="hover:bg-white/20 p-1 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={pickerSearch}
                                    onChange={(e) => setPickerSearch(e.target.value)}
                                    placeholder="ค้นหาด้วย id / name / email"
                                    className="w-full pl-7 pr-2 py-1.5 text-sm border rounded"
                                />
                            </div>
                        </div>
                        <div className="p-4 overflow-y-auto grow">
                            {pickerLoading ? (
                                <p className="text-gray-500 text-center py-4">Loading...</p>
                            ) : filteredAvailable.length === 0 ? (
                                <p className="text-gray-500 text-center py-10">ไม่พบนักศึกษา</p>
                            ) : (
                                <ul className="space-y-1">
                                    {filteredAvailable.map((s) => (
                                        <li key={s.user_id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 border">
                                            <div>
                                                <div className="text-sm font-medium font-mono">{s.user_id}</div>
                                                <div className="text-xs text-gray-500">{s.name} {s.surname} — {s.email}</div>
                                            </div>
                                            <button
                                                onClick={() => handleAddToRoster(s.user_id)}
                                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1"
                                            >
                                                <Plus size={12} /> เพิ่ม
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="p-3 border-t flex justify-end">
                            <button
                                onClick={() => setShowPicker(false)}
                                className="px-3 py-1.5 rounded border"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                config={showDeleteConfirm ? {
                    title: isTeacher ? "ยืนยันการเอาออกจากรายการ" : "ยืนยันการลบผู้ใช้",
                    message: isTeacher
                        ? `เอา ${showDeleteConfirm.name} ${showDeleteConfirm.surname} (${showDeleteConfirm.user_id}) ออกจากรายการของคุณ?\nบัญชีของนักศึกษาจะยังคงอยู่`
                        : `คุณต้องการลบผู้ใช้ ${showDeleteConfirm.name} ${showDeleteConfirm.surname} (${showDeleteConfirm.user_id}) หรือไม่?`,
                    type: "danger",
                    confirmText: deleting ? "กำลังดำเนินการ..." : (isTeacher ? "เอาออก" : "ลบผู้ใช้"),
                    cancelText: "ยกเลิก",
                    onConfirm: handleDeleteUser
                } : null}
                onClose={() => setShowDeleteConfirm(null)}
            />

        </div>
    );
}
