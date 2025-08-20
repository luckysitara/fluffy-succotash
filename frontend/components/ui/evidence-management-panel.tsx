"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { Evidence } from "@/lib/api"
import {
  FileText,
  Hash,
  Shield,
  Link2,
  User,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Trash2,
} from "lucide-react"
import { format } from "date-fns"

interface EvidenceManagementPanelProps {
  evidence: Evidence[]
  onEvidenceUpdate: (evidenceId: string, updates: Partial<Evidence>) => void
  onEvidenceDelete: (evidenceId: string) => void
  canEdit: boolean
  canDelete: boolean
}

interface EvidenceCorrelation {
  id: string
  relatedEvidenceId: string
  relatedEvidenceTitle: string
  correlationType: "duplicate" | "related" | "sequence" | "contradiction"
  confidence: number
  description: string
}

export function EvidenceManagementPanel({
  evidence,
  onEvidenceUpdate,
  onEvidenceDelete,
  canEdit,
  canDelete,
}: EvidenceManagementPanelProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterVerified, setFilterVerified] = useState("all")
  const [sortBy, setSortBy] = useState("date")

  // Mock correlations data
  const [correlations] = useState<EvidenceCorrelation[]>([
    {
      id: "1",
      relatedEvidenceId: "evidence-2",
      relatedEvidenceTitle: "Network logs from same timeframe",
      correlationType: "sequence",
      confidence: 0.85,
      description: "Events occurred within 5 minutes of each other",
    },
    {
      id: "2",
      relatedEvidenceId: "evidence-3",
      relatedEvidenceTitle: "Duplicate file with different hash",
      correlationType: "duplicate",
      confidence: 0.92,
      description: "Same filename but different SHA256 hash",
    },
  ])

  const { toast } = useToast()

  const filteredEvidence = evidence
    .filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      const matchesType = filterType === "all" || item.type === filterType
      const matchesVerified =
        filterVerified === "all" ||
        (filterVerified === "verified" && item.is_verified) ||
        (filterVerified === "unverified" && !item.is_verified)

      return matchesSearch && matchesType && matchesVerified
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        case "name":
          return a.title.localeCompare(b.title)
        case "size":
          return b.file_size - a.file_size
        case "type":
          return a.type.localeCompare(b.type)
        default:
          return 0
      }
    })

  const handleVerifyEvidence = async (evidenceId: string, verified: boolean) => {
    try {
      onEvidenceUpdate(evidenceId, { is_verified: verified })
      toast({
        title: "Evidence Updated",
        description: `Evidence ${verified ? "verified" : "unverified"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update evidence verification",
        variant: "destructive",
      })
    }
  }

  const handleViewDetails = (item: Evidence) => {
    setSelectedEvidence(item)
    setShowDetailsModal(true)
  }

  const handleEditEvidence = (item: Evidence) => {
    setSelectedEvidence(item)
    setShowEditModal(true)
  }

  const getEvidenceTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "file":
        return <FileText className="w-4 h-4" />
      case "image":
        return <FileText className="w-4 h-4" />
      case "document":
        return <FileText className="w-4 h-4" />
      case "intelligence":
        return <Shield className="w-4 h-4" />
      case "pii_analysis":
        return <Shield className="w-4 h-4 text-red-400" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getCorrelationColor = (type: string) => {
    switch (type) {
      case "duplicate":
        return "bg-yellow-600"
      case "related":
        return "bg-blue-600"
      case "sequence":
        return "bg-green-600"
      case "contradiction":
        return "bg-red-600"
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
    <div className="space-y-6">
      {/* Evidence Management Controls */}
      <Card className="border-slate-800 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Evidence Management</CardTitle>
          <CardDescription className="text-slate-400">
            Advanced evidence organization, verification, and correlation tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search evidence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FILE">Files</SelectItem>
                <SelectItem value="IMAGE">Images</SelectItem>
                <SelectItem value="DOCUMENT">Documents</SelectItem>
                <SelectItem value="INTELLIGENCE">Intelligence</SelectItem>
                <SelectItem value="PII_ANALYSIS">PII Analysis</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterVerified} onValueChange={setFilterVerified}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Verification status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Evidence</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="date">Upload Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">File Size</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Evidence Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm text-slate-400">Total Evidence</p>
                  <p className="text-lg font-semibold text-white">{evidence.length}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-sm text-slate-400">Verified</p>
                  <p className="text-lg font-semibold text-white">{evidence.filter((e) => e.is_verified).length}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Link2 className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-sm text-slate-400">Correlations</p>
                  <p className="text-lg font-semibold text-white">{correlations.length}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-orange-400" />
                <div>
                  <p className="text-sm text-slate-400">Total Size</p>
                  <p className="text-lg font-semibold text-white">
                    {formatFileSize(evidence.reduce((sum, e) => sum + e.file_size, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence List with Enhanced Features */}
      <Card className="border-slate-800 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Evidence Items ({filteredEvidence.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvidence.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Filter className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-medium mb-2">No evidence matches your filters</h3>
              <p>Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvidence.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center space-x-2">
                      {getEvidenceTypeIcon(item.type)}
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-white">{item.title}</h4>
                          {item.is_verified ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                          <span>{formatFileSize(item.file_size)}</span>
                          <span>•</span>
                          <span>{item.file_type}</span>
                          <span>•</span>
                          <span>{format(new Date(item.uploaded_at), "MMM dd, yyyy")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {item.type}
                      </Badge>
                      {correlations.some((c) => c.relatedEvidenceId === item.id) && (
                        <Badge className="bg-purple-600">
                          <Link2 className="w-3 h-3 mr-1" />
                          Linked
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(item)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>

                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerifyEvidence(item.id, !item.is_verified)}
                        className={`border-slate-600 hover:bg-slate-800 bg-transparent ${
                          item.is_verified ? "text-yellow-400" : "text-green-400"
                        }`}
                      >
                        {item.is_verified ? (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Unverify
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>

                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEvidenceDelete(item.id)}
                        className="border-red-600 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Correlations */}
      {correlations.length > 0 && (
        <Card className="border-slate-800 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Link2 className="w-5 h-5 mr-2" />
              Evidence Correlations
            </CardTitle>
            <CardDescription className="text-slate-400">
              Automatically detected relationships between evidence items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {correlations.map((correlation) => (
                <div key={correlation.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getCorrelationColor(correlation.correlationType)}>
                        {correlation.correlationType.toUpperCase()}
                      </Badge>
                      <span className="text-white font-medium">{correlation.relatedEvidenceTitle}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-400">
                        {Math.round(correlation.confidence * 100)}% confidence
                      </span>
                      <div className="w-16 h-2 bg-slate-700 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${correlation.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">{correlation.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Evidence Details</DialogTitle>
            <DialogDescription className="text-slate-400">
              Comprehensive information about this evidence item
            </DialogDescription>
          </DialogHeader>

          {selectedEvidence && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="metadata" className="data-[state=active]:bg-blue-600">
                  Metadata
                </TabsTrigger>
                <TabsTrigger value="chain" className="data-[state=active]:bg-blue-600">
                  Chain of Custody
                </TabsTrigger>
                <TabsTrigger value="analysis" className="data-[state=active]:bg-blue-600">
                  Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-white font-medium mb-3">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Title:</span>
                        <span className="text-white">{selectedEvidence.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type:</span>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {selectedEvidence.type}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Size:</span>
                        <span className="text-white">{formatFileSize(selectedEvidence.file_size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Verified:</span>
                        {selectedEvidence.is_verified ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Uploaded:</span>
                        <span className="text-white">
                          {format(new Date(selectedEvidence.uploaded_at), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                      {selectedEvidence.updated_at && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Updated:</span>
                          <span className="text-white">
                            {format(new Date(selectedEvidence.updated_at), "MMM dd, yyyy HH:mm")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedEvidence.description && (
                  <div>
                    <h3 className="text-white font-medium mb-2">Description</h3>
                    <p className="text-slate-300 bg-slate-800/50 p-3 rounded">{selectedEvidence.description}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4">
                <div>
                  <h3 className="text-white font-medium mb-3">File Hashes</h3>
                  <div className="space-y-2">
                    {selectedEvidence.hash_sha256 && (
                      <div className="p-3 bg-slate-800/50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">SHA256:</span>
                          <code className="text-white font-mono text-sm break-all">{selectedEvidence.hash_sha256}</code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chain" className="space-y-4">
                <div>
                  <h3 className="text-white font-medium mb-3">Chain of Custody</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-800/50 rounded border-l-4 border-green-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Evidence Uploaded</p>
                          <p className="text-sm text-slate-400">
                            {format(new Date(selectedEvidence.uploaded_at), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                        <User className="w-4 h-4 text-green-400" />
                      </div>
                    </div>

                    {selectedEvidence.is_verified && (
                      <div className="p-3 bg-slate-800/50 rounded border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">Evidence Verified</p>
                            <p className="text-sm text-slate-400">Integrity confirmed</p>
                          </div>
                          <CheckCircle className="w-4 h-4 text-blue-400" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4">
                {selectedEvidence?.type === "PII_ANALYSIS" &&
                (selectedEvidence.content ||
                  selectedEvidence.data_info?.intelligence_data ||
                  selectedEvidence.data_info?.parsed_data) ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-white font-medium mb-3">PII Intelligence Analysis</h3>
                      {(() => {
                        try {
                          let piiData
                          if (selectedEvidence.data_info?.parsed_data) {
                            // Use parsed data if available (new format)
                            piiData = selectedEvidence.data_info.parsed_data
                          } else if (selectedEvidence.data_info?.intelligence_data) {
                            // Parse intelligence_data string (current format)
                            piiData = JSON.parse(selectedEvidence.data_info.intelligence_data)
                          } else if (selectedEvidence.content) {
                            // Fallback to content field (legacy format)
                            piiData = JSON.parse(selectedEvidence.content)
                          } else {
                            throw new Error("No PII data found")
                          }

                          return (
                            <div className="space-y-4">
                              {/* Query Information */}
                              <div className="p-4 bg-slate-800/50 rounded-lg">
                                <h4 className="text-white font-medium mb-2">Search Query</h4>
                                <p className="text-slate-300 font-mono">{piiData.query}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <Badge className="bg-blue-600">
                                    {piiData.findings_count || piiData.findings || 0} findings
                                  </Badge>
                                  <Badge
                                    className={`${
                                      piiData.risk_level === "HIGH" || piiData.risk_level === "CRITICAL"
                                        ? "bg-red-600"
                                        : piiData.risk_level === "MEDIUM"
                                          ? "bg-yellow-600"
                                          : "bg-green-600"
                                    }`}
                                  >
                                    {piiData.risk_level} Risk
                                  </Badge>
                                  {piiData.confidence_score && (
                                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                                      {piiData.confidence_score}% confidence
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Platform Validation Results */}
                              {piiData.platform_validation && (
                                <div className="p-4 bg-slate-800/50 rounded-lg">
                                  <h4 className="text-white font-medium mb-3">Platform Validation Results</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(piiData.platform_validation).map(
                                      ([platform, data]: [string, any]) => (
                                        <div
                                          key={platform}
                                          className={`p-3 rounded-lg border ${
                                            data.valid
                                              ? "border-green-600 bg-green-900/20"
                                              : "border-red-600 bg-red-900/20"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium capitalize">{platform}</span>
                                            {data.valid ? (
                                              <CheckCircle className="w-4 h-4 text-green-400" />
                                            ) : (
                                              <XCircle className="w-4 h-4 text-red-400" />
                                            )}
                                          </div>

                                          <div className="space-y-1 text-xs">
                                            <p className="text-slate-400">Status: {data.status_code}</p>

                                            {data.profile_data && (
                                              <div className="space-y-1">
                                                {data.profile_data.display_name && (
                                                  <p className="text-slate-300">
                                                    Name: {data.profile_data.display_name}
                                                  </p>
                                                )}
                                                {data.profile_data.followers && (
                                                  <p className="text-slate-300">
                                                    Followers: {data.profile_data.followers}
                                                  </p>
                                                )}
                                                {data.profile_data.posts && (
                                                  <p className="text-slate-300">Posts: {data.profile_data.posts}</p>
                                                )}
                                                {data.profile_data.profile_photo && (
                                                  <div className="mt-2">
                                                    <img
                                                      src={data.profile_data.profile_photo || "/placeholder.svg"}
                                                      alt="Profile"
                                                      className="w-8 h-8 rounded-full"
                                                      onError={(e) => {
                                                        e.currentTarget.style.display = "none"
                                                      }}
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {data.profile_url && (
                                            <a
                                              href={data.profile_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-400 hover:text-blue-300 underline mt-2 block"
                                            >
                                              View Profile
                                            </a>
                                          )}
                                        </div>
                                      ),
                                    )}
                                  </div>

                                  {/* Summary Stats */}
                                  <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-400">Valid Accounts:</span>
                                      <span className="text-green-400 font-medium">
                                        {Object.values(piiData.platform_validation).filter((p: any) => p.valid).length}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-1">
                                      <span className="text-slate-400">Total Platforms:</span>
                                      <span className="text-white font-medium">
                                        {Object.keys(piiData.platform_validation).length}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-1">
                                      <span className="text-slate-400">Success Rate:</span>
                                      <span className="text-blue-400 font-medium">
                                        {Math.round(
                                          (Object.values(piiData.platform_validation).filter((p: any) => p.valid)
                                            .length /
                                            Object.keys(piiData.platform_validation).length) *
                                            100,
                                        )}
                                        %
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Username Analysis Results */}
                              {piiData.username_analysis && (
                                <div className="p-4 bg-slate-800/50 rounded-lg">
                                  <h4 className="text-white font-medium mb-3">Username Analysis</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-400">Username:</span>
                                      <span className="text-white font-mono">
                                        {piiData.username_analysis.username || piiData.query}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-400">Confidence:</span>
                                      <span className="text-white">
                                        {piiData.username_analysis.confidence || piiData.confidence_score || 95}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Validation Results Summary */}
                              {piiData.validation_results && (
                                <div className="p-4 bg-slate-800/50 rounded-lg">
                                  <h4 className="text-white font-medium mb-3">Validation Summary</h4>
                                  <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-3 bg-slate-900/50 rounded">
                                      <p className="text-2xl font-bold text-blue-400">
                                        {piiData.validation_results.total_platforms}
                                      </p>
                                      <p className="text-xs text-slate-400">Total Platforms</p>
                                    </div>
                                    <div className="p-3 bg-slate-900/50 rounded">
                                      <p className="text-2xl font-bold text-green-400">
                                        {piiData.validation_results.valid_platforms}
                                      </p>
                                      <p className="text-xs text-slate-400">Valid Accounts</p>
                                    </div>
                                    <div className="p-3 bg-slate-900/50 rounded">
                                      <p className="text-2xl font-bold text-purple-400">
                                        {piiData.validation_results.success_rate}%
                                      </p>
                                      <p className="text-xs text-slate-400">Success Rate</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Raw Data */}
                              <div className="p-4 bg-slate-800/50 rounded-lg">
                                <h4 className="text-white font-medium mb-2">Raw Analysis Data</h4>
                                <pre className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded overflow-x-auto max-h-64">
                                  {JSON.stringify(piiData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )
                        } catch (error) {
                          console.error("[v0] Error parsing PII data:", error)
                          return (
                            <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-medium">Parse Error</span>
                              </div>
                              <p className="text-red-300 text-sm">Unable to parse PII analysis data</p>
                              <pre className="text-xs text-slate-400 mt-2 bg-slate-900/50 p-2 rounded max-h-32 overflow-y-auto">
                                {selectedEvidence.content ||
                                  selectedEvidence.data_info?.intelligence_data ||
                                  "No data available"}
                              </pre>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  </div>
                ) : selectedEvidence?.type === "INTELLIGENCE" &&
                  (selectedEvidence.content || selectedEvidence.data_info?.intelligence_data) ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-white font-medium mb-3">Intelligence Analysis</h3>
                      {(() => {
                        try {
                          let intelligenceData
                          if (selectedEvidence.content) {
                            intelligenceData = JSON.parse(selectedEvidence.content)
                          } else if (selectedEvidence.data_info?.intelligence_data) {
                            intelligenceData = JSON.parse(selectedEvidence.data_info.intelligence_data)
                          } else {
                            throw new Error("No intelligence data found")
                          }

                          return (
                            <div className="space-y-4">
                              <div className="p-4 bg-slate-800/50 rounded-lg">
                                <h4 className="text-white font-medium mb-2">Analysis Summary</h4>
                                <div className="space-y-2 text-sm">
                                  {intelligenceData.query && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Query:</span>
                                      <span className="text-white font-mono">{intelligenceData.query}</span>
                                    </div>
                                  )}
                                  {intelligenceData.type && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Type:</span>
                                      <Badge className="bg-blue-600">{intelligenceData.type}</Badge>
                                    </div>
                                  )}
                                  {intelligenceData.findings_count && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Findings:</span>
                                      <span className="text-white">{intelligenceData.findings_count}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="p-4 bg-slate-800/50 rounded-lg">
                                <h4 className="text-white font-medium mb-2">Raw Intelligence Data</h4>
                                <pre className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded overflow-x-auto max-h-64">
                                  {JSON.stringify(intelligenceData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )
                        } catch (error) {
                          console.error("[v0] Error parsing intelligence data:", error)
                          return (
                            <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-medium">Parse Error</span>
                              </div>
                              <p className="text-red-300 text-sm">Unable to parse intelligence data</p>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                    <h3 className="text-lg font-medium mb-2">Analysis Tools</h3>
                    <p>
                      {selectedEvidence?.type === "PII_ANALYSIS"
                        ? "No PII analysis data available for this evidence"
                        : selectedEvidence?.type === "INTELLIGENCE"
                          ? "No intelligence analysis data available for this evidence"
                          : "Advanced analysis features coming soon"}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
