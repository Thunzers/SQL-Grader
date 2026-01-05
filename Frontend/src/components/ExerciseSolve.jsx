import { useState, useEffect } from "react";
import { ArrowLeft, Play, Check, AlertCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import MonacoSQLEditor from "./MonacoSQLEditor";
import SubmitResultModal from "./SubmitResultModal";
import ConfirmModal from "./ConfirmModal";

export default function ExerciseSolve() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [query, setQuery] = useState("-- Write your SQL query here\n");
  const [results, setResults] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeRightTab, setActiveRightTab] = useState("editor");
  const [error, setError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Fetch Exercise Detail
  useEffect(() => {
    if (!exerciseId) return;

    fetch(`http://localhost:5000/api/exercises/${exerciseId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch exercise');
        return res.json();
      })
      .then((data) => {
        setExercise(data);
        // Fetch Dataset
        if (data.dataset_id) {
          return fetch(`http://localhost:5000/api/datasets/${data.dataset_id}`);
        }
      })
      .then((res) => {
        if (!res) return null;
        if (!res.ok) throw new Error('Failed to fetch dataset');
        return res.json();
      })
      .then((datasetData) => {
        if (datasetData) {
          setDataset(datasetData);
        }
      })
      .catch((err) => {
        console.error("Error fetching exercise:", err);
        setError("Failed to load exercise: " + err.message);
      });
  }, [exerciseId]);

  // Run SQL (Test without submitting)
  const handleRun = async () => {
    if (!query.trim()) {
      setError("Please write a SQL query first");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);
    setTestResults(null);

    try {
      // Old: /api/run-sql -> New: /api/exercises/{id}/run
      const response = await fetch(`http://localhost:5000/api/exercises/${exerciseId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || data.error || "SQL execution failed");
      } else {
        // Updated Response: { success, query_result, test_results }
        setResults(data.query_result);
        setTestResults(data.test_results);

        // Show both tabs logic? Or just switch to results and let them check test cases?
        // Let's stick to showing Results tab first, but now they can check Test Cases tab too.
        setActiveRightTab("results");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Solution
  const handleSubmit = async () => {
    if (!query.trim()) {
      setError("Please write a SQL query first");
      return;
    }

    // Show confirmation modal
    setConfirmModal({
      title: "ยืนยันการส่งคำตอบ",
      message: "คุณต้องการส่งคำตอบนี้หรือไม่?",
      type: "warning",
      confirmText: "ส่งคำตอบ",
      cancelText: "ยกเลิก",
      onConfirm: async () => {
        const studentId = localStorage.getItem("student_id");

        setIsSubmitting(true);
        setError(null);

        try {
          const response = await fetch(
            `http://localhost:5000/api/exercises/${exerciseId}/submit`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: query,
                student_id: studentId,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            setError(data.error || data.detail || "Submission failed");
            console.error("Submission failed:", data);
          } else {
            console.log("Submission successful:", data);

            // Show test results from submission
            setTestResults(data);
            setActiveRightTab("testcases");

            // Show modal with results
            setSubmitResult(data);
            setShowResultModal(true);
            console.log("Modal should be shown now");
          }
        } catch (err) {
          setError("Network error: " + err.message);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading exercise...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* TOP NAVBAR */}
      <nav className="w-full bg-[#00796b] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Exercises</span>
          </button>
          <div className="border-l border-white/30 h-6"></div>
          <h1 className="text-lg font-semibold">{exercise.title}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="bg-white/20 px-3 py-1 rounded">
            Attempts: {exercise.attempts_left || "∞"} left
          </span>
          <span className="bg-white/20 px-3 py-1 rounded">
            Points: {exercise.points}
          </span>
        </div>
      </nav>

      {/* SPLIT SCREEN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Problem Description */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveTab("description")}
              className={`px-6 py-3 text-sm font-medium transition ${activeTab === "description"
                ? "border-b-2 border-[#00796b] text-[#00796b] bg-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("dataset")}
              className={`px-6 py-3 text-sm font-medium transition ${activeTab === "dataset"
                ? "border-b-2 border-[#00796b] text-[#00796b] bg-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Dataset
            </button>
            {/* <button
              onClick={() => setActiveTab("hints")}
              className={`px-6 py-3 text-sm font-medium transition ${activeTab === "hints"
                ? "border-b-2 border-[#00796b] text-[#00796b] bg-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Hints
            </button> */}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "description" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{exercise.title}</h2>
                  <div className="flex gap-2 mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${exercise.difficulty === "Easy"
                        ? "bg-green-100 text-green-800"
                        : exercise.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                        }`}
                    >
                      {exercise.difficulty}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {exercise.points} points
                    </span>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {exercise.description || "No description available."}
                  </p>
                </div>

                {exercise.expected_output && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">
                      Expected Output
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {exercise.expected_output}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "dataset" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dataset Schema</h3>
                {dataset ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium mb-2 text-sm text-gray-700">
                        Schema SQL:
                      </h4>
                      <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                        {dataset.schema_sql}
                      </pre>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium mb-2 text-sm text-gray-700">
                        Sample Data:
                      </h4>
                      <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                        {dataset.seed_data_sql}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No dataset information</p>
                )}
              </div>
            )}

            {activeTab === "hints" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Hints</h3>
                {exercise.hints ? (
                  <div className="space-y-2">
                    {exercise.hints.split("\n").map((hint, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"
                      >
                        <span className="text-yellow-600">💡</span>
                        <p className="text-gray-700">{hint}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No hints available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Code Editor */}
        <div className="w-1/2 flex flex-col bg-white">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveRightTab("editor")}
              className={`px-6 py-3 text-sm font-medium transition ${activeRightTab === "editor"
                ? "border-b-2 border-[#00796b] text-[#00796b] bg-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              SQL Editor
            </button>
            <button
              onClick={() => setActiveRightTab("results")}
              className={`px-6 py-3 text-sm font-medium transition ${activeRightTab === "results"
                ? "border-b-2 border-[#00796b] text-[#00796b] bg-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Results
            </button>
            <button
              onClick={() => setActiveRightTab("testcases")}
              className={`px-6 py-3 text-sm font-medium transition ${activeRightTab === "testcases"
                ? "border-b-2 border-[#00796b] text-[#00796b] bg-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Test Cases
            </button>
          </div>

          {/* Editor Tab */}
          {activeRightTab === "editor" && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-hidden">
                <MonacoSQLEditor value={query} onChange={setQuery} />
              </div>
              <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isRunning ? "Running..." : "Run"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-[#00796b] text-white rounded-lg hover:bg-[#00695c] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeRightTab === "results" && (
            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p className="text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {results && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Query Results</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b border-gray-200">
                          <tr>
                            {results.columns?.map((col, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-2 text-left font-medium text-gray-700"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(results.rows) && results.rows.map((row, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              {Array.isArray(row)
                                ? row.map((cell, cellIdx) => (
                                  <td
                                    key={cellIdx}
                                    className="px-4 py-2 text-gray-700"
                                  >
                                    {cell === null ? (
                                      <span className="text-gray-400 italic">
                                        NULL
                                      </span>
                                    ) : (
                                      String(cell)
                                    )}
                                  </td>
                                ))
                                : typeof row === 'object' && row !== null
                                  ? results.columns?.map((col, cellIdx) => (
                                    <td
                                      key={cellIdx}
                                      className="px-4 py-2 text-gray-700"
                                    >
                                      {row[col] === null || row[col] === undefined ? (
                                        <span className="text-gray-400 italic">
                                          NULL
                                        </span>
                                      ) : (
                                        String(row[col])
                                      )}
                                    </td>
                                  ))
                                  : (
                                    <td className="px-4 py-2 text-gray-700">
                                      {String(row)}
                                    </td>
                                  )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {results.row_count} row(s) returned
                  </p>
                </div>
              )}

              {!results && !error && (
                <div className="text-center text-gray-500 py-10">
                  Run your query to see results here
                </div>
              )}
            </div>
          )}

          {/* Test Cases Tab */}
          {activeRightTab === "testcases" && (
            <div className="flex-1 overflow-y-auto p-4">
              {testResults && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg border-2 ${testResults.is_correct
                      ? "bg-green-50 border-green-500"
                      : "bg-red-50 border-red-500"
                      }`}
                  >
                    <h3
                      className={`text-lg font-bold ${testResults.is_correct
                        ? "text-green-800"
                        : "text-red-800"
                        }`}
                    >
                      {testResults.is_correct
                        ? "✓ All Tests Passed!"
                        : "✗ Some Tests Failed"}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${testResults.is_correct
                        ? "text-green-700"
                        : "text-red-700"
                        }`}
                    >
                      Score: {testResults.total_score} / {testResults.max_score}
                    </p>
                  </div>

                  {testResults.results?.map((result, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${result.is_passed
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg ${result.is_passed
                              ? "text-green-600"
                              : "text-red-600"
                              }`}
                          >
                            {result.is_passed ? "✓" : "✗"}
                          </span>
                          <span className="font-medium">
                            {result.case_name}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-medium ${result.is_passed
                            ? "text-green-700"
                            : "text-red-700"
                            }`}
                        >
                          {result.points_earned} / {result.max_points} pts
                        </span>
                      </div>
                      {result.error && (
                        <p className="text-sm text-red-600 mt-2">
                          {result.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!testResults && (
                <div className="text-center text-gray-500 py-10">
                  Submit your solution to see test case results
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Submit Result Modal */}
      <SubmitResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={submitResult}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        config={confirmModal}
        onClose={() => setConfirmModal(null)}
      />
    </div>
  );
}
