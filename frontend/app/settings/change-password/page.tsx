"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProtectedRoute } from "@/components/ui/protected-route"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react'
import Link from "next/link"

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long")
      setLoading(false)
      return
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password")
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Password change failed" }))
        throw new Error(errorData.detail || "Password change failed")
      }

      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      })

    } catch (error: any) {
      setError(error.message || "Failed to change password")
      toast({
        title: "Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-900">
        <Sidebar />

        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <Link href="/settings">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
              </Link>
              <div className="animate-slide-in-left">
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Shield className="w-6 h-6 mr-3 text-blue-400" />
                  Change Password
                </h1>
                <p className="text-slate-400">Update your account password</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Card className="border-slate-800 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Change Your Password</CardTitle>
                  <CardDescription className="text-slate-400">
                    Enter your current password and choose a new one
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {success && (
                    <Alert className="mb-6 border-green-600 bg-green-900/20">
                      <Shield className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-green-400">
                        Password changed successfully!
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-slate-300">
                        Current Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Enter your current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="bg-slate-900/50 border-slate-700 text-white pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-slate-300">
                        New Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter your new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          disabled={loading}
                          className="bg-slate-900/50 border-slate-700 text-white pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">Password must be at least 8 characters long</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-slate-300">
                        Confirm New Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={8}
                          disabled={loading}
                          className="bg-slate-900/50 border-slate-700 text-white pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        ) : null}
                        Change Password
                      </Button>
                      <Link href="/settings">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                        >
                          Cancel
                        </Button>
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
