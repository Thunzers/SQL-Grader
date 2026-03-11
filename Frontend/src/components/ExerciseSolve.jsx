import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Play, Send, AlertCircle, ChevronUp, ChevronDown, Database, Lightbulb, FileText, CheckCircle2, XCircle, Loader2, Terminal, GripVertical, AlertTriangle, List } from "lucide-react";
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
  const [outputTab, setOutputTab] = useState("output");
  const [error, setError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  
  // Resize States
  const [outputOpen, setOutputOpen] = useState(false);
  const [outputHeight, setOutputHeight] = useState(250);
  const [leftWidth, setLeftWidth] = useState(420);
  const [isDragging, setIsDragging] = useState(false);

  // Due date expiry
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const dueTimerRef = useRef(null);

  // Problem List Sidebar
  const [showProblemList, setShowProblemList] = useState(false);
  const [assignmentExercises, setAssignmentExercises] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const sessionData = JSON.parse(localStorage.getItem("session") || "{}");
  const studentId = sessionData.studentId;

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

  // Fetch Assignment Exercises for Sidebar
  useEffect(() => {
    if (!exercise?.assign_id) return;
    
    setLoadingList(true);
    const url = studentId 
      ? `http://localhost:5000/api/assignments/${exercise.assign_id}/exercises?student_id=${studentId}`
      : `http://localhost:5000/api/assignments/${exercise.assign_id}/exercises`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setAssignmentExercises(data);
        setLoadingList(false);
      })
      .catch(err => {
        console.error("Error fetching assignment exercises:", err);
        setLoadingList(false);
      });
  }, [exercise?.assign_id, studentId]);

  // Real-time due_date check — auto-redirect when expired
  useEffect(() => {
    if (!exercise?.assignment_due_date) return;

    const checkDue = () => {
      const now = new Date();
      const due = new Date(exercise.assignment_due_date);
      if (now > due) {
        setShowExpiredModal(true);
        if (dueTimerRef.current) clearInterval(dueTimerRef.current);
      }
    };

    checkDue();
    dueTimerRef.current = setInterval(checkDue, 1000);

    return () => {
      if (dueTimerRef.current) clearInterval(dueTimerRef.current);
    };
  }, [exercise]);

  // Keyboard shortcut: Ctrl+Enter to Run
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query]);

  // --- Resizing Logic ---

  // Bottom Output Panel Resize
  const handleOutputDragStart = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = outputHeight;
    setIsDragging(true);

    const handleMouseMove = (e) => {
      const diff = startY - e.clientY;
      const newHeight = Math.min(Math.max(startHeight + diff, 120), 600);
      setOutputHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [outputHeight]);

  // Left/Right Panel Resize
  const handleVerticalDragStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    setIsDragging(true);

    const handleMouseMove = (e) => {
      const diff = e.clientX - startX;
      // Min width 300px, Max width 800px
      const newWidth = Math.min(Math.max(startWidth + diff, 300), 800);
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [leftWidth]);

  // --- Run / Submit Logic ---

  const handleRun = async () => {
    if (!query.trim()) {
      setError("Please write a SQL query first");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);
    setTestResults(null);
    setOutputOpen(true);
    setOutputTab("output");

    try {
      const studentId = localStorage.getItem("student_id");
      const response = await fetch(`http://localhost:5000/api/exercises/${exerciseId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, student_id: studentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || data.error || "SQL execution failed");
      } else {
        setResults(data.query_result);
        setTestResults(data.test_results);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = async () => {
    setConfirmModal({
      title: "ยืนยันการเริ่มใหม่",
      message: "ระบบจะล้างตารางและข้อมูลที่คุณเคยสร้างไว้ทั้งหมด กลับไปเป็นเหมือนตอนเริ่มแรก คุณแน่ใจหรือไม่?",
      type: "warning",
      confirmText: "เริ่มใหม่ (Reset)",
      cancelText: "ยกเลิก",
      onConfirm: async () => {
        const studentId = localStorage.getItem("student_id");
        setError(null);
        setResults(null);
        setTestResults(null);
        
        try {
          const response = await fetch(`http://localhost:5000/api/exercises/${exerciseId}/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId }),
          });
          
          if (!response.ok) {
            const data = await response.json();
            setError(data.error || "Failed to reset sandbox");
          } else {
            // Optional: Show a brief success message
            setOutputOpen(false);
          }
        } catch (err) {
          setError("Network error: " + err.message);
        }
      }
    });
  };

  const handleSubmit = async () => {
    if (!query.trim()) {
      setError("Please write a SQL query first");
      return;
    }

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
              body: JSON.stringify({ query, student_id: studentId }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            setError(data.error || data.detail || "Submission failed");
          } else {
            setTestResults(data);
            setOutputOpen(true);
            setOutputTab("testcases");
            setSubmitResult(data);
            setShowResultModal(true);
          }
        } catch (err) {
          setError("Network error: " + err.message);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  // Difficulty badge config (Light Theme)
  const difficultyConfig = {
    easy: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", label: "Easy" },
    medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", label: "Medium" },
    hard: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", label: "Hard" },
  };

  const getDifficulty = (d) => difficultyConfig[(d || "easy").toLowerCase()] || difficultyConfig.easy;

  if (!exercise) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="animate-spin text-teal-600" />
          <span className="text-gray-500 text-sm">Loading exercise...</span>
        </div>
      </div>
    );
  }

  const diff = getDifficulty(exercise.difficulty);
  const totalPassed = testResults?.results?.filter(r => r.is_passed).length || 0;
  const totalTests = testResults?.results?.length || 0;

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden font-sans">

      {/* === TOP NAVBAR === */}
      <nav className="flex-shrink-0 bg-[#00796b] text-white px-4 py-2 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-white/80 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all text-sm"
          >
            <ArrowLeft size={16} />
          </button>
          
          <button
            onClick={() => setShowProblemList(true)}
            className="flex items-center gap-2 text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all text-sm font-medium"
          >
            <List size={16} />
            <span className="hidden sm:inline">Problem List</span>
            {assignmentExercises.length > 0 && (
              <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                {assignmentExercises.filter(e => e.status === 'completed').length}/{assignmentExercises.length} Solved
              </span>
            )}
          </button>

          <div className="w-px h-5 bg-white/20 mx-1"></div>
          <h1 className="text-sm font-semibold truncate max-w-xs">{exercise.title}</h1>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30`}>
            {exercise.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
           <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
            <span className="text-white/80">Attempts</span>
            <span className="font-semibold">{exercise.attempts_left || "∞"}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
            <span className="text-white/80">Points</span>
            <span className="font-semibold">{exercise.points}</span>
          </div>
        </div>
      </nav>

      {/* === MAIN CONTENT (Split) === */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL — Description */}
        <div 
          className="flex flex-col bg-white border-r border-gray-200 flex-shrink-0"
          style={{ width: leftWidth }}
        >
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <button
              onClick={() => setActiveTab("description")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all ${
                activeTab === "description"
                  ? "text-teal-700 border-b-2 border-teal-600 bg-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FileText size={14} />
              Description
            </button>
            <button
              onClick={() => setActiveTab("dataset")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all ${
                activeTab === "dataset"
                  ? "text-teal-700 border-b-2 border-teal-600 bg-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Database size={14} />
              Dataset
            </button>
            {exercise.hint && (
              <button
                onClick={() => setActiveTab("hints")}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all ${
                  activeTab === "hints"
                    ? "text-teal-700 border-b-2 border-teal-600 bg-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Lightbulb size={14} />
                Hints
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 transition-opacity duration-200">
            {activeTab === "description" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">{exercise.title}</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${diff.bg} ${diff.text} ${diff.border}`}>
                      {diff.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                      {exercise.points} points
                    </span>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-wrap">
                    {exercise.description || "No description available."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "dataset" && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Database size={16} className="text-teal-600" />
                  Dataset Schema
                </h3>
                {dataset ? (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Schema SQL</p>
                      <pre className="text-xs bg-gray-50 text-gray-800 p-4 rounded-lg overflow-x-auto border border-gray-200 font-mono shadow-sm">
                        {dataset.schema_sql}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Sample Data</p>
                      <pre className="text-xs bg-gray-50 text-gray-800 p-4 rounded-lg overflow-x-auto border border-gray-200 font-mono shadow-sm">
                        {dataset.seed_data_sql}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Database size={28} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No dataset information</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "hints" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Lightbulb size={16} className="text-amber-500" />
                  Hints
                </h3>
                {exercise.hint ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                    <p className="text-amber-800 text-sm flex items-start gap-2">
                      <span className="mt-0.5">💡</span>
                      {exercise.hint}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No hints available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RESIZE HANDLE (Vertical) */}
        <div
          className="w-1 bg-gray-200 hover:bg-teal-500 cursor-col-resize flex items-center justify-center transition-colors z-20 group"
          onMouseDown={handleVerticalDragStart}
        >
          <GripVertical size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* RIGHT PANEL — Editor + Output */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">

          {/* Editor Toolbar */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 shadow-sm z-10">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 border border-gray-200 text-gray-600">
                <Terminal size={14} className="text-teal-600" />
                <span className="text-xs font-semibold">SQL Editor</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-red-200 active:scale-95"
              >
                <AlertCircle size={14} />
                เริ่มใหม่
              </button>
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 active:scale-95"
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} className="text-teal-600" />
                )}
                {isRunning ? "Running..." : "Run"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow active:scale-95"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <MonacoSQLEditor value={query} onChange={setQuery} />
          </div>

          {/* Output Panel */}
          <div
            className={`flex-shrink-0 border-t border-gray-300 bg-white flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 ${!isDragging ? "transition-all duration-300 ease-in-out" : ""}`}
            style={{ height: outputOpen ? outputHeight : 36 }}
          >
            {/* Drag Handle + Result Tabs */}
            <div
              className={`flex items-center justify-between px-2 bg-gray-50 border-b border-gray-200 ${outputOpen ? "cursor-ns-resize hover:bg-gray-100" : "cursor-pointer hover:bg-gray-100"}`}
              onMouseDown={outputOpen ? handleOutputDragStart : undefined}
              onClick={() => { if (!outputOpen) setOutputOpen(true); }}
            >
              <div className="flex items-center">
                <button
                  onClick={(e) => { e.stopPropagation(); setOutputOpen(!outputOpen); }}
                  className="p-1 hover:bg-gray-200 rounded transition mr-2"
                >
                  {outputOpen ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
                </button>
                
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOutputTab("output"); if (!outputOpen) setOutputOpen(true); }}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                      outputTab === "output"
                        ? "text-teal-700 border-teal-600 bg-white"
                        : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                  >
                    Output
                    {results && (
                      <span className="ml-2 px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[10px]">
                        {results.row_count} rows
                      </span>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOutputTab("testcases"); if (!outputOpen) setOutputOpen(true); }}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      outputTab === "testcases"
                        ? "text-teal-700 border-teal-600 bg-white"
                        : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                  >
                    Test Cases
                    {testResults && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        testResults.is_correct
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {totalPassed}/{totalTests}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              {outputOpen && (
                <div className="flex items-center gap-2">
                   {/* <div className="h-1 w-16 bg-gray-300 rounded-full"></div> */}
                </div>
              )}
            </div>

            {/* Output Content */}
            {outputOpen && (
              <div className="flex-1 overflow-y-auto bg-white p-0 relative">
                {/* Running indicator */}
                {isRunning && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={24} className="animate-spin text-teal-600" />
                    <span className="text-sm font-medium text-gray-600">Executing query...</span>
                  </div>
                )}

                {/* Error Banner */}
                {error && !isRunning && (
                  <div className="m-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3 shadow-sm">
                    <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700">Execution Error</p>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {/* Output Tab */}
                {outputTab === "output" && !isRunning && (
                  <div className="p-4">
                    {results ? (
                      <div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  {results.columns?.map((col, idx) => (
                                    <th key={idx} className="px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {Array.isArray(results.rows) && results.rows.map((row, idx) => (
                                  <tr key={idx} className={`hover:bg-teal-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                    {Array.isArray(row)
                                      ? row.map((cell, ci) => (
                                        <td key={ci} className="px-4 py-2 text-gray-700 font-mono text-xs">
                                          {cell === null ? <span className="text-gray-400 italic">NULL</span> : String(cell)}
                                        </td>
                                      ))
                                      : typeof row === 'object' && row !== null
                                        ? results.columns?.map((col, ci) => (
                                          <td key={ci} className="px-4 py-2 text-gray-700 font-mono text-xs">
                                            {row[col] === null || row[col] === undefined ? <span className="text-gray-400 italic">NULL</span> : String(row[col])}
                                          </td>
                                        ))
                                        : (
                                          <td className="px-4 py-2 text-gray-700 font-mono text-xs">{String(row)}</td>
                                        )
                                    }
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : !error ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center opacity-60">
                        <Terminal size={48} className="text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">Run your query to see results here</p>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 font-sans shadow-sm">Ctrl+Enter</kbd> to run
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Test Cases Tab */}
                {outputTab === "testcases" && !isRunning && (
                  <div className="p-4">
                    {testResults ? (
                      <div className="space-y-6">
                        {/* Score Summary */}
                        <div className={`p-5 rounded-xl border flex items-center justify-between shadow-sm ${
                          testResults.is_correct
                            ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100"
                            : "bg-gradient-to-r from-rose-50 to-orange-50 border-rose-100"
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${testResults.is_correct ? "bg-white text-emerald-500 shadow-sm" : "bg-white text-rose-500 shadow-sm"}`}>
                              {testResults.is_correct ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                            </div>
                            <div>
                              <h4 className={`text-lg font-bold ${testResults.is_correct ? "text-emerald-800" : "text-rose-800"}`}>
                                {testResults.is_correct ? "All Tests Passed!" : "Some Tests Failed"}
                              </h4>
                              <p className={`text-sm ${testResults.is_correct ? "text-emerald-600" : "text-rose-600"}`}>
                                Great job! You passed {totalPassed} out of {totalTests} tests.
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-gray-800 tracking-tight">{testResults.total_score}</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Points</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                           <div className="flex justify-between text-xs font-semibold text-gray-500">
                              <span>Progress</span>
                              <span>{Math.round((testResults.total_score / testResults.max_score) * 100)}%</span>
                           </div>
                           <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${testResults.is_correct ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${testResults.max_score > 0 ? (testResults.total_score / testResults.max_score) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Individual Results Cards */}
                        <div className="grid gap-3">
                          {testResults.results?.map((result, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md ${
                                result.is_passed
                                  ? "bg-white border-l-4 border-l-emerald-500 border-gray-100"
                                  : "bg-white border-l-4 border-l-rose-500 border-gray-100"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {result.is_passed ? (
                                  <CheckCircle2 size={18} className="text-emerald-500" />
                                ) : (
                                  <XCircle size={18} className="text-rose-500" />
                                )}
                                <span className="text-sm font-semibold text-gray-700">{result.case_name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                 {result.error && (
                                   <span className="text-xs text-rose-500 max-w-[200px] truncate" title={result.error}>
                                     {result.error}
                                   </span>
                                 )}
                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                  result.is_passed ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                }`}>
                                  {result.points_earned}/{result.max_points} pts
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 flex flex-col items-center justify-center opacity-60">
                        <CheckCircle2 size={48} className="text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">No results to show yet</p>
                        <p className="text-xs text-gray-400 mt-2">Submit your code to see comprehensive test feedback</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === PROBLEM LIST SIDEBAR === */}
      {showProblemList && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setShowProblemList(false)}
          />
          
          {/* Sidebar Panel */}
          <div className="relative w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col h-full animate-slide-in-left">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#00796b] text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <List size={18} />
                <h2 className="font-semibold text-sm">Problem List</h2>
                {assignmentExercises.length > 0 && (
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                    {assignmentExercises.filter(e => e.status === 'completed').length}/{assignmentExercises.length}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setShowProblemList(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-teal-600" />
                </div>
              ) : assignmentExercises.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No exercises found
                </div>
              ) : (
                <div className="py-1">
                  {assignmentExercises.map((ex, index) => {
                    const isActive = String(ex.exercise_id) === String(exerciseId);
                    const isCompleted = ex.status === 'completed';
                    const isAttempted = ex.status === 'attempted';
                    const diffConfig = {
                      easy: 'text-emerald-600',
                      medium: 'text-amber-600',
                      hard: 'text-rose-600',
                    };
                    const diffColor = diffConfig[(ex.difficulty || 'easy').toLowerCase()] || diffConfig.easy;

                    return (
                      <button
                        key={ex.exercise_id}
                        onClick={() => {
                          setShowProblemList(false);
                          if (!isActive) {
                            navigate(`/exercise/${ex.exercise_id}`);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all border-l-[3px] ${
                          isActive
                            ? 'bg-teal-50 border-teal-600'
                            : 'border-transparent hover:bg-gray-50'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          ) : isAttempted ? (
                            <AlertCircle size={18} className="text-amber-500" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono">{index + 1}.</span>
                            <span className={`text-sm font-medium truncate ${isActive ? 'text-teal-800' : 'text-gray-800'}`}>
                              {ex.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold uppercase ${diffColor}`}>
                              {ex.difficulty || 'Easy'}
                            </span>
                            <span className="text-[10px] text-gray-400">•</span>
                            <span className="text-[10px] text-gray-400">{ex.points} pts</span>
                            {ex.user_score > 0 && (
                              <>
                                <span className="text-[10px] text-gray-400">•</span>
                                <span className="text-[10px] font-semibold text-teal-600">{ex.user_score}/{ex.points}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Active arrow */}
                        {isActive && (
                          <span className="text-teal-600 text-xs font-bold">▸</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Expired Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">!!! หมดเวลาแล้ว !!!</h2>
            <p className="text-gray-600 mb-6">
              Assignment นี้หมดเวลาส่งแล้ว ไม่สามารถทำหรือส่งคำตอบได้อีก
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-[#00796b] text-white rounded-lg hover:bg-[#00695c] transition font-semibold"
            >
              กลับไปหน้า Assignment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
