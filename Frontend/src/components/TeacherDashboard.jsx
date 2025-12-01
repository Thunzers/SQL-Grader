import { useState } from "react";
import { ChevronDown, LogOut, User, FilePlus, Users, ClipboardList } from "lucide-react";

export default function TeacherDashboard({ setIsLoggedIn, userEmail }) {
  const [openProfile, setOpenProfile] = useState(false);

  const courses = [
    { code: "TEACHER 101", name: "Introduction to SQL", students: 40 },
    { code: "COM 111", name: "Computer Basics", students: 35 },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* NAVBAR */}
      <nav className="w-full bg-[#00796b] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-8">
          
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/40 rounded-full flex flex-col items-center justify-center text-xs font-semibold">
              <span>Grader</span>
              <span>SQL</span>
            </div>
            <span className="text-lg font-semibold">Teacher Panel</span>
          </div>

          <div className="flex gap-6 text-sm opacity-80">
            <button className="hover:opacity-100">My Courses</button>
            <button className="hover:opacity-100">Assignments</button>
            <button className="hover:opacity-100">Students</button>
          </div>
        </div>

        {/* PROFILE DROPDOWN */}
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
              <button className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-100">
                <User size={18} /> Profile
              </button>
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

      {/* HEADER */}
      <div className="px-6 mt-6">
        <h2 className="text-2xl font-semibold">My Teaching Courses</h2>
        <p className="text-sm text-gray-600">
          Manage your subjects and class materials.
        </p>
      </div>

      {/* COURSE GRID */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">

        {courses.map((c, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl shadow border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 p-5 cursor-pointer"
          >
            <h3 className="text-xl font-bold">{c.code}</h3>
            <p className="text-gray-700">{c.name}</p>

            <div className="flex justify-between mt-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Users size={16} /> {c.students} Students
              </span>
              <span className="flex items-center gap-1">
                <ClipboardList size={16} /> Assignments
              </span>
            </div>
          </div>
        ))}

        {/* Add new course button */}
        <button className="bg-teal-600 text-white rounded-xl shadow hover:bg-teal-700 transition flex flex-col items-center justify-center p-6">
          <FilePlus size={40} />
          <span className="mt-2 font-semibold">Create Course</span>
        </button>

      </div>

    </div>
  );
}
