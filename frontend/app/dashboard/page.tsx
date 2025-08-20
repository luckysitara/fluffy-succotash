"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { StatCard } from "@/components/ui/stat-card"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { api, casesAPI, usersAPI } from "@/lib/api" // Import UserRole
import { OrganizationSelect } from "@/components/organization-select" // Added OrganizationSelect import
import {
  BarChart3,
  Plus,
  Search,
  Globe,
  Server,
  FileText,
  Eye,
  FolderOpen,
  Calendar,
  User,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  TrendingUp,
  Activity,
  Zap,
} from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation" // Added router for navigation

interface DashboardStats {
  total_cases: number
  active_cases: number
  completed_cases: number
  total_scans: number
  recent_activity: any[]
}

interface Case {
  id: string // Changed from number to string for UUID
  title: string
  description: string
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "ARCHIVED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  case_number: string // Added case_number
  created_by: string // Changed from number to string for UUID
  assigned_to?: string // Changed from number to string for UUID
  organization_id?: string // Changed from number to string for UUID and made optional
  created_at: string
  updated_at?: string
  closed_at?: string
  created_by_user?: {
    // Renamed from creator to created_by_user
    username: string
    full_name: string
  }
  assigned_to_user?: {
    // Renamed from assignee to assigned_to_user
    username: string
    full_name: string
  }
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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [newCaseData, setNewCaseData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as const,
    assigned_to: "", // Changed from assigned_to_id to assigned_to for UUID
    organization_id: "", // Added organization_id field for Super Admin case creation
  })
  const [users, setUsers] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([]) // Added organizations state
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter() // Added router instance

  useEffect(() => {
    fetchDashboardData()
    fetchUsers()
    if (user?.role === "SUPER_ADMIN") {
      // Fetch organizations for Super Admin
      fetchOrganizations()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, casesResponse] = await Promise.all([api.getDashboardStats(), casesAPI.listCases()])
      setStats(statsResponse)
      setCases(casesResponse)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.listUsers()
      setUsers(response.filter((u: any) => u.is_active))
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const fetchOrganizations = async () => {
    // Added fetchOrganizations function
    try {
      const response = await api.listOrganizations()
      setOrganizations(response.filter((org: any) => org.is_active))
    } catch (error) {
      console.error("Failed to fetch organizations:", error)
    }
  }

  const handleCaseSelect = (case_: Case) => {
    setSelectedCase(case_)
    setActiveTab("case-detail")
  }

  const handleToolLaunch = (toolPath: string) => {
    router.push(toolPath)
  }

  const handleCreateCase = async () => {
    if (!newCaseData.title.trim()) {
      toast({
        title: "Error",
        description: "Case title is required",
        variant: "destructive",
      })
      return
    }

    if (user?.role === "SUPER_ADMIN" && !newCaseData.organization_id) {
      toast({
        title: "Error",
        description: "Super Admin must specify an organization when creating a case",
        variant: "destructive",
      })
      return
    }

    try {
      const caseData = {
        ...newCaseData,
        assigned_to: newCaseData.assigned_to || undefined, // Handle UUID strings properly
        organization_id: newCaseData.organization_id || undefined, // Include organization_id in case data
      }

      const response = await casesAPI.createCase(caseData)
      setCases([response, ...cases])
      setNewCaseData({
        title: "",
        description: "",
        priority: "MEDIUM",
        assigned_to: "", // Reset assigned_to field
        organization_id: "", // Reset organization_id field
      })
      toast({
        title: "Success",
        description: "Case created successfully",
      })
      setActiveTab("cases")
    } catch (error: any) {
      console.log("[v0] Case creation error:", error) // Added debug logging
      const errorMessage = error.response?.data?.detail || error.message || "Failed to create case"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm("Are you sure you want to delete this case?")) return

    try {
      await casesAPI.deleteCase(caseId)
      setCases(cases.filter((c) => c.id !== caseId))
      if (selectedCase?.id === caseId) {
        setSelectedCase(null)
        setActiveTab("cases")
      }
      toast({
        title: "Success",
        description: "Case deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete case",
        variant: "destructive",
      })
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

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-slate-950">
          <Sidebar />
          <div className="flex-1 ml-64 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-xl flex items-center justify-center mr-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <p className="text-slate-400 animate-pulse">Loading dashboard...</p>
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

        <div className="flex-1 ml-64 overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="animate-fade-in-up">
                <h1 className="text-4xl font-bold text-white flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  Intelligence Dashboard
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Comprehensive OSINT platform overview</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">System Online</span>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-slate-900/50 border border-slate-800">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="cases"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                >
                  Cases
                </TabsTrigger>
                <TabsTrigger
                  value="new-case"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                >
                  New Case
                </TabsTrigger>
                <TabsTrigger
                  value="intelligence"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                >
                  Intelligence
                </TabsTrigger>
                <TabsTrigger
                  value="case-detail"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                  disabled={!selectedCase}
                >
                  Case Detail
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-8 animate-fade-in-up">
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total Cases"
                      value={stats.total_cases}
                      icon={FolderOpen}
                      trend={12}
                      className="bg-slate-900/50 border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                    />
                    <StatCard
                      title="Active Cases"
                      value={stats.active_cases}
                      icon={Clock}
                      trend={8}
                      className="bg-slate-900/50 border-slate-800 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10"
                    />
                    <StatCard
                      title="Completed Cases"
                      value={stats.completed_cases}
                      icon={CheckCircle}
                      trend={-3}
                      className="bg-slate-900/50 border-slate-800 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
                    />
                    <StatCard
                      title="Total Scans"
                      value={stats.total_scans}
                      icon={Search}
                      trend={25}
                      className="bg-slate-900/50 border-slate-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm hover:border-slate-700 transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
                        Recent Cases
                      </CardTitle>
                      <CardDescription className="text-slate-400">Latest investigation cases</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {cases.slice(0, 5).map((case_, index) => {
                          const StatusIcon = statusIcons[case_.status]
                          return (
                            <div
                              key={case_.id}
                              className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-all duration-200 group animate-slide-in-left"
                              style={{ animationDelay: `${index * 100}ms` }}
                              onClick={() => handleCaseSelect(case_)}
                            >
                              <div className="flex items-center space-x-3">
                                <StatusIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                <div>
                                  <p className="font-medium text-white group-hover:text-blue-400 transition-colors">
                                    {case_.title}
                                  </p>
                                  <p className="text-sm text-slate-400">
                                    {format(new Date(case_.created_at), "MMM dd, yyyy")}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                className={`${statusColors[case_.status]} text-white transition-all duration-200 group-hover:scale-105`}
                              >
                                {case_.status.replace("_", " ")}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm hover:border-slate-700 transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-purple-400" />
                        Intelligence Tools
                      </CardTitle>
                      <CardDescription className="text-slate-400">Quick access to OSINT tools</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          {
                            name: "PII Intel",
                            icon: Search,
                            href: "/pii-intelligence",
                            color: "from-blue-500 to-cyan-500",
                          },
                          {
                            name: "Domain Intel",
                            icon: Globe,
                            href: "/domain-intel",
                            color: "from-green-500 to-emerald-500",
                          },
                          {
                            name: "IP Analysis",
                            icon: Server,
                            href: "/ip-analysis",
                            color: "from-purple-500 to-pink-500",
                          },
                          {
                            name: "File Analysis",
                            icon: FileText,
                            href: "/file-analysis",
                            color: "from-orange-500 to-red-500",
                          },
                        ].map((tool, index) => (
                          <Button
                            key={tool.name}
                            variant="outline"
                            onClick={() => handleToolLaunch(tool.href)} // Added click handler for navigation
                            className={`h-20 flex-col border-slate-700 text-slate-300 hover:text-white bg-gradient-to-br ${tool.color} hover:from-slate-800 hover:to-slate-700 transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in-up`}
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <tool.icon className="w-6 h-6 mb-2" />
                            {tool.name}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Cases Tab */}
              <TabsContent value="cases" className="space-y-6 animate-fade-in-up">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input
                            placeholder="Search cases..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-40 bg-slate-800/50 border-slate-700 text-white">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-full sm:w-40 bg-slate-800/50 border-slate-700 text-white">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
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

                {filteredCases.length === 0 ? (
                  <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                    <CardContent className="p-12 text-center">
                      <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No cases found</h3>
                      <p className="text-slate-400 mb-6">
                        {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Create your first case to get started"}
                      </p>
                      <Button
                        onClick={() => setActiveTab("new-case")}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Case
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCases.map((case_, index) => {
                      const StatusIcon = statusIcons[case_.status]
                      return (
                        <Card
                          key={case_.id}
                          className="border-slate-800 bg-slate-900/50 backdrop-blur-sm hover:border-slate-600 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-blue-500/10 animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => handleCaseSelect(case_)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <StatusIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                                  {case_.title}
                                </CardTitle>
                              </div>
                              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Edit functionality
                                  }}
                                  className="hover:bg-slate-700"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteCase(case_.id)
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <CardDescription className="text-slate-400 line-clamp-2">
                              {case_.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2 mb-4">
                              <Badge className={`${statusColors[case_.status]} text-white`}>
                                {case_.status.replace("_", " ")}
                              </Badge>
                              <Badge className={`${priorityColors[case_.priority]} text-white`}>{case_.priority}</Badge>
                            </div>
                            <div className="space-y-2 text-sm text-slate-400">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>
                                  Created by{" "}
                                  {case_.created_by_user?.full_name || case_.created_by_user?.username || "Unknown"}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(case_.created_at), "MMM dd, yyyy")}</span>
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
              </TabsContent>

              {/* New Case Tab */}
              <TabsContent value="new-case" className="space-y-6 animate-fade-in-up">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Plus className="w-5 h-5 mr-2 text-blue-400" />
                      Create New Case
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Start a new investigation case with the details below
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-slate-300">
                        Case Title *
                      </Label>
                      <Input
                        id="title"
                        value={newCaseData.title}
                        onChange={(e) => setNewCaseData({ ...newCaseData, title: e.target.value })}
                        placeholder="Enter case title"
                        className="bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-slate-300">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={newCaseData.description}
                        onChange={(e) => setNewCaseData({ ...newCaseData, description: e.target.value })}
                        placeholder="Provide a detailed description of the case"
                        rows={4}
                        className="bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {user?.role === "SUPER_ADMIN" && (
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-slate-300">
                          Organization *
                        </Label>
                        <OrganizationSelect
                          value={newCaseData.organization_id}
                          onValueChange={(value) => setNewCaseData({ ...newCaseData, organization_id: value || "" })}
                          placeholder="Select organization for this case"
                          className="bg-slate-800/50 border-slate-700 text-white"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority" className="text-slate-300">
                          Priority
                        </Label>
                        <Select
                          value={newCaseData.priority}
                          onValueChange={(value) => setNewCaseData({ ...newCaseData, priority: value as any })}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assigned_to" className="text-slate-300">
                          Assign To
                        </Label>
                        <Select
                          value={newCaseData.assigned_to || "0"}
                          onValueChange={(value) =>
                            setNewCaseData({ ...newCaseData, assigned_to: value === "0" ? "" : value })
                          }
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                            <SelectValue placeholder="Select assignee (optional)" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="0">Unassigned</SelectItem>
                            {users
                              .filter(
                                (user) =>
                                  !newCaseData.organization_id ||
                                  user.organization_id === newCaseData.organization_id ||
                                  user.role === "SUPER_ADMIN",
                              )
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.full_name} ({user.username})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={handleCreateCase}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex-1"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Case
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("cases")}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Intelligence Tab */}
              <TabsContent value="intelligence" className="space-y-6 animate-fade-in-up">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      name: "PII Intelligence",
                      icon: Search,
                      href: "/pii-intelligence",
                      color: "from-blue-500 to-cyan-500",
                      description: "Email, username, and phone number analysis",
                    },
                    {
                      name: "Domain Intelligence",
                      icon: Globe,
                      href: "/domain-intel",
                      color: "from-green-500 to-emerald-500",
                      description: "Domain and subdomain reconnaissance",
                    },
                    {
                      name: "IP Analysis",
                      icon: Server,
                      href: "/ip-analysis",
                      color: "from-purple-500 to-pink-500",
                      description: "IP address investigation and geolocation",
                    },
                    {
                      name: "File Analysis",
                      icon: FileText,
                      href: "/file-analysis",
                      color: "from-orange-500 to-red-500",
                      description: "File metadata and forensic analysis",
                    },
                    {
                      name: "Dark Web Monitor",
                      icon: Eye,
                      href: "/dark-web",
                      color: "from-red-500 to-pink-500",
                      description: "Dark web monitoring and alerts",
                    },
                    {
                      name: "Scan Results",
                      icon: BarChart3,
                      href: "/scan-results",
                      color: "from-cyan-500 to-blue-500",
                      description: "View and analyze scan results",
                    },
                  ].map((tool, index) => (
                    <Card
                      key={tool.name}
                      className="border-slate-800 bg-slate-900/50 backdrop-blur-sm hover:border-slate-600 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-blue-500/10 animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader>
                        <CardTitle className="text-white flex items-center group-hover:text-blue-400 transition-colors">
                          <div
                            className={`w-10 h-10 bg-gradient-to-br ${tool.color} rounded-lg flex items-center justify-center mr-3`}
                          >
                            <tool.icon className="w-5 h-5 text-white" />
                          </div>
                          {tool.name}
                        </CardTitle>
                        <CardDescription className="text-slate-400">{tool.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => handleToolLaunch(tool.href)} // Added click handler for navigation
                          className={`w-full bg-gradient-to-r ${tool.color} hover:opacity-90 text-white transition-all duration-200 hover:scale-105`}
                        >
                          Launch Tool
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Case Detail Tab */}
              <TabsContent value="case-detail" className="space-y-6 animate-fade-in-up">
                {selectedCase && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-white flex items-center">
                          <FolderOpen className="w-8 h-8 mr-4 text-blue-400" />
                          {selectedCase.title}
                        </h2>
                        <p className="text-slate-400 mt-1">Case ID: #{selectedCase.case_number}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("cases")}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                      >
                        Back to Cases
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2 border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-white">Case Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-white ${statusColors[selectedCase.status]}`}>
                              {selectedCase.status.replace("_", " ")}
                            </Badge>
                            <Badge className={`text-white ${priorityColors[selectedCase.priority]}`}>
                              {selectedCase.priority}
                            </Badge>
                          </div>

                          {selectedCase.description && (
                            <div>
                              <h4 className="font-semibold mb-2 text-white">Description</h4>
                              <p className="text-slate-300">{selectedCase.description}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              <div>
                                <p className="text-sm text-slate-500">Created</p>
                                <p className="font-medium text-white">
                                  {format(new Date(selectedCase.created_at), "MMM dd, yyyy HH:mm")}
                                </p>
                              </div>
                            </div>

                            {selectedCase.updated_at && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <div>
                                  <p className="text-sm text-slate-500">Last Updated</p>
                                  <p className="font-medium text-white">
                                    {format(new Date(selectedCase.updated_at), "MMM dd, yyyy HH:mm")}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-white">Assignment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500" />
                            <div>
                              <p className="text-sm text-slate-500">Created by</p>
                              <p className="font-medium text-white">
                                {selectedCase.created_by_user?.full_name || "Unknown"}
                              </p>
                            </div>
                          </div>

                          {selectedCase.assigned_to_user && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-500" />
                              <div>
                                <p className="text-sm text-slate-500">Assigned to</p>
                                <p className="font-medium text-white">{selectedCase.assigned_to_user.full_name}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
