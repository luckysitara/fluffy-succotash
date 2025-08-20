"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { IntelligenceToCaseModal } from "@/components/ui/intelligence-to-case-modal"
import {
  UserCheck,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  AlertTriangle,
  Shield,
  Search,
  TrendingUp,
  User,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PIIResult {
  type: string
  value: string
  confidence: number
  risk_level: string
  breach_data?: {
    breaches: number
    latest_breach: string
    exposed_data: string[]
  }
  platforms?: Record<string, string>
  valid_platforms?: Record<string, string>
  validation_results?: {
    validations: Record<
      string,
      {
        platform: string
        url: string
        is_valid: boolean
        status_code?: number
        error?: string
        profile_data?: {
          profile_photo?: string
          followers?: number
          posts?: number
          avatar?: string
          display_name?: string
          bio?: string
        }
      }
    >
    summary: {
      total_platforms: number
      valid_platforms: number
      invalid_platforms: number
      validation_rate: number
    }
  }
  analysis?: {
    length: number
    contains_numbers: boolean
    contains_special_chars: boolean
    pattern_type: string
  }
  truecaller_data?: {
    name: string
    phone_number: string
    carrier: string
    email: string
    profile_image: string
    country_code: string
    success: boolean
  }
  name?: string
  email?: string
  profile_image?: string
  carrier?: string
  enhanced_info?: boolean
}

interface PIIStats {
  total_scans: number
  pii_found: number
  breaches: number
  risk_score: number
  recent_scans: Array<{
    query: string
    type: string
    timestamp: string
    findings: number
    risk: string
  }>
}

export default function PIIIntelligencePage() {
  const [inputText, setInputText] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PIIResult[]>([])
  const [scanHistory, setScanHistory] = useState<
    Array<{
      id: number
      query: string
      type: string
      timestamp: string
      findings: number
      risk: string
    }>
  >([])
  const [stats, setStats] = useState<PIIStats>({
    total_scans: 0,
    pii_found: 0,
    breaches: 0,
    risk_score: 0,
    recent_scans: [],
  })
  const { toast } = useToast()
  const [showIntelligenceModal, setShowIntelligenceModal] = useState(false)
  const [modalIntelligenceData, setModalIntelligenceData] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/pii/stats`, {
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
                query: scan.query,
                type: scan.type,
                timestamp: scan.timestamp,
                findings: scan.findings || 1,
                risk: scan.risk,
              })),
            )
          }
        }
      } catch (error) {
        console.error("Failed to fetch PII stats:", error)
      }
    }

    fetchStats()
  }, [])

  const handlePIIAnalysis = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to analyze",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/pii/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          text: inputText,
          include_username_lookup: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const data = await response.json()

      const mockResults: PIIResult[] = data.results.map((result: any) => ({
        type: result.type,
        value: result.value,
        confidence: result.confidence,
        risk_level: data.risk_level,
        analysis: {
          length: result.value.length,
          contains_numbers: /\d/.test(result.value),
          contains_special_chars: /[^a-zA-Z0-9]/.test(result.value),
          pattern_type: result.type,
        },
      }))

      setResults(mockResults)
      toast({
        title: "Analysis Complete",
        description: `Found ${mockResults.length} PII entities in the analyzed content`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAnalysis = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/pii/email/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({ email }),
        },
      )

      if (!response.ok) {
        throw new Error("Email analysis failed")
      }

      const data = await response.json()

      const mockResults: PIIResult[] = [
        {
          type: "email",
          value: email,
          confidence: 0.98,
          risk_level: data.risk_assessment?.disposable ? "high" : "medium",
          analysis: {
            length: email.length,
            contains_numbers: /\d/.test(email),
            contains_special_chars: /[^a-zA-Z0-9@.]/.test(email),
            pattern_type: "email",
          },
          breach_data: data.hibp_data
            ? {
                breaches: data.hibp_data.total_breaches || 0,
                latest_breach: "2023-01-01",
                exposed_data: ["email", "password"],
              }
            : undefined,
        },
      ]

      setResults(mockResults)
      toast({
        title: "Email Analysis Complete",
        description: `Analysis complete for ${email}. ${data.hibp_data?.total_breaches || 0} breaches found.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze email",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneAnalysis = async () => {
    if (!phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/pii/phone/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({ phone }),
        },
      )

      if (!response.ok) {
        throw new Error("Phone analysis failed")
      }

      const data = await response.json()

      const mockResults: PIIResult[] = [
        {
          type: "phone",
          value: phone,
          confidence: data.is_valid ? 0.91 : 0.5,
          risk_level: data.is_valid ? "medium" : "low",
          analysis: {
            length: data.length,
            contains_numbers: true,
            contains_special_chars: /[^0-9]/.test(phone),
            pattern_type: data.type || "phone",
          },
          // Enhanced TrueCaller data
          breach_data: data.enhanced_info
            ? {
                breaches: 0,
                latest_breach: "N/A",
                exposed_data: ["name", "phone", "location"],
              }
            : undefined,
          truecaller_data: data.truecaller_data,
          name: data.name || "Unknown",
          email: data.email || "Not available",
          profile_image: data.profile_image || "",
          carrier: data.carrier || "Unknown",
          enhanced_info: data.enhanced_info || false,
        },
      ]

      setResults(mockResults)
      toast({
        title: "Phone Analysis Complete",
        description: `Analysis complete for ${phone}. ${data.enhanced_info ? "Enhanced data available" : "Basic info only"}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze phone number",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUsernameAnalysis = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/pii/username/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({ username }),
        },
      )

      if (!response.ok) {
        throw new Error("Username search failed")
      }

      const data = await response.json()

      const mockResults: PIIResult[] = [
        {
          type: "username",
          value: username,
          confidence: 0.95,
          risk_level: "medium",
          platforms: data.platforms,
          valid_platforms: data.valid_platforms,
          validation_results: data.validation_results,
          analysis: data.analysis,
        },
      ]

      setResults(mockResults)

      const validCount = data.validation_results?.summary?.valid_platforms || 0
      const totalCount = data.validation_results?.summary?.total_platforms || 0

      toast({
        title: "Username Analysis Complete",
        description: `Found ${validCount} valid accounts out of ${totalCount} platforms checked (${data.validation_results?.summary?.validation_rate || 0}% success rate). Use the buttons below to create a case or add to existing case.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search username",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewCase = () => {
    if (results.length === 0) {
      toast({
        title: "No Results",
        description: "No analysis results to create case from",
        variant: "destructive",
      })
      return
    }

    const query = inputText || email || phone || username
    const intelligenceData = {
      type: "pii" as const,
      query: query,
      results: {
        findings: results,
        platform_validation: results.find((r) => r.validation_results)?.validation_results?.validations || null,
        username_detected: results.find((r) => r.type === "username") || null,
        confidence:
          results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length) : 0,
        detailed_analysis: {
          pii_types: [...new Set(results.map((r) => r.type))],
          risk_distribution: results.reduce(
            (acc, r) => {
              acc[r.risk_level] = (acc[r.risk_level] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          ),
          platform_analysis: results.find((r) => r.validation_results)?.validation_results || null,
        },
      },
      findings: results.length,
      riskLevel: results.reduce(
        (max, result) =>
          result.risk_level === "critical"
            ? "CRITICAL"
            : result.risk_level === "high" && max !== "CRITICAL"
              ? "HIGH"
              : result.risk_level === "medium" && !["CRITICAL", "HIGH"].includes(max)
                ? "MEDIUM"
                : max,
        "LOW",
      ) as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    }

    setModalIntelligenceData(intelligenceData)
    setShowIntelligenceModal(true)
  }

  const handleAddToCase = () => {
    if (results.length === 0) {
      toast({
        title: "No Results",
        description: "No analysis results to add to case",
        variant: "destructive",
      })
      return
    }

    const query = inputText || email || phone || username
    const intelligenceData = {
      type: "pii" as const,
      query: query,
      results: {
        findings: results,
        platform_validation: results.find((r) => r.validation_results)?.validation_results?.validations || null,
        username_detected: results.find((r) => r.type === "username") || null,
        confidence:
          results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length) : 0,
        detailed_analysis: {
          pii_types: [...new Set(results.map((r) => r.type))],
          risk_distribution: results.reduce(
            (acc, r) => {
              acc[r.risk_level] = (acc[r.risk_level] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          ),
          platform_analysis: results.find((r) => r.validation_results)?.validation_results || null,
        },
      },
      findings: results.length,
      riskLevel: results.reduce(
        (max, result) =>
          result.risk_level === "critical"
            ? "CRITICAL"
            : result.risk_level === "high" && max !== "CRITICAL"
              ? "HIGH"
              : result.risk_level === "medium" && !["CRITICAL", "HIGH"].includes(max)
                ? "MEDIUM"
                : max,
        "LOW",
      ) as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    }

    setModalIntelligenceData(intelligenceData)
    setShowIntelligenceModal(true)
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

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "email":
        return <Mail className="w-4 h-4" />
      case "phone":
        return <Phone className="w-4 h-4" />
      case "ssn":
        return <CreditCard className="w-4 h-4" />
      case "address":
        return <MapPin className="w-4 h-4" />
      default:
        return <UserCheck className="w-4 h-4" />
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">PII Intelligence</h1>
              <p className="text-slate-400">Analyze and detect personally identifiable information</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-purple-600">
                <UserCheck className="w-4 h-4 mr-1" />
                PII Scanner
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
                      <p className="text-sm text-slate-400">Total Scans</p>
                      <p className="text-2xl font-bold text-white">{stats.total_scans.toLocaleString()}</p>
                    </div>
                    <Search className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">PII Found</p>
                      <p className="text-2xl font-bold text-red-400">{stats.pii_found.toLocaleString()}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Breaches</p>
                      <p className="text-2xl font-bold text-orange-400">{stats.breaches}</p>
                    </div>
                    <Shield className="w-8 h-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Risk Score</p>
                      <p className="text-2xl font-bold text-yellow-400">{stats.risk_score.toFixed(1)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Tools */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">PII Analysis Tools</CardTitle>
                <CardDescription className="text-slate-400">
                  Analyze text, emails, and phone numbers for personally identifiable information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                    <TabsTrigger value="text" className="data-[state=active]:bg-purple-600">
                      Text Analysis
                    </TabsTrigger>
                    <TabsTrigger value="email" className="data-[state=active]:bg-purple-600">
                      Email Lookup
                    </TabsTrigger>
                    <TabsTrigger value="phone" className="data-[state=active]:bg-purple-600">
                      Phone Lookup
                    </TabsTrigger>
                    <TabsTrigger value="username" className="data-[state=active]:bg-purple-600">
                      Username Lookup
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-4">
                    <div>
                      <Label htmlFor="text-input" className="text-white">
                        Text to Analyze
                      </Label>
                      <Textarea
                        id="text-input"
                        placeholder="Paste text content to scan for PII..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white min-h-32"
                      />
                    </div>
                    <Button
                      onClick={handlePIIAnalysis}
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Analyze Text
                    </Button>
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4">
                    <div>
                      <Label htmlFor="email-input" className="text-white">
                        Email Address
                      </Label>
                      <Input
                        id="email-input"
                        type="email"
                        placeholder="Enter email address to analyze..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <Button
                      onClick={handleEmailAnalysis}
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Analyze Email
                    </Button>
                  </TabsContent>

                  <TabsContent value="phone" className="space-y-4">
                    <div>
                      <Label htmlFor="phone-input" className="text-white">
                        Phone Number
                      </Label>
                      <Input
                        id="phone-input"
                        placeholder="Enter phone number to analyze..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <Button
                      onClick={handlePhoneAnalysis}
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <Phone className="w-4 h-4 mr-2" />
                      )}
                      Analyze Phone
                    </Button>
                  </TabsContent>

                  <TabsContent value="username" className="space-y-4">
                    <div>
                      <Label htmlFor="username-input" className="text-white">
                        Username
                      </Label>
                      <Input
                        id="username-input"
                        placeholder="Enter username to search across platforms..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <Button
                      onClick={handleUsernameAnalysis}
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <UserCheck className="w-4 h-4 mr-2" />
                      )}
                      Search Username
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Analysis Results</CardTitle>
                      <CardDescription className="text-slate-400">
                        Found {results.length} PII entities in the analyzed content
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateNewCase}
                        className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                      >
                        Create New Case
                      </Button>
                      <Select onValueChange={(value) => value === "add" && handleAddToCase()}>
                        <SelectTrigger className="w-48 border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                          <SelectValue placeholder="Select existing case..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="add">+ Add to Case</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {result.type === "phone" && result.profile_image ? (
                              <div className="flex items-center space-x-3">
                                <img
                                  src={result.profile_image || "/placeholder.svg"}
                                  alt="Profile"
                                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none"
                                  }}
                                />
                                <div>
                                  <h3 className="text-white font-medium">Phone Intelligence</h3>
                                  <p className="text-slate-300 font-mono">{result.value}</p>
                                  {result.enhanced_info && (
                                    <p className="text-green-400 text-sm">✓ Enhanced data available</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                {getTypeIcon(result.type)}
                                <div>
                                  <h3 className="text-white font-medium capitalize">{result.type} Detected</h3>
                                  <p className="text-slate-300 font-mono">{result.value}</p>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRiskColor(result.risk_level)}>{result.risk_level.toUpperCase()}</Badge>
                            <Badge variant="outline" className="border-slate-600">
                              {Math.round(result.confidence * 100)}% confidence
                            </Badge>
                          </div>
                        </div>

                        {result.type === "phone" && result.enhanced_info && result.truecaller_data && (
                          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                            <h4 className="text-sm font-medium text-green-300 mb-3 flex items-center">
                              <User className="w-4 h-4 mr-2" />
                              TrueCaller Intelligence
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Name</p>
                                <p className="text-white font-medium">{result.name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Carrier</p>
                                <p className="text-white">{result.carrier}</p>
                              </div>
                              {result.email && result.email !== "Not available" && (
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">Email</p>
                                  <p className="text-white font-mono text-sm">{result.email}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Country Code</p>
                                <p className="text-white">+{result.truecaller_data.country_code}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Analysis Details:</h4>
                            <div className="space-y-1 text-xs text-slate-400">
                              <div>Length: {result.analysis?.length || 0} characters</div>
                              <div>Contains Numbers: {result.analysis?.contains_numbers ? "Yes" : "No"}</div>
                              <div>Special Characters: {result.analysis?.contains_special_chars ? "Yes" : "No"}</div>
                              <div>Pattern: {result.analysis?.pattern_type || "Unknown"}</div>
                            </div>
                          </div>
                        </div>

                        {result.breach_data && (
                          <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-600">
                            <h4 className="text-sm font-medium text-red-300 mb-2">Breach Information</h4>
                            <div className="text-xs text-red-200">
                              <div>Breaches Found: {result.breach_data.breaches}</div>
                              <div>Latest Breach: {result.breach_data.latest_breach}</div>
                              <div>Exposed Data: {result.breach_data.exposed_data.join(", ")}</div>
                            </div>
                          </div>
                        )}
                        {result.type === "username" && result.validation_results && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-slate-300">Platform Validation Results</h4>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="border-green-600 text-green-400">
                                  {result.validation_results.summary.valid_platforms} Valid
                                </Badge>
                                <Badge variant="outline" className="border-red-600 text-red-400">
                                  {result.validation_results.summary.invalid_platforms} Invalid
                                </Badge>
                                <Badge variant="outline" className="border-blue-600 text-blue-400">
                                  {result.validation_results.summary.validation_rate}% Success Rate
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                              {Object.entries(result.validation_results.validations).map(([platform, validation]) => (
                                <div
                                  key={platform}
                                  className={`p-3 rounded-lg border ${
                                    validation.is_valid
                                      ? "border-green-600 bg-green-900/20"
                                      : "border-red-600 bg-red-900/20"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="capitalize font-medium text-white">{platform}</span>
                                    {validation.is_valid ? (
                                      <span className="text-green-400">✓</span>
                                    ) : (
                                      <span className="text-red-400">✗</span>
                                    )}
                                  </div>

                                  {validation.is_valid && validation.profile_data && (
                                    <div className="mb-3 space-y-2">
                                      {validation.profile_data.profile_photo && (
                                        <div className="flex items-center space-x-2">
                                          <img
                                            src={validation.profile_data.profile_photo || "/placeholder.svg"}
                                            alt="Profile"
                                            className="w-8 h-8 rounded-full"
                                            onError={(e) => {
                                              e.currentTarget.style.display = "none"
                                            }}
                                          />
                                          {validation.profile_data.display_name && (
                                            <span className="text-xs text-white font-medium">
                                              {validation.profile_data.display_name}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {validation.profile_data.followers !== null && (
                                          <div className="text-slate-300">
                                            <span className="text-slate-400">Followers:</span>{" "}
                                            {validation.profile_data.followers?.toLocaleString()}
                                          </div>
                                        )}
                                        {validation.profile_data.posts !== null && (
                                          <div className="text-slate-300">
                                            <span className="text-slate-400">Posts:</span>{" "}
                                            {validation.profile_data.posts?.toLocaleString()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <a
                                    href={validation.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block truncate underline text-xs ${
                                      validation.is_valid
                                        ? "text-green-400 hover:text-green-300"
                                        : "text-red-400 hover:text-red-300"
                                    }`}
                                  >
                                    View Profile
                                  </a>
                                  {validation.status_code && (
                                    <div className="text-xs text-slate-400 mt-1">Status: {validation.status_code}</div>
                                  )}
                                  {validation.error && (
                                    <div className="text-xs text-red-400 mt-1">Error: {validation.error}</div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {result.valid_platforms && Object.keys(result.valid_platforms).length > 0 && (
                              <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-600">
                                <h5 className="text-sm font-medium text-green-300 mb-2">
                                  Valid Accounts Found ({Object.keys(result.valid_platforms).length})
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(result.valid_platforms).map(([platform, url]) => (
                                    <a
                                      key={platform}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-green-400 hover:text-green-300 underline capitalize"
                                    >
                                      {platform}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scan History */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Recent Scans</CardTitle>
                <CardDescription className="text-slate-400">Your recent PII analysis history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanHistory.length > 0 ? (
                    scanHistory.map((scan) => (
                      <div key={scan.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(scan.type)}
                          <div>
                            <p className="text-white font-medium">{scan.query}</p>
                            <p className="text-xs text-slate-400">{new Date(scan.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="border-slate-600">
                            {scan.findings} findings
                          </Badge>
                          <Badge className={getRiskColor(scan.risk)}>{scan.risk}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No recent PII scans found</p>
                      <p className="text-sm">Start analyzing text or identifiers to see your scan history</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* IntelligenceToCaseModal */}
      {modalIntelligenceData && (
        <IntelligenceToCaseModal
          isOpen={showIntelligenceModal}
          onClose={() => {
            setShowIntelligenceModal(false)
            setModalIntelligenceData(null)
          }}
          intelligenceData={modalIntelligenceData}
          onCaseCreated={(caseId) => {
            toast({
              title: "Success",
              description: "PII intelligence data has been added to the case",
            })
            setShowIntelligenceModal(false)
            setModalIntelligenceData(null)
          }}
        />
      )}
    </ProtectedRoute>
  )
}
