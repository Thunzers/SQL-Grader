import { useState } from "react";
import { UserPlus, X } from "lucide-react";

export default function AddUserModal({ isOpen, onClose, onUserAdded, mode = "admin", teacherId }) {
    const [newUserId, setNewUserId] = useState("");
    const [newName, setNewName] = useState("");
    const [newSurname, setNewSurname] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserRole, setNewUserRole] = useState("student");
    const [addingUser, setAddingUser] = useState(false);

    // Function to Add Single User
    const handleAddSingleUser = async (e) => {
        e.preventDefault();

        if (!newUserId.trim() || !newName.trim() || !newSurname.trim() || !newUserEmail.trim()) {
            alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
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
                    user_id: newUserId.trim(),
                    name: newName.trim(),
                    surname: newSurname.trim(),
                    email: newUserEmail.trim(),
                    role: mode === 'teacher' ? 'student' : newUserRole,
                    ...(mode === 'teacher' && teacherId ? { teacher_id: teacherId } : {}),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("เพิ่มผู้ใช้สำเร็จ!");
                setNewUserId("");
                setNewName("");
                setNewSurname("");
                setNewUserEmail("");
                setNewUserRole("student");
                onUserAdded(); // Callback to refresh parent list
                onClose();
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">

                {/* Modal Header */}
                <div className="bg-teal-700 text-white p-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <UserPlus size={22} /> เพิ่มผู้ใช้ใหม่
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full text-white">
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body (Form) */}
                <form onSubmit={handleAddSingleUser} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            รหัสนักศึกษา / User ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newUserId}
                            onChange={(e) => setNewUserId(e.target.value)}
                            placeholder="6512345678"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            ชื่อ <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="สมชาย"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            นามสกุล <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newSurname}
                            onChange={(e) => setNewSurname(e.target.value)}
                            placeholder="ใจดี"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                    </div>

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

                    {mode === 'admin' && (
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
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
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
    );
}
