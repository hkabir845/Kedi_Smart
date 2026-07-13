'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get('/admin/settings')
      .then(setSettings)
      .catch(() => router.push('/admin'))
      .finally(() => setLoading(false))
  }, [router])

  const handleEdit = (setting: any) => {
    setEditingKey(setting.key)
    setEditValue(JSON.stringify(setting.value_json, null, 2))
  }

  const handleSave = async (key: string) => {
    try {
      const valueJson = JSON.parse(editValue)
      await api.put(`/admin/settings/${key}`, valueJson)
      setEditingKey(null)
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to save setting')
    }
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditValue('')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Admin Dashboard
        </Link>
        <h1 className="text-4xl font-bold mb-8">Platform Settings</h1>

        {settings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No settings found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {settings.map((setting) => (
              <div key={setting.key} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{setting.key}</h3>
                  {editingKey !== setting.key && (
                    <button
                      onClick={() => handleEdit(setting)}
                      className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingKey === setting.key ? (
                  <div>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
                      rows={10}
                    />
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleSave(setting.key)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(setting.value_json, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
