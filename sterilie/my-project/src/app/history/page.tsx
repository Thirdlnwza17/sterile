'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { getFirestore, collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc, deleteDoc, getDoc, addDoc, getDocs, setDoc } from "firebase/firestore";
import Link from "next/link";
import { getAllLogsFromAll, updateLog, deleteLog } from '../../dbService';
import SterilizerLoadsCardView from './SterilizerLoadsCardView';
import OcrModal from './OcrModal';
import ImageModal from './ImageModal';
import HistoryFormModal from './HistoryFormModal';
import EditLoadModal from './EditLoadModal';
import DuplicateModal from './DuplicateModal';

const initialEdit = {
  id: "",
  test_date: "",
  serial_number: "",
  program: "",
  items: "",
  chemical_result: "",
  biological_result: "",
  sterilization_time: "",
  temperature: "", // เพิ่ม field อุณหภูมิ
  operator: "",
};

const initialOcrEdit = {
  id: "",
  created_at: "",
  serial_number: "",
  program: "",
  chemical_result: "",
  biological_result: "",
  sterilization_time: "",
  temperature: "",
  operator: "",
  extracted_text: "",
};

// ลบ device_id, start_time ออกจาก initialForm
const initialForm = {
  status: "PASS",
};

const SLIP_KEYWORDS = [
  'BAUMER', 'PROGRAM', 'TEMPERATURE', 'STERILIZATION TIME', 'VACUUM PULSE', 'DRYING TIME', 'END OF CYCLE', 'OPER'
];

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [ocrEntries, setOcrEntries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [activeTab, setActiveTab] = useState<'manual' | 'ocr'>('manual');
  const [edit, setEdit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(initialEdit);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [role, setRole] = useState<string>("");
  const router = useRouter();
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, distance: 0 });
  const [lastTap, setLastTap] = useState(0);
  const [editOcr, setEditOcr] = useState<any | null>(null);
  const [editOcrForm, setEditOcrForm] = useState(initialOcrEdit);
  const [editOcrLoading, setEditOcrLoading] = useState(false);
  const [editOcrError, setEditOcrError] = useState("");
  // 1. เพิ่ม state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateEntries, setDuplicateEntries] = useState<any[]>([]);
  const [duplicateType, setDuplicateType] = useState<'image' | 'text' | 'both'>('image');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // เพิ่ม state zoom/offset สำหรับ modal edit OCR
  const [ocrZoom, setOcrZoom] = useState(1);
  const [ocrOffset, setOcrOffset] = useState({ x: 0, y: 0 });
  const [ocrDragging, setOcrDragging] = useState(false);
  const ocrDragStart = useRef({ x: 0, y: 0 });
  const ocrOffsetStart = useRef({ x: 0, y: 0 });
  const ocrTouchStart = useRef({ x: 0, y: 0, distance: 0 });

  // เพิ่ม state สำหรับเก็บผลลัพธ์ล่าสุดจาก OCR API
  const [lastOcrApiResult, setLastOcrApiResult] = useState<any>(null);

  // --- เพิ่ม state zoom/offset/dragging สำหรับ modal edit ---
  const [zoom1, setZoom1] = useState(1);
  const [offset1, setOffset1] = useState({ x: 0, y: 0 });
  const [dragging1, setDragging1] = useState(false);
  const dragStart1 = useRef({ x: 0, y: 0 });
  const offsetStart1 = useRef({ x: 0, y: 0 });
  const [zoom2, setZoom2] = useState(1);
  const [offset2, setOffset2] = useState({ x: 0, y: 0 });
  const [dragging2, setDragging2] = useState(false);
  const dragStart2 = useRef({ x: 0, y: 0 });
  const offsetStart2 = useRef({ x: 0, y: 0 });

  // --- เพิ่ม state สำหรับ overlay รูปใหญ่ ---
  const [showBigImage1, setShowBigImage1] = useState(false);
  const [showBigImage2, setShowBigImage2] = useState(false);

  // --- เพิ่ม state zoom/offset/dragging สำหรับ overlay modal รูปใหญ่ ---
  const [zoomBig1, setZoomBig1] = useState(1);
  const [offsetBig1, setOffsetBig1] = useState({ x: 0, y: 0 });
  const [draggingBig1, setDraggingBig1] = useState(false);
  const dragStartBig1 = useRef({ x: 0, y: 0 });
  const offsetStartBig1 = useRef({ x: 0, y: 0 });
  const [zoomBig2, setZoomBig2] = useState(1);
  const [offsetBig2, setOffsetBig2] = useState({ x: 0, y: 0 });
  const [draggingBig2, setDraggingBig2] = useState(false);
  const dragStartBig2 = useRef({ x: 0, y: 0 });
  const offsetStartBig2 = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 1));
  const handleResetZoom = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  };
  const handleMouseUp = () => setDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  };
  const handleWheel = (e: React.WheelEvent) => {
    // Remove preventDefault to fix passive event listener error
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };
  const handleImageClick = () => handleZoomIn();
  const handleImageDoubleClick = () => handleResetZoom();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - start panning
      setDragging(true);
      const touch = e.touches[0];
      dragStart.current = { x: touch.clientX, y: touch.clientY };
      offsetStart.current = { ...offset };
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setTouchStart({ x: 0, y: 0, distance });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Remove preventDefault to fix passive event listener error
    if (e.touches.length === 1 && dragging) {
      // Single touch - panning
      const touch = e.touches[0];
      setOffset({
        x: offsetStart.current.x + (touch.clientX - dragStart.current.x),
        y: offsetStart.current.y + (touch.clientY - dragStart.current.y),
      });
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      if (touchStart.distance > 0) {
        const scale = distance / touchStart.distance;
        setZoom(z => Math.max(1, Math.min(5, z * scale)));
      }
      setTouchStart(prev => ({ ...prev, distance }));
    }
  };

  const handleTouchEnd = () => {
    setDragging(false);
    setTouchStart({ x: 0, y: 0, distance: 0 });
  };

  const handleImageTouch = (e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected
      handleResetZoom();
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type === 'application/pdf') {
      alert('ไม่รองรับการอัปโหลดไฟล์ PDF');
      return;
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string;
        // OCR ก่อน แล้วตรวจสอบ keyword
        try {
          const base64Data = imageUrl.split(',')[1];
          const response = await fetch('/api/claude-ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Data })
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API error: ${response.status}`);
          }
          const data = await response.json();
          let ocrRaw = data.text || '';
          ocrRaw = ocrRaw.replace(/^Here is the full raw text extracted from the image:\s*/i, '');
          // ตรวจสอบ keyword
          const isSlip = SLIP_KEYWORDS.some(keyword => ocrRaw.toUpperCase().includes(keyword));
          if (!isSlip) {
            alert('ไม่อนุญาตให้อัปโหลด: ไม่พบข้อมูลที่ระบุว่าเป็นสลิปจากเครื่องนึ่ง กรุณาเลือกรูปสลิปที่ถูกต้อง');
            return;
          }
          // ถ้าใช่ slip จริง ค่อยเปิด modal OCR ต่อ
          setPreviewImage(imageUrl);
          setShowOcrModal(true);
          setOcrLoading(false);
          setOcrText(ocrRaw);
          setLastOcrApiResult(data);
        } catch (error) {
          console.error('OCR Error:', error);
          setOcrText('เกิดข้อผิดพลาดในการอ่านข้อความจากรูปภาพ');
          setOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert('รองรับเฉพาะไฟล์รูปภาพหรือ PDF เท่านั้น');
    }
  };

  const handleCloseOcrModal = () => {
    setShowOcrModal(false);
    setPreviewImage(null);
    setOcrText("");
    setOcrLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        router.replace("/login");
      } else {
        // ดึง role จาก Firestore
        const db = getFirestore();
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        const userRole = userSnap.exists() && userSnap.data().role ? userSnap.data().role : "operator";
        setRole(userRole);
        // Redirect operator to /history if not already there
        if (userRole !== "admin" && router && typeof window !== 'undefined' && window.location.pathname !== "/history") {
          router.replace("/history");
        }
      }
    });
    const db = getFirestore();
    
    // Subscribe to manual entries
    const q = query(collection(db, "sterilizer_entries"), orderBy("test_date", "desc"));
    const unsubEntries = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    // Subscribe to OCR entries
    const qOcr = query(collection(db, "sterilizer_ocr_entries"), orderBy("created_at", "desc"));
    const unsubOcrEntries = onSnapshot(qOcr, (snapshot) => {
      setOcrEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => {
      unsubscribe();
      unsubEntries();
      unsubOcrEntries();
    };
  }, [router]);

 

  // เปิด modal edit
  const openEdit = (entry: any) => {
    setEdit(entry);
    setEditForm({
      id: entry.id,
      test_date: entry.test_date && entry.test_date.toDate ? entry.test_date.toDate().toISOString().slice(0,16) : "",
      serial_number: entry.serial_number || "",
      program: entry.program || "",
      items: entry.items || "",
      chemical_result: entry.chemical_result || "",
      biological_result: entry.biological_result || "",
      sterilization_time: entry.sterilization_time || "",
      temperature: entry.temperature || "", // เพิ่มบรรทัดนี้
      operator: entry.operator || "",
    });
    setEditError("");
  };

  // handle edit form change
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // save edit
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    try {
      const db = getFirestore();
      // ดึงข้อมูลก่อนแก้ไข
      const beforeSnap = await getDoc(doc(db, "sterilizer_entries", editForm.id));
      const beforeData = beforeSnap.exists() ? beforeSnap.data() : {};
      // อัปเดตข้อมูลจริง
      await updateDoc(doc(db, "sterilizer_entries", editForm.id), {
        test_date: editForm.test_date ? Timestamp.fromDate(new Date(editForm.test_date)) : Timestamp.now(),
        serial_number: editForm.serial_number,
        program: editForm.program,
        items: editForm.items,
        chemical_result: editForm.chemical_result,
        biological_result: editForm.biological_result,
        sterilization_time: editForm.sterilization_time,
        temperature: editForm.temperature, // เพิ่มบรรทัดนี้
        operator: editForm.operator,
      });
      // บันทึก log การแก้ไข (action log)
      await addDoc(collection(db, "sterilizer_action_logs"), {
        action: "edit",
        entry_id: editForm.id,
        by: user?.email,
        role,
        at: Timestamp.now(),
        before: beforeData,
        after: {
          test_date: editForm.test_date,
          serial_number: editForm.serial_number,
          program: editForm.program,
          items: editForm.items,
          chemical_result: editForm.chemical_result,
          biological_result: editForm.biological_result,
          sterilization_time: editForm.sterilization_time,
          temperature: editForm.temperature, // เพิ่มบรรทัดนี้
          operator: editForm.operator,
        },
      });
      setEdit(null);
    } catch (err: any) {
      setEditError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setEditLoading(false);
    }
  };

  // delete entry
  const handleDelete = async () => {
    if (!editForm.id) return;
    setEditLoading(true);
    setEditError("");
    if (role !== "admin") {
      setEditError("คุณไม่มีสิทธิ์ลบข้อมูล");
      setEditLoading(false);
      return;
    }
    try {
      const db = getFirestore();
      // ดึงข้อมูลก่อนลบ
      const beforeSnap = await getDoc(doc(db, "sterilizer_entries", editForm.id));
      const beforeData = beforeSnap.exists() ? beforeSnap.data() : {};
      await deleteDoc(doc(db, "sterilizer_entries", editForm.id));
      // log การลบ
      await addDoc(collection(db, "sterilizer_action_logs"), {
        action: "delete",
        entry_id: editForm.id,
        by: user?.email,
        role,
        at: Timestamp.now(),
        before: beforeData,
      });
      setEdit(null);
    } catch (err: any) {
      setEditError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.replace("/login");
  };

  // เปิด modal edit OCR
  const openEditOcr = (entry: any) => {
    setEditOcr(entry);
    setEditOcrForm({
      id: entry.id,
      created_at: entry.created_at && entry.created_at.toDate ? entry.created_at.toDate().toISOString().slice(0,16) : "",
      serial_number: entry.serial_number || "",
      program: entry.program || "",
      chemical_result: entry.chemical_result || "",
      biological_result: entry.biological_result || "",
      sterilization_time: entry.sterilization_time || "",
      temperature: entry.temperature || "",
      operator: entry.operator || "",
      extracted_text: entry.extracted_text || "",
    });
    setEditOcrError("");
  };
  // handle edit OCR form change
  const handleEditOcrChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditOcrForm({ ...editOcrForm, [e.target.name]: e.target.value });
  };
  // save edit OCR
  const handleEditOcrSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditOcrLoading(true);
    setEditOcrError("");
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "sterilizer_ocr_entries", editOcrForm.id), {
        serial_number: editOcrForm.serial_number,
        program: editOcrForm.program,
        chemical_result: editOcrForm.chemical_result,
        biological_result: editOcrForm.biological_result,
        sterilization_time: editOcrForm.sterilization_time,
        temperature: editOcrForm.temperature,
        operator: editOcrForm.operator,
        extracted_text: editOcrForm.extracted_text,
      });
      setEditOcr(null);
    } catch (err: any) {
      setEditOcrError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setEditOcrLoading(false);
    }
  };
  // delete OCR entry
  const handleDeleteOcr = async () => {
    if (!editOcrForm.id) return;
    setEditOcrLoading(true);
    setEditOcrError("");
    if (role !== "admin") {
      setEditOcrError("คุณไม่มีสิทธิ์ลบข้อมูล");
      setEditOcrLoading(false);
      return;
    }
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "sterilizer_ocr_entries", editOcrForm.id));
      setEditOcr(null);
    } catch (err: any) {
      setEditOcrError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setEditOcrLoading(false);
    }
  };

  const checkForDuplicates = async (imageUrl: string, extractedText: string) => {
    const db = getFirestore();
    const q = query(collection(db, "sterilizer_ocr_entries"), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    const existingEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    const duplicates = existingEntries.filter(entry => {
      const imageMatch = entry.image_url === imageUrl;
      const textMatch = entry.extracted_text === extractedText;
      return imageMatch || textMatch;
    });
    return duplicates;
  };

  const handleSaveOcrEntry = async () => {
    if (!previewImage || !ocrText || !user) return;
    // Check for duplicates first
    const duplicates = await checkForDuplicates(previewImage, ocrText);
    if (duplicates.length > 0) {
      setDuplicateEntries(duplicates);
      if (duplicates.some((d: any) => d.image_url === previewImage) && duplicates.some((d: any) => d.extracted_text === ocrText)) {
        setDuplicateType('both');
      } else if (duplicates.some((d: any) => d.image_url === previewImage)) {
        setDuplicateType('image');
      } else {
        setDuplicateType('text');
      }
      setShowDuplicateModal(true);
      return;
    }
    // No duplicates, proceed with save
    await saveOcrEntry();
  };

  const saveOcrEntry = async () => {
    if (!user) return;
    setSaveLoading(true);
    setSaveSuccess("");
    try {
      const db = getFirestore();
      const checkboxResults = lastOcrApiResult?.checkboxResults;
      await addDoc(collection(db, "sterilizer_ocr_entries"), {
        image_url: previewImage,
        extracted_text: ocrText,
        created_by: user.email,
        created_at: Timestamp.now(),
        ...(checkboxResults ? { checkboxResults } : {}),
      });
      setSaveSuccess("บันทึกสำเร็จ!");
      setShowOcrModal(false);
      setPreviewImage(null);
      setOcrText("");
      setLastOcrApiResult(null);
    } catch (err) {
      setSaveSuccess("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleProceedWithSave = async () => {
    setShowDuplicateModal(false);
    await saveOcrEntry();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    if (role !== "admin" && role !== "operator") {
      setErrorMsg("คุณไม่มีสิทธิ์เพิ่มข้อมูล");
      setSubmitting(false);
      return;
    }
    try {
      const db = getFirestore();
      const filteredItems = Array.isArray((form as any).items) ? (form as any).items.filter((item: any) => item.name || item.quantity) : [];
      // กรอง device_id ออกจาก form ก่อนบันทึก (เฉพาะถ้ามี)
      const formWithoutDeviceId = { ...form };
      if ('device_id' in formWithoutDeviceId) delete formWithoutDeviceId.device_id;
      const docRef = await addDoc(collection(db, "sterilizer_loads"), {
        ...formWithoutDeviceId,
        items: filteredItems,
        created_by: user?.email,
        created_at: Timestamp.now(),
      });
      // sync ไป collection เฉพาะทาง
      // const newCol = getColByProgram(form.program_name); // Removed
      // if (newCol) { // Removed
      //   await setDoc(doc(db, newCol, docRef.id), { // Removed
      //     ...form, // Removed
      //     program_name: fullProgramName, // Removed
      //     start_time: form.start_time ? Timestamp.fromDate(new Date(form.start_time)) : Timestamp.now(), // Removed
      //     end_time: form.end_time ? Timestamp.fromDate(new Date(form.end_time)) : Timestamp.now(), // Removed
      //     created_by: user?.email, // Removed
      //     created_at: Timestamp.now(), // Removed
      //   }); // Removed
      // } // Removed
      setSuccessMsg("บันทึกข้อมูลรอบการทำงานสำเร็จ!");
      setForm(initialForm);
      setShowForm(false);
      setSearch("");
      setStartDate("");
      setEndDate("");
      setActiveTab("manual");
    } catch (err) {
      const errorMsg = (err as any)?.message || "เกิดข้อผิดพลาด";
      setErrorMsg(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Mouse events
  const handleOcrMouseDown = (e: React.MouseEvent) => {
    setOcrDragging(true);
    ocrDragStart.current = { x: e.clientX, y: e.clientY };
    ocrOffsetStart.current = { ...ocrOffset };
  };
  const handleOcrMouseUp = () => setOcrDragging(false);
  const handleOcrMouseMove = (e: React.MouseEvent) => {
    if (!ocrDragging) return;
    setOcrOffset({
      x: ocrOffsetStart.current.x + (e.clientX - ocrDragStart.current.x),
      y: ocrOffsetStart.current.y + (e.clientY - ocrDragStart.current.y),
    });
  };
  const handleOcrWheel = (e: React.WheelEvent) => {
    setOcrZoom(z => Math.max(0.5, Math.min(5, z + (e.deltaY < 0 ? 0.1 : -0.1))));
  };

  // Touch events
  const handleOcrTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setOcrDragging(true);
      const touch = e.touches[0];
      ocrDragStart.current = { x: touch.clientX, y: touch.clientY };
      ocrOffsetStart.current = { ...ocrOffset };
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      ocrTouchStart.current = { x: 0, y: 0, distance };
    }
  };
  const handleOcrTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && ocrDragging) {
      const touch = e.touches[0];
      setOcrOffset({
        x: ocrOffsetStart.current.x + (touch.clientX - ocrDragStart.current.x),
        y: ocrOffsetStart.current.y + (touch.clientY - ocrDragStart.current.y),
      });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      if (ocrTouchStart.current.distance > 0) {
        const scale = distance / ocrTouchStart.current.distance;
        setOcrZoom(z => Math.max(0.5, Math.min(5, z * scale)));
      }
      ocrTouchStart.current = { ...ocrTouchStart.current, distance };
    }
  };
  const handleOcrTouchEnd = () => setOcrDragging(false);

  // Reset zoom/offset when modal opens/closes
  useEffect(() => {
    if (editOcr) {
      setOcrZoom(1);
      setOcrOffset({ x: 0, y: 0 });
    }
  }, [editOcr]);

  useEffect(() => {
    if (showBigImage1 || showBigImage2) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [showBigImage1, showBigImage2]);

  const overlayRef1 = useRef<HTMLDivElement>(null);
  const overlayRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showBigImage1) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoomBig1(z => Math.max(0.5, Math.min(5, z + (e.deltaY < 0 ? 0.1 : -0.1))));
    };
    const el = overlayRef1.current;
    if (el) el.addEventListener('wheel', handler, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handler); };
  }, [showBigImage1]);

  useEffect(() => {
    if (!showBigImage2) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoomBig2(z => Math.max(0.5, Math.min(5, z + (e.deltaY < 0 ? 0.1 : -0.1))));
    };
    const el = overlayRef2.current;
    if (el) el.addEventListener('wheel', handler, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handler); };
  }, [showBigImage2]);

  useEffect(() => {
    if (showForm) {
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [showForm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400">
        <div className="text-white text-xl font-semibold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500 p-4">
      <div className="w-full max-w-6xl bg-white/90 rounded-3xl shadow-2xl mt-8 p-8 flex flex-col items-center border border-white/30 backdrop-blur-xl">
        <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-purple-700 text-center drop-shadow">ประวัติการบันทึก Sterilizer</h1>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center bg-sky-500 hover:bg-sky-700 text-white rounded-full px-4 py-1 text-xs font-semibold shadow transition-all"
              onClick={() => setShowForm(true)}
            >
              <span className="mr-1">🧪</span> บันทึกรอบการทำงาน
            </button>
            <label className="flex items-center bg-green-400 hover:bg-green-600 text-white rounded-full px-4 py-1 text-xs font-semibold shadow transition-all cursor-pointer">
              <span className="mr-1">🖼️</span> เพิ่มไฟล์
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImageUpload}/>
            </label>
            {role === 'admin' && (
              <Link href="/dashboard" className="bg-purple-500 hover:bg-purple-600 text-white rounded-full px-4 py-1 text-xs font-semibold shadow transition-all">Dashboard</Link>
            )}
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-1 text-xs font-semibold shadow transition-all">Logout</button>
          </div>
        </div>
        {user && (
          <div className="w-full mb-4 flex justify-end">
            <div className="bg-purple-100 text-purple-700 rounded-full px-6 py-2 font-semibold shadow text-center">
              👤 {user.displayName || user.email}
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        {/* ลบ JSX ปุ่ม tab navigation (ข้อมูลที่กรอกเอง/ข้อมูลจาก OCR) ออกทั้งหมด */}
        
        <div className="w-full flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="ค้นหาด้วย keyword (SN, โปรแกรม, อุปกรณ์, ผู้รับผิดชอบ ฯลฯ)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 rounded px-3 py-2 border text-black"
          />
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="rounded px-3 py-2 border text-black"
            placeholder="วันที่เริ่มต้น"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="rounded px-3 py-2 border text-black"
            placeholder="วันที่สิ้นสุด"
          />
        </div>
        
        {/* ลบตารางเดิมออก แล้วแสดงข้อมูล sterilizer_loads แบบ Card view */}
        <SterilizerLoadsCardView user={user} startDate={startDate} endDate={endDate} />
        
        {/* Modal Edit */}
        {edit && (
          <EditLoadModal
            editForm={editForm}
            setEditForm={setEditForm}
            onSave={handleEditSave}
            onDelete={handleDelete}
            loading={editLoading}
            deleteLoading={false}
            error={editError}
            allLoads={entries}
          />
        )}
        {editOcr && (
          <EditLoadModal
            editForm={editOcrForm}
            setEditForm={setEditOcrForm}
            onSave={handleEditOcrSave}
            onDelete={handleDeleteOcr}
            loading={editOcrLoading}
            deleteLoading={false}
            error={editOcrError}
            allLoads={entries}
          />
        )}
        <HistoryFormModal
          show={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          form={form}
          setForm={setForm}
          submitting={submitting}
          errorMsg={errorMsg}
          successMsg={successMsg}
          user={user}
        />
        <OcrModal
          show={showOcrModal}
          onClose={handleCloseOcrModal}
          previewImage={previewImage}
          ocrText={ocrText}
          ocrLoading={ocrLoading}
          saveLoading={saveLoading}
          saveSuccess={saveSuccess}
          handleSaveOcrEntry={handleSaveOcrEntry}
        />
        <DuplicateModal
          show={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          duplicateType={duplicateType}
          duplicateEntries={duplicateEntries}
          onProceedWithSave={handleProceedWithSave}
        />
        <ImageModal
          show={!!imageModalUrl}
          imageUrl={imageModalUrl}
          zoom={zoom}
          offset={offset}
          dragging={dragging}
          onClose={() => { setImageModalUrl(null); setZoom(1); setOffset({ x: 0, y: 0 }); }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onImageClick={handleImageClick}
          onImageDoubleClick={handleImageDoubleClick}
        />
      </div>
      <div className="mt-8 text-white/80 text-center text-sm">
        &copy; {new Date().getFullYear()} Sterilizer Data System | For Hospital Use
      </div>
    </div>
  );
} 

