'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function VendorProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    Promise.all([
      api.get('/vendor/products').catch(() => []),
      api.get('/vendor/profile').catch(() => null),
    ])
      .then(([productsData, profileData]) => {
        setProducts(productsData || [])
        setProfile(profileData)
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Products</h1>
          <Link
            href="/dashboard/vendor/products/new"
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            + Add Product
          </Link>
        </div>

        {!profile && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Set up your shop first.</strong>{' '}
            <Link href="/dashboard/vendor/profile" className="underline font-medium">
              Complete your shop profile
            </Link>{' '}
            before adding products.
          </div>
        )}

        {profile && !profile.is_approved && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your shop is pending admin approval. Products you add will be reviewed but won&apos;t go live until
            your shop is approved.
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven&apos;t added any products yet.</p>
            <Link
              href="/dashboard/vendor/products/new"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Add your first product →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-2">{product.title}</h2>
                <p className="text-gray-600 mb-2">{product.brand}</p>
                <p className="text-sm text-gray-500 mb-4">
                  {product.variants?.[0] ? `BDT ${product.variants[0].price}` : 'No variant'}
                </p>
                <p className={`inline-block px-2 py-1 rounded text-xs mr-2 ${
                  product.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {product.status}
                </p>
                <p className={`inline-block px-2 py-1 rounded text-xs mr-2 ${
                  product.catalog === 'general' ? 'bg-purple-100 text-purple-800' : 'bg-primary-100 text-primary-800'
                }`}>
                  {product.catalog === 'general' ? 'General' : 'Pet'}
                </p>
                <p className={`inline-block px-2 py-1 rounded text-xs ${
                  product.approval_status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {product.approval_status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
