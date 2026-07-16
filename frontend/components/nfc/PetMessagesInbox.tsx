'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Message = {
  id: number
  sender_type: string
  message: string
  created_at?: string
}

type Thread = {
  thread_id: number
  finder_session_id?: string
  messages: Message[]
  created_at?: string
}

type Props = {
  petId: string | number
}

export default function PetMessagesInbox({ petId }: Props) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const data = await api.get(`/nfc/pets/${petId}/messages`)
    const list: Thread[] = Array.isArray(data) ? data : []
    setThreads(list)
    setSelected((prev) => prev ?? (list[0]?.thread_id ?? null))
  }, [petId])

  useEffect(() => {
    load()
      .catch(() => setThreads([]))
      .finally(() => setLoading(false))
  }, [load])

  const active = threads.find((t) => t.thread_id === selected) || null

  const sendReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!active || !reply.trim()) return
    setBusy(true)
    setError('')
    try {
      await api.post(`/nfc/pets/${petId}/messages`, {
        thread_id: active.thread_id,
        message: reply.trim(),
      })
      setReply('')
      const data = await api.get(`/nfc/pets/${petId}/messages`)
      setThreads(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Could not send reply')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading finder messages…</p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Finder messages</h2>
          <p className="text-sm text-gray-600 mt-1">
            Anonymous chat from people who scanned your pet&apos;s tag. Your phone number stays private.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load().catch(() => undefined)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {threads.length === 0 ? (
        <p className="text-sm text-gray-500 rounded-lg bg-gray-50 border border-dashed border-gray-200 px-4 py-5">
          No messages yet. When someone uses &quot;Send message&quot; on the public scan page, threads appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 min-h-[280px]">
          <ul className="space-y-1 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-3">
            {threads.map((t) => (
              <li key={t.thread_id}>
                <button
                  type="button"
                  onClick={() => setSelected(t.thread_id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                    selected === t.thread_id
                      ? 'bg-primary-50 text-primary-800 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  Finder #{t.thread_id}
                  <span className="block text-xs text-gray-400 font-normal">
                    {t.messages?.length || 0} message{(t.messages?.length || 0) === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col min-h-[240px]">
            <div className="flex-1 space-y-2 overflow-y-auto max-h-64 mb-3 pr-1">
              {(active?.messages || []).map((m) => {
                const mine = m.sender_type === 'owner'
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      mine
                        ? 'ml-auto bg-primary-600 text-white'
                        : 'mr-auto bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                      {mine ? 'You' : 'Finder'}
                    </p>
                    <p className="whitespace-pre-wrap">{m.message}</p>
                    {m.created_at && (
                      <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <form onSubmit={sendReply} className="flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply to finder…"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={busy || !reply.trim()}
                className="px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
