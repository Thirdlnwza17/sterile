import React from 'react';

export default function DashboardFormModal({ show, onClose, onSubmit, form, setForm, submitting, errorMsg, successMsg, handleChange }: {
  show: boolean,
  onClose: () => void,
  onSubmit: (e: React.FormEvent) => void,
  form: any,
  setForm: (v: any) => void,
  submitting: boolean,
  errorMsg: string,
  successMsg: string,
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg relative max-h-[80vh] flex flex-col">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-2 text-blue-900">บันทึกรอบการทำงาน Sterilizer</h2>
        <form className="flex-1 flex flex-col gap-2 text-black overflow-y-auto pr-1" onSubmit={onSubmit}>
          <label className="flex flex-col text-black">
            หมายเลขเครื่อง
            <input type="text" name="device_id" value={form.device_id} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" required />
          </label>
          <label className="flex flex-col text-black">
            ชื่อโปรแกรมฆ่าเชื้อ
            <input type="text" name="program_name" value={form.program_name} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" required placeholder="ชื่อโปรแกรม" />
          </label>
          <label className="flex flex-col text-black">
            อุณหภูมิที่ต้องการ
            <input type="number" name="program_temp" value={form.program_temp} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" required placeholder="อุณหภูมิ (°C)" />
          </label>
          <label className="flex flex-col text-black">
            แรงดันที่ต้องการ
            <input type="number" name="program_pressure" value={form.program_pressure} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" required placeholder="แรงดัน (B)" />
          </label>
          <label className="flex flex-col text-black">
            เวลาเริ่มรอบ
            <input type="datetime-local" name="start_time" value={form.start_time} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" required />
          </label>
          <label className="flex flex-col text-black">
            เวลาสิ้นสุดรอบ
            <input type="datetime-local" name="end_time" value={form.end_time} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" required />
          </label>
          <label className="flex flex-col text-black">
            สถานะการทำงาน
            <select name="status" value={form.status} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" required>
              <option value="PASS">ผ่าน (PASS)</option>
              <option value="FAIL">ล้มเหลว (FAIL)</option>
              <option value="CANCEL">ยกเลิกกลางคัน (CANCEL)</option>
            </select>
          </label>
          <label className="flex flex-col text-black">
            ผู้ปฏิบัติงาน
            <input type="text" name="operator" value={form.operator} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" required placeholder="ชื่อผู้ปฏิบัติงาน" />
          </label>
          <label className="flex flex-col text-black">
            หมายเหตุ/สิ่งที่อบ
            <textarea name="notes" value={form.notes} onChange={handleChange} className="rounded px-3 py-2 border mt-1 text-black" rows={2} placeholder="เช่น: รอบนี้อบเครื่องมือผ่าตัดชุดเล็ก" />
          </label>
          <div className="flex gap-2 mt-4 sticky bottom-0 bg-white/90 py-2 z-10">
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded transition-all disabled:opacity-60">
              {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded transition-all">
              ยกเลิก
            </button>
          </div>
          {errorMsg && <div className="text-red-600 mt-2 text-center">{errorMsg}</div>}
          {successMsg && <div className="text-green-600 mt-2 text-center">{successMsg}</div>}
        </form>
      </div>
    </div>
  );
} 