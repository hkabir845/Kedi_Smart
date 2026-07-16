'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import PetImage from '@/components/PetImage'
import { resolveMediaUrl } from '@/lib/media'
import { toWhatsAppDigits } from '@/lib/phone'

export type ScanPayload = {
  tag_uid: string
  pet_id: number
  name?: string
  species?: string
  breed?: string
  gender?: string
  age_text?: string
  color_markings?: string
  photo_url?: string
  location?: string
  lost_mode_active?: boolean
  last_seen_location?: string
  reward_note?: string
  instructions_if_found?: string
  contact_options?: {
    allow_call?: boolean
    allow_whatsapp?: boolean
    allow_chat?: boolean
    phone?: string | null
  }
  message?: string
}

function finderSessionKey(petId: number) {
  return `nfc_finder_session_${petId}`
}

function ensureFinderSession(petId: number): string {
  if (typeof window === 'undefined') return ''
  const key = finderSessionKey(petId)
  let id = localStorage.getItem(key)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `finder_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(key, id)
  }
  return id
}

type Props = {
  tagInfo: ScanPayload
}

export default function ScanProfileClient({ tagInfo }: Props) {
  const [panel, setPanel] = useState<'none' | 'chat' | 'found'>('none')
  const [chatText, setChatText] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatOk, setChatOk] = useState('')
  const [chatErr, setChatErr] = useState('')
  const [foundBusy, setFoundBusy] = useState(false)
  const [foundOk, setFoundOk] = useState('')
  const [foundErr, setFoundErr] = useState('')
  const [found, setFound] = useState({
    finder_name: '',
    finder_contact: '',
    location_text: '',
    message: '',
  })

  const phone = toWhatsAppDigits(tagInfo.contact_options?.phone || '')
  const contacts = tagInfo.contact_options
  const photoSrc = resolveMediaUrl(tagInfo.photo_url)
  const hasContactAction =
    Boolean(contacts?.allow_call && phone) ||
    Boolean(contacts?.allow_whatsapp && phone) ||
    Boolean(contacts?.allow_chat)

  const sessionId = useMemo(() => {
    if (!tagInfo.pet_id) return ''
    return ensureFinderSession(tagInfo.pet_id)
  }, [tagInfo.pet_id])

  useEffect(() => {
    if (tagInfo.pet_id) ensureFinderSession(tagInfo.pet_id)
  }, [tagInfo.pet_id])

  const sendChat = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatText.trim()) return
    setChatBusy(true)
    setChatErr('')
    setChatOk('')
    try {
      await api.post(`/nfc/pets/${tagInfo.pet_id}/messages`, {
        finder_session_id: sessionId || ensureFinderSession(tagInfo.pet_id),
        message: chatText.trim(),
      })
      setChatText('')
      setChatOk('Message sent. The owner can reply in their dashboard.')
    } catch (err: any) {
      setChatErr(err.message || 'Could not send message')
    } finally {
      setChatBusy(false)
    }
  }

  const submitFound = async (e: FormEvent) => {
    e.preventDefault()
    if (!found.finder_contact.trim() && !found.location_text.trim() && !found.message.trim()) {
      setFoundErr('Add a contact, location, or message so the owner can follow up.')
      return
    }
    setFoundBusy(true)
    setFoundErr('')
    setFoundOk('')
    try {
      await api.post(`/nfc/pets/${tagInfo.pet_id}/found-report`, {
        finder_name: found.finder_name.trim() || null,
        finder_contact: found.finder_contact.trim() || null,
        location_text: found.location_text.trim() || null,
        message: found.message.trim() || null,
      })
      setFoundOk('Thank you — your report was sent to the owner.')
      setFound({ finder_name: '', finder_contact: '', location_text: '', message: '' })
    } catch (err: any) {
      setFoundErr(err.message || 'Could not submit report')
    } finally {
      setFoundBusy(false)
    }
  }

  const metaBits = [
    tagInfo.species,
    tagInfo.breed,
    tagInfo.gender,
    tagInfo.age_text,
    tagInfo.color_markings,
    tagInfo.location,
  ].filter(Boolean)

  return (
    <div className="space-y-5">
      {tagInfo.lost_mode_active && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1">Lost pet</p>
          <h2 className="text-xl font-bold text-red-900">Please help reunite this pet</h2>
          {tagInfo.last_seen_location && (
            <p className="text-red-800 mt-2 text-sm">
              Last seen: <span className="font-medium">{tagInfo.last_seen_location}</span>
            </p>
          )}
          {tagInfo.reward_note && (
            <p className="text-red-800 mt-1 text-sm">Reward: {tagInfo.reward_note}</p>
          )}
        </div>
      )}

      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
        {photoSrc ? (
          <PetImage
            src={photoSrc}
            alt={tagInfo.name || 'Pet'}
            fit="contain"
            className="max-w-full max-h-full w-auto h-auto"
            fallbackClassName="w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 px-4 text-center">
            <svg className="w-14 h-14 mb-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <p className="text-xs">Photo not available on this public profile</p>
          </div>
        )}
      </div>

      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          {tagInfo.name || 'Pet profile'}
        </h1>
        {metaBits.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 capitalize">
            {metaBits.map((bit) => (
              <span key={String(bit)}>{bit}</span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Limited public details — use the buttons below to contact the owner.
          </p>
        )}
      </div>

      {tagInfo.instructions_if_found && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold mb-1">If you found me</p>
          <p className="whitespace-pre-wrap">{tagInfo.instructions_if_found}</p>
        </div>
      )}

      <div className="space-y-2.5">
        {contacts?.allow_call && phone && (
          <a
            href={`tel:+${phone}`}
            className="block w-full text-center py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
          >
            Call owner
          </a>
        )}
        {contacts?.allow_whatsapp && phone && (
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 rounded-xl bg-[#25D366] text-white font-semibold hover:opacity-95 transition-opacity"
          >
            WhatsApp owner
          </a>
        )}
        {contacts?.allow_chat && (
          <button
            type="button"
            onClick={() => setPanel(panel === 'chat' ? 'none' : 'chat')}
            className="block w-full text-center py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
          >
            {panel === 'chat' ? 'Close message' : 'Send private message'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPanel(panel === 'found' ? 'none' : 'found')}
          className="block w-full text-center py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
        >
          {panel === 'found' ? 'Close form' : 'I found this pet'}
        </button>
      </div>

      {!hasContactAction && (
        <p className="text-xs text-center text-gray-500">
          Direct call / chat may be limited — use &quot;I found this pet&quot; to reach the owner.
        </p>
      )}

      {panel === 'chat' && (
        <form onSubmit={sendChat} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Message the owner without seeing their number. They can reply from their KediSmart dashboard.
          </p>
          <textarea
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            rows={3}
            placeholder="Hi — I think I found your pet near…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-white"
          />
          {chatErr && <p className="text-sm text-red-600">{chatErr}</p>}
          {chatOk && <p className="text-sm text-emerald-700">{chatOk}</p>}
          <button
            type="submit"
            disabled={chatBusy || !chatText.trim()}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {chatBusy ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}

      {panel === 'found' && (
        <form onSubmit={submitFound} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
          <p className="text-sm text-gray-600">Tell the owner where and how to reach you.</p>
          <input
            value={found.finder_name}
            onChange={(e) => setFound({ ...found, finder_name: e.target.value })}
            placeholder="Your name (optional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
          <input
            value={found.finder_contact}
            onChange={(e) => setFound({ ...found, finder_contact: e.target.value })}
            placeholder="Phone or email"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
          <input
            value={found.location_text}
            onChange={(e) => setFound({ ...found, location_text: e.target.value })}
            placeholder="Where did you find the pet?"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
          <textarea
            value={found.message}
            onChange={(e) => setFound({ ...found, message: e.target.value })}
            rows={3}
            placeholder="Extra details"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
          {foundErr && <p className="text-sm text-red-600">{foundErr}</p>}
          {foundOk && <p className="text-sm text-emerald-700">{foundOk}</p>}
          <button
            type="submit"
            disabled={foundBusy}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {foundBusy ? 'Submitting…' : 'Submit found report'}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-gray-400 pt-2">
        Powered by{' '}
        <Link href="/" className="text-primary-600 hover:underline">
          KediSmart
        </Link>
      </p>
    </div>
  )
}
