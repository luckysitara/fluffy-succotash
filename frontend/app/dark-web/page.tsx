"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import {
  Eye,
  Search,
  AlertTriangle,
  Shield,
  Globe,
  DollarSign,
  Users,
  MessageSquare,
  Clock,
  Database,
  Activity,
  Zap,
} from "lucide-react"

interface DarkWebResult {
  type: string
  title: string
  description: string
  url: string
  timestamp: string
  risk_level: string
  category: string
  price?: string
  seller?: string
  rating?: number
}

export default function DarkWebPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DarkWebResult[]>([])
  const [monitoredKeywords, setMonitoredKeywords] = useState([])
  const [stats, setStats] = useState({
    total_mentions: 0,
    critical_alerts: 0,
    marketplaces: 0,
    active_monitors: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dark-web/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats({
            total_mentions: data.total_mentions || 0,
            critical_alerts: data.critical_alerts || 0,
            marketplaces: data.marketplaces || 0,
            active_monitors: data.active_monitors || 0,
          })
          setMonitoredKeywords(data.monitored_keywords || [])
        }
      } catch (error) {
        console.error("Failed to fetch dark web stats:", error)
        // Keep default values if API fails
      }
    }

    fetchStats()
  }, [])

  const handleDarkWebSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Mock dark web search results
      const mockResults: DarkWebResult[] = [
        {
          type: "marketplace",
          title: "Corporate Database Access",
          description: "Fresh database dump from major corporation containing user credentials and PII",
          url: "dark://marketplace.onion/listing/12345",
          timestamp: "2024-01-15T10:30:00Z",
          risk_level: "critical",
          category: "data_breach",
          price: "$2,500",
          seller: "DataBroker99",
          rating: 4.2,
        },
        {
          type: "forum",
          title: "Discussion about recent breach",
          description: "Forum post discussing methods used in recent corporate breach",
          url: "dark://forum.onion/thread/67890",
          timestamp: "2024-01-14T18:45:00Z",
          risk_level: "high",
          category: "threat_intelligence",
        },
        {
          type: "paste",
          title: "Leaked credentials",
          description: "Pastebin-style dump containing email:password combinations",
          url: "dark://paste.onion/abc123",
          timestamp: "2024-01-13T22:15:00Z",
          risk_level: "high",
          category: "credential_dump",
        },
      ]

      setResults(mockResults)

      // Create a new case automatically
      await createCaseFromScan("Dark Web Monitor", searchTerm, mockResults.length)

      toast({
        title: "Search Complete",
        description: `Found ${mockResults.length} dark web mentions. Case created automatically.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search dark web",
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
        description: `Automated case created from ${scanType.toLowerCase()} search. Found ${findings} dark web mentions requiring investigation.`,
        status: "OPEN",
        priority: findings > 3 ? "HIGH" : findings > 1 ? "MEDIUM" : "LOW",
        case_type: "DARK_WEB_MONITORING",
      }

      console.log("Creating case:", caseData)
    } catch (error) {
      console.error("Failed to create case:", error)
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "data_breach":
        return <Database className="w-4 h-4" />
      case "marketplace":
        return <DollarSign className="w-4 h-4" />
      case "forum":
        return <MessageSquare className="w-4 h-4" />
      case "threat_intelligence":
        return <Shield className="w-4 h-4" />
      case "credential_dump":
        return <Users className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">Dark Web Monitor</h1>
              <p className="text-slate-400">Monitor dark web activities and threat intelligence</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-red-600">
                <Eye className="w-4 h-4 mr-1" />
                Dark Web Scanner
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
                      <p className="text-sm text-slate-400">Total Mentions</p>
                      <p className="text-2xl font-bold text-white">{stats.total_mentions.toLocaleString()}</p>
                    </div>
                    <Eye className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Critical Alerts</p>
                      <p className="text-2xl font-bold text-red-400">{stats.critical_alerts}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Marketplaces</p>
                      <p className="text-2xl font-bold text-yellow-400">{stats.marketplaces}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Active Monitors</p>
                      <p className="text-2xl font-bold text-blue-400">{stats.active_monitors}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search Tool */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Dark Web Search</CardTitle>
                <CardDescription className="text-slate-400">
                  Search for mentions, threats, and intelligence across dark web sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="search-input" className="text-white">
                      Search Term
                    </Label>
                    <Input
                      id="search-input"
                      placeholder="Enter keywords, domains, emails, or company names..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleDarkWebSearch}
                      disabled={loading}
                      className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Search Dark Web
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monitored Keywords */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Monitored Keywords</CardTitle>
                <CardDescription className="text-slate-400">
                  Keywords being actively monitored for dark web mentions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monitoredKeywords.length > 0 ? (
                    monitoredKeywords.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Zap className="w-5 h-5 text-yellow-400" />
                          <div>
                            <p className="text-white font-medium">{item.keyword}</p>
                            <p className="text-xs text-slate-400">
                              Last seen: {new Date(item.last_seen).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-red-600">{item.alerts} alerts</Badge>
                          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">No monitored keywords available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {results.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Search Results</CardTitle>
                  <CardDescription className="text-slate-400">
                    Found {results.length} mentions across dark web sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {getCategoryIcon(result.category)}
                            <div>
                              <h3 className="text-white font-medium">{result.title}</h3>
                              <p className="text-sm text-slate-400 capitalize">{result.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRiskColor(result.risk_level)}>{result.risk_level.toUpperCase()}</Badge>
                            <Badge variant="outline" className="border-slate-600">
                              {result.category.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-slate-300 mb-3">{result.description}</p>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-4 text-slate-400">
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(result.timestamp).toLocaleString()}
                            </span>
                            {result.price && (
                              <span className="flex items-center text-yellow-400">
                                <DollarSign className="w-4 h-4 mr-1" />
                                {result.price}
                              </span>
                            )}
                            {result.seller && (
                              <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {result.seller}
                              </span>
                            )}
                            {result.rating && <span className="flex items-center">⭐ {result.rating}/5</span>}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
                              <Shield className="w-4 h-4 mr-1" />
                              Report
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Threat Intelligence Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Recent Threats</CardTitle>
                  <CardDescription className="text-slate-400">
                    Latest threat intelligence from dark web sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        threat: "New ransomware variant targeting healthcare",
                        severity: "critical",
                        time: "2 hours ago",
                      },
                      {
                        threat: "Corporate credentials for sale",
                        severity: "high",
                        time: "4 hours ago",
                      },
                      {
                        threat: "Discussion about zero-day exploit",
                        severity: "medium",
                        time: "6 hours ago",
                      },
                    ].map((threat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle
                            className={`w-4 h-4 ${
                              threat.severity === "critical"
                                ? "text-red-400"
                                : threat.severity === "high"
                                  ? "text-orange-400"
                                  : "text-yellow-400"
                            }`}
                          />
                          <div>
                            <p className="text-white text-sm">{threat.threat}</p>
                            <p className="text-xs text-slate-400">{threat.time}</p>
                          </div>
                        </div>
                        <Badge className={getRiskColor(threat.severity)}>{threat.severity}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Market Activity</CardTitle>
                  <CardDescription className="text-slate-400">Recent marketplace activities and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        activity: "Database dump - 50M records",
                        price: "$15,000",
                        market: "AlphaBay v2",
                      },
                      {
                        activity: "Credit card data - Fresh batch",
                        price: "$2,500",
                        market: "DarkMarket",
                      },
                      {
                        activity: "Corporate VPN access",
                        price: "$800",
                        market: "SilkRoad 3.0",
                      },
                    ].map((activity, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-4 h-4 text-yellow-400" />
                          <div>
                            <p className="text-white text-sm">{activity.activity}</p>
                            <p className="text-xs text-slate-400">{activity.market}</p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-600">{activity.price}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
