"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { type UserRole } from "@/lib/api" // Import UserRole

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[] // Use UserRole type
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
        return
      }

      if (requiredRoles && !requiredRoles.includes(user.role)) {
        router.push("/unauthorized")
        return
      }
    }
  }, [user, loading, router, requiredRoles])

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-900 items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
