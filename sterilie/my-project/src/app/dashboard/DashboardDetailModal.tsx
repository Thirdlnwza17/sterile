import React from 'react';

export default function DashboardDetailModal({ show, onClose, entry }: {
  show: boolean,
  onClose: () => void,
  entry: any
}) {
  if (!show || !entry) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="font-semibold">📋 โปรแกรม: {entry.program_name || "ไม่ระบุ"}</div>
          <div className="font-semibold">📅 เวลา: {
            entry.start_time && entry.start_time.toDate ? 
            entry.start_time.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : "-"
          } - {
            entry.end_time && entry.end_time.toDate ? 
            entry.end_time.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : "-"
          }</div>
          <div className="font-semibold">👤 ผู้ปฏิบัติงาน: {entry.operator}</div>
          <div className="border-t border-gray-300 pt-2 mt-2">----------------------------------</div>
          <div className="font-semibold">เฟสที่ทำงาน:</div>
          {Array.isArray(entry.phases) ? entry.phases.map((phase: any, index: number) => {
            const startTime = phase.start ? new Date(phase.start).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : "-";
            const endTime = phase.end ? new Date(phase.end).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : "-";
            let phaseDisplay = `✔ ${phase.phase_name} (${startTime} - ${endTime})`;
            if (phase.phase_name === "Sterilize" && phase.temperature) {
              phaseDisplay += ` - ${phase.temperature}°C`;
            }
            return <div key={index} className="ml-2">{phaseDisplay}</div>;
          }) : (
            <div className="ml-2 text-gray-500">ไม่มีข้อมูลเฟส</div>
          )}
        </div>
      </div>
    </div>
  );
} 