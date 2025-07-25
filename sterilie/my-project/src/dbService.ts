// dbService.ts
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, getDocs, doc, Timestamp } from 'firebase/firestore';

export interface SterilizerEntry extends Record<string, unknown> {
  id?: string;
}

const COLLECTIONS = {
  gas: 'gas_logs',
  plasma: 'plasma_logs',
  autoclave: 'autoclave_logs',
};

export function getColByProgram(program: string): string | null {
  if (!program) return null;
  if (program === 'EO') return COLLECTIONS.gas;
  if (program === 'Plasma') return COLLECTIONS.plasma;
  if (program === 'PREVAC' || program === 'BOWIE') return COLLECTIONS.autoclave;
  return null;
}

// CREATE
export async function createLog(program: string, data: SterilizerEntry) {
  const col = getColByProgram(program);
  if (!col) throw new Error('Invalid program type');
  const db = getFirestore();
  const docRef = await addDoc(collection(db, col), {
    ...data,
    created_at: data.created_at || Timestamp.now(),
  });
  return docRef.id;
}

// READ ALL (optionally with order)
export async function getAllLogs(col: string) {
  const db = getFirestore();
  const q = query(collection(db, col), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SterilizerEntry);
}

// READ ONE
export async function getLog(col: string, id: string) {
  const db = getFirestore();
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } as SterilizerEntry : null;
}

// UPDATE
export async function updateLog(program: string, id: string, data: SterilizerEntry) {
  const col = getColByProgram(program);
  if (!col) throw new Error('Invalid program type');
  const db = getFirestore();
  await updateDoc(doc(db, col, id), data);
}

// DELETE
export async function deleteLog(program: string, id: string) {
  const col = getColByProgram(program);
  if (!col) throw new Error('Invalid program type');
  const db = getFirestore();
  await deleteDoc(doc(db, col, id));
}

// Utility: get all logs from all collections (for All filter)
export async function getAllLogsFromAll() {
  const db = getFirestore();
  const colNames = [...Object.values(COLLECTIONS), 'sterilizer_loads'];
  const results = await Promise.all(colNames.map(async col => {
    const q = query(collection(db, col), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data(), _col: col }) as SterilizerEntry);
  }));
  return results.flat();
} 

// --- เพิ่มฟังก์ชันสำหรับใช้งานใน history/page.tsx ---

// Subscribe to manual entries
export function subscribeSterilizerEntries(callback: (entries: SterilizerEntry[]) => void) {
  const db = getFirestore();
  const q = query(collection(db, "sterilizer_entries"), orderBy("test_date", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SterilizerEntry));
  });
}

// Subscribe to OCR entries
export function subscribeOcrEntries(callback: (entries: SterilizerEntry[]) => void) {
  const db = getFirestore();
  const q = query(collection(db, "sterilizer_ocr_entries"), orderBy("created_at", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SterilizerEntry));
  });
}

// Add manual entry
export async function addSterilizerEntry(data: SterilizerEntry) {
  const db = getFirestore();
  return await addDoc(collection(db, "sterilizer_entries"), data);
}

// Update manual entry
export async function updateSterilizerEntry(id: string, data: SterilizerEntry) {
  const db = getFirestore();
  return await updateDoc(doc(db, "sterilizer_entries", id), data);
}

// Delete manual entry
export async function deleteSterilizerEntry(id: string) {
  const db = getFirestore();
  return await deleteDoc(doc(db, "sterilizer_entries", id));
}

// Add OCR entry
export async function addOcrEntry(data: SterilizerEntry) {
  const db = getFirestore();
  return await addDoc(collection(db, "sterilizer_ocr_entries"), data);
}

// Update OCR entry
export async function updateOcrEntry(id: string, data: SterilizerEntry) {
  const db = getFirestore();
  return await updateDoc(doc(db, "sterilizer_ocr_entries", id), data);
}

// Delete OCR entry
export async function deleteOcrEntry(id: string) {
  const db = getFirestore();
  return await deleteDoc(doc(db, "sterilizer_ocr_entries", id));
}

// Log action (edit/delete)
export async function logAction(action: string, entryId: string, before: SterilizerEntry, after: SterilizerEntry, user: string, role: string) {
  const db = getFirestore();
  return await addDoc(collection(db, "sterilizer_action_logs"), {
    action,
    entry_id: entryId,
    by: user,
    role,
    at: Timestamp.now(),
    before,
    after,
  });
}

// Check for duplicate OCR entry
export async function checkOcrDuplicate(imageUrl: string, extractedText: string) {
  const db = getFirestore();
  const q = query(collection(db, "sterilizer_ocr_entries"), orderBy("created_at", "desc"));
  const snapshot = await getDocs(q);
  const existingEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SterilizerEntry[];
  const duplicates = existingEntries.filter(entry => {
    const imageMatch = entry.image_url === imageUrl;
    const textMatch = entry.extracted_text === extractedText;
    return imageMatch || textMatch;
  });
  return duplicates;
} 