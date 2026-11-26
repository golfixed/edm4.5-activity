'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary' | 'success'
  /** info/success notice: only the confirm button is shown */
  hideCancel?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>(opts => {
    resolveRef.current?.(false)
    setOptions(opts)
    return new Promise<boolean>(resolve => { resolveRef.current = resolve })
  }, [])

  const close = (ok: boolean) => {
    resolveRef.current?.(ok)
    resolveRef.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && <ConfirmDialog options={options} onClose={close} />}
    </ConfirmContext.Provider>
  )
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const { title, message, confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก', tone = 'primary', hideCancel = false } = options
  const danger = tone === 'danger'
  const success = tone === 'success'
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <style>{`
        @keyframes confirm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes confirm-pop { from { opacity: 0; transform: translateY(8px) scale(0.96) } to { opacity: 1; transform: none } }
      `}</style>
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-[confirm-fade_0.15s_ease-out]" onClick={() => onClose(false)} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-orange-100 p-6 flex flex-col items-center text-center animate-[confirm-pop_0.18s_ease-out]">
        <span className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-red-50 text-red-500' : success ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-500'}`}>
          {success ? (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          ) : danger ? (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />
            </svg>
          ) : (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5.5M12 16.5h.01" strokeWidth={2.5} />
            </svg>
          )}
        </span>
        <h2 id="confirm-title" className="text-gray-900 text-xl font-bold leading-snug">{title}</h2>
        {message && <div className="text-gray-600 text-sm mt-2 leading-relaxed">{message}</div>}
        <div className="flex gap-3 w-full mt-6">
          {!hideCancel && (
            <button onClick={() => onClose(false)}
              className="flex-1 h-11 rounded-xl bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 font-semibold transition-colors">
              {cancelLabel}
            </button>
          )}
          <button ref={confirmRef} onClick={() => onClose(true)}
            className={`flex-1 h-11 rounded-xl font-bold text-white transition-all focus:outline-none focus-visible:ring-4 ${danger
              ? 'bg-red-600 hover:bg-red-700 shadow-[0_6px_20px_rgba(220,38,38,0.3)] focus-visible:ring-red-200'
              : 'bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 shadow-[0_6px_20px_rgba(194,65,12,0.3)] focus-visible:ring-orange-200'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
