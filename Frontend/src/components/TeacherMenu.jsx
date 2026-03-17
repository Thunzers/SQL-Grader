import { useState, useEffect } from "react";
import {
  ChevronDown, LogOut, User, FilePlus, Users, ClipboardList,
  X, Save, Plus, Trash2, Edit3, BookOpen, Database, ChevronRight,
  Calendar, Target, FileText, Play, CheckCircle, XCircle, Loader2,
  Tag, Key, EyeOff
} from "lucide-react";
import Notification from "./Notification";
import ConfirmModal from "./ConfirmModal";
import UserManagementModal from "./admin/UserManagementModal";

const API_BASE = "http://localhost:5000";

export default function TeacherDashboard({ setIsLoggedIn, userEmail, userId }) {
  const [openProfile, setOpenProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("assignments"); // assignments, datasets

  // Category State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState({ id: null, name: "" });

  // Assignments State
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Exercises State
  const [exercises, setExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Assignment Tabs State
  const [activeAssignTab, setActiveAssignTab] = useState("exercises"); // exercises, progress
  const [studentProgress, setStudentProgress] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Datasets State
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  // Categories
  const [categories, setCategories] = useState([]);

  // Modals
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingDataset, setEditingDataset] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Assignment Form State
  const [assignmentForm, setAssignmentForm] = useState({
    category_id: "",
    title: "",
    description: "",
    start_date: "",
    due_date: "",
    is_active: true
  });

  // Exercise Form State
  const [exerciseForm, setExerciseForm] = useState({
    title: "",
    description: "",
    expected_query: "",
    dataset_id: "",
    points: 1,
    difficulty: "",
    order_num: 0,
    hint: "",
    show_solution: false
  });

  // Dataset Form State
  const [datasetForm, setDatasetForm] = useState({
    name: "",
    description: "",
    schema_sql: "",
    seed_data_sql: ""
  });

  const [saving, setSaving] = useState(false);

  // Notification State
  const [notification, setNotification] = useState(null);
  const notify = (type, message) => setNotification({ type, message });

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState(null);

  // Test Cases State
  const [testCases, setTestCases] = useState([]);
  const [loadingTestCases, setLoadingTestCases] = useState(false);
  const [testingSQL, setTestingSQL] = useState(false);
  const [sqlTestResult, setSqlTestResult] = useState(null);
  const [showTestCaseModal, setShowTestCaseModal] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState(null);
  const [testCaseForm, setTestCaseForm] = useState({
    case_name: "",
    golden_query: "",
    expected_output: "",
    points: 1,
    is_hidden: false,
    required_keywords: [],
    check_order: false
  });
  const [previewingGoldenQuery, setPreviewingGoldenQuery] = useState(false);
  const [goldenQueryPreview, setGoldenQueryPreview] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchAssignments();
    fetchDatasets();
    fetchCategories();
  }, []);

  // Fetch assignments
  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`${API_BASE}/api/assignments`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAssignments(data);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Fetch exercises for an assignment
  const fetchExercises = async (assignId) => {
    setLoadingExercises(true);
    try {
      const res = await fetch(`${API_BASE}/api/assignments/${assignId}/exercises`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setExercises(data);
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoadingExercises(false);
    }
  };

  // Fetch student progress for an assignment
  const fetchStudentProgress = async (assignId) => {
    setLoadingProgress(true);
    try {
      const res = await fetch(`${API_BASE}/api/assignments/${assignId}/student-progress`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudentProgress(data);
      }
    } catch (error) {
      console.error("Error fetching student progress:", error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleExportCSV = () => {
    if (!studentProgress || studentProgress.length === 0) {
      notify("error", "ไม่มีข้อมูลสำหรับ Export");
      return;
    }

    const headers = ["user_id", "ชื่อ", "นามสกุล", "คะแนนรวม"];
    const csvRows = [headers.join(",")];
    
    studentProgress.forEach(student => {
      const row = [
        student.user_id || "",
        `"${(student.student_name || "").replace(/"/g, '""')}"`,
        `"${(student.surname || "").replace(/"/g, '""')}"`,
        student.user_score || 0
      ];
      csvRows.push(row.join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `progress_${selectedAssignment.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("success", "Export CSV สำเร็จ!");
  };

  // Fetch datasets
  const fetchDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const res = await fetch(`${API_BASE}/api/datasets`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDatasets(data);
      }
    } catch (error) {
      console.error("Error fetching datasets:", error);
    } finally {
      setLoadingDatasets(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (error) {
      setCategories(["SELECT", "JOIN", "GROUP BY", "Subquery"]);
    }
  };

  // Handle Assignment Selection
  const handleSelectAssignment = (assign) => {
    setSelectedAssignment(assign);
    setActiveAssignTab("exercises"); // default to exercises
    fetchExercises(assign.assign_id);
    fetchStudentProgress(assign.assign_id);
  };

  // Open Assignment Modal (Create/Edit)
  const openAssignmentForm = (assignment = null) => {
    setNewCategoryName("");
    if (assignment) {
      setEditingAssignment(assignment);
      setAssignmentForm({
        category_id: assignment.category_id || "",
        title: assignment.title || "",
        description: assignment.description || "",
        start_date: assignment.start_date ? assignment.start_date.substring(0, 16) : "",
        due_date: assignment.due_date ? assignment.due_date.substring(0, 16) : "",
        is_active: assignment.is_active !== false
      });
    } else {
      setEditingAssignment(null);
      setAssignmentForm({
        category_id: categories.length > 0 ? categories[0].category_id : "",
        title: "",
        description: "",
        start_date: "",
        due_date: "",
        is_active: true
      });
    }
    setShowAssignmentModal(true);
  };

  // Save Assignment
  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.title || !assignmentForm.category_id) {
      alert("กรุณากรอกชื่อและหมวดหมู่");
      return;
    }

    setSaving(true);
    try {
      const url = editingAssignment
        ? `${API_BASE}/api/assignments/${editingAssignment.assign_id}`
        : `${API_BASE}/api/assignments`;

      const method = editingAssignment ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assignmentForm,
          start_date: assignmentForm.start_date || null,
          due_date: assignmentForm.due_date || null,
          created_by: userId
        })
      });

      const data = await res.json();
      if (res.ok) {
        notify("success", editingAssignment ? "แก้ไข Assignment สำเร็จ!" : "สร้าง Assignment สำเร็จ!");
        setShowAssignmentModal(false);
        
        // Update the selected assignment if we were editing it
        if (editingAssignment && selectedAssignment?.assign_id === editingAssignment.assign_id) {
          setSelectedAssignment(data.assignment);
        }

        fetchAssignments();
        fetchCategories();
      } else {
        notify("error", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Error saving assignment:", error);
      notify("error", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = (assignId) => {
    setConfirmModal({
      title: "ยืนยันการลบ Assignment",
      message: "ต้องการลบ Assignment นี้หรือไม่? (Exercise ทั้งหมดจะถูกลบด้วย)",
      type: "danger",
      confirmText: "ลบ",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/assignments/${assignId}`, { method: "DELETE" });
          if (res.ok) {
            notify("success", "ลบ Assignment สำเร็จ!");
            fetchAssignments();
            if (selectedAssignment?.assign_id === assignId) {
              setSelectedAssignment(null);
              setExercises([]);
            }
          } else {
            notify("error", "เกิดข้อผิดพลาดในการลบ");
          }
        } catch (error) {
          console.error("Error deleting assignment:", error);
        }
      }
    });
  };

  // Open Exercise Modal
  const openExerciseForm = (exercise = null) => {
    setSqlTestResult(null);
    setTestCases([]);
    if (exercise) {
      setEditingExercise(exercise);
      setExerciseForm({
        title: exercise.title || "",
        description: exercise.description || "",
        expected_query: exercise.expected_query || "",
        dataset_id: exercise.dataset_id || "",
        points: exercise.points || 10,
        difficulty: exercise.difficulty || "medium",
        order_num: exercise.order_num || 0,
        hint: exercise.hint || "",
        show_solution: exercise.show_solution || false,
        required_keywords: exercise.required_keywords || []
      });
      fetchTestCases(exercise.exercise_id);
    } else {
      setEditingExercise(null);
      setExerciseForm({
        title: "",
        description: "",
        expected_query: "",
        dataset_id: "",
        points: 10,
        difficulty: "medium",
        order_num: exercises.length + 1,
        hint: "",
        show_solution: false,
        required_keywords: []
      });
    }
    setShowExerciseModal(true);
  };

  // Save Exercise
  const handleSaveExercise = async (e) => {
    e.preventDefault();
    if (!exerciseForm.title || !exerciseForm.description) {
      alert("กรุณากรอกข้อมูลที่จำเป็น: ชื่อ และโจทย์");
      return;
    }

    setSaving(true);
    try {
      const url = editingExercise
        ? `${API_BASE}/api/exercises/${editingExercise.exercise_id}`
        : `${API_BASE}/api/assignments/${selectedAssignment.assign_id}/exercises`;

      const method = editingExercise ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...exerciseForm,
          dataset_id: exerciseForm.dataset_id || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (!editingExercise && testCases.length > 0) {
          const newExerciseId = data.exercise.exercise_id;
          // Save all temp test cases
          for (const tc of testCases) {
            if (tc.is_temp) {
              await fetch(`${API_BASE}/api/exercises/${newExerciseId}/test-cases`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  case_name: tc.case_name,
                  golden_query: tc.golden_query,
                  expected_output: tc.expected_output,
                  points: tc.points,
                  is_hidden: tc.is_hidden,
                  required_keywords: tc.required_keywords || [],
                  check_order: tc.check_order || false
                })
              });
            }
          }
        }

        notify("success", editingExercise ? "แก้ไข Exercise สำเร็จ!" : "สร้าง Exercise สำเร็จ!");
        setShowExerciseModal(false);
        fetchExercises(selectedAssignment.assign_id);
        fetchAssignments(); // Update exercise count
      } else {
        notify("error", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Error saving exercise:", error);
      notify("error", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  // Delete Exercise
  const handleDeleteExercise = (exerciseId) => {
    setConfirmModal({
      title: "ยืนยันการลบ Exercise",
      message: "ต้องการลบ Exercise นี้หรือไม่?",
      type: "danger",
      confirmText: "ลบ",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/exercises/${exerciseId}`, { method: "DELETE" });
          if (res.ok) {
            notify("success", "ลบ Exercise สำเร็จ!");
            fetchExercises(selectedAssignment.assign_id);
            fetchAssignments();
          } else {
            notify("error", "เกิดข้อผิดพลาดในการลบ");
          }
        } catch (error) {
          console.error("Error deleting exercise:", error);
        }
      }
    });
  };

  // Open Dataset Modal (Create/Edit)
  const openDatasetForm = (dataset = null) => {
    if (dataset) {
      setEditingDataset(dataset);
      setDatasetForm({
        name: dataset.name || "",
        description: dataset.description || "",
        schema_sql: dataset.schema_sql || "",
        seed_data_sql: dataset.seed_data_sql || ""
      });
    } else {
      setEditingDataset(null);
      setDatasetForm({ name: "", description: "", schema_sql: "", seed_data_sql: "" });
    }
    setShowDatasetModal(true);
  };

  // Save Dataset
  const handleSaveDataset = async (e) => {
    e.preventDefault();
    if (!datasetForm.name || !datasetForm.schema_sql || !datasetForm.seed_data_sql) {
      alert("กรุณากรอกข้อมูลที่จำเป็น");
      return;
    }

    setSaving(true);
    try {
      const url = editingDataset
        ? `${API_BASE}/api/datasets/${editingDataset.dataset_id}`
        : `${API_BASE}/api/datasets`;

      const method = editingDataset ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datasetForm, created_by: userId })
      });

      const data = await res.json();
      if (res.ok) {
        notify("success", editingDataset ? "แก้ไข Dataset สำเร็จ!" : "สร้าง Dataset สำเร็จ!");
        setShowDatasetModal(false);
        setDatasetForm({ name: "", description: "", schema_sql: "", seed_data_sql: "" });
        fetchDatasets();
      } else {
        notify("error", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Error saving dataset:", error);
      notify("error", "ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  // Delete Dataset
  const handleDeleteDataset = (datasetId) => {
    setConfirmModal({
      title: "ยืนยันการลบ Dataset",
      message: "ต้องการลบ Dataset นี้หรือไม่? (Exercise ที่ใช้ Dataset นี้จะไม่สามารถใช้งานได้)",
      type: "danger",
      confirmText: "ลบ",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/datasets/${datasetId}`, { method: "DELETE" });
          if (res.ok) {
            notify("success", "ลบ Dataset สำเร็จ!");
            fetchDatasets();
          } else {
            notify("error", "เกิดข้อผิดพลาดในการลบ");
          }
        } catch (error) {
          console.error("Error deleting dataset:", error);
        }
      }
    });
  };

  // Fetch Test Cases for an exercise
  const fetchTestCases = async (exerciseId) => {
    setLoadingTestCases(true);
    try {
      const res = await fetch(`${API_BASE}/api/exercises/${exerciseId}/test-cases`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTestCases(data);
      }
    } catch (error) {
      console.error("Error fetching test cases:", error);
    } finally {
      setLoadingTestCases(false);
    }
  };

  // Preview Golden Query result
  const handlePreviewGoldenQuery = async () => {
    if (!testCaseForm.golden_query) {
      alert("กรุณากรอก Golden Query ก่อน");
      return;
    }
    const datasetId = exerciseForm.dataset_id;
    if (!datasetId) {
      alert("กรุณาเลือก Dataset ก่อน");
      return;
    }
    setPreviewingGoldenQuery(true);
    setGoldenQueryPreview(null);
    try {
      // Find dataset
      const ds = datasets.find(d => String(d.dataset_id) === String(datasetId));
      if (!ds) { alert("Dataset not found"); return; }
      const result = await fetch(`${API_BASE}/api/datasets/${datasetId}/run-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testCaseForm.golden_query, schema_sql: ds.schema_sql, seed_data_sql: ds.seed_data_sql })
      });
      const data = await result.json();
      setGoldenQueryPreview(data);
    } catch (err) {
      setGoldenQueryPreview({ error: err.message });
    } finally {
      setPreviewingGoldenQuery(false);
    }
  };

  // Open Test Case Modal
  const openTestCaseForm = (testCase = null) => {
    setGoldenQueryPreview(null);
    if (testCase) {
      setEditingTestCase(testCase);
      setTestCaseForm({
        case_name: testCase.case_name || "",
        golden_query: testCase.golden_query || "",
        expected_output: typeof testCase.expected_output === "object"
          ? JSON.stringify(testCase.expected_output, null, 2)
          : testCase.expected_output || "",
        points: testCase.points || 1,
        is_hidden: testCase.is_hidden || false,
        required_keywords: testCase.required_keywords || [],
        check_order: testCase.check_order || false
      });
    } else {
      setEditingTestCase(null);
      setTestCaseForm({
        case_name: `Test Case ${testCases.length + 1}`,
        golden_query: exerciseForm.expected_query || "",
        expected_output: "",
        points: 1,
        is_hidden: false,
        required_keywords: [],
        check_order: false
      });
    }
    setShowTestCaseModal(true);
  };

  // Save Test Case
  const handleSaveTestCase = async (e) => {
    e.preventDefault();
    if (!testCaseForm.case_name || !testCaseForm.golden_query) {
      alert("กรุณากรอกชื่อและ Golden Query (SQL เฉลย)");
      return;
    }

    // Auto-detect ORDER BY for check_order
    const hasOrderBy = testCaseForm.golden_query.toUpperCase().includes("ORDER BY");
    const effectiveCheckOrder = testCaseForm.check_order || hasOrderBy;

    // For temp saves, we store the golden_query and parse expected_output if available
    let expectedOutputJson = null;
    if (testCaseForm.expected_output) {
      try {
        expectedOutputJson = typeof testCaseForm.expected_output === "string"
          ? JSON.parse(testCaseForm.expected_output)
          : testCaseForm.expected_output;
      } catch {
        // Not valid JSON, that's OK for temp saves — the backend will generate it
      }
    }

    setSaving(true);
    try {
      // สำหรับ create ใหม่ต้องมี exercise_id หรือเป็นโหมดสร้างใหม่ (เก็บลง state)
      const exerciseId = editingExercise?.exercise_id;

      // CASE 1: New Exercise (Temp Save)
      if (!exerciseId) {
        if (editingTestCase) {
          // Edit Temp Case
          setTestCases(testCases.map(tc =>
            tc.case_id === editingTestCase.case_id
              ? {
                ...tc,
                case_name: testCaseForm.case_name,
                golden_query: testCaseForm.golden_query,
                expected_output: expectedOutputJson,
                points: testCaseForm.points,
                is_hidden: testCaseForm.is_hidden,
                required_keywords: testCaseForm.required_keywords,
                check_order: effectiveCheckOrder
              }
              : tc
          ));
        } else {
          // Add New Temp Case
          const newTemp = {
            case_id: `temp-${Date.now()}`,
            case_name: testCaseForm.case_name,
            golden_query: testCaseForm.golden_query,
            expected_output: expectedOutputJson,
            points: testCaseForm.points,
            is_hidden: testCaseForm.is_hidden,
            required_keywords: testCaseForm.required_keywords,
            check_order: effectiveCheckOrder,
            is_temp: true
          };
          setTestCases([...testCases, newTemp]);
        }
        setShowTestCaseModal(false);
        setSaving(false);
        return;
      }

      // CASE 2: Existing Exercise (Real DB Save)
      if (editingTestCase) {
        if (editingTestCase.is_temp) {
          // Updating a temp case while in Edit Mode (shouldn't happen often but valid)
          setTestCases(testCases.map(tc =>
            tc.case_id === editingTestCase.case_id
              ? {
                ...tc,
                case_name: testCaseForm.case_name,
                golden_query: testCaseForm.golden_query,
                expected_output: expectedOutputJson,
                points: testCaseForm.points,
                is_hidden: testCaseForm.is_hidden,
                required_keywords: testCaseForm.required_keywords,
                check_order: effectiveCheckOrder
              }
              : tc
          ));
          setShowTestCaseModal(false);
          setSaving(false);
          return;
        }

        // Update test case ที่มีอยู่
        const res = await fetch(`${API_BASE}/api/test-cases/${editingTestCase.case_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_name: testCaseForm.case_name,
            golden_query: testCaseForm.golden_query,
            points: testCaseForm.points,
            is_hidden: testCaseForm.is_hidden,
            required_keywords: testCaseForm.required_keywords,
            check_order: effectiveCheckOrder
          })
        });
        if (res.ok) {
          notify("success", "แก้ไข Test Case สำเร็จ!");
          setShowTestCaseModal(false);
          fetchTestCases(exerciseId || editingTestCase.exercise_id);
        } else {
          const data = await res.json();
          notify("error", data.error || "เกิดข้อผิดพลาด");
        }
      } else {
        // Create new test case in DB
        const res = await fetch(`${API_BASE}/api/exercises/${exerciseId}/test-cases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_name: testCaseForm.case_name,
            golden_query: testCaseForm.golden_query,
            points: testCaseForm.points,
            is_hidden: testCaseForm.is_hidden,
            required_keywords: testCaseForm.required_keywords,
            check_order: effectiveCheckOrder
          })
        });
        if (res.ok) {
          notify("success", "สร้าง Test Case สำเร็จ!");
          setShowTestCaseModal(false);
          fetchTestCases(exerciseId);
        } else {
          const data = await res.json();
          notify("error", data.error || "เกิดข้อผิดพลาด");
        }
      }
    } catch (error) {
      console.error("Error saving test case:", error);
      notify("error", "ไม่สามารถบันทึก Test Case ได้");
    } finally {
      setSaving(false);
    }
  };

  // Delete Test Case
  const handleDeleteTestCase = (caseId) => {
    setConfirmModal({
      title: "ยืนยันการลบ Test Case",
      message: "ต้องการลบ Test Case นี้หรือไม่?",
      type: "danger",
      confirmText: "ลบ",
      onConfirm: async () => {
        try {
          // Check if temp case
          if (typeof caseId === 'string' && caseId.startsWith('temp-')) {
            setTestCases(testCases.filter(tc => tc.case_id !== caseId));
            notify("success", "ลบ Test Case สำเร็จ!");
            return;
          }

          const res = await fetch(`${API_BASE}/api/test-cases/${caseId}`, { method: "DELETE" });
          if (res.ok) {
            notify("success", "ลบ Test Case สำเร็จ!");
            setTestCases(testCases.filter(tc => tc.case_id !== caseId));
          } else {
            notify("error", "เกิดข้อผิดพลาดในการลบ");
          }
        } catch (error) {
          console.error("Error deleting test case:", error);
        }
      }
    });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "hard": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* NAVBAR */}
      <nav className="w-full bg-[#00796b] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/40 rounded-full flex flex-col items-center justify-center text-xs font-semibold">
              <span>Grader</span>
              <span>SQL</span>
            </div>
            <span className="text-lg font-semibold">Teacher Panel</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 text-sm">
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-3 py-1 rounded transition ${activeTab === "assignments" ? "bg-white/20" : "hover:bg-white/10"}`}
            >
              <BookOpen size={16} className="inline mr-1" /> Assignments
            </button>
            <button
              onClick={() => setActiveTab("datasets")}
              className={`px-3 py-1 rounded transition ${activeTab === "datasets" ? "bg-white/20" : "hover:bg-white/10"}`}
            >
              <Database size={16} className="inline mr-1" /> Datasets
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              className="px-3 py-1 rounded transition hover:bg-white/10 text-teal-100 font-semibold"
            >
              <Users size={16} className="inline mr-1" /> Manage Students
            </button>
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

      {/* MAIN CONTENT */}
      <div className="p-6">

        {/* === ASSIGNMENTS TAB === */}
        {activeTab === "assignments" && (
          <div className="flex gap-6">

            {/* Left: Assignment List */}
            <div className="w-1/3 bg-white rounded-xl shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Assignments</h2>
                <button
                  onClick={() => openAssignmentForm()}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm transition"
                >
                  เพิ่ม
                </button>
              </div>

              {loadingAssignments ? (
                <p className="text-gray-500 text-center py-4">กำลังโหลด...</p>
              ) : assignments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">ยังไม่มี Assignment</p>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {assignments.map((a) => (
                    <div
                      key={a.assign_id}
                      onClick={() => handleSelectAssignment(a)}
                      className={`p-3 rounded-lg cursor-pointer border transition ${selectedAssignment?.assign_id === a.assign_id
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {a.category_name || (categories.find(c => c.category_id === a.category_id)?.name || a.category || "General")}
                          </span>
                          <h3 className="font-semibold text-gray-800 mt-1 flex flex-wrap items-center gap-2">
                            <span>{a.title}</span>
                            {!a.is_active && (
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <EyeOff size={10} /> ซ่อนอยู่
                              </span>
                            )}
                            {a.start_date && new Date() < new Date(a.start_date) && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded border border-yellow-200 inline-flex items-center">
                                Upcoming
                              </span>
                            )}
                            {a.due_date && new Date() > new Date(a.due_date) && (
                              <span className="text-[10px] bg-red-200 text-red-500 font-bold px-2 py-0.5 rounded border border-gray-200 inline-flex items-center">
                                Past Due
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">{a.exercise_count || 0} ข้อ</p>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Exercise List */}
            <div className="flex-1 bg-white rounded-xl shadow-md p-4">
              {selectedAssignment ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {selectedAssignment.category_name || (categories.find(c => c.category_id === selectedAssignment.category_id)?.name || selectedAssignment.category || "General")}
                      </span>
                      <h2 className="text-xl font-bold text-gray-800 mt-1 flex items-center gap-2">
                        {selectedAssignment.title}
                        {!selectedAssignment.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                            <EyeOff size={12} /> ซ่อนอยู่
                          </span>
                        )}
                      </h2>
                      {selectedAssignment.description && (
                        <p className="text-sm text-gray-500 mt-1">{selectedAssignment.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAssignmentForm(selectedAssignment)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg flex items-center gap-1 text-sm transition"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(selectedAssignment.assign_id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg flex items-center gap-1 text-sm transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <hr className="my-4" />

                  {/* === ASSIGNMENT TABS === */}
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      className={`px-4 py-2 font-medium text-sm transition ${activeAssignTab === "exercises"
                        ? "border-b-2 border-teal-600 text-teal-700"
                        : "text-gray-500 hover:text-teal-600 hover:bg-gray-50"
                        }`}
                      onClick={() => setActiveAssignTab("exercises")}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} /> แบบฝึกหัด
                      </div>
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm transition ${activeAssignTab === "progress"
                        ? "border-b-2 border-teal-600 text-teal-700"
                        : "text-gray-500 hover:text-teal-600 hover:bg-gray-50"
                        }`}
                      onClick={() => setActiveAssignTab("progress")}
                    >
                      <div className="flex items-center gap-2">
                        <Users size={16} /> ความคืบหน้านักศึกษา
                      </div>
                    </button>
                  </div>

                  {activeAssignTab === "exercises" && (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">Exercises</h3>
                        <button
                          onClick={() => openExerciseForm()}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm transition"
                        >
                          <Plus size={16} /> สร้างโจทย์
                        </button>
                      </div>

                      {loadingExercises ? (
                        <div className="flex items-center gap-2 text-teal-600">
                          <Loader2 size={20} className="animate-spin" />
                          <span>กำลังโหลด...</span>
                        </div>
                      ) : exercises.length === 0 ? (
                        <p className="text-gray-500 italic">ยังไม่มีโจทย์ใน Assignment นี้</p>
                      ) : (
                        <div className="space-y-3">
                          {exercises.map((ex, index) => (
                            <div key={ex.exercise_id} className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/30 transition flex justify-between items-center group">
                              <div className="flex items-start gap-3">
                                <span className="text-gray-400 font-mono mt-0.5">{index + 1}.</span>
                                <div>
                                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                    {ex.title}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${ex.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                        ex.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                                          'bg-yellow-100 text-yellow-700'
                                      }`}>
                                      {ex.difficulty || 'medium'}
                                    </span>
                                  </h4>
                                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Target size={12} /> {ex.points} คะแนน</span>
                                    {ex.dataset_name && (
                                      <span className="flex items-center gap-1"><Database size={12} /> ข้อมูล: {ex.dataset_name}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openExerciseForm(ex)}
                                  className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                                  title="แก้ไข"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteExercise(ex.exercise_id)}
                                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                                  title="ลบ"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {activeAssignTab === "progress" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                          <h3 className="text-lg font-semibold text-gray-700">Student Progress</h3>
                          <button 
                            onClick={() => fetchStudentProgress(selectedAssignment.assign_id)}
                            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition"
                            title="รีเฟรชข้อมูล"
                          >
                            <Loader2 size={18} className={loadingProgress ? "animate-spin" : ""} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                          >
                            Export CSV
                          </button>
                          <div className="text-sm text-gray-500">
                            มีผู้ส่งงาน {studentProgress.filter(p => p.completed_exercises > 0).length} / {studentProgress.length} คน
                          </div>
                        </div>
                      </div>

                      {loadingProgress ? (
                        <div className="flex justify-center items-center py-10 gap-2 text-teal-600">
                          <Loader2 size={24} className="animate-spin" />
                          <span>กำลังดึงข้อมูลคะแนน...</span>
                        </div>
                      ) : studentProgress.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
                          ไม่พบข้อมูลนักศึกษา โปรดเพิ่มแบบฝึกหัดเข้าสู่ระบบ
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">No.</th>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">User ID / รหัสนักศึกษา</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ชื่อ-สกุล</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">โจทย์ที่เสร็จแล้ว</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">คะแนนรวม</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ความคืบหน้า</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {studentProgress.map((student, idx) => {
                                const percentComplete = student.total_exercises > 0 
                                  ? Math.round((student.completed_exercises / student.total_exercises) * 100) 
                                  : 0;
                                  
                                return (
                                  <tr key={student.user_id || idx} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800">{student.user_id || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {student.student_name} {student.surname || ""}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      <div className="flex items-center gap-2">
                                        <BookOpen size={14} className={student.completed_exercises === student.total_exercises ? "text-green-500" : "text-gray-400"} />
                                        <span className={student.completed_exercises === student.total_exercises ? "font-bold text-green-700" : "text-gray-700"}>
                                          {student.completed_exercises}
                                        </span>
                                        <span className="text-gray-400">/ {student.total_exercises}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`font-semibold ${student.user_score >= student.max_score ? 'text-green-600' : 'text-teal-700'}`}>
                                        {student.user_score}
                                      </span>
                                      <span className="text-gray-400 text-xs ml-1">/ {student.max_score}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center gap-3">
                                        <div className="w-full bg-gray-200 rounded-full h-2 min-w-[60px]">
                                          <div 
                                            className={`h-2 rounded-full ${percentComplete === 100 ? 'bg-green-500' : 'bg-teal-500'}`}
                                            style={{ width: `${percentComplete}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">{percentComplete}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-500 py-20">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p>เลือก Assignment จากด้านซ้ายเพื่อดู/จัดการ Exercises</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === DATASETS TAB === */}
        {activeTab === "datasets" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Datasets (ฐานข้อมูลจำลอง)</h2>
              <button
                onClick={() => openDatasetForm()}
                className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-lg flex items-center gap-2 transition"
              >
                สร้าง Dataset
              </button>
            </div>

            {loadingDatasets ? (
              <p className="text-gray-500 text-center py-4">กำลังโหลด...</p>
            ) : datasets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">ยังไม่มี Dataset</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {datasets.map((ds) => (
                  <div key={ds.dataset_id} className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Database size={20} className="text-teal-600" />
                        <h3 className="font-semibold text-gray-800">{ds.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDatasetForm(ds)}
                          className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                          title="แก้ไข"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDataset(ds.dataset_id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{ds.description || "ไม่มีคำอธิบาย"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* === ASSIGNMENT MODAL === */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-teal-700 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BookOpen size={22} />
                {editingAssignment ? "แก้ไข Assignment" : "สร้าง Assignment ใหม่"}
              </h2>
              <button onClick={() => setShowAssignmentModal(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={assignmentForm.category_id}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, category_id: parseInt(e.target.value) })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => setShowCategoryModal(true)}
                    className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg transition flex items-center gap-1"
                    title="จัดการหมวดหมู่"
                  >
                    แก้ไข
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ชื่อ Assignment <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  placeholder="เช่น SELECT เบื้องต้น"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">คำอธิบาย</label>
                <textarea
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  placeholder="คำอธิบายเกี่ยวกับ Assignment นี้..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-gray-700">
                      <Calendar size={14} className="inline mr-1" /> วันเริ่มต้น
                    </label>
                    <button
                      type="button"
                      onClick={() => setAssignmentForm({ ...assignmentForm, start_date: "" })}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      ไม่กำหนด
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={assignmentForm.start_date}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, start_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-gray-700">
                      <Calendar size={14} className="inline mr-1" /> วันหมดเขต
                    </label>
                    <button
                      type="button"
                      onClick={() => setAssignmentForm({ ...assignmentForm, due_date: "" })}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      ไม่กำหนด
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={assignmentForm.due_date}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignmentForm.is_active}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">เปิดให้นักศึกษาเห็น</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:bg-teal-300 flex items-center justify-center gap-2"
                >

                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === EXERCISE MODAL === */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-teal-700 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText size={22} />
                {editingExercise ? "แก้ไข Exercise" : "สร้าง Exercise ใหม่"}
              </h2>
              <button onClick={() => setShowExerciseModal(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveExercise} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ชื่อข้อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={exerciseForm.title}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  โจทย์ (Description) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={exerciseForm.description}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <Database size={14} className="inline mr-1" /> Dataset
                </label>
                <select
                  value={exerciseForm.dataset_id}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, dataset_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- ไม่ใช้ Dataset --</option>
                  {datasets.map((ds) => (
                    <option key={ds.dataset_id} value={ds.dataset_id}>{ds.name}</option>
                  ))}
                </select>
              </div>

              {/* Test Cases Section */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-1">
                      <CheckCircle size={16} /> Test Cases ({testCases.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => openTestCaseForm()}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                    >
                      เพิ่ม Test Case
                    </button>
                  </div>
                  {loadingTestCases ? (
                    <p className="text-sm text-gray-500">กำลังโหลด...</p>
                  ) : testCases.length === 0 ? (
                    <p className="text-sm text-gray-500">ยังไม่มี Test Case - กดปุ่ม "เพิ่ม Test Case" เพื่อสร้าง</p>
                  ) : (
                    <div className="space-y-2">
                      {testCases.map((tc) => (
                        <div key={tc.case_id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700">
                              {tc.case_name || `Test Case #${tc.case_id}`}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">({tc.points} คะแนน)</span>
                            {tc.is_hidden && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-1 py-0.5 rounded ml-2">ซ่อน</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => openTestCaseForm(tc)}
                              className="p-1 bg-yellow-500 text-white hover:bg-yellow-600 rounded"
                              title="แก้ไข Test Case"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTestCase(tc.case_id)}
                              className="p-1 bg-red-500 text-white hover:bg-red-600 rounded"
                              title="ลบ Test Case"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">คะแนน</label>
                  <input
                    type="number"
                    min="1"
                    value={exerciseForm.points}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, points: parseInt(e.target.value) || 10 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ความยาก</label>
                  <select
                    value={exerciseForm.difficulty}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, difficulty: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ลำดับข้อ</label>
                  <input
                    type="number"
                    min="0"
                    value={exerciseForm.order_num}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, order_num: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">คำใบ้ (Hint)</label>
                <textarea
                  value={exerciseForm.hint}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, hint: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div> */}

              {/* Required Keywords Section */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <Key size={14} />
                  SQL Keywords 
                </label>
                <p className="text-xs text-amber-700 mb-3">
                  กำหนดคำสั่ง SQL ที่นักศึกษาต้องใช้ในคำตอบ ถ้าคำตอบถูกแต่ไม่มีคำสั่งที่กำหนดจะไม่ได้คะแนน
                </p>

                {/* Tags Display */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(exerciseForm.required_keywords || []).map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-semibold border border-amber-300"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = exerciseForm.required_keywords.filter((_, i) => i !== idx);
                          setExerciseForm({ ...exerciseForm, required_keywords: updated });
                        }}
                        className="hover:bg-amber-200 rounded-full p-0.5 transition"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                
                </div>

                {/* Input */}
                {/* Preset Suggestions */}
                <div className="flex flex-wrap gap-1">
                  {["WHERE", "AND", "OR", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "GROUP BY", "HAVING", "ORDER BY", "DISTINCT", "LIKE", "IN", "BETWEEN", "EXISTS", "UNION"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={(exerciseForm.required_keywords || []).includes(preset)}
                      onClick={() => {
                        if (!(exerciseForm.required_keywords || []).includes(preset)) {
                          setExerciseForm({
                            ...exerciseForm,
                            required_keywords: [...(exerciseForm.required_keywords || []), preset]
                          });
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-amber-200 text-amber-700 rounded hover:bg-amber-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExerciseModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:bg-teal-300 flex items-center justify-center gap-2"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === DATASET MODAL === */}
      {showDatasetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-teal-600 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Database size={22} /> {editingDataset ? "แก้ไข Dataset" : "สร้าง Dataset ใหม่"}
              </h2>
              <button onClick={() => setShowDatasetModal(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveDataset} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ชื่อ Dataset <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={datasetForm.name}
                  onChange={(e) => setDatasetForm({ ...datasetForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">คำอธิบาย</label>
                <input
                  type="text"
                  value={datasetForm.description}
                  onChange={(e) => setDatasetForm({ ...datasetForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Schema SQL (สร้างตาราง) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={datasetForm.schema_sql}
                  onChange={(e) => setDatasetForm({ ...datasetForm, schema_sql: e.target.value })}

                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Seed Data SQL (ใส่ข้อมูล) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={datasetForm.seed_data_sql}
                  onChange={(e) => setDatasetForm({ ...datasetForm, seed_data_sql: e.target.value })}

                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDatasetModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:bg-teal-300 flex items-center justify-center gap-2"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === TEST CASE MODAL === */}
      {showTestCaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-teal-600 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle size={22} />
                {editingTestCase ? "แก้ไข Test Case" : "สร้าง Test Case ใหม่"}
              </h2>
              <button onClick={() => setShowTestCaseModal(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveTestCase} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ชื่อ Test Case <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={testCaseForm.case_name}
                  onChange={(e) => setTestCaseForm({ ...testCaseForm, case_name: e.target.value })}
                  placeholder="เช่น Test Case 1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Golden Query (SQL เฉลย) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={testCaseForm.golden_query}
                  onChange={(e) => setTestCaseForm({ ...testCaseForm, golden_query: e.target.value })}
                  rows={5}
                  placeholder="SELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm"
                  required
                />
                <div className="flex items-center justify-between mt-1">
                  {testCaseForm.golden_query && testCaseForm.golden_query.toUpperCase().includes("ORDER BY") ? (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      ✓ ตรวจพบ ORDER BY — ระบบจะเช็คลำดับผลลัพธ์ด้วยอัตโนมัติ
                    </p>
                  ) : <div></div>}
                  <button
                    type="button"
                    onClick={handlePreviewGoldenQuery}
                    disabled={previewingGoldenQuery || !testCaseForm.golden_query}
                    className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded hover:bg-teal-200 disabled:opacity-50"
                  >
                    {previewingGoldenQuery ? "กำลังรัน..." : "ทดสอบรันผลลัพธ์"}
                  </button>
                </div>
              </div>

              {/* Golden Query Preview Result */}
              {goldenQueryPreview && (
                 <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                   <label className="block text-xs font-semibold text-indigo-700 mb-1 flex items-center gap-1">
                     <Play size={12}/> ผลการทดสอบจาก Dataset
                   </label>
                   {goldenQueryPreview.error ? (
                     <p className="text-xs text-red-600 font-mono break-words">{goldenQueryPreview.error}</p>
                   ) : (
                     <div className="text-xs text-indigo-900 font-mono">
                       <p>Columns: {goldenQueryPreview.columns?.join(', ')}</p>
                       <p>Row count: {goldenQueryPreview.row_count}</p>
                     </div>
                   )}
                 </div>
              )}

              {/* Expected Output Preview (auto-generated, readonly) */}
              {testCaseForm.expected_output && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Expected Output (สร้างอัตโนมัติจาก Golden Query ก่อนหน้า)
                  </label>
                  <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {typeof testCaseForm.expected_output === "string" ? testCaseForm.expected_output : JSON.stringify(testCaseForm.expected_output, null, 2)}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">คะแนน</label>
                  <input
                    type="number"
                    min="1"
                    value={testCaseForm.points}
                    onChange={(e) => setTestCaseForm({ ...testCaseForm, points: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testCaseForm.is_hidden}
                      onChange={(e) => setTestCaseForm({ ...testCaseForm, is_hidden: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                    <span className="text-sm text-gray-700">ซ่อนจากนักศึกษา</span>
                  </label>
                </div>
              </div>

              {/* Required Keywords per Test Case */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <Key size={14} />
                  SQL Keywords (สำหรับ Test Case นี้)
                </label>
                <p className="text-xs text-amber-700 mb-2">
                  กำหนดคำสั่ง SQL ที่ต้องใช้เพื่อผ่าน Test Case นี้ (ถ้าไม่กำหนดจะใช้ keywords ระดับ Exercise แทน)
                </p>

                {/* Tags Display */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(testCaseForm.required_keywords || []).map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-semibold border border-amber-300"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = testCaseForm.required_keywords.filter((_, i) => i !== idx);
                          setTestCaseForm({ ...testCaseForm, required_keywords: updated });
                        }}
                        className="hover:bg-amber-200 rounded-full p-0.5 transition"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-1">
                  {["WHERE", "AND", "OR", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "GROUP BY", "HAVING", "ORDER BY", "DISTINCT", "LIKE", "IN", "BETWEEN", "EXISTS", "UNION"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={(testCaseForm.required_keywords || []).includes(preset)}
                      onClick={() => {
                        if (!(testCaseForm.required_keywords || []).includes(preset)) {
                          setTestCaseForm({
                            ...testCaseForm,
                            required_keywords: [...(testCaseForm.required_keywords || []), preset]
                          });
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-amber-200 text-amber-700 rounded hover:bg-amber-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTestCaseModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:bg-teal-300 flex items-center justify-center gap-2"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        config={confirmModal}
        onClose={() => setConfirmModal(null)}
      />

      {/* Notification Toast */}
      <Notification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {/* Teacher Student Management Modal */}
      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        mode="teacher"
      />

      {/* === CATEGORY MANAGEMENT MODAL === */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-teal-700 text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Tag size={20} /> จัดการหมวดหมู่
              </h2>
              <button onClick={() => setShowCategoryModal(false)} className="hover:bg-white/20 p-1 rounded-full text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 shrink-0">
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={newCategoryName}
                   onChange={(e) => setNewCategoryName(e.target.value)}
                   placeholder="พิมพ์ชื่อหมวดหมู่ใหม่..."
                   className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       // Simulate click on add button
                       document.getElementById('add-category-btn').click();
                     }
                   }}
                 />
                 <button 
                   id="add-category-btn"
                   type="button" 
                   onClick={async () => {
                     if(!newCategoryName.trim()) return;
                     try {
                       const res = await fetch(`${API_BASE}/api/categories`, {
                         method: "POST", headers: { "Content-Type": "application/json" },
                         body: JSON.stringify({ name: newCategoryName.trim() })
                       });
                       if(res.ok) {
                         const newCat = await res.json();
                         setCategories([...categories, newCat]);
                         setNewCategoryName("");
                         notify("success", "เพิ่มหมวดหมู่ใหม่สำเร็จ");
                       } else {
                         const data = await res.json();
                         notify("error", data.error || "เกิดข้อผิดพลาด");
                       }
                     } catch (error) { notify("error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
                   }}
                   disabled={!newCategoryName.trim()}
                   className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition"
                 >เพิ่ม</button>
               </div>
            </div>

            <div className="overflow-y-auto p-4 flex-1">
              {categories.length === 0 ? (
                <p className="text-center text-gray-500 py-4">ไม่มีหมวดหมู่</p>
              ) : (
                <ul className="space-y-2">
                  {categories.map(cat => (
                    <li key={cat.category_id} className="flex justify-between items-center p-2 border border-gray-100 rounded-lg hover:bg-gray-50 flex-wrap gap-2">
                      {editingCategory.id === cat.category_id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input 
                            type="text" 
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="flex-1 border border-teal-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                document.getElementById(`save-cat-${cat.category_id}`).click();
                              }
                            }}
                          />
                          <button
                            id={`save-cat-${cat.category_id}`}
                            onClick={async () => {
                              if(!editingCategory.name.trim() || editingCategory.name.trim() === cat.name) {
                                setEditingCategory({ id: null, name: "" });
                                return;
                              }
                              try {
                                const res = await fetch(`${API_BASE}/api/categories/${cat.category_id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ name: editingCategory.name.trim() })
                                });
                                if (res.ok) {
                                  const updatedCat = await res.json();
                                  setCategories(categories.map(c => c.category_id === updatedCat.category_id ? updatedCat : c));
                                  setEditingCategory({ id: null, name: "" });
                                  fetchAssignments(); // Refresh assignment list to show new category name immediately
                                  notify("success", "แก้ไขชื่อหมวดหมู่สำเร็จ");
                                } else {
                                  const data = await res.json();
                                  notify("error", data.error || "เกิดข้อผิดพลาด");
                                }
                              } catch(err) {
                                notify("error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
                              }
                            }}
                            className="text-white bg-teal-500 hover:bg-teal-600 p-1 rounded"
                            title="บันทึก"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => setEditingCategory({ id: null, name: "" })}
                            className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded"
                            title="ยกเลิก"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-gray-700 flex-1">{cat.name}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingCategory({ id: cat.category_id, name: cat.name })}
                              className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                              title="แก้ไขชื่อหมวดหมู่"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat.name}"?\n(ไม่สามารถลบได้หากมีแบบฝึกหัดที่ใช้หมวดหมู่นี้อยู่)`)) {
                                  try {
                                    const res = await fetch(`${API_BASE}/api/categories/${cat.category_id}`, {
                                      method: 'DELETE'
                                    });
                                    if(res.ok) {
                                      setCategories(categories.filter(c => c.category_id !== cat.category_id));
                                      if (assignmentForm.category_id === cat.category_id) {
                                        setAssignmentForm({ ...assignmentForm, category_id: "" });
                                      }
                                      notify("success", "ลบหมวดหมู่สำเร็จ");
                                    } else {
                                      const data = await res.json();
                                      notify("error", data.error || "ลบไม่สำเร็จ (อาจมีการใช้งานอยู่)");
                                    }
                                  } catch(err) {
                                     notify("error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
                                  }
                                }
                              }}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                              title="ลบหมวดหมู่"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 shrink-0 text-right bg-gray-50">
               <button 
                 onClick={() => setShowCategoryModal(false)}
                 className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
               >
                 ปิด
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
