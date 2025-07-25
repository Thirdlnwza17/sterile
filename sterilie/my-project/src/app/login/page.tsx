'use client';

import Link from "next/link";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Save user info to Firestore
      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);
      // ดึงข้อมูล user เดิม
      const userSnap = await (await import("firebase/firestore")).getDoc(userRef);
      let role = "operator";
      if (userSnap.exists() && userSnap.data().role) {
        role = userSnap.data().role;
      }
      await setDoc(userRef, {
        email: user.email,
        lastLogin: Timestamp.now(),
        role,
      }, { merge: true });
      setSuccess("Login successful!");
      if (role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/history");
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image src="/user.png" alt="User Icon" width={192} height={192} className="mx-auto w-48 h-48 object-contain bg-white rounded-xl border border-gray-100" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          เข้าสู่ระบบ
        </h1>
        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base text-black bg-white placeholder-gray-500 shadow-sm"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base text-black bg-white placeholder-gray-500 shadow-sm"
            required
          />
          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-all disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Logging in..." : "เข้าสู่ระบบ"}
          </button>
        </form>
        {error && <div className="mt-4 text-red-500 font-medium text-center">{error}</div>}
        {success && <div className="mt-4 text-green-500 font-medium text-center">{success}</div>}
        <Link href="/" className="mt-6 text-blue-500 hover:underline font-medium">← กลับหน้าแรก</Link>
      </div>
    </div>
  );
} 