import { useState, useEffect, useMemo } from "react";
import { ChevronDown, LogOut, User, BookOpen, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StudentMenu({ setIsLoggedIn, userEmail, userId }) {
  const navigate = useNavigate();
  const [openProfile, setOpenProfile] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Assignments
  useEffect(() => {
    const url = userId 
      ? `http://localhost:5000/api/assignments?user_id=${userId}`
      : "http://localhost:5000/api/assignments";
      
    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Loaded assignments:", data);
        setAssignments(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching assignments:", error);
        setIsLoading(false);
      });
  }, [userId]);

  const handleAssignmentClick = (assignmentId) => {
    navigate(`/assignment/${assignmentId}`);
  };

  // Group assignments by class. Backend returns one row per (class,
  // assignment) pair, with class_id=null for individual overrides.
  const groupedByClass = useMemo(() => {
    const groups = new Map();
    for (const a of assignments) {
      const key = a.class_id ?? `__individual__`;
      if (!groups.has(key)) {
        groups.set(key, {
          class_id: a.class_id,
          class_code: a.class_code,
          class_name: a.class_name,
          items: [],
        });
      }
      groups.get(key).items.push(a);
    }
    // Order: real classes first (by code), individual bucket last.
    return Array.from(groups.values()).sort((x, y) => {
      if (x.class_id == null) return 1;
      if (y.class_id == null) return -1;
      return String(x.class_code).localeCompare(String(y.class_code));
    });
  }, [assignments]);

  // Default: Assignments List View
  return (
    <div className="min-h-screen bg-white">
      {/* TOP NAVBAR */}
      <nav className="w-full bg-[#00796b] text-white px-6 py-4 flex justify-between items-center shadow-md">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/40 rounded-full flex flex-col items-center justify-center text-xs font-semibold">
              <span>Grader</span>
              <span>SQL</span>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="relative">
          <div
            onClick={() => setOpenProfile(!openProfile)}
            className="cursor-pointer flex items-center gap-2 hover:opacity-80 transition"
          >
            <span className="text-sm">{userEmail}</span>
            <ChevronDown size={20} />
          </div>

          {openProfile && (
            <div className="absolute right-0 mt-2 w-44 bg-white text-black rounded-lg shadow-lg overflow-hidden z-50">
              <button
                className="w-full px-4 py-3 flex items-center gap-2 text-red-600 hover:bg-gray-100"
                onClick={() => setIsLoggedIn(false)}
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* TAB */}
      <div className="px-6 pt-4">
        <div className="border-b text-gray-700">
          <button className="pb-2 border-b-2 border-black font-semibold">
            Current Assignments
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-6 mt-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-semibold">My Assignments</h2>
            <p className="text-sm text-gray-600">
            </p>
          </div>
        </div>

        {/* Loading / Empty */}
        {isLoading && (
          <div className="text-center py-10 text-gray-500">
            Loading assignments from database...
          </div>
        )}
        {!isLoading && assignments.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No assignments available yet
          </div>
        )}

        {/* Grouped by class */}
        {!isLoading && groupedByClass.map((group) => (
          <section key={group.class_id ?? "individual"} className="mt-8">
            <div className="flex items-baseline gap-3 border-b pb-2 mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {group.class_id == null
                  ? "Individual Assignments"
                  : group.class_name || group.class_code}
              </h3>
              {group.class_id != null && group.class_code && (
                <span className="text-sm text-gray-500 font-mono">{group.class_code}</span>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {group.items.length} {group.items.length === 1 ? "assignment" : "assignments"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {group.items.map((assignment) => {
                const hasDueDate = !!assignment.due_date;
                const now = new Date();
                const startDate = new Date(assignment.start_date);
                const dueDate = hasDueDate ? new Date(assignment.due_date) : null;

                const isActive = now >= startDate && (!hasDueDate || now <= dueDate);
                const isPast = hasDueDate && now > dueDate;
                const isUpcoming = now < startDate;

                return (
                  <div
                    key={`${group.class_id ?? "ind"}-${assignment.assign_id}`}
                    onClick={() => !isPast && !isUpcoming && handleAssignmentClick(assignment.assign_id)}
                    className={`rounded-xl shadow border border-gray-200 transition-all duration-200 ${
                      isPast || isUpcoming
                        ? "bg-gray-100 cursor-not-allowed opacity-75"
                        : "bg-white hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
                    }`}
                  >
                    <div className={`h-32 p-4 w-full text-white flex flex-col justify-between rounded-t-xl ${
                      isPast ? "bg-gray-400" : isUpcoming ? "bg-yellow-500" : "bg-teal-600"
                    }`}>
                      <div>
                        <h3 className="text-xl font-bold line-clamp-1">
                          {assignment.title}
                        </h3>
                        <p className="text-sm opacity-80 line-clamp-2 mt-1">
                          {assignment.category_name || "General SQL"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {isActive && (
                          <span className="bg-green-500 text-white px-2 py-1 text-xs rounded shadow-sm font-medium">
                            Active
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="bg-orange-500 text-white px-2 py-1 text-xs rounded shadow-sm font-medium">
                            Upcoming
                          </span>
                        )}
                        {isPast && (
                          <span className="bg-gray-600 text-white px-2 py-1 text-xs rounded shadow-sm font-medium">
                            Past Due
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-3 space-y-2 text-sm text-gray-700">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-gray-500" />
                          <span>{assignment.completed_exercises || 0} / {assignment.exercise_count || 0} ผ่านแล้ว</span>
                        </div>
                        {assignment.user_score !== undefined && (
                          <div className="font-semibold text-teal-700">
                            {assignment.user_score} / {assignment.max_score || 0} คะแนน
                          </div>
                        )}
                      </div>
                      {assignment.due_date && (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-500" />
                          <span>
                            Due: {new Date(assignment.due_date).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
