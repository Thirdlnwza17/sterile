'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // สุ่มค่าหลัง mount (client only)
    const arr = Array.from({ length: 30 }).map(() => ({
      width: Math.random() * 16 + 8,
      height: Math.random() * 16 + 8,
      left: Math.random() * 100,
      top: Math.random() * 100,
      background: ["#f472b6", "#a78bfa", "#38bdf8", "#facc15"][Math.floor(Math.random() * 4)],
      animationDuration: (Math.random() * 8 + 6) + "s",
    }));
    // setParticles(arr); // This line was removed as per the edit hint.
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const db = getFirestore();
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        const role = userSnap.exists() && userSnap.data().role ? userSnap.data().role : "operator";
        if (role !== "admin") {
          router.replace("/history");
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image src="/ram-logo.jpg" alt="RAM Hospital Logo" width={192} height={192} className="mx-auto w-48 h-48 object-contain bg-white rounded-xl border border-gray-100" />
        </div>
        {/* Main Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 text-center">
          (Central Supply Sterile Quality information system)
        </h1>
        <p className="text-gray-600 text-lg md:text-xl mb-8 text-center">
          ระบบข้อมูลการติดตามคุณภาพการทำฆ่าเชื้ออุปกรณ์เวชภัณฑ์ทางการแพทย์
        </p>
        <Link
          href="/login"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-3 px-4 rounded-lg transition-all mb-4 text-center"
        >
          <span className="mr-2">🚀</span>เริ่มใช้งานระบบ
        </Link>
        <div className="mt-8 pt-4 border-t border-gray-100 text-base text-gray-400 w-full flex flex-col items-center">
          <div className="flex items-center gap-1 mb-1">
            <span>🏥</span>
            <span>RAM Hospital</span>
          </div>
          <div className="flex items-center gap-1 mb-1">
            <span>📅</span>
            <span>2025</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💾</span>
            <span>Firebase</span>
          </div>
        </div>
      </div>
    </div>
  );
}
