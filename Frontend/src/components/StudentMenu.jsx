import { useState, useEffect } from "react";
import { ChevronDown, LogOut, User, BookOpen, Calendar } from "lucide-react";
import AssignmentDetail from "./AssignmentDetail";
import ExerciseSolve from "./ExerciseSolve";

export default function StudentMenu({ setIsLoggedIn, userEmail }) {
  const [openProfile, setOpenProfile] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation State
  const [currentView, setCurrentView] = useState("assignments"); // 'assignments' | 'assignment-detail' | 'exercise-solve'
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  // Fetch Assignments
  useEffect(() => {
    fetch("http://localhost:5000/api/assignments")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Loaded assignments:", data);
        setAssignments(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching assignments:", error);
        setIsLoading(false);
      });
  }, []);

  const handleAssignmentClick = (assignmentId) => {
    setSelectedAssignmentId(assignmentId);
    setCurrentView("assignment-detail");
  };

  const handleExerciseClick = (exerciseId) => {
    setSelectedExerciseId(exerciseId);
    setCurrentView("exercise-solve");
  };

  const handleBackToAssignments = () => {
    setCurrentView("assignments");
    setSelectedAssignmentId(null);
    setSelectedExerciseId(null);
  };

  const handleBackToExercises = () => {
    setCurrentView("assignment-detail");
    setSelectedExerciseId(null);
  };

  // Render based on current view
  if (currentView === "exercise-solve") {
    return (
      <ExerciseSolve
        exerciseId={selectedExerciseId}
        onBack={handleBackToExercises}
      />
    );
  }

  if (currentView === "assignment-detail") {
    return (
      <AssignmentDetail
        assignmentId={selectedAssignmentId}
        onBack={handleBackToAssignments}
        onSelectExercise={handleExerciseClick}
      />
    );
  }

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

        {/* ASSIGNMENT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {/* Loading State */}
          {isLoading && (
            <div className="col-span-full text-center py-10 text-gray-500">
              Loading assignments from database...
            </div>
          )}

          {/* Empty State */}
          {!isLoading && assignments.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              No assignments available yet
            </div>
          )}

          {/* Loop Assignments */}
          {assignments.map((assignment) => {
            const isActive =
              new Date() >= new Date(assignment.start_date) &&
              new Date() <= new Date(assignment.due_date);
            const isPast = new Date() > new Date(assignment.due_date);

            return (
              <div
                key={assignment.assign_id}
                onClick={() => handleAssignmentClick(assignment.assign_id)}
                className="bg-white rounded-xl shadow border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              >
                {/* HEADER BLOCK */}
                <div className="h-32 p-4 w-full bg-teal-600 text-white flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold line-clamp-1">
                      {assignment.title}
                    </h3>
                    <p className="text-sm opacity-80 line-clamp-2 mt-1">
                      {assignment.category || "General SQL"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isActive && (
                      <span className="bg-green-500 text-white px-2 py-1 text-xs rounded">
                        Active
                      </span>
                    )}
                    {isPast && (
                      <span className="bg-gray-500 text-white px-2 py-1 text-xs rounded">
                        Past Due
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-gray-500" />
                    <span>{assignment.exercise_count || 0} Exercises</span>
                  </div>
                  {assignment.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-500" />
                      <span>
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
