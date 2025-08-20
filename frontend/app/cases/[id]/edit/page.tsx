"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { CaseAssignmentSelect } from "@/components/ui/case-assignment-select"
import { casesAPI, type Case } from "@/lib/api"
import { ArrowLeft, Save, X, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

const caseEditSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "ARCHIVED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  assigned_to: z.string().optional(),
})

type CaseEditFormData = z.infer<typeof caseEditSchema>

export default function EditCasePage() {
  const params = useParams()
  const caseId = params.id as string
  const [case_, setCase] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<CaseEditFormData>({
    resolver: zodResolver(caseEditSchema),
  })

  useEffect(() => {
    const fetchCase = async () => {
      try {
        setError("")
        console.log("[v0] Fetching case:", caseId)
        const caseData = await casesAPI.getCase(caseId)
        console.log("[v0] Case data received:", caseData)
        setCase(caseData)

        // Populate form with existing data
        reset({
          title: caseData.title,
          description: caseData.description || "",
          status: caseData.status as any,
          priority: caseData.priority as any,
          assigned_to: caseData.assigned_to || undefined,
        })
      } catch (err: any) {
        console.error("[v0] Failed to fetch case:", err)
        setError(err.detail || err.message || "Failed to fetch case data")
      } finally {
        setLoading(false)
      }
    }

    if (caseId) {
      fetchCase()
    }
  }, [caseId, reset])

  const onSubmit = async (data: CaseEditFormData) => {
    setSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      const updateData = {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        assigned_to: data.assigned_to || null,
      }

      console.log("[v0] Updating case with data:", updateData)
      console.log("[v0] Case ID:", caseId)

      const updatedCase = await casesAPI.updateCase(caseId, updateData)
      console.log("[v0] Case updated successfully:", updatedCase)

      setCase(updatedCase)
      setSuccessMessage("Case updated successfully!")

      toast({
        title: "Success",
        description: "Case updated successfully",
      })

      setTimeout(() => {
        router.push(`/cases/${caseId}`)
      }, 1500)
    } catch (err: any) {
      console.error("[v0] Case update error:", err)
      console.error("[v0] Error details:", {
        status: err.status,
        statusText: err.statusText,
        detail: err.detail,
        message: err.message,
        response: err.response,
      })

      let errorMessage = "Failed to update case"

      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.detail) {
        errorMessage = Array.isArray(err.detail) ? err.detail.join(", ") : err.detail
      } else if (err.message) {
        errorMessage = err.message
      } else if (typeof err === "string") {
        errorMessage = err
      }

      if (err.status === 422 || err.status === 400) {
        errorMessage = "Validation error: " + errorMessage
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to edit this case"
      } else if (err.status === 404) {
        errorMessage = "Case not found"
      }

      setError(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (isDirty) {
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        router.push(`/cases/${caseId}`)
      }
    } else {
      router.push(`/cases/${caseId}`)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-slate-950">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading case details...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error && !case_) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-slate-950">
          <Sidebar />
          <div className="flex-1 p-6">
            <Alert variant="destructive" className="border-red-800 bg-red-900/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Link href="/cases">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Cases
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
            <div className="flex items-center gap-4">
              <Link href={`/cases/${caseId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Case
                </Button>
              </Link>
              <div className="animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Save className="w-6 h-6 mr-3 text-blue-400" />
                  Edit Case
                </h1>
                <p className="text-slate-400">{case_?.title}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {isDirty && (
                <div className="flex items-center text-sm text-yellow-400 mr-4">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
                  Unsaved changes
                </div>
              )}
              {successMessage && (
                <div className="flex items-center text-sm text-green-400 mr-4">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {successMessage}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Case Details</CardTitle>
                  <CardDescription className="text-slate-400">Update the case information and settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-slate-300">
                        Case Title *
                      </Label>
                      <Input
                        id="title"
                        {...register("title")}
                        placeholder="Enter case title"
                        disabled={saving}
                        className="bg-slate-800/50 border-slate-700 text-white focus:border-blue-500"
                      />
                      {errors.title && <p className="text-sm text-red-400">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-slate-300">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        {...register("description")}
                        placeholder="Provide a detailed description of the case"
                        rows={4}
                        disabled={saving}
                        className="bg-slate-800/50 border-slate-700 text-white focus:border-blue-500"
                      />
                      {errors.description && <p className="text-sm text-red-400">{errors.description.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-slate-300">
                          Status
                        </Label>
                        <Select
                          value={watch("status")}
                          onValueChange={(value) => setValue("status", value as any, { shouldDirty: true })}
                          disabled={saving}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white focus:border-blue-500">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.status && <p className="text-sm text-red-400">{errors.status.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority" className="text-slate-300">
                          Priority
                        </Label>
                        <Select
                          value={watch("priority")}
                          onValueChange={(value) => setValue("priority", value as any, { shouldDirty: true })}
                          disabled={saving}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white focus:border-blue-500">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.priority && <p className="text-sm text-red-400">{errors.priority.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assigned_to" className="text-slate-300">
                        Assign To
                      </Label>
                      <CaseAssignmentSelect
                        value={watch("assigned_to")}
                        onValueChange={(value) => setValue("assigned_to", value, { shouldDirty: true })}
                        disabled={saving}
                        placeholder="Select assignee (optional)"
                      />
                    </div>

                    {successMessage && (
                      <Alert className="border-green-800 bg-green-900/50">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <AlertDescription className="text-green-200">{successMessage}</AlertDescription>
                      </Alert>
                    )}

                    {error && (
                      <Alert variant="destructive" className="border-red-800 bg-red-900/50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-red-200">{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-slate-700">
                      <Button
                        type="submit"
                        disabled={saving || !isDirty}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={saving}
                        className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
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
