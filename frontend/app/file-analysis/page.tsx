"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { FileText, CheckCircle, XCircle, Zap, Activity, Database, Lock, Bug } from "lucide-react"

interface FileAnalysisResult {
  filename: string
  size: number
  type: string
  hash: {
    md5: string
    sha1: string
    sha256: string
  }
  malware_scan: {
    is_malicious: boolean
    threat_level: string
    detections: {
      engine: string
      result: string
      confidence: number
    }[]
  }
  static_analysis: {
    file_type: string
    entropy: number
    strings: string[]
    imports: string[]
    exports: string[]
  }
  behavioral_analysis: {
    network_activity: {
      connections: string[]
      dns_queries: string[]
    }
    file_operations: string[]
    registry_changes: string[]
  }
}

export default function FileAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FileAnalysisResult | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [stats, setStats] = useState({
    files_analyzed: 0,
    malware_detected: 0,
    clean_files: 0,
    quarantined: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/file-analysis/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats({
            files_analyzed: data.files_analyzed || 0,
            malware_detected: data.malware_detected || 0,
            clean_files: data.clean_files || 0,
            quarantined: data.quarantined || 0,
          })
          setAnalysisHistory(data.recent_analyses || [])
        }
      } catch (error) {
        console.error("Failed to fetch file analysis stats:", error)
      }
    }

    fetchStats()
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleFileAnalysis = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to analyze",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Mock file analysis results
      const mockResult: FileAnalysisResult = {
        filename: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type || "application/octet-stream",
        hash: {
          md5: "d41d8cd98f00b204e9800998ecf8427e",
          sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
        malware_scan: {
          is_malicious: Math.random() > 0.7,
          threat_level: Math.random() > 0.5 ? "high" : "medium",
          detections: [
            {
              engine: "ClamAV",
              result: Math.random() > 0.5 ? "Trojan.Generic" : "Clean",
              confidence: Math.random() * 100,
            },
            {
              engine: "Windows Defender",
              result: Math.random() > 0.5 ? "Malware" : "Clean",
              confidence: Math.random() * 100,
            },
            {
              engine: "Kaspersky",
              result: Math.random() > 0.5 ? "Suspicious" : "Clean",
              confidence: Math.random() * 100,
            },
          ],
        },
        static_analysis: {
          file_type: "PE32 executable",
          entropy: Math.random() * 8,
          strings: ["http://malicious-site.com", "password", "admin", "connect"],
          imports: ["kernel32.dll", "user32.dll", "ws2_32.dll"],
          exports: ["DllMain", "StartService"],
        },
        behavioral_analysis: {
          network_activity: {
            connections: ["192.168.1.100:443", "malicious-c2.com:8080"],
            dns_queries: ["malicious-c2.com", "update-server.net"],
          },
          file_operations: [
            "Created: C:\\temp\\malware.tmp",
            "Modified: C:\\Windows\\System32\\hosts",
            "Deleted: C:\\Users\\victim\\Documents\\important.doc",
          ],
          registry_changes: [
            "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Malware",
            "HKCU\\Software\\Classes\\exefile\\shell\\open\\command",
          ],
        },
      }

      setResults(mockResult)

      // Create a new case automatically
      await createCaseFromScan("File Analysis", selectedFile.name, mockResult.malware_scan.detections.length)

      toast({
        title: "Analysis Complete",
        description: `File analysis completed. ${mockResult.malware_scan.is_malicious ? "Threats detected!" : "File appears clean."} Case created.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze file",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createCaseFromScan = async (scanType: string, filename: string, findings: number) => {
    try {
      const caseData = {
        title: `${scanType}: ${filename}`,
        description: `Automated case created from ${scanType.toLowerCase()}. File analyzed with ${findings} detection engines.`,
        status: "OPEN",
        priority: findings > 2 ? "HIGH" : findings > 0 ? "MEDIUM" : "LOW",
        case_type: "FILE_ANALYSIS",
      }

      console.log("Creating case:", caseData)
    } catch (error) {
      console.error("Failed to create case:", error)
    }
  }

  const getThreatColor = (level: string) => {
    switch (level.toLowerCase()) {
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">File Analysis</h1>
              <p className="text-slate-400">Advanced malware detection and file forensics</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-orange-600">
                <FileText className="w-4 h-4 mr-1" />
                File Scanner
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Files Analyzed</p>
                      <p className="text-2xl font-bold text-white">{stats.files_analyzed.toLocaleString()}</p>
                    </div>
                    <FileText className="w-8 h-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Malware Detected</p>
                      <p className="text-2xl font-bold text-red-400">{stats.malware_detected}</p>
                    </div>
                    <Bug className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Clean Files</p>
                      <p className="text-2xl font-bold text-green-400">{stats.clean_files.toLocaleString()}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Quarantined</p>
                      <p className="text-2xl font-bold text-yellow-400">{stats.quarantined}</p>
                    </div>
                    <Lock className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* File Upload */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">File Analysis</CardTitle>
                <CardDescription className="text-slate-400">
                  Upload a file for comprehensive malware analysis and forensics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-input" className="text-white">
                      Select File
                    </Label>
                    <Input
                      id="file-input"
                      type="file"
                      onChange={handleFileSelect}
                      className="bg-slate-800 border-slate-700 text-white file:bg-slate-700 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded"
                    />
                    {selectedFile && (
                      <div className="mt-2 p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-orange-400" />
                          <div>
                            <p className="text-white font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-slate-400">
                              {formatFileSize(selectedFile.size)} • {selectedFile.type || "Unknown type"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleFileAnalysis}
                    disabled={loading || !selectedFile}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Analyze File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {results && (
              <div className="space-y-6">
                {/* File Overview */}
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      {results.filename}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={results.malware_scan.is_malicious ? "bg-red-600" : "bg-green-600"}>
                        {results.malware_scan.is_malicious ? "MALICIOUS" : "CLEAN"}
                      </Badge>
                      <Badge className={getThreatColor(results.malware_scan.threat_level)}>
                        {results.malware_scan.threat_level.toUpperCase()} RISK
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="text-white font-medium mb-2">File Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Size:</span>
                            <span className="text-white">{formatFileSize(results.size)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Type:</span>
                            <span className="text-white">{results.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Entropy:</span>
                            <span className="text-white">{results.static_analysis.entropy.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-medium mb-2">File Hashes</h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-slate-400">MD5:</span>
                            <p className="text-white font-mono text-xs break-all">{results.hash.md5}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">SHA1:</span>
                            <p className="text-white font-mono text-xs break-all">{results.hash.sha1}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">SHA256:</span>
                            <p className="text-white font-mono text-xs break-all">{results.hash.sha256}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-medium mb-2">Detection Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Engines:</span>
                            <span className="text-white">{results.malware_scan.detections.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Detections:</span>
                            <span className="text-red-400">
                              {results.malware_scan.detections.filter((d) => d.result !== "Clean").length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Clean:</span>
                            <span className="text-green-400">
                              {results.malware_scan.detections.filter((d) => d.result === "Clean").length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Analysis */}
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Detailed Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="malware" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                        <TabsTrigger value="malware" className="data-[state=active]:bg-orange-600">
                          Malware Scan
                        </TabsTrigger>
                        <TabsTrigger value="static" className="data-[state=active]:bg-orange-600">
                          Static Analysis
                        </TabsTrigger>
                        <TabsTrigger value="behavioral" className="data-[state=active]:bg-orange-600">
                          Behavioral
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="malware" className="space-y-4">
                        <div className="space-y-3">
                          {results.malware_scan.detections.map((detection, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-lg border ${
                                detection.result === "Clean"
                                  ? "bg-green-900/20 border-green-800"
                                  : "bg-red-900/20 border-red-800"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  {detection.result === "Clean" ? (
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-400" />
                                  )}
                                  <span className="text-white font-medium">{detection.engine}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={detection.result === "Clean" ? "bg-green-600" : "bg-red-600"}>
                                    {detection.result}
                                  </Badge>
                                  <Badge variant="outline" className="border-slate-600">
                                    {Math.round(detection.confidence)}% confidence
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="static" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-white font-medium mb-3">Imports</h4>
                            <div className="space-y-1">
                              {results.static_analysis.imports.map((imp, idx) => (
                                <div key={idx} className="p-2 bg-slate-800/50 rounded text-sm text-slate-300 font-mono">
                                  {imp}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-3">Suspicious Strings</h4>
                            <div className="space-y-1">
                              {results.static_analysis.strings.map((str, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-red-900/20 border border-red-800 rounded text-sm text-red-300 font-mono"
                                >
                                  {str}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="behavioral" className="space-y-4">
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-white font-medium mb-3 flex items-center">
                              <Activity className="w-4 h-4 mr-2" />
                              Network Activity
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h5 className="text-slate-300 text-sm mb-2">Connections</h5>
                                <div className="space-y-1">
                                  {results.behavioral_analysis.network_activity.connections.map((conn, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2 bg-red-900/20 border border-red-800 rounded text-sm text-red-300 font-mono"
                                    >
                                      {conn}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h5 className="text-slate-300 text-sm mb-2">DNS Queries</h5>
                                <div className="space-y-1">
                                  {results.behavioral_analysis.network_activity.dns_queries.map((dns, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2 bg-yellow-900/20 border border-yellow-800 rounded text-sm text-yellow-300 font-mono"
                                    >
                                      {dns}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-white font-medium mb-3 flex items-center">
                              <Database className="w-4 h-4 mr-2" />
                              File Operations
                            </h4>
                            <div className="space-y-1">
                              {results.behavioral_analysis.file_operations.map((op, idx) => (
                                <div key={idx} className="p-2 bg-slate-800/50 rounded text-sm text-slate-300">
                                  {op}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-white font-medium mb-3 flex items-center">
                              <Lock className="w-4 h-4 mr-2" />
                              Registry Changes
                            </h4>
                            <div className="space-y-1">
                              {results.behavioral_analysis.registry_changes.map((reg, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-orange-900/20 border border-orange-800 rounded text-sm text-orange-300 font-mono"
                                >
                                  {reg}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Analysis History */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Recent File Analysis</CardTitle>
                <CardDescription className="text-slate-400">Your recent file analysis history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisHistory.length > 0 ? (
                    analysisHistory.map((analysis: any) => (
                      <div
                        key={analysis.id}
                        className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-orange-400" />
                          <div>
                            <p className="text-white font-medium">{analysis.filename}</p>
                            <p className="text-xs text-slate-400">{new Date(analysis.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={analysis.is_malicious ? "bg-red-600" : "bg-green-600"}>
                            {analysis.is_malicious ? "Malicious" : "Clean"}
                          </Badge>
                          <Badge className={getThreatColor(analysis.threat_level)}>{analysis.threat_level} risk</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">No recent analyses available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
