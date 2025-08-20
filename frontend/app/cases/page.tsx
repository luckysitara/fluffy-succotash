"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Plus, Search, Calendar, User, CheckCircle, Clock, Eye, Edit, Trash2, FolderOpen } from "lucide-react"
import { ProtectedRoute } from "@/components/ui/protected-route"

interface Case {
  id: string
  title: string
  description: string
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "ARCHIVED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  created_by: string
  assigned_to?: string
  created_at: string
  updated_at?: string
  created_by_user?: {
    username: string
    full_name: string
  }
  assigned_to_user?: {
    username: string
    full_name: string
  }
  organization_id?: string
}

const statusColors = {
  OPEN: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  CLOSED: "bg-green-500",
  ARCHIVED: "bg-gray-500",
}

const priorityColors = {
  LOW: "bg-gray-500",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
}

const statusIcons = {
  OPEN: FolderOpen,
  IN_PROGRESS: Clock,
  CLOSED: CheckCircle,
  ARCHIVED: Eye,
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [deletingCases, setDeletingCases] = useState<Set<string>>(new Set())
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    // Redirect to dashboard with cases tab active
    router.push("/dashboard")
  }, [router])

  const fetchCases = async () => {
    try {
      const response = await api.get("/cases/")
      setCases(response.data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch cases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCases = cases.filter((case_) => {
    const matchesSearch =
      case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || case_.status === statusFilter
    const matchesPriority = priorityFilter === "all" || case_.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleDeleteCase = async (caseId: string) => {
    if (deletingCases.has(caseId)) return

    if (!confirm("Are you sure you want to delete this case?")) return

    setDeletingCases((prev) => new Set(prev).add(caseId))

    const caseToDelete = cases.find((c) => c.id === caseId)
    setCases((prevCases) => prevCases.filter((c) => c.id !== caseId))

    try {
      await api.delete(`/cases/${caseId}`)
      toast({
        title: "Success",
        description: "Case deleted successfully",
      })
    } catch (error: any) {
      let errorMessage = "Failed to delete case"
      let shouldRefreshCases = false

      if (error.status === 404) {
        errorMessage = "Case not found. It may have already been deleted."
        shouldRefreshCases = true
      } else if (error.status === 403) {
        errorMessage = "You don't have permission to delete this case."
        if (caseToDelete) {
          setCases((prevCases) =>
            [...prevCases, caseToDelete].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
          )
        }
      } else if (error.status === 0) {
        errorMessage = "Network error. Please check your connection and try again."
        if (caseToDelete) {
          setCases((prevCases) =>
            [...prevCases, caseToDelete].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
          )
        }
      } else if (error.detail) {
        errorMessage = error.detail
        if (caseToDelete) {
          setCases((prevCases) =>
            [...prevCases, caseToDelete].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
          )
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })

      if (shouldRefreshCases) {
        fetchCases()
      }
    } finally {
      setDeletingCases((prev) => {
        const newSet = new Set(prev)
        newSet.delete(caseId)
        return newSet
      })
    }
  }

  const canEditCase = (case_: Case) => {
    if (!user) return false

    // Super admin can edit everything
    if (user.role === "SUPER_ADMIN") return true

    // Org admin can edit cases in their organization
    if (user.role === "ORG_ADMIN" && case_.organization_id === user.organization_id) return true

    // Staff users can edit cases they created or are assigned to
    if (user.role === "STAFF_USER") {
      return case_.created_by === user.id || case_.assigned_to === user.id
    }

    // Individual users can edit their own cases
    if (user.role === "INDIVIDUAL_USER") {
      return case_.created_by === user.id || case_.assigned_to === user.id
    }

    return false
  }

  const canDeleteCase = (case_: Case) => {
    if (!user) return false

    // Super admin can delete everything
    if (user.role === "SUPER_ADMIN") return true

    // Org admin can delete cases in their organization
    if (user.role === "ORG_ADMIN" && case_.organization_id === user.organization_id) return true

    // Only creators can delete their own cases (not assignees)
    return case_.created_by === user.id
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-950 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-800 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-800 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Cases</h1>
              <p className="text-gray-400 mt-1">Manage your investigation cases</p>
            </div>
            <Button onClick={() => router.push("/cases/new")} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
          </div>

          {/* Filters */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search cases..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Cases Grid */}
          {filteredCases.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-12 text-center">
                <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No cases found</h3>
                <p className="text-gray-400 mb-6">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first case to get started"}
                </p>
                {!searchTerm && statusFilter === "all" && priorityFilter === "all" && (
                  <Button
                    onClick={() => router.push("/cases/new")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Case
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCases.map((case_) => {
                const StatusIcon = statusIcons[case_.status]
                return (
                  <Card
                    key={case_.id}
                    className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/cases/${case_.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className="w-5 h-5 text-gray-400" />
                          <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                            {case_.title}
                          </CardTitle>
                        </div>
                        <div className="flex space-x-1">
                          {canEditCase(case_) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/cases/${case_.id}/edit`)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-800 text-gray-300 hover:text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDeleteCase(case_) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCase(case_.id)
                              }}
                              disabled={deletingCases.has(case_.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity z-10 text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardDescription className="text-gray-400 line-clamp-2">{case_.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className={`${statusColors[case_.status]} text-white`}>
                          {case_.status.replace("_", " ")}
                        </Badge>
                        <Badge className={`${priorityColors[case_.priority]} text-white`}>{case_.priority}</Badge>
                      </div>
                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>
                            Created by{" "}
                            {case_.created_by_user?.full_name || case_.created_by_user?.username || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(case_.created_at).toLocaleDateString()}</span>
                        </div>
                        {case_.assigned_to_user && (
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>
                              Assigned to {case_.assigned_to_user.full_name || case_.assigned_to_user.username}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
