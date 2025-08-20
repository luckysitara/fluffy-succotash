"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { casesAPI, evidenceAPI } from "@/lib/api"
import { Plus, FolderPlus, FileText, AlertTriangle, CheckCircle } from "lucide-react"

interface IntelligenceToCaseModalProps {
  isOpen: boolean
  onClose: () => void
  intelligenceData: {
    type: "domain" | "ip" | "pii" | "file"
    query: string
    results: any
    findings: number
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  }
  onCaseCreated?: (caseId: string) => void
}

interface ExistingCase {
  id: string
  title: string
  status: string
  priority: string
  created_at: string
}

export function IntelligenceToCaseModal({
  isOpen,
  onClose,
  intelligenceData,
  onCaseCreated,
}: IntelligenceToCaseModalProps) {
  const [action, setAction] = useState<"new" | "existing">("new")
  const [loading, setLoading] = useState(false)
  const [existingCases, setExistingCases] = useState<ExistingCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState("")

  // New case form
  const [newCaseTitle, setNewCaseTitle] = useState(
    `${getIntelligenceTypeLabel(intelligenceData.type)}: ${intelligenceData.query}`,
  )
  const [newCaseDescription, setNewCaseDescription] = useState("")
  const [newCasePriority, setNewCasePriority] = useState(mapRiskToPriority(intelligenceData.riskLevel))

  // Evidence form
  const [evidenceDescription, setEvidenceDescription] = useState("")
  const [evidenceTags, setEvidenceTags] = useState(generateDefaultTags(intelligenceData))

  const { toast } = useToast()

  const loadExistingCases = async () => {
    try {
      const cases = await casesAPI.listCases()
      const openCases = cases.filter((c) => c.status !== "CLOSED" && c.status !== "ARCHIVED")
      setExistingCases(openCases.slice(0, 10)) // Show recent 10 cases
    } catch (error) {
      console.error("Failed to load cases:", error)
      toast({
        title: "Warning",
        description: "Failed to load existing cases. You can still create a new case.",
        variant: "destructive",
      })
    }
  }

  const handleActionChange = (newAction: "new" | "existing") => {
    setAction(newAction)
    if (newAction === "existing" && existingCases.length === 0) {
      loadExistingCases()
    }
  }

  const handleCreateNewCase = async () => {
    setLoading(true)
    try {
      const caseData = {
        title: newCaseTitle,
        description:
          newCaseDescription ||
          `Automated case created from ${intelligenceData.type} analysis. Found ${intelligenceData.findings} items of interest.`,
        status: "OPEN",
        priority: newCasePriority,
      }

      const newCase = await casesAPI.createCase(caseData)

      // Add intelligence data as evidence
      await addIntelligenceEvidence(newCase.id)

      toast({
        title: "Case Created",
        description: `Case "${newCase.title}" created successfully with intelligence evidence.`,
      })

      onCaseCreated?.(newCase.id)
      onClose()
    } catch (error) {
      let errorMessage = "Failed to create case"

      if (error && typeof error === "object" && "detail" in error) {
        errorMessage = (error as any).detail || (error as any).message || errorMessage
      } else if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddToExistingCase = async () => {
    if (!selectedCaseId) {
      toast({
        title: "Error",
        description: "Please select a case",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await addIntelligenceEvidence(selectedCaseId)

      toast({
        title: "Evidence Added",
        description: "Intelligence data added to case successfully.",
      })

      onCaseCreated?.(selectedCaseId)
      onClose()
    } catch (error) {
      let errorMessage = "Failed to add evidence to case"

      if (error && typeof error === "object" && "detail" in error) {
        errorMessage = (error as any).detail || (error as any).message || errorMessage
      } else if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addIntelligenceEvidence = async (caseId: string) => {
    const intelligenceDataFormatted = {
      query: intelligenceData.query,
      type: intelligenceData.type,
      results: intelligenceData.results,
      findings_count: intelligenceData.findings,
      risk_level: intelligenceData.riskLevel,
      analysis_timestamp: new Date().toISOString(),
      metadata: generateMetadata(intelligenceData),
      detailed_results: intelligenceData.results,
      platform_validation: intelligenceData.results?.platform_validation || null,
      username_analysis:
        intelligenceData.results?.username_detected || intelligenceData.results?.username_analysis || null,
      confidence_score: intelligenceData.results?.confidence || 95,
      source_type: intelligenceData.type,
      scan_summary: `Found ${intelligenceData.findings} PII entities with ${intelligenceData.riskLevel} risk level`,
      validation_results: intelligenceData.results?.platform_validation
        ? {
            total_platforms: Object.keys(intelligenceData.results.platform_validation).length,
            valid_platforms: Object.values(intelligenceData.results.platform_validation).filter((p: any) => p.valid)
              .length,
            success_rate: Math.round(
              (Object.values(intelligenceData.results.platform_validation).filter((p: any) => p.valid).length /
                Object.keys(intelligenceData.results.platform_validation).length) *
                100,
            ),
          }
        : null,
    }

    await evidenceAPI.createIntelligenceEvidence(
      caseId,
      intelligenceData.type === "pii" ? "PII_ANALYSIS" : intelligenceData.type.toUpperCase(),
      `${getIntelligenceTypeLabel(intelligenceData.type)}: ${intelligenceData.query}`,
      JSON.stringify(intelligenceDataFormatted, null, 2),
      `${intelligenceData.type} Intelligence Scanner`,
      evidenceDescription ||
        `Intelligence analysis results for ${intelligenceData.query}. Found ${intelligenceData.findings} PII entities with ${intelligenceData.riskLevel} risk level.`,
    )
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
        return "bg-red-600"
      case "HIGH":
        return "bg-orange-600"
      case "MEDIUM":
        return "bg-yellow-600"
      case "LOW":
        return "bg-green-600"
      default:
        return "bg-gray-600"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-600"
      case "HIGH":
        return "bg-orange-600"
      case "MEDIUM":
        return "bg-yellow-600"
      case "LOW":
        return "bg-green-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Add Intelligence to Case</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new case or add intelligence findings to an existing case
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Intelligence Summary */}
          <Card className="border-slate-800 bg-slate-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Intelligence Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">{getIntelligenceTypeLabel(intelligenceData.type)}</span>
                </div>
                <Badge className={getRiskColor(intelligenceData.riskLevel)}>{intelligenceData.riskLevel} RISK</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Query:</span>
                  <p className="text-white font-mono">{intelligenceData.query}</p>
                </div>
                <div>
                  <span className="text-slate-400">Findings:</span>
                  <p className="text-white">{intelligenceData.findings} items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Selection */}
          <div className="space-y-4">
            <Label className="text-white">Choose Action</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={`cursor-pointer transition-colors border-2 ${
                  action === "new"
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
                onClick={() => handleActionChange("new")}
              >
                <CardContent className="p-4 text-center">
                  <FolderPlus className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <h3 className="text-white font-medium">Create New Case</h3>
                  <p className="text-sm text-slate-400">Start a new investigation</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors border-2 ${
                  action === "existing"
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
                onClick={() => handleActionChange("existing")}
              >
                <CardContent className="p-4 text-center">
                  <Plus className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <h3 className="text-white font-medium">Add to Existing</h3>
                  <p className="text-sm text-slate-400">Enhance current case</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* New Case Form */}
          {action === "new" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="case-title" className="text-white">
                  Case Title
                </Label>
                <Input
                  id="case-title"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white mt-2"
                />
              </div>

              <div>
                <Label htmlFor="case-description" className="text-white">
                  Case Description (Optional)
                </Label>
                <Textarea
                  id="case-description"
                  value={newCaseDescription}
                  onChange={(e) => setNewCaseDescription(e.target.value)}
                  placeholder="Describe the investigation objectives..."
                  className="bg-slate-800 border-slate-700 text-white mt-2"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="case-priority" className="text-white">
                  Priority
                </Label>
                <Select value={newCasePriority} onValueChange={setNewCasePriority}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Existing Case Selection */}
          {action === "existing" && (
            <div className="space-y-4">
              <Label className="text-white">Select Case</Label>
              {existingCases.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {existingCases.map((case_) => (
                    <div
                      key={case_.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCaseId === case_.id
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      }`}
                      onClick={() => setSelectedCaseId(case_.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{case_.title}</h4>
                          <p className="text-sm text-slate-400">
                            Created {new Date(case_.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className="bg-blue-600">{case_.status}</Badge>
                          <Badge className={getPriorityColor(case_.priority)}>{case_.priority}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  <p>No open cases found</p>
                </div>
              )}
            </div>
          )}

          {/* Evidence Details */}
          <div className="space-y-4">
            <Label className="text-white">Evidence Details</Label>

            <div>
              <Label htmlFor="evidence-description" className="text-white text-sm">
                Description (Optional)
              </Label>
              <Textarea
                id="evidence-description"
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="Additional context about this intelligence..."
                className="bg-slate-800 border-slate-700 text-white mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="evidence-tags" className="text-white text-sm">
                Tags
              </Label>
              <Input
                id="evidence-tags"
                value={evidenceTags}
                onChange={(e) => setEvidenceTags(e.target.value)}
                placeholder="intelligence, osint, analysis"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={action === "new" ? handleCreateNewCase : handleAddToExistingCase}
              disabled={loading || (action === "existing" && !selectedCaseId)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {action === "new" ? "Create Case" : "Add Evidence"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getIntelligenceTypeLabel(type: string): string {
  switch (type) {
    case "domain":
      return "Domain Intelligence"
    case "ip":
      return "IP Analysis"
    case "pii":
      return "PII Analysis"
    case "file":
      return "File Analysis"
    default:
      return "Intelligence Analysis"
  }
}

function mapRiskToPriority(risk: string): string {
  switch (risk) {
    case "CRITICAL":
      return "CRITICAL"
    case "HIGH":
      return "HIGH"
    case "MEDIUM":
      return "MEDIUM"
    case "LOW":
      return "LOW"
    default:
      return "MEDIUM"
  }
}

function generateDefaultTags(intelligenceData: any): string {
  const baseTags = ["intelligence", "osint", intelligenceData.type]

  if (intelligenceData.riskLevel === "HIGH" || intelligenceData.riskLevel === "CRITICAL") {
    baseTags.push("high-risk")
  }

  if (intelligenceData.findings > 10) {
    baseTags.push("extensive-findings")
  }

  return baseTags.join(", ")
}

function generateMetadata(intelligenceData: any) {
  return {
    scan_type: intelligenceData.type,
    findings_summary: `Found ${intelligenceData.findings} items`,
    risk_assessment: intelligenceData.riskLevel,
    automated_analysis: true,
    tool_version: "1.0.0",
    pii_entities_detected: intelligenceData.findings,
    platform_count: intelligenceData.results?.platform_validation
      ? Object.keys(intelligenceData.results.platform_validation).length
      : 0,
    valid_platforms: intelligenceData.results?.platform_validation
      ? Object.values(intelligenceData.results.platform_validation).filter((p) => p.valid).length
      : 0,
  }
}
