import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
          Loading sign-in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
