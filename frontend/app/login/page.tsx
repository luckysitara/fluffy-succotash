"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Shield, Eye, EyeOff, Mail, ArrowLeft, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showResetForm, setShowResetForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const getErrorMessage = (error: any) => {
    // <CHANGE> Enhanced error message handling for better user feedback
    if (!error) return "An unexpected error occurred. Please try again."
    
    const errorMessage = error.message || error.detail || error.toString()
    
    // Handle specific error cases
    if (errorMessage.includes("Incorrect username or password")) {
      return "Invalid username or password. Please check your credentials and try again."
    }
    
    if (errorMessage.includes("Inactive user")) {
      return "Your account has been deactivated. Please contact your administrator for assistance."
    }
    
    if (errorMessage.includes("Network error") || errorMessage.includes("fetch")) {
      return "Unable to connect to the server. Please check your internet connection and try again."
    }
    
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return "Authentication failed. Please verify your username and password are correct."
    }
    
    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      return "Access denied. You don't have permission to access this system."
    }
    
    if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
      return "Server error occurred. Please try again later or contact support if the problem persists."
    }
    
    if (errorMessage.includes("timeout")) {
      return "Request timed out. Please check your connection and try again."
    }
    
    // Return the original message if no specific case matches
    return errorMessage
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // <CHANGE> Added client-side validation for better UX
    if (!username.trim()) {
      setError("Please enter your username.")
      setLoading(false)
      return
    }
    
    if (!password.trim()) {
      setError("Please enter your password.")
      setLoading(false)
      return
    }

    try {
      await login(username, password)
      toast({
        title: "Login Successful",
        description: "Welcome back to Sentinel OSINT Platform",
      })
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Login error:", error)
      const errorMessage = getErrorMessage(error)
      setError(errorMessage)
      
      // <CHANGE> Enhanced toast notifications with more specific messaging
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage("")
    setResetLoading(true)

    // <CHANGE> Added validation for reset email
    if (!resetEmail.trim()) {
      setResetMessage("Please enter your email address.")
      setResetLoading(false)
      return
    }
    
    if (!resetEmail.includes("@")) {
      setResetMessage("Please enter a valid email address.")
      setResetLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Password reset failed" }))
        throw new Error(errorData.detail || "Password reset failed")
      }

      setResetMessage("Password reset email sent! Please check your inbox and spam folder.")
      setResetEmail("")
      toast({
        title: "Reset Email Sent",
        description: "Please check your email for password reset instructions",
      })
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send reset email. Please try again or contact support."
      setResetMessage(errorMessage)
      toast({
        title: "Reset Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Sentinel OSINT</h1>
            <p className="text-slate-400">Intelligence Platform</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">Sign In</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-800 bg-red-900/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 pr-10"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : null}
                Sign In
              </Button>
            </form>

            {/* Password Reset Section */}
            <div className="pt-4 border-t border-slate-700">
              <Collapsible open={showResetForm} onOpenChange={setShowResetForm}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full text-sm text-slate-400 hover:text-white"
                  >
                    Forgot your password?
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {resetMessage && (
                    <Alert className={resetMessage.includes("sent") ? "border-green-600 bg-green-900/20" : "border-red-600 bg-red-900/20"}>
                      <Mail className="h-4 w-4" />
                      <AlertDescription className={resetMessage.includes("sent") ? "text-green-300" : "text-red-300"}>
                        {resetMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-white text-sm">
                        Email Address
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                        autoComplete="email"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowResetForm(false)}
                        className="flex-1 border-slate-600 text-slate-400 hover:text-white"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={resetLoading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                      >
                        {resetLoading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        ) : (
                          <Mail className="w-4 h-4 mr-1" />
                        )}
                        Send Reset Email
                      </Button>
                    </div>
                  </form>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          <p>© 2024 Sentinel OSINT Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
