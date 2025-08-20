"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { CaseAssignmentManager } from "@/components/ui/case-assignment-manager"
import { type Case, type Evidence, casesAPI, evidenceAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { EvidenceUploadModal } from "@/components/ui/evidence-upload-modal"
import { EvidenceManagementPanel } from "@/components/ui/evidence-management-panel"
import {
  ArrowLeft,
  Edit,
  Upload,
  Calendar,
  User,
  AlertTriangle,
  FolderOpen,
  BarChart3,
  Shield,
  FileText,
  Database,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface CaseAnalytics {
  total_evidence: number
  evidence_types: Record<string, number>
  pii_findings: number
  risk_score: number
  completion_percentage: number
  recent_activity: Array<{
    type: string
    description: string
    timestamp: string
    user: string
  }>
}

export default function CaseDetailPage() {
  const params = useParams()
  const caseId = params.id as string
  const [case_, setCase] = useState<Case | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const fetchCaseData = async () => {
      try {
        const [caseData, evidenceData] = await Promise.all([
          casesAPI.getCase(caseId),
          evidenceAPI.listCaseEvidence(caseId),
        ])
        setCase(caseData)
        setEvidence(evidenceData)

        const analyticsData: CaseAnalytics = {
          total_evidence: evidenceData.length,
          evidence_types: evidenceData.reduce(
            (acc, e) => {
              const type = e.type || "DOCUMENT"
              acc[type] = (acc[type] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          ),
          pii_findings: evidenceData.filter((e) => e.type === "PII_ANALYSIS").length,
          risk_score: calculateRiskScore(evidenceData),
          completion_percentage: calculateCompletionPercentage(caseData, evidenceData),
          recent_activity: generateRecentActivity(caseData, evidenceData),
        }
        setAnalytics(analyticsData)
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to fetch case data")
      } finally {
        setLoading(false)
      }
    }

    if (caseId) {
      fetchCaseData()
    }
  }, [caseId])

  const calculateRiskScore = (evidenceData: Evidence[]): number => {
    const piiCount = evidenceData.filter((e) => e.type === "PII_ANALYSIS").length
    const totalEvidence = evidenceData.length
    if (totalEvidence === 0) return 0
    return Math.min(10, (piiCount / totalEvidence) * 10 + Math.random() * 2)
  }

  const calculateCompletionPercentage = (caseData: Case, evidenceData: Evidence[]): number => {
    let score = 0
    if (caseData.description) score += 20
    if (caseData.assigned_to) score += 20
    if (evidenceData.length > 0) score += 30
    if (evidenceData.length > 3) score += 20
    if (caseData.status === "CLOSED") score += 10
    return Math.min(100, score)
  }

  const generateRecentActivity = (caseData: Case, evidenceData: Evidence[]) => {
    const activities = []

    // Case creation
    activities.push({
      type: "case_created",
      description: "Case was created",
      timestamp: caseData.created_at,
      user: caseData.created_by_user?.full_name || "Unknown",
    })

    // Evidence uploads
    evidenceData.slice(-3).forEach((e) => {
      activities.push({
        type: "evidence_added",
        description: `Evidence "${e.name}" was added`,
        timestamp: e.created_at,
        user: e.uploaded_by?.full_name || "Unknown",
      })
    })

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      const newEvidencePromises = Array.from(files).map((file) => evidenceAPI.uploadEvidence(caseId, file))
      const newEvidence = await Promise.all(newEvidencePromises)
      setEvidence([...evidence, ...newEvidence])
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload evidence")
    }
  }

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (confirm("Are you sure you want to delete this evidence?")) {
      try {
        await evidenceAPI.deleteEvidence(evidenceId)
        setEvidence(evidence.filter((e) => e.id !== evidenceId))
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to delete evidence")
      }
    }
  }

  const handleEvidenceAdded = (newEvidence: Evidence) => {
    setEvidence((prev) => [...prev, newEvidence])
  }

  const handleEvidenceUpdate = async (evidenceId: string, updates: Partial<Evidence>) => {
    try {
      setEvidence((prev) => prev.map((e) => (e.id === evidenceId ? { ...e, ...updates } : e)))
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update evidence")
      const [caseData, evidenceData] = await Promise.all([
        casesAPI.getCase(caseId),
        evidenceAPI.listCaseEvidence(caseId),
      ])
      setEvidence(evidenceData)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "bg-red-600"
      case "high":
        return "bg-orange-600"
      case "medium":
        return "bg-yellow-600"
      case "low":
        return "bg-green-600"
      default:
        return "bg-gray-600"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-600"
      case "in_progress":
        return "bg-yellow-600"
      case "closed":
        return "bg-green-600"
      case "archived":
        return "bg-gray-600"
      default:
        return "bg-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return <AlertCircle className="w-4 h-4" />
      case "in_progress":
        return <Clock className="w-4 h-4" />
      case "closed":
        return <CheckCircle className="w-4 h-4" />
      case "archived":
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const canManageAssignments = () => {
    if (!user || !case_) return false
    return user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN"
  }

  const canEditCase = () => {
    if (!user || !case_) return false

    if (user.role === "SUPER_ADMIN") return true

    if (user.role === "ORG_ADMIN" && case_.organization_id === user.organization_id) return true

    if (user.role === "STAFF_USER") {
      return case_.created_by === user.id || case_.assigned_to === user.id
    }

    if (user.role === "INDIVIDUAL_USER") {
      return case_.created_by === user.id || case_.assigned_to === user.id
    }

    return false
  }

  const canDeleteEvidence =
    user?.role === "SUPER_ADMIN" || user?.role === "ORG_ADMIN" || evidence.some((e) => e.uploaded_by_id === user?.id)

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-slate-950">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !case_) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-slate-950">
          <Sidebar />
          <div className="flex-1 p-6">
            <Alert variant="destructive" className="border-red-800 bg-red-900/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-200">{error || "Case not found"}</AlertDescription>
            </Alert>
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
              <div className="animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <FolderOpen className="w-6 h-6 mr-3 text-blue-400" />
                  {case_.title}
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-slate-400">Case #{case_.case_number || case_.id.slice(0, 8)}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-white ${getPriorityColor(case_.priority)} flex items-center gap-1`}>
                      <AlertTriangle className="w-3 h-3" />
                      {case_.priority}
                    </Badge>
                    <Badge className={`text-white ${getStatusColor(case_.status)} flex items-center gap-1`}>
                      {getStatusIcon(case_.status)}
                      {case_.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            {canEditCase() && (
              <div className="flex gap-2">
                <Link href={`/cases/${case_.id}/edit`}>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Case
                  </Button>
                </Link>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  disabled={case_.status === "CLOSED" || case_.status === "ARCHIVED"}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Evidence
                </Button>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Total Evidence</p>
                        <p className="text-2xl font-bold text-white">{analytics.total_evidence}</p>
                      </div>
                      <FileText className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">PII Findings</p>
                        <p className="text-2xl font-bold text-red-400">{analytics.pii_findings}</p>
                      </div>
                      <Shield className="w-8 h-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Risk Score</p>
                        <p className="text-2xl font-bold text-yellow-400">{analytics.risk_score.toFixed(1)}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Completion</p>
                        <p className="text-2xl font-bold text-green-400">{analytics.completion_percentage}%</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Case Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    Case Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {case_.description && (
                    <div>
                      <h4 className="font-semibold mb-2 text-white">Description</h4>
                      <p className="text-slate-300 leading-relaxed">{case_.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm text-slate-400">Created</p>
                        <p className="font-medium text-white">{format(new Date(case_.created_at), "MMM dd, yyyy")}</p>
                        <p className="text-xs text-slate-500">{format(new Date(case_.created_at), "HH:mm")}</p>
                      </div>
                    </div>

                    {case_.updated_at && (
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <Activity className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-sm text-slate-400">Last Updated</p>
                          <p className="font-medium text-white">{format(new Date(case_.updated_at), "MMM dd, yyyy")}</p>
                          <p className="text-xs text-slate-500">{format(new Date(case_.updated_at), "HH:mm")}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {analytics && Object.keys(analytics.evidence_types).length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                      <h4 className="font-semibold mb-3 text-white">Evidence Types</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(analytics.evidence_types).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="border-slate-600 text-slate-300">
                            {type.replace("_", " ")}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-400" />
                      Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <User className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm text-slate-400">Created by</p>
                        <p className="font-medium text-white">{case_.created_by_user?.full_name || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{case_.created_by_user?.role?.replace("_", " ")}</p>
                      </div>
                    </div>

                    {case_.assigned_to_user ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <User className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-sm text-slate-400">Assigned to</p>
                          <p className="font-medium text-white">{case_.assigned_to_user.full_name}</p>
                          <p className="text-xs text-slate-500">{case_.assigned_to_user.role?.replace("_", " ")}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <div>
                          <p className="text-sm text-yellow-400">Unassigned</p>
                          <p className="text-xs text-yellow-300">This case needs to be assigned</p>
                        </div>
                      </div>
                    )}

                    {case_.closed_at && (
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-sm text-slate-400">Closed</p>
                          <p className="font-medium text-white">
                            {format(new Date(case_.closed_at), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {analytics && analytics.recent_activity.length > 0 && (
                  <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-400" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.recent_activity.map((activity, index) => (
                          <div key={index} className="flex items-start gap-3 p-2 bg-slate-800/30 rounded-lg">
                            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white">{activity.description}</p>
                              <p className="text-xs text-slate-400">
                                by {activity.user} • {format(new Date(activity.timestamp), "MMM dd, HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Tabs for Evidence, Assignments, and Timeline */}
            <Tabs defaultValue="evidence" className="w-full">
              <TabsList className="bg-slate-800 border border-slate-700">
                <TabsTrigger
                  value="evidence"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Evidence ({evidence.length})
                </TabsTrigger>
                <TabsTrigger
                  value="assignments"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600"
                >
                  <User className="w-4 h-4 mr-2" />
                  Assignments
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="evidence" className="space-y-4">
                <EvidenceManagementPanel
                  evidence={evidence}
                  onEvidenceUpdate={handleEvidenceUpdate}
                  onEvidenceDelete={handleDeleteEvidence}
                  canEdit={canEditCase()}
                  canDelete={canDeleteEvidence}
                />
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4">
                <CaseAssignmentManager caseId={caseId} canManageAssignments={canManageAssignments()} />
              </TabsContent>

              <TabsContent value="timeline">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Case Timeline
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Chronological view of all case activities and evidence
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics && analytics.recent_activity.length > 0 ? (
                      <div className="space-y-4">
                        {analytics.recent_activity.map((activity, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border-l-4 border-blue-400"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <Activity className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{activity.description}</h4>
                              <p className="text-sm text-slate-400 mt-1">
                                {activity.user} • {format(new Date(activity.timestamp), "MMM dd, yyyy 'at' HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No timeline data available</p>
                        <p className="text-sm">Activity will appear here as the case progresses</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        Case Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {analytics && (
                        <>
                          <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-300">Evidence Count</span>
                            <span className="text-white font-bold">{analytics.total_evidence}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-300">PII Findings</span>
                            <span className="text-red-400 font-bold">{analytics.pii_findings}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-300">Risk Score</span>
                            <span className="text-yellow-400 font-bold">{analytics.risk_score.toFixed(1)}/10</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-300">Completion</span>
                            <span className="text-green-400 font-bold">{analytics.completion_percentage}%</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-400" />
                        Security Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 font-medium">PII Risk Assessment</span>
                          </div>
                          <p className="text-red-300 text-sm">
                            {analytics?.pii_findings || 0} PII findings detected.
                            {(analytics?.pii_findings || 0) > 0
                              ? " Review evidence for sensitive data exposure."
                              : " No PII concerns identified."}
                          </p>
                        </div>

                        <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Search className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-400 font-medium">Investigation Status</span>
                          </div>
                          <p className="text-blue-300 text-sm">
                            Case is {analytics?.completion_percentage || 0}% complete.
                            {(analytics?.completion_percentage || 0) < 50
                              ? " More evidence collection recommended."
                              : " Investigation is progressing well."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <EvidenceUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        caseId={caseId}
        onEvidenceAdded={handleEvidenceAdded}
      />
    </ProtectedRoute>
  )
}
