"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { casesAPI } from "@/lib/api"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"

const caseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  assigned_to: z.string().optional(),
})

type CaseFormData = z.infer<typeof caseSchema>

export default function NewCasePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      priority: "MEDIUM",
    },
  })

  const onSubmit = async (data: CaseFormData) => {
    setLoading(true)
    setError("")

    try {
      const newCase = await casesAPI.createCase(data)
      router.push(`/cases/${newCase.id}`)
    } catch (err: any) {
      setError(err.detail || "Failed to create case")
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
              <Link href="/cases">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Cases
                </Button>
              </Link>
              <div className="animate-slide-in-left">
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Plus className="w-6 h-6 mr-3 text-blue-400" />
                  Create New Case
                </h1>
                <p className="text-slate-400">Start a new investigation case</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Card className="border-slate-800 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Case Details</CardTitle>
                  <CardDescription className="text-slate-400">
                    Provide the basic information for the new case
                  </CardDescription>
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
                        disabled={loading}
                        className="bg-slate-900/50 border-slate-700 text-white"
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
                        disabled={loading}
                        className="bg-slate-900/50 border-slate-700 text-white"
                      />
                      {errors.description && <p className="text-sm text-red-400">{errors.description.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority" className="text-slate-300">
                          Priority
                        </Label>
                        <Select
                          value={watch("priority")}
                          onValueChange={(value) => setValue("priority", value as any)}
                          disabled={loading}
                        >
                          <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.priority && <p className="text-sm text-red-400">{errors.priority.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assigned_to" className="text-slate-300">
                          Assign To
                        </Label>
                        <CaseAssignmentSelect
                          value={watch("assigned_to")}
                          onValueChange={(value) => setValue("assigned_to", value)}
                          disabled={loading}
                          placeholder="Select assignee (optional)"
                        />
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="border-red-800 bg-red-900/50">
                        <AlertDescription className="text-red-200">{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-4">
                      <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? "Creating..." : "Create Case"}
                      </Button>
                      <Link href="/cases">
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
