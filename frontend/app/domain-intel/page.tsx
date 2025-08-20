"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { IntelligenceToCaseModal } from "@/components/ui/intelligence-to-case-modal"
import { useToast } from "@/hooks/use-toast"
import { Globe, Search, AlertTriangle, CheckCircle, XCircle, Lock, MapPin, Network, FolderPlus } from "lucide-react"

interface DomainResult {
  domain: string
  status: string
  whois: {
    registrar: string
    created: string
    expires: string
    updated: string
    nameservers: string[]
  }
  dns: {
    a_records: string[]
    mx_records: string[]
    ns_records: string[]
    txt_records: string[]
  }
  ssl: {
    valid: boolean
    issuer: string
    expires: string
    grade: string
  }
  subdomains: string[]
  reputation: {
    score: number
    category: string
    threats: string[]
  }
  geolocation: {
    country: string
    city: string
    isp: string
  }
}

export default function DomainIntelPage() {
  const [domain, setDomain] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DomainResult | null>(null)
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [scanHistory, setScanHistory] = useState([])
  const [stats, setStats] = useState({
    domains_scanned: 0,
    subdomains_found: 0,
    threats_detected: 0,
    ssl_issues: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domain/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats({
            domains_scanned: data.domains_scanned || 0,
            subdomains_found: data.subdomains_found || 0,
            threats_detected: data.threats_detected || 0,
            ssl_issues: data.ssl_issues || 0,
          })
          setScanHistory(data.recent_scans || [])
        }
      } catch (error) {
        console.error("Failed to fetch domain stats:", error)
      }
    }

    fetchStats()
  }, [])

  const handleDomainAnalysis = async () => {
    if (!domain.trim()) {
      toast({
        title: "Error",
        description: "Please enter a domain to analyze",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Mock domain analysis results
      const mockResult: DomainResult = {
        domain: domain,
        status: "active",
        whois: {
          registrar: "GoDaddy LLC",
          created: "2020-03-15",
          expires: "2025-03-15",
          updated: "2023-12-01",
          nameservers: ["ns1.example.com", "ns2.example.com"],
        },
        dns: {
          a_records: ["192.168.1.1", "192.168.1.2"],
          mx_records: ["mail.example.com", "mail2.example.com"],
          ns_records: ["ns1.example.com", "ns2.example.com"],
          txt_records: ["v=spf1 include:_spf.google.com ~all", "google-site-verification=abc123"],
        },
        ssl: {
          valid: true,
          issuer: "Let's Encrypt",
          expires: "2024-06-15",
          grade: "A+",
        },
        subdomains: ["www.example.com", "mail.example.com", "ftp.example.com", "blog.example.com"],
        reputation: {
          score: 85,
          category: "legitimate",
          threats: [],
        },
        geolocation: {
          country: "United States",
          city: "San Francisco",
          isp: "Cloudflare Inc.",
        },
      }

      setResults(mockResult)

      toast({
        title: "Analysis Complete",
        description: `Domain analysis completed. Found ${mockResult.subdomains.length} subdomains.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze domain",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCase = () => {
    if (!results) return
    setShowCaseModal(true)
  }

  const getIntelligenceData = () => {
    if (!results) return null

    const riskLevel = results.reputation.threats.length > 0 ? "HIGH" : results.reputation.score < 50 ? "MEDIUM" : "LOW"

    return {
      type: "domain" as const,
      query: results.domain,
      results: results,
      findings: results.subdomains.length + results.dns.a_records.length,
      riskLevel: riskLevel as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-600"
      case "flagged":
        return "bg-red-600"
      case "suspicious":
        return "bg-yellow-600"
      default:
        return "bg-gray-600"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high":
        return "bg-red-600"
      case "medium":
        return "bg-yellow-600"
      case "low":
        return "bg-green-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">Domain Intelligence</h1>
              <p className="text-slate-400">Comprehensive domain analysis and reconnaissance</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-blue-600">
                <Globe className="w-4 h-4 mr-1" />
                Domain Scanner
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
                      <p className="text-sm text-slate-400">Domains Scanned</p>
                      <p className="text-2xl font-bold text-white">{stats.domains_scanned.toLocaleString()}</p>
                    </div>
                    <Globe className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Subdomains Found</p>
                      <p className="text-2xl font-bold text-green-400">{stats.subdomains_found.toLocaleString()}</p>
                    </div>
                    <Network className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Threats Detected</p>
                      <p className="text-2xl font-bold text-red-400">{stats.threats_detected}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">SSL Issues</p>
                      <p className="text-2xl font-bold text-yellow-400">{stats.ssl_issues}</p>
                    </div>
                    <Lock className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Domain Analysis Tool */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Domain Analysis</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter a domain to perform comprehensive intelligence gathering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="domain-input" className="text-white">
                      Domain Name
                    </Label>
                    <Input
                      id="domain-input"
                      placeholder="Enter domain (e.g., example.com)"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleDomainAnalysis}
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Analyze Domain
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results && (
              <div className="space-y-6">
                {/* Domain Overview */}
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center">
                          <Globe className="w-5 h-5 mr-2" />
                          {results.domain}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className={getStatusColor(results.status)}>{results.status.toUpperCase()}</Badge>
                          <Badge className="bg-slate-700">Reputation: {results.reputation.score}/100</Badge>
                        </div>
                      </div>
                      <Button onClick={handleAddToCase} className="bg-green-600 hover:bg-green-700">
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Add to Case
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="text-white font-medium mb-2">WHOIS Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Registrar:</span>
                            <span className="text-white">{results.whois.registrar}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Created:</span>
                            <span className="text-white">{results.whois.created}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Expires:</span>
                            <span className="text-white">{results.whois.expires}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-medium mb-2">SSL Certificate</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            {results.ssl.valid ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-white">{results.ssl.valid ? "Valid" : "Invalid"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Issuer:</span>
                            <span className="text-white">{results.ssl.issuer}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Grade:</span>
                            <Badge className="bg-green-600">{results.ssl.grade}</Badge>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-medium mb-2">Geolocation</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span className="text-white">
                              {results.geolocation.city}, {results.geolocation.country}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ISP:</span>
                            <span className="text-white">{results.geolocation.isp}</span>
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
                    <Tabs defaultValue="dns" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                        <TabsTrigger value="dns" className="data-[state=active]:bg-blue-600">
                          DNS Records
                        </TabsTrigger>
                        <TabsTrigger value="subdomains" className="data-[state=active]:bg-blue-600">
                          Subdomains
                        </TabsTrigger>
                        <TabsTrigger value="security" className="data-[state=active]:bg-blue-600">
                          Security
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="dns" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-white font-medium mb-2">A Records</h4>
                            <div className="space-y-1">
                              {results.dns.a_records.map((record, idx) => (
                                <div key={idx} className="p-2 bg-slate-800/50 rounded text-sm text-slate-300 font-mono">
                                  {record}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-2">MX Records</h4>
                            <div className="space-y-1">
                              {results.dns.mx_records.map((record, idx) => (
                                <div key={idx} className="p-2 bg-slate-800/50 rounded text-sm text-slate-300 font-mono">
                                  {record}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="subdomains" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {results.subdomains.map((subdomain, idx) => (
                            <div key={idx} className="p-3 bg-slate-800/50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <Globe className="w-4 h-4 text-blue-400" />
                                <span className="text-white font-mono text-sm">{subdomain}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="security" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-white font-medium mb-3">Reputation Analysis</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Security Score</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 h-2 bg-slate-700 rounded-full">
                                    <div
                                      className="h-2 bg-green-500 rounded-full"
                                      style={{ width: `${results.reputation.score}%` }}
                                    />
                                  </div>
                                  <span className="text-white">{results.reputation.score}/100</span>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Category</span>
                                <Badge className="bg-green-600">{results.reputation.category}</Badge>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-3">Threat Intelligence</h4>
                            {results.reputation.threats.length > 0 ? (
                              <div className="space-y-2">
                                {results.reputation.threats.map((threat, idx) => (
                                  <div key={idx} className="flex items-center space-x-2">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <span className="text-red-300">{threat}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-green-300">No threats detected</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Scan History */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Recent Domain Scans</CardTitle>
                <CardDescription className="text-slate-400">Your recent domain analysis history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanHistory.length > 0 ? (
                    scanHistory.map((scan: any) => (
                      <div key={scan.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Globe className="w-5 h-5 text-blue-400" />
                          <div>
                            <p className="text-white font-medium">{scan.domain}</p>
                            <p className="text-xs text-slate-400">{new Date(scan.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(scan.status)}>{scan.status}</Badge>
                          <Badge className={getRiskColor(scan.risk)}>{scan.risk} risk</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">No recent scans available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Intelligence to Case Modal */}
      {showCaseModal && getIntelligenceData() && (
        <IntelligenceToCaseModal
          isOpen={showCaseModal}
          onClose={() => setShowCaseModal(false)}
          intelligenceData={getIntelligenceData()!}
          onCaseCreated={(caseId) => {
            toast({
              title: "Success",
              description: "Intelligence data added to case successfully",
            })
          }}
        />
      )}
    </ProtectedRoute>
  )
}
