'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import Link from "next/link";
import { getFirestore, collection, addDoc, Timestamp, query, orderBy, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { Fragment } from "react";
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);
// Remove Tesseract import and Chart.js imports since we removed charts
// import { Pie } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   ArcElement,
//   Tooltip,
//   Legend
// } from "chart.js";
// ChartJS.register(ArcElement, Tooltip, Legend);
// import Tesseract from 'tesseract.js';

// Add Claude API configuration
// const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY || 'your-claude-api-key-here';
// const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// ลบ import * as pdfjsLib from 'pdfjs-dist';
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const initialForm = {
  status: "PASS",
  phases: [
    { phase_name: "Pre-Vacuum", start: "", end: "", pressure: 0.8 },
    { phase_name: "Heat-Up", start: "", end: "", pressure: 1.2 },
    { phase_name: "Steam", start: "", end: "", pressure: 1.5 },
    { phase_name: "Sterilize", temperature: 134, duration_min: 5, start: "", end: "", pressure: 2.1 },
    { phase_name: "Exhaust", start: "", end: "", pressure: 1.0 },
    { phase_name: "Dry", start: "", end: "", pressure: 0.5 }
  ]
};

import DashboardFormModal from "./DashboardFormModal";
import DashboardOcrModal from "./DashboardOcrModal";
import DashboardDuplicateModal from "./DashboardDuplicateModal";
import DashboardDetailModal from "./DashboardDetailModal";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [role, setRole] = useState<string>("");
  const router = useRouter();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const unsubEntriesRef = useRef<null | (() => void)>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  // 1. Remove OCR-related state
  // Remove: const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Remove: const [ocrText, setOcrText] = useState<string>("");
  // Remove: const [showOcrModal, setShowOcrModal] = useState(false);
  // Remove: const [ocrLoading, setOcrLoading] = useState(false);
  // Remove: const [saveLoading, setSaveLoading] = useState(false);
  // Remove: const [saveSuccess, setSaveSuccess] = useState("");
  // Remove: const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  // Remove: const [duplicateEntries, setDuplicateEntries] = useState<any[]>([]);
  // Remove: const [duplicateType, setDuplicateType] = useState<'image' | 'text' | 'both'>('image');
  // Remove: const [lastOcrApiResult, setLastOcrApiResult] = useState<any>(null);
  // 2. Remove all OCR-related useEffect
  // Remove: useEffect that sets ocrEntries
  // 3. Remove all OCR-related functions: handleImageUpload, handleCloseOcrModal, checkForDuplicates, handleSaveOcrEntry, saveOcrEntry, handleProceedWithSave
  // 4. Remove all DashboardOcrModal and DashboardDuplicateModal components from JSX
  // 5. Remove all OCR statistics, chart data, and references to OCR in the UI (e.g. ocrPerDay, topUsers, totalMechanicalPass, etc.)
  // 6. Remove any OCR-related imports
  // เพิ่ม state สำหรับสถานะ checkbox demo
  type CheckboxType = 'mechanical' | 'chemical_external' | 'chemical_internal';
  const [checkboxDemo, setCheckboxDemo] = useState<Record<CheckboxType, string>>({
    mechanical: 'unknown',
    chemical_external: 'unknown',
    chemical_internal: 'unknown',
  });
  const toggleCheckbox = (type: CheckboxType) => {
    setCheckboxDemo(prev => ({
      ...prev,
      [type]: prev[type] === 'checked' ? 'unchecked' : prev[type] === 'unchecked' ? 'unknown' : 'checked',
    }));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        setTimeout(() => router.replace("/login"), 100);
      } else {
        // ดึง role จาก Firestore
        const db = getFirestore();
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        setRole(userSnap.exists() && userSnap.data().role ? userSnap.data().role : "operator");
      }
    });
    // Subscribe to sterilizer_loads (was sterilizer_ocr_entries)
    const db = getFirestore();
    const q = query(collection(db, "sterilizer_loads"), orderBy("created_at", "desc"));
    unsubEntriesRef.current = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      if (unsubEntriesRef.current) unsubEntriesRef.current();
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!loading && role && role !== 'admin' && typeof window !== 'undefined' && window.location.pathname !== '/history') {
      router.replace('/history');
    }
  }, [role, loading, router]);

  // คำนวณข้อมูล 1 เดือนล่าสุด
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const recentEntries = entries.filter(entry => {
    if (entry.created_at && entry.created_at.toDate) {
      return entry.created_at.toDate() >= oneMonthAgo;
    }
    return false;
  });

  // คำนวณ pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = recentEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(recentEntries.length / entriesPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleLogout = async () => {
    if (unsubEntriesRef.current) unsubEntriesRef.current();
    await signOut(auth);
    router.replace("/login");
  };

  const showDetail = (entry: any) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  // 1. Remove handleExport function and any CSV export logic
  // 2. Remove any export buttons or UI elements from the JSX

  // คำนวณสถิติสำหรับกราฟ
  const passCount = entries.filter(e => e.status === "PASS").length;
  const failCount = entries.filter(e => e.status === "FAIL").length;
  const cancelCount = entries.filter(e => e.status === "CANCEL").length;
  
  const programStats: Record<string, number> = {};
  entries.forEach(e => {
    if (e.program_name) programStats[e.program_name] = (programStats[e.program_name] || 0) + 1;
  });
  const programLabels = Object.keys(programStats);
  const programData = Object.values(programStats);
  const mostUsedProgram = programLabels[programData.indexOf(Math.max(...programData))] || "-";

  // ---------- สถิติ OCR ----------
  // 1. กราฟเส้น: จำนวนรอบ OCR ต่อวัน (7 วันล่าสุด)
  // 2. กราฟแท่ง: Top 5 ผู้บันทึก OCR
  const userCount: Record<string, number> = {};
  entries.forEach(e => {
    const user = e.created_by || 'ไม่ระบุ';
    userCount[user] = (userCount[user] || 0) + 1;
  });
  const topUsers = Object.entries(userCount).sort((a,b) => b[1]-a[1]).slice(0,5);

  // คำนวณสถิติ checkbox จาก ocrEntries
  // const totalMechanicalPass = ocrEntries.filter(e => e.checkboxResults?.mechanical === 'checked').length;
  // const totalChemExtPass = ocrEntries.filter(e => e.checkboxResults?.chemical_external === 'checked').length;
  // const totalChemIntPass = ocrEntries.filter(e => e.checkboxResults?.chemical_internal === 'checked').length;

  if (loading || (role && role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500">
        <div className="text-blue-900 text-xl font-semibold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500 p-4">
      <div className="w-full max-w-6xl bg-white/90 rounded-3xl shadow-2xl mt-10 p-8 flex flex-col items-center border border-white/30 backdrop-blur-xl relative">
        <div className="w-full flex flex-row items-center justify-between mb-4 gap-2 flex-wrap">
          <Link href="/history" className="bg-blue-500 hover:bg-blue-700 text-white rounded-full px-4 py-1 text-xs font-semibold shadow transition-all order-1">ประวัติ</Link>
          <div className="flex flex-row gap-2 items-center order-2 ml-auto">
            <div className="bg-blue-100 text-blue-800 rounded-full px-6 py-2 font-semibold shadow text-center flex items-center gap-2">
              <span className="text-xl">👤</span> {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow hover:from-red-700 hover:to-pink-600 transition-all"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
        {/* Header section: logo left, title right */}
        <div className="w-full flex flex-row items-center mb-4">
          <img src="/ram-logo.jpg" alt="Sterilizer Logo" className="w-40 h-40 object-contain drop-shadow-xl bg-white rounded-2xl p-2 mr-4" />
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2 drop-shadow text-center">(Central Supply Sterile Quality information system)</h1>
            <p className="text-lg md:text-xl text-blue-800 mb-4 text-center">ระบบข้อมูลการติดตามคุณภาพการทำฆ่าเชื้ออุปกรณ์เวชภัณฑ์ทางการแพทย์</p>
          </div>
        </div>
        {/* AdminLTE-style cards row */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 w-full mb-8">
          <div className="bg-blue-500 text-white rounded-xl shadow-lg p-6 flex flex-col items-center">
            <div className="text-3xl font-bold">{entries.length}</div>
            <div className="text-sm mt-2">ไฟล์ทั้งหมด</div>
          </div>
          <div className="bg-orange-400 text-white rounded-xl shadow-lg p-6 flex flex-col items-center">
            <div className="text-3xl font-bold">{Object.keys(userCount).length}</div>
            <div className="text-sm mt-2">User Count</div>
          </div>
          {/* The four status cards below are removed as requested */}
        </div>
        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
          {/* Remove the chart for 'บันทึกไฟล์ 7 วันล่าสุด' and any JSX using days or ocrPerDay */}
        </div>
        {/* ปุ่มและ modal ต่างๆ (เหมือนเดิม) */}
        {/* Modal Form */}
        <DashboardDetailModal
          show={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          entry={selectedEntry}
        />
      </div>
      <div className="mt-8 text-white/80 text-center text-sm">
        &copy; {new Date().getFullYear()} Sterilizer Data System | For Hospital Use
      </div>
    </div>
  );
} 