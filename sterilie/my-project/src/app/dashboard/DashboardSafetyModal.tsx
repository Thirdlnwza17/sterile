import React from 'react';

export default function DashboardSafetyModal({ show, onClose, failedEntries }: {
  show: boolean,
  onClose: () => void,
  failedEntries: any[]
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-red-600">รายการรอบการทำงานที่มีปัญหา</h2>
        {failedEntries.length === 0 ? (
          <div className="text-center text-gray-500">ไม่พบรอบการทำงานที่มีปัญหา</div>
        ) : (
          <table className="min-w-full text-sm text-gray-700 border">
            <thead>
              <tr className="bg-red-100">
                <th className="p-2">วันที่/เวลาเริ่ม</th>
                <th className="p-2">หมายเลขเครื่อง</th>
                <th className="p-2">โปรแกรม</th>
                <th className="p-2">สถานะ</th>
                <th className="p-2">ผู้ปฏิบัติงาน</th>
                <th className="p-2">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {failedEntries.map(entry => (
                <tr key={entry.id} className="bg-red-50">
                  <td className="p-2 whitespace-nowrap">{entry.created_at && entry.created_at.toDate ? entry.created_at.toDate().toLocaleString() : "-"}</td>
                  <td className="p-2 whitespace-nowrap">{entry.device_id}</td>
                  <td className="p-2 whitespace-nowrap">{entry.program_name}</td>
                  <td className="p-2 text-center">{entry.status}</td>
                  <td className="p-2 whitespace-nowrap">{entry.operator}</td>
                  <td className="p-2">{entry.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 