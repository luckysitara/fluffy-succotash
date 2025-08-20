"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { BarChart3, Search, Filter, Download, Eye, AlertTriangle, CheckCircle, Clock } from "lucide-react"

export default function ScanResultsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [results, setResults] = useState([
    {
      id: 1,
      type: "email",
      target: "john.doe@company.com",
      status: "completed",
      severity: "high",
      findings: 3,
      timestamp: "2024-01-15T10:30:00Z",
      duration: "2m 34s",
      details: "Found in 3 data breaches: LinkedIn (2021), Facebook (2019), Adobe (2013)",
    },
    {
      id: 2,
      type: "domain",
      target: "suspicious-site.com",
      status: "completed",
      severity: "low",
      findings: 0,
      timestamp: "2024-01-15T09:15:00Z",
      duration: "1m 12s",
      details: "Clean domain with valid SSL certificate",
    },
    {
      id: 3,
      type: "ip",
      target: "192.168.1.100",
      status: "running",
      severity: "medium",
      findings: 1,
      timestamp: "2024-01-15T11:45:00Z",
      duration: "45s",
      details: "Scanning in progress...",
    },
    {
      id: 4,
      type: "username",
      target: "johndoe123",
      status: "completed",
      severity: "medium",
      findings: 5,
      timestamp: "2024-01-15T08:20:00Z",
      duration: "3m 18s",
      details: "Found on 5 platforms: Twitter, Instagram, GitHub, Reddit, LinkedIn",
    },
    {
      id: 5,
      type: "phone",
      target: "+1234567890",
      status: "failed",
      severity: "unknown",
      findings: 0,
      timestamp: "2024-01-15T07:30:00Z",
      duration: "30s",
      details: "Scan failed due to rate limiting",
    },
    {
      id: 6,
      type: "file",
      target: "document.pdf",
      status: "completed",
      severity: "critical",
      findings: 2,
      timestamp: "2024-01-14T16:45:00Z",
      duration: "5m 42s",
      details: "Malware detected by 2/67 engines",
    },
  ])

  const [filteredResults, setFilteredResults] = useState(results)

  useEffect(() => {
    let filtered = results

    if (searchTerm) {
      filtered = filtered.filter(
        (result) =>
          result.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.details.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (filterType !== "all") {
      filtered = filtered.filter((result) => result.type === filterType)
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((result) => result.status === filterStatus)
    }

    setFilteredResults(filtered)
  }, [searchTerm, filterType, filterStatus, results])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600"
      case "high":
        return "bg-orange-600"
      case "medium":
        return "bg-yellow-600"
      case "low":
        return "bg-green-600"
      case "unknown":
        return "bg-gray-600"
      default:
        return "bg-gray-600"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400"
      case "running":
        return "text-blue-400"
      case "failed":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return CheckCircle
      case "running":
        return Clock
      case "failed":
        return AlertTriangle
      default:
        return Clock
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return "📧"
      case "domain":
        return "🌐"
      case "ip":
        return "🖥️"
      case "username":
        return "👤"
      case "phone":
        return "📱"
      case "file":
        return "📄"
      default:
        return "🔍"
    }
  }

  const stats = {
    total: results.length,
    completed: results.filter((r) => r.status === "completed").length,
    running: results.filter((r) => r.status === "running").length,
    failed: results.filter((r) => r.status === "failed").length,
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-900">
        <Sidebar />

        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-slide-in-left">
              <h1 className="text-2xl font-bold text-white">Scan Results</h1>
              <p className="text-slate-400">View and manage all OSINT scan results</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-slate-800 bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Scans</p>
                      <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Completed</p>
                      <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Running</p>
                      <p className="text-2xl font-bold text-blue-400">{stats.running}</p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Failed</p>
                      <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="border-slate-800 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-blue-400" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search results..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-900/50 border-slate-700 text-white"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="username">Username</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card className="border-slate-800 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">Scan Results ({filteredResults.length})</CardTitle>
                <CardDescription className="text-slate-400">All OSINT scan results and findings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredResults.map((result) => {
                    const StatusIcon = getStatusIcon(result.status)
                    return (
                      <div
                        key={result.id}
                        className="p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900/80 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getTypeIcon(result.type)}</span>
                            <div>
                              <p className="text-white font-medium">{result.target}</p>
                              <p className="text-sm text-slate-400 capitalize">{result.type} scan</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="flex items-center space-x-2">
                                <StatusIcon className={`w-4 h-4 ${getStatusColor(result.status)}`} />
                                <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                                  {result.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{result.duration}</p>
                            </div>
                            {result.severity !== "unknown" && (
                              <Badge className={getSeverityColor(result.severity)}>{result.severity}</Badge>
                            )}
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-slate-300">{result.details}</p>
                            {result.findings > 0 && (
                              <p className="text-sm text-blue-400 mt-1">
                                {result.findings} finding{result.findings !== 1 ? "s" : ""} detected
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">{new Date(result.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {filteredResults.length === 0 && (
                  <div className="text-center py-8 text-slate-500">No scan results found matching your criteria.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
