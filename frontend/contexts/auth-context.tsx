"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient, type UserRole } from "@/lib/api" // Import apiClient and UserRole

interface User {
  id: string // converted from number to string for UUID compatibility
  username: string
  email: string
  full_name: string
  role: UserRole // Use the imported UserRole type
  organization_id?: string // converted from number to string for UUID compatibility
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        setLoading(false)
        return
      }

      const userData = await apiClient.getCurrentUser() // Use apiClient
      setUser(userData)
    } catch (error) {
      console.error("Auth check failed:", error)
      localStorage.removeItem("access_token")
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await apiClient.login(username, password) // Use apiClient
      localStorage.setItem("access_token", data.access_token)
      await checkAuth()
      router.push("/dashboard")
      return true
    } catch (error) {
      console.error("Login failed:", error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    setUser(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
