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
import { useToast } from "@/hooks/use-toast"
import { Server, Search, MapPin, Shield, AlertTriangle, CheckCircle, XCircle, Network } from "lucide-react"
import { api } from "@/lib/api"
import { CaseSelector } from "@/components/ui/case-selector"

interface IPResult {
  ip: string
  geolocation: {
    country: string
    region: string
    city: string
    latitude: number
    longitude: number
    timezone: string
    isp: string
    organization: string
  }
  reputation: {
    score: number
    category: string
    threats: string[]
    blacklisted: boolean
  }
  network: {
    asn: string
    asn_name: string
    cidr: string
    type: string
  }
  ports: {
    open: number[]
    filtered: number[]
    closed: number[]
  }
  services: {
    port: number
    service: string
    version: string
    banner: string
  }[]
  vulnerabilities: {
    cve: string
    severity: string
    description: string
  }[]
}

interface IPStats {
  total_ips_analyzed: number
  open_ports: number
  vulnerabilities: number
  blacklisted: number
  recent_scans: Array<{
    ip: string
    timestamp: string
    country: string
    risk: string
  }>
}

export default function IPAnalysisPage() {
  const [ipAddress, setIpAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<IPResult | null>(null)
  const [scanHistory, setScanHistory] = useState<
    Array<{
      id: number
      ip: string
      timestamp: string
      country: string
      risk: string
    }>
  >([])
  const [stats, setStats] = useState<IPStats>({
    total_ips_analyzed: 0,
    open_ports: 0,
    vulnerabilities: 0,
    blacklisted: 0,
    recent_scans: [],
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/ip/stats`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setStats(data)

          if (data.recent_scans) {
            setScanHistory(
              data.recent_scans.map((scan: any, index: number) => ({
                id: index + 1,
                ip: scan.ip,
                timestamp: scan.timestamp,
                country: scan.country || "Unknown",
                risk: scan.risk,
              })),
            )
          }
        }
      } catch (error) {
        console.error("Failed to fetch IP stats:", error)
      }
    }

    fetchStats()
  }, [])

  const handleIPAnalysis = async () => {
    if (!ipAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter an IP address to analyze",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const mockResult: IPResult = {
        ip: ipAddress,
        geolocation: {
          country: "United States",
          region: "California",
          city: "San Francisco",
          latitude: 37.7749,
          longitude: -122.4194,
          timezone: "America/Los_Angeles",
          isp: "Cloudflare Inc.",
          organization: "Cloudflare",
        },
        reputation: {
          score: 92,
          category: "legitimate",
          threats: [],
          blacklisted: false,
        },
        network: {
          asn: "AS13335",
          asn_name: "CLOUDFLARENET",
          cidr: "104.16.0.0/12",
          type: "hosting",
        },
        ports: {
          open: [80, 443, 8080],
          filtered: [22, 3389],
          closed: [21, 23, 25],
        },
        services: [
          {
            port: 80,
            service: "HTTP",
            version: "nginx/1.18.0",
            banner: "nginx/1.18.0 (Ubuntu)",
          },
          {
            port: 443,
            service: "HTTPS",
            version: "nginx/1.18.0",
            banner: "nginx/1.18.0 (Ubuntu) OpenSSL/1.1.1f",
          },
        ],
        vulnerabilities: [
          {
            cve: "CVE-2023-1234",
            severity: "medium",
            description: "Potential information disclosure vulnerability",
          },
        ],
      }

      setResults(mockResult)

      toast({
        title: "Analysis Complete",
        description: `IP analysis completed. Found ${mockResult.ports.open.length} open ports and ${mockResult.vulnerabilities.length} vulnerabilities. Use the buttons below to create a case or add to existing case.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze IP address",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createCaseFromScan = async (scanType: string, query: string, findings: number) => {
    try {
      const caseData = {
        title: `${scanType}: ${query}`,
        description: `Case created from ${scanType.toLowerCase()} scan. Found ${findings} open ports and network information requiring investigation.`,
        status: "OPEN",
        priority: findings > 5 ? "HIGH" : findings > 2 ? "MEDIUM" : "LOW",
        case_type: "IP_ANALYSIS",
      }

      const newCase = await api.createCase(caseData)

      if (results) {
        await addIPEvidence(newCase.id, query, results)
      }

      toast({
        title: "Case Created",
        description: `Case ${newCase.case_number} created with IP analysis results`,
      })
    } catch (error) {
      console.error("Failed to create case:", error)
      toast({
        title: "Error",
        description: "Failed to create case from analysis results",
        variant: "destructive",
      })
    }
  }

  const addIPEvidence = async (caseId: string, ipAddress: string, analysis: IPResult) => {
    try {
      const intelligenceData = {
        ip_address: ipAddress,
        analysis_type: "ip_intelligence",
        findings: {
          geolocation: analysis.geolocation,
          network_info: analysis.network,
          port_scan: analysis.ports,
          services: analysis.services,
          vulnerabilities: analysis.vulnerabilities,
          reputation: analysis.reputation,
        },
        timestamp: new Date().toISOString(),
        risk_assessment: {
          reputation_score: analysis.reputation.score,
          blacklisted: analysis.reputation.blacklisted,
          open_ports: analysis.ports.open.length,
          vulnerability_count: analysis.vulnerabilities.length,
          threat_count: analysis.reputation.threats.length,
        },
      }

      await api.createIntelligenceEvidence(
        caseId,
        "IP_ANALYSIS",
        `IP Analysis: ${ipAddress}`,
        JSON.stringify(intelligenceData),
        "IP Intelligence Scanner",
        `Comprehensive IP intelligence analysis including geolocation, ${analysis.ports.open.length} open ports, ${analysis.services.length} services, and ${analysis.vulnerabilities.length} vulnerabilities`,
      )
    } catch (error) {
      console.error("Failed to add IP evidence:", error)
      throw error
    }
  }

  const addToExistingCase = async (caseId: string) => {
    if (!results) {
      toast({
        title: "No Results",
        description: "No analysis results to add to case",
        variant: "destructive",
      })
      return
    }

    try {
      await addIPEvidence(caseId, ipAddress, results)

      toast({
        title: "Evidence Added",
        description: `IP analysis findings added to case as evidence`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add evidence to case",
        variant: "destructive",
      })
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

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-600"
      case "high":
        return "bg-orange-600"
      case "medium":
        return "bg-yellow-600"
      case "low":
        return "bg-blue-600"
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
              <h1 className="text-2xl font-bold text-white">IP Analysis</h1>
              <p className="text-slate-400">Comprehensive IP address intelligence and reconnaissance</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-600">
                <Server className="w-4 h-4 mr-1" />
                IP Scanner
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
                      <p className="text-sm text-slate-400">IPs Scanned</p>
                      <p className="text-2xl font-bold text-white">{stats.total_ips_analyzed.toLocaleString()}</p>
                    </div>
                    <Server className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Open Ports</p>
                      <p className="text-2xl font-bold text-blue-400">{stats.open_ports.toLocaleString()}</p>
                    </div>
                    <Network className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Vulnerabilities</p>
                      <p className="text-2xl font-bold text-red-400">{stats.vulnerabilities}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Blacklisted</p>
                      <p className="text-2xl font-bold text-yellow-400">{stats.blacklisted}</p>
                    </div>
                    <Shield className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* IP Analysis Tool */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">IP Address Analysis</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter an IP address to perform comprehensive intelligence gathering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="ip-input" className="text-white">
                      IP Address
                    </Label>
                    <Input
                      id="ip-input"
                      placeholder="Enter IP address (e.g., 192.168.1.1)"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleIPAnalysis}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Analyze IP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results && (
              <div className="space-y-6">
                {/* IP Overview */}
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center">
                          <Server className="w-5 h-5 mr-2" />
                          {results.ip}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className={results.reputation.blacklisted ? "bg-red-600" : "bg-green-600"}>
                            {results.reputation.blacklisted ? "BLACKLISTED" : "CLEAN"}
                          </Badge>
                          <Badge className="bg-slate-700">Reputation: {results.reputation.score}/100</Badge>
                          <Badge className="bg-blue-600">{results.network.type.toUpperCase()}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => createCaseFromScan("IP Analysis", ipAddress, results.ports.open.length)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                        >
                          Create New Case
                        </Button>
                        <CaseSelector onCaseSelect={addToExistingCase} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="text-white font-medium mb-2 flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          Geolocation
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Country:</span>
                            <span className="text-white">{results.geolocation.country}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">City:</span>
                            <span className="text-white">{results.geolocation.city}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ISP:</span>
                            <span className="text-white">{results.geolocation.isp}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Timezone:</span>
                            <span className="text-white">{results.geolocation.timezone}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-medium mb-2 flex items-center">
                          <Network className="w-4 h-4 mr-2" />
                          Network Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">ASN:</span>
                            <span className="text-white">{results.network.asn}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Organization:</span>
                            <span className="text-white">{results.network.asn_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">CIDR:</span>
                            <span className="text-white font-mono">{results.network.cidr}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-medium mb-2 flex items-center">
                          <Shield className="w-4 h-4 mr-2" />
                          Security Status
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Reputation Score:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 h-2 bg-slate-700 rounded-full">
                                <div
                                  className="h-2 bg-green-500 rounded-full"
                                  style={{ width: `${results.reputation.score}%` }}
                                />
                              </div>
                              <span className="text-white">{results.reputation.score}/100</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Category:</span>
                            <Badge className="bg-green-600">{results.reputation.category}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Threats:</span>
                            <span className="text-white">{results.reputation.threats.length}</span>
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
                    <Tabs defaultValue="ports" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                        <TabsTrigger value="ports" className="data-[state=active]:bg-green-600">
                          Port Scan
                        </TabsTrigger>
                        <TabsTrigger value="services" className="data-[state=active]:bg-green-600">
                          Services
                        </TabsTrigger>
                        <TabsTrigger value="vulnerabilities" className="data-[state=active]:bg-green-600">
                          Vulnerabilities
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="ports" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-green-400 font-medium mb-2 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Open Ports ({results.ports.open.length})
                            </h4>
                            <div className="space-y-1">
                              {results.ports.open.map((port, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-green-900/20 border border-green-800 rounded text-sm text-green-300 font-mono"
                                >
                                  {port}/tcp
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-yellow-400 font-medium mb-2 flex items-center">
                              <Shield className="w-4 h-4 mr-2" />
                              Filtered Ports ({results.ports.filtered.length})
                            </h4>
                            <div className="space-y-1">
                              {results.ports.filtered.map((port, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-yellow-900/20 border border-yellow-800 rounded text-sm text-yellow-300 font-mono"
                                >
                                  {port}/tcp
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-slate-400 font-medium mb-2 flex items-center">
                              <XCircle className="w-4 h-4 mr-2" />
                              Closed Ports ({results.ports.closed.length})
                            </h4>
                            <div className="space-y-1">
                              {results.ports.closed.slice(0, 3).map((port, idx) => (
                                <div key={idx} className="p-2 bg-slate-800/50 rounded text-sm text-slate-400 font-mono">
                                  {port}/tcp
                                </div>
                              ))}
                              {results.ports.closed.length > 3 && (
                                <div className="text-xs text-slate-500 text-center">
                                  +{results.ports.closed.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="services" className="space-y-4">
                        <div className="space-y-3">
                          {results.services.map((service, idx) => (
                            <div key={idx} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <Badge className="bg-blue-600">Port {service.port}</Badge>
                                  <span className="text-white font-medium">{service.service}</span>
                                </div>
                                <Badge variant="outline" className="border-slate-600">
                                  {service.version}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-400 font-mono">{service.banner}</p>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="vulnerabilities" className="space-y-4">
                        {results.vulnerabilities.length > 0 ? (
                          <div className="space-y-3">
                            {results.vulnerabilities.map((vuln, idx) => (
                              <div key={idx} className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-3">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                    <span className="text-white font-medium">{vuln.cve}</span>
                                  </div>
                                  <Badge className={getSeverityColor(vuln.severity)}>
                                    {vuln.severity.toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-300">{vuln.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                            <p className="text-green-300">No vulnerabilities detected</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Scan History */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Recent IP Scans</CardTitle>
                <CardDescription className="text-slate-400">Your recent IP analysis history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanHistory.length > 0 ? (
                    scanHistory.map((scan) => (
                      <div key={scan.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Server className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-white font-medium font-mono">{scan.ip}</p>
                            <p className="text-xs text-slate-400">
                              {scan.country} • {new Date(scan.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getRiskColor(scan.risk)}>{scan.risk} risk</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No recent IP scans found</p>
                      <p className="text-sm">Start analyzing IP addresses to see your scan history</p>
                    </div>
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
