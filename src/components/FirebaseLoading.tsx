'use client'

import { useStore } from '@/lib/store'

const STATUS_TEXT = {
  connecting: 'กำลังเชื่อมต่อ Firebase…',
  connected: 'กำลังโหลดข้อมูลจาก Firebase…',
  disconnected: 'ไม่สามารถเชื่อมต่อ Firebase ได้ กำลังลองใหม่…',
} as const

function FirebaseFlame() {
  return (
    <svg className="w-16 h-16 animate-[fb-bob_1.6s_ease-in-out_infinite]" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6.5 24.5 10 5.3c.1-.7 1-.8 1.3-.2l3.8 7.1z" fill="#FFC24A" />
      <path d="M15.3 12.4 12.6 7.3c-.3-.5-1-.5-1.2 0L6.5 24.5z" fill="#FFA712" />
      <path d="m6.5 24.5 15.6-15c.4-.4 1-.2 1.1.4l2.5 14.6-8.3 4.6c-.8.4-1.7.4-2.5 0z" fill="#FF8A00" />
      <path d="m25.7 24.5-2.5-14.6c-.1-.6-.7-.8-1.1-.4L6.5 24.5l8.6 4.6c.8.4 1.7.4 2.5 0z" fill="#F4511E" fillOpacity={0.35} />
    </svg>
  )
}

export default function FirebaseLoading() {
  const status = useStore(s => s.firebaseStatus)
  const offline = status === 'disconnected'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 select-none">
      <style>{`
        @keyframes fb-slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }
        @keyframes fb-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
      `}</style>
      <FirebaseFlame />
      <div className="w-56 h-1.5 rounded-full bg-orange-100 overflow-hidden">
        <div className={`h-full w-1/3 rounded-full animate-[fb-slide_1.2s_ease-in-out_infinite] ${offline ? 'bg-red-400' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} />
      </div>
      <p className={`text-sm font-medium ${offline ? 'text-red-500' : 'text-gray-500'}`}>{STATUS_TEXT[status]}</p>
    </div>
  )
}
