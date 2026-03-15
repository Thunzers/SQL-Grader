import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Clock, BookOpen, Target, AlertTriangle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPastDue, setIsPastDue] = useState(false);
  const timerRef = useRef(null);

  // Get user ID from session
  const sessionData = JSON.parse(localStorage.getItem("session") || "{}");
  const userId = sessionData.userId;

  useEffect(() => {
    if (!assignmentId) return;

    const assignUrl = userId 
      ? `http://localhost:5000/api/assignments/${assignmentId}?user_id=${userId}`
      : `http://localhost:5000/api/assignments/${assignmentId}`;
      
    const exercisesUrl = userId
      ? `http://localhost:5000/api/assignments/${assignmentId}/exercises?user_id=${userId}`
      : `http://localhost:5000/api/assignments/${assignmentId}/exercises`;

    // Fetch Assignment Info
    Promise.all([
      fetch(assignUrl).then((res) => res.json()),
      fetch(exercisesUrl).then((res) => res.json()),
    ])
      .then(([assignmentData, exercisesData]) => {
        setAssignment(assignmentData);
        setExercises(exercisesData);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching assignment details:", error);
        setIsLoading(false);
      });
  }, [assignmentId]);

  // Real-time due_date check (every second)
  useEffect(() => {
    if (!assignment?.due_date) return;

    const checkDue = () => {
      const now = new Date();
      const due = new Date(assignment.due_date);
      if (now > due) {
        setIsPastDue(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    checkDue(); // check immediately
    timerRef.current = setInterval(checkDue, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assignment]);

  const handleSelectExercise = (exerciseId) => {
    navigate(`/exercise/${exerciseId}`);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <span className="text-green-600 text-lg">✓</span>;
      case "attempted":
        return <span className="text-yellow-600 text-lg">⚠</span>;
      default:
        return <span className="text-gray-400 text-lg">○</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading assignment...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* TOP NAVBAR */}
      <nav className="w-full bg-[#00796b] text-white px-6 py-4 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/student')}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Assignments</span>
          </button>
        </div>
      </nav>

      {/* ASSIGNMENT HEADER */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{assignment?.title}</h1>
              <p className="text-teal-100 mb-4">
                {assignment?.description || "No description available"}
              </p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded">
                  <BookOpen size={16} />
                  <span>{exercises.length} Exercises</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded">
                  <Target size={16} />
                  <span>{assignment?.category || "General"}</span>
                </div>
                {assignment?.due_date && (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded">
                    <Clock size={16} />
                    <span>
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/20 px-6 py-4 rounded-lg text-center min-w-[120px]">
              <div className="text-3xl font-bold">
                {assignment?.user_score !== undefined ? assignment.user_score : 0}
              </div>
              <div className="text-xs text-teal-100">
                / {assignment?.max_score || 0} คะแนน
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAST DUE BANNER */}
      {isPastDue && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3 text-red-700">
            <AlertTriangle size={20} />
            <span className="font-semibold">⏰ หมดเวลาแล้ว — ไม่สามารถเข้าทำโจทย์ในชุดนี้ได้อีก</span>
          </div>
        </div>
      )}

      {/* EXERCISES TABLE */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-4">Exercises</h2>

        {exercises.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No exercises found in this assignment
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Your Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exercises.map((exercise, index) => (
                  <tr
                    key={exercise.exercise_id}
                    className={`transition ${
                      isPastDue ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusIcon(exercise.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-mono text-sm">
                          {index + 1}.
                        </span>
                        <span className="font-medium text-gray-900">
                          {exercise.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                          exercise.difficulty
                        )}`}
                      >
                        {exercise.difficulty || "Medium"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {exercise.points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {exercise.user_score !== undefined &&
                        exercise.user_score !== null ? (
                        <span
                          className={`font-medium ${exercise.user_score === exercise.points
                            ? "text-green-600"
                            : exercise.user_score > 0
                              ? "text-yellow-600"
                              : "text-gray-500"
                            }`}
                        >
                          {exercise.user_score} / {exercise.points}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => !isPastDue && handleSelectExercise(exercise.exercise_id)}
                        disabled={isPastDue}
                        className={`px-4 py-2 text-sm rounded-lg transition ${
                          isPastDue
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-[#00796b] text-white hover:bg-[#00695c]"
                        }`}
                      >
                        {isPastDue ? "ปิดแล้ว" : exercise.status === "completed" ? "Review" : "Solve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
