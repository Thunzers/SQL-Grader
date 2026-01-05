import { useState } from "react";
import { Upload, X } from "lucide-react";

export default function BulkUploadModal({ isOpen, onClose, onUploadComplete }) {
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploading, setUploading] = useState(false);

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
                onUploadComplete(); // Refresh user list
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

    const resetBulkUpload = () => {
        setUploadFile(null);
        setUploadResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-scale-in">

                {/* Modal Header */}
                <div className="bg-indigo-700 text-white p-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Upload size={22} /> อัปโหลดผู้ใช้จาก Excel
                    </h2>
                    <button onClick={resetBulkUpload} className="hover:bg-white/20 p-1 rounded-full text-white">
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto">

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h3 className="font-semibold text-blue-900 mb-2">คำแนะนำ:</h3>
                        <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                            <li>ไฟล์ Excel/CSV ต้องมีคอลัมน์ <strong>student_id, name, surname, email</strong> (จำเป็น)</li>
                            <li>คอลัมน์ <strong>role</strong> (ไม่บังคับ) - ถ้าไม่ระบุจะเป็น student</li>
                            <li>Role ที่ใช้ได้: student, teacher, admin</li>
                            <li>รหัสนักศึกษาหรืออีเมลที่มีอยู่แล้วในระบบจะถูกข้าม</li>
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
                                accept=".xlsx,.xls,.csv"
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
    );
}
