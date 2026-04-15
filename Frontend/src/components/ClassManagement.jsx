import { useState, useEffect, useMemo } from "react";
import { Users, UserPlus, Trash2, Search, Plus, X, BookOpen, FileText } from "lucide-react";
import Notification from "./Notification";

const API_BASE = "http://localhost:5000";

export default function ClassManagement({ userId }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [tab, setTab] = useState("students"); // "students" | "assignments"

  const [enrolled, setEnrolled]   = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [search, setSearch] = useState("");

  // --- Assignment tab state ---
  const [classAssignments, setClassAssignments] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newClass, setNewClass] = useState({ code: "", name: "", semester: "" });

  const [notification, setNotification] = useState(null);
  const notify = (type, message) => setNotification({ type, message });

  // --- Fetchers ---
  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch(`${API_BASE}/api/classes`);
      const data = await res.json();
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) { notify("error", "โหลดรายการคลาสไม่สำเร็จ"); }
    finally { setLoadingClasses(false); }
  };

  const fetchAllStudents = async () => {
    try {
      // Scope to the current teacher's roster. If userId missing we
      // deliberately show nothing — the teacher must populate their
      // roster via Student Management first.
      const url = userId
        ? `${API_BASE}/api/teachers/${userId}/students`
        : null;
      if (!url) { setAllStudents([]); return; }
      const res = await fetch(url);
      const data = await res.json();
      setAllStudents(Array.isArray(data) ? data : []);
    } catch (e) { notify("error", "โหลดรายชื่อนักศึกษาไม่สำเร็จ"); }
  };

  const fetchEnrolled = async (classId) => {
    if (!classId) return;
    setLoadingEnrolled(true);
    try {
      const res = await fetch(`${API_BASE}/api/classes/${classId}/students`);
      const data = await res.json();
      setEnrolled(Array.isArray(data) ? data : []);
    } catch (e) { notify("error", "โหลดสมาชิกคลาสไม่สำเร็จ"); }
    finally { setLoadingEnrolled(false); }
  };

  const fetchClassAssignments = async (classId) => {
    if (!classId) return;
    setLoadingAssignments(true);
    try {
      const res = await fetch(`${API_BASE}/api/classes/${classId}/assignments`);
      const data = await res.json();
      setClassAssignments(Array.isArray(data) ? data : []);
    } catch (e) { notify("error", "โหลดรายการข้อสอบของคลาสไม่สำเร็จ"); }
    finally { setLoadingAssignments(false); }
  };

  const fetchMyAssignments = async () => {
    try {
      const url = userId
        ? `${API_BASE}/api/assignments?user_id=${userId}`
        : `${API_BASE}/api/assignments`;
      const res = await fetch(url);
      const data = await res.json();
      setMyAssignments(Array.isArray(data) ? data : []);
    } catch (e) { notify("error", "โหลดข้อสอบของฉันไม่สำเร็จ"); }
  };

  useEffect(() => { fetchClasses(); fetchAllStudents(); fetchMyAssignments(); }, [userId]);
  useEffect(() => {
    if (selectedClass) {
      fetchEnrolled(selectedClass.class_id);
      fetchClassAssignments(selectedClass.class_id);
    }
  }, [selectedClass]);

  // --- Actions ---
  const handleCreateClass = async () => {
    const { code, name } = newClass;
    if (!code.trim() || !name.trim()) return notify("error", "กรอก code และ name");
    try {
      const res = await fetch(`${API_BASE}/api/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClass),
      });
      const data = await res.json();
      if (!res.ok) return notify("error", data.error || "สร้างคลาสไม่สำเร็จ");
      notify("success", "สร้างคลาสเรียบร้อย");
      setShowCreate(false);
      setNewClass({ code: "", name: "", semester: "" });
      await fetchClasses();
    } catch (e) { notify("error", "เกิดข้อผิดพลาด"); }
  };

  const handleDeleteClass = async (cls) => {
    if (!cls) return;
    const ok = window.confirm(
      `ลบคลาส "${cls.name}" (${cls.code}) ?\n` +
      `การเชื่อมโยงนักศึกษา อาจารย์ และข้อสอบในคลาสนี้จะถูกลบทั้งหมด`
    );
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/classes/${cls.class_id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify("error", data.error || "ลบคลาสไม่สำเร็จ");
      notify("success", "ลบคลาสเรียบร้อย");
      if (selectedClass?.class_id === cls.class_id) setSelectedClass(null);
      await fetchClasses();
    } catch (e) { notify("error", "เกิดข้อผิดพลาด"); }
  };

  const handleEnroll = async (userId) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/classes/${selectedClass.class_id}/students`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const data = await res.json();
      if (!res.ok) return notify("error", data.error || "เพิ่มไม่สำเร็จ");
      notify("success", `เพิ่ม ${userId} เข้าคลาสแล้ว`);
      fetchEnrolled(selectedClass.class_id);
      fetchClasses();
    } catch (e) { notify("error", "เกิดข้อผิดพลาด"); }
  };

  const handleUnenroll = async (userId) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/classes/${selectedClass.class_id}/students/${userId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) return notify("error", data.error || "ลบไม่สำเร็จ");
      notify("success", "ลบนักศึกษาออกจากคลาสแล้ว");
      fetchEnrolled(selectedClass.class_id);
      fetchClasses();
    } catch (e) { notify("error", "เกิดข้อผิดพลาด"); }
  };

  const handleAddAssignment = async (assignId) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/classes/${selectedClass.class_id}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assign_id: assignId }),
        }
      );
      const data = await res.json();
      if (!res.ok) return notify("error", data.error || "เพิ่มข้อสอบไม่สำเร็จ");
      notify("success", "เพิ่มข้อสอบเข้าคลาสแล้ว");
      fetchClassAssignments(selectedClass.class_id);
      fetchClasses();
    } catch (e) { notify("error", "เกิดข้อผิดพลาด"); }
  };

  const handleRemoveAssignment = async (assignId) => {
    if (!selectedClass) return;
    const ok = window.confirm("เอาข้อสอบนี้ออกจากคลาสใช่หรือไม่?");
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/classes/${selectedClass.class_id}/assignments/${assignId}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify("error", data.error || "ลบไม่สำเร็จ");
      notify("success", "เอาข้อสอบออกจากคลาสแล้ว");
      fetchClassAssignments(selectedClass.class_id);
      fetchClasses();
    } catch (e) { notify("error", "เกิดข้อผิดพลาด"); }
  };

  // --- Derived lists ---
  const enrolledIds = useMemo(() => new Set(enrolled.map((s) => s.user_id)), [enrolled]);

  const availableStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStudents
      .filter((s) => !enrolledIds.has(s.user_id))
      .filter((s) => {
        if (!q) return true;
        return (
          String(s.user_id).toLowerCase().includes(q) ||
          String(s.name || "").toLowerCase().includes(q) ||
          String(s.surname || "").toLowerCase().includes(q) ||
          String(s.email || "").toLowerCase().includes(q)
        );
      });
  }, [allStudents, enrolledIds, search]);

  const linkedAssignIds = useMemo(
    () => new Set(classAssignments.map((a) => a.assign_id)),
    [classAssignments]
  );

  const availableAssignments = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    return myAssignments
      .filter((a) => !linkedAssignIds.has(a.assign_id))
      .filter((a) => {
        if (!q) return true;
        return (
          String(a.title || "").toLowerCase().includes(q) ||
          String(a.category_name || "").toLowerCase().includes(q)
        );
      });
  }, [myAssignments, linkedAssignIds, assignSearch]);

  return (
    <div className="flex gap-6">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* LEFT: Classes list */}
      <div className="w-1/3 bg-white rounded-xl shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Classes</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
          >
            <Plus size={14} /> New
          </button>
        </div>

        {loadingClasses ? (
          <p className="text-gray-500 text-center py-4">Loading...</p>
        ) : classes.length === 0 ? (
          <p className="text-gray-500 text-center py-4">ยังไม่มีคลาส</p>
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
            {classes.map((c) => (
              <div
                key={c.class_id}
                onClick={() => setSelectedClass(c)}
                className={`p-3 rounded-lg cursor-pointer border transition group ${
                  selectedClass?.class_id === c.class_id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">{c.code}</div>
                    <div className="font-semibold text-gray-800 truncate">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                      <span><Users size={12} className="inline mr-1" />{c.student_count || 0} students</span>
                      <span>{c.teacher_count || 0} teachers</span>
                      <span><BookOpen size={12} className="inline mr-1" />{c.assignment_count || 0} assigns</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClass(c); }}
                    className="text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-50"
                    title="Delete class"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Details */}
      <div className="flex-1 bg-white rounded-xl shadow-md p-4">
        {!selectedClass ? (
          <div className="text-center text-gray-500 py-20">
            เลือกคลาสทางด้านซ้ายเพื่อจัดการสมาชิก/ข้อสอบ
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs text-gray-500">{selectedClass.code}</div>
                <h2 className="text-xl font-bold text-gray-800">{selectedClass.name}</h2>
                {selectedClass.semester && (
                  <div className="text-sm text-gray-500">Semester: {selectedClass.semester}</div>
                )}
              </div>
              <button
                onClick={() => handleDeleteClass(selectedClass)}
                className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
              >
                <Trash2 size={14} /> Delete Class
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b mb-4">
              <button
                onClick={() => setTab("students")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  tab === "students"
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Users size={14} className="inline mr-1" /> Students
              </button>
              <button
                onClick={() => setTab("assignments")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  tab === "assignments"
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <BookOpen size={14} className="inline mr-1" /> Assignments
              </button>
            </div>

            {tab === "students" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Enrolled students */}
                <div className="border rounded-lg p-3">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users size={16} /> Enrolled ({enrolled.length})
                  </h3>
                  {loadingEnrolled ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                  ) : enrolled.length === 0 ? (
                    <p className="text-gray-500 text-sm">ยังไม่มีนักศึกษาในคลาสนี้</p>
                  ) : (
                    <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
                      {enrolled.map((s) => (
                        <li key={s.user_id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                          <div>
                            <div className="text-sm font-medium">{s.user_id}</div>
                            <div className="text-xs text-gray-500">{s.name} {s.surname} — {s.email}</div>
                          </div>
                          <button
                            onClick={() => handleUnenroll(s.user_id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                            title="Remove from class"
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Available students */}
                <div className="border rounded-lg p-3">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <UserPlus size={16} /> Add Student
                  </h3>
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ค้นหาด้วย id / name / email"
                      className="w-full pl-7 pr-2 py-1.5 text-sm border rounded"
                    />
                  </div>
                  {availableStudents.length === 0 ? (
                    <p className="text-gray-500 text-sm">ไม่มีนักศึกษาที่ตรงกับเงื่อนไข</p>
                  ) : (
                    <ul className="space-y-1 max-h-[55vh] overflow-y-auto">
                      {availableStudents.map((s) => (
                        <li key={s.user_id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                          <div>
                            <div className="text-sm font-medium">{s.user_id}</div>
                            <div className="text-xs text-gray-500">{s.name} {s.surname} — {s.email}</div>
                          </div>
                          <button
                            onClick={() => handleEnroll(s.user_id)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
                          >
                            <Plus size={12} /> Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {tab === "assignments" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Linked assignments */}
                <div className="border rounded-lg p-3">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen size={16} /> In this Class ({classAssignments.length})
                  </h3>
                  {loadingAssignments ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                  ) : classAssignments.length === 0 ? (
                    <p className="text-gray-500 text-sm">ยังไม่มีข้อสอบในคลาสนี้</p>
                  ) : (
                    <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
                      {classAssignments.map((a) => (
                        <li key={a.assign_id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                          <div className="min-w-0 pr-2">
                            <div className="text-sm font-medium truncate">
                              #{a.assign_id} — {a.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {a.category_name || "—"}
                              {a.is_active === false && <span className="ml-2 text-amber-600">(draft)</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(a.assign_id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded shrink-0"
                            title="Remove from class"
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Available assignments */}
                <div className="border rounded-lg p-3">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText size={16} /> Add Assignment
                  </h3>
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      placeholder="ค้นหาด้วย title / category"
                      className="w-full pl-7 pr-2 py-1.5 text-sm border rounded"
                    />
                  </div>
                  {availableAssignments.length === 0 ? (
                    <p className="text-gray-500 text-sm">ไม่มีข้อสอบที่จะเพิ่ม</p>
                  ) : (
                    <ul className="space-y-1 max-h-[55vh] overflow-y-auto">
                      {availableAssignments.map((a) => (
                        <li key={a.assign_id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                          <div className="min-w-0 pr-2">
                            <div className="text-sm font-medium truncate">
                              #{a.assign_id} — {a.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {a.category_name || "—"}
                              {a.is_active === false && <span className="ml-2 text-amber-600">(draft)</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddAssignment(a.assign_id)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 shrink-0"
                          >
                            <Plus size={12} /> Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create class modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Create Class</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-black">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-700">Code</label>
                <input
                  className="w-full border rounded px-2 py-1.5"
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                  placeholder="e.g. CS101-2568-S1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Name</label>
                <input
                  className="w-full border rounded px-2 py-1.5"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="e.g. Intro to SQL"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Semester</label>
                <input
                  className="w-full border rounded px-2 py-1.5"
                  value={newClass.semester}
                  onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                  placeholder="e.g. 2568/1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClass}
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
