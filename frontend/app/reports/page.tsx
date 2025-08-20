"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { Download, FileText, Calendar, BarChart3, PieChart, TrendingUp, Eye, Plus } from "lucide-react"

export default function ReportsPage() {
  const [reports] = useState([
    {
      id: 1,
      title: "Weekly Security Assessment",
      type: "security",
      status: "completed",
      created: "2024-01-15T10:00:00Z",
      size: "2.4 MB",
      pages: 45,
      description: "Comprehensive security analysis covering all OSINT findings from the past week",
    },
    {
      id: 2,
      title: "Domain Intelligence Report",
      type: "domain",
      status: "generating",
      created: "2024-01-15T09:30:00Z",
      size: "1.8 MB",
      pages: 32,
      description: "Detailed analysis of monitored domains and their security posture",
    },
    {
      id: 3,
      title: "PII Exposure Analysis",
      type: "pii",
      status: "completed",
      created: "2024-01-14T16:20:00Z",
      size: "3.1 MB",
      pages: 67,
      description: "Analysis of personal identifiable information found across various sources",
    },
    {
      id: 4,
      title: "Dark Web Monitoring Summary",
      type: "darkweb",
      status: "completed",
      created: "2024-01-14T14:15:00Z",
      size: "1.2 MB",
      pages: 28,
      description: "Summary of dark web activities and threat intelligence gathered",
    },
    {
      id: 5,
      title: "Monthly Executive Summary",
      type: "executive",
      status: "scheduled",
      created: "2024-01-13T12:00:00Z",
      size: "0.8 MB",
      pages: 15,
      description: "High-level overview of security posture and key findings for executives",
    },
  ])

  const templates = [
    {
      id: 1,
      name: "Security Assessment",
      description: "Comprehensive security analysis report",
      icon: "🛡️",
      category: "security",
    },
    {
      id: 2,
      name: "Threat Intelligence",
      description: "Dark web and threat landscape analysis",
      icon: "⚠️",
      category: "threat",
    },
    {
      id: 3,
      name: "PII Exposure",
      description: "Personal data exposure and breach analysis",
      icon: "👤",
      category: "privacy",
    },
    {
      id: 4,
      name: "Executive Summary",
      description: "High-level overview for leadership",
      icon: "📊",
      category: "executive",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-600"
      case "generating":
        return "bg-blue-600"
      case "scheduled":
        return "bg-yellow-600"
      case "failed":
        return "bg-red-600"
      default:
        return "bg-gray-600"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "security":
        return "🛡️"
      case "domain":
        return "🌐"
      case "pii":
        return "👤"
      case "darkweb":
        return "🕵️"
      case "executive":
        return "📊"
      default:
        return "📄"
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">Reports</h1>
              <p className="text-slate-400">Generate and manage OSINT intelligence reports</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Reports</p>
                      <p className="text-2xl font-bold text-white">{reports.length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Completed</p>
                      <p className="text-2xl font-bold text-green-400">
                        {reports.filter((r) => r.status === "completed").length}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Generating</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {reports.filter((r) => r.status === "generating").length}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Size</p>
                      <p className="text-2xl font-bold text-white">9.3 MB</p>
                    </div>
                    <PieChart className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Templates */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Report Templates</CardTitle>
                <CardDescription className="text-slate-400">
                  Quick start templates for common report types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">{template.icon}</div>
                        <h3 className="text-white font-medium mb-1">{template.name}</h3>
                        <p className="text-sm text-slate-400 mb-3">{template.description}</p>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Generate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Recent Reports</CardTitle>
                <CardDescription className="text-slate-400">
                  Your latest generated reports and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getTypeIcon(report.type)}</span>
                          <div>
                            <h3 className="text-white font-medium">{report.title}</h3>
                            <p className="text-sm text-slate-400 capitalize">{report.type} report</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(report.status)}>{report.status}</Badge>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {report.status === "completed" && (
                              <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-300 mb-3">{report.description}</p>

                      <div className="flex items-center justify-between text-sm text-slate-400">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(report.created).toLocaleDateString()}
                          </span>
                          <span>{report.pages} pages</span>
                          <span>{report.size}</span>
                        </div>
                        {report.status === "generating" && (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                            <span className="text-blue-400">Generating...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
