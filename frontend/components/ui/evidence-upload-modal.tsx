"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { evidenceAPI } from "@/lib/api"
import { Upload, Database, Server, FileText, X, AlertCircle, Globe, Terminal, Webhook, HardDrive } from "lucide-react"

interface EvidenceUploadModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  onEvidenceAdded: (evidence: any) => void
}

interface DatabaseConnection {
  id: string
  name: string
  type: "postgresql" | "mysql" | "sqlite" | "mongodb"
  host: string
  port: number
  database: string
  status: "connected" | "disconnected" | "error"
}

interface FTPConnection {
  id: string
  name: string
  type: "ftp" | "sftp" | "ftps"
  host: string
  port: number
  username: string
  status: "connected" | "disconnected" | "error"
}

interface SSHConnection {
  id: string
  name: string
  host: string
  port: number
  username: string
  status: "connected" | "disconnected" | "error"
}

interface WebhookConfig {
  id: string
  name: string
  url: string
  method: "GET" | "POST"
  headers: Record<string, string>
  status: "active" | "inactive"
}

export function EvidenceUploadModal({ isOpen, onClose, caseId, onEvidenceAdded }: EvidenceUploadModalProps) {
  const [activeTab, setActiveTab] = useState("local")
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")

  // Database state
  const [dbConnections] = useState<DatabaseConnection[]>([
    {
      id: "1",
      name: "Main Database",
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "evidence_db",
      status: "connected",
    },
    {
      id: "2",
      name: "Archive DB",
      type: "mysql",
      host: "archive.company.com",
      port: 3306,
      database: "archive",
      status: "disconnected",
    },
  ])
  const [selectedDbConnection, setSelectedDbConnection] = useState("")
  const [dbQuery, setDbQuery] = useState("")

  // FTP state
  const [ftpConnections] = useState<FTPConnection[]>([
    {
      id: "1",
      name: "Evidence Server",
      type: "sftp",
      host: "evidence.company.com",
      port: 22,
      username: "investigator",
      status: "connected",
    },
    {
      id: "2",
      name: "Backup FTP",
      type: "ftp",
      host: "backup.company.com",
      port: 21,
      username: "backup_user",
      status: "error",
    },
  ])
  const [selectedFtpConnection, setSelectedFtpConnection] = useState("")
  const [ftpPath, setFtpPath] = useState("/evidence/")
  const [ftpFiles, setFtpFiles] = useState<string[]>([])
  const [selectedFtpFiles, setSelectedFtpFiles] = useState<string[]>([])

  // SSH state
  const [sshConnections] = useState<SSHConnection[]>([
    {
      id: "1",
      name: "Production Server",
      host: "prod.company.com",
      port: 22,
      username: "admin",
      status: "connected",
    },
    {
      id: "2",
      name: "Log Server",
      host: "logs.company.com",
      port: 22,
      username: "loguser",
      status: "connected",
    },
  ])
  const [selectedSshConnection, setSelectedSshConnection] = useState("")
  const [sshCommand, setSshCommand] = useState("")
  const [sshPath, setSshPath] = useState("/var/log/")

  // Webhook state
  const [webhookConfigs] = useState<WebhookConfig[]>([
    {
      id: "1",
      name: "Security API",
      url: "https://api.security.com/evidence",
      method: "GET",
      headers: { Authorization: "Bearer token123" },
      status: "active",
    },
    {
      id: "2",
      name: "Log Aggregator",
      url: "https://logs.company.com/api/export",
      method: "POST",
      headers: { "X-API-Key": "key456" },
      status: "active",
    },
  ])
  const [selectedWebhook, setSelectedWebhook] = useState("")
  const [webhookParams, setWebhookParams] = useState("")

  // Server/Network state
  const [serverType, setServerType] = useState<"network_share" | "web_server" | "api_endpoint">("network_share")
  const [serverUrl, setServerUrl] = useState("")
  const [serverAuth, setServerAuth] = useState("")
  const [serverPath, setServerPath] = useState("")

  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setSelectedFiles(Array.from(files))
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index))
  }

  const handleLocalUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const uploadPromises = selectedFiles.map((file) => evidenceAPI.uploadEvidence(caseId, file, description))
      const newEvidence = await Promise.all(uploadPromises)

      newEvidence.forEach((evidence) => onEvidenceAdded(evidence))

      toast({
        title: "Success",
        description: `${selectedFiles.length} file(s) uploaded successfully.`,
      })

      // Reset form
      setSelectedFiles([])
      setDescription("")
      setTags("")
      onClose()
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDatabaseImport = async () => {
    if (!selectedDbConnection || !dbQuery.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a database connection and enter a query.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      await evidenceAPI.importFromDatabase(caseId, selectedDbConnection, dbQuery, description)

      toast({
        title: "Database import completed",
        description: "Data has been imported as evidence successfully.",
      })

      // Reset form
      setSelectedDbConnection("")
      setDbQuery("")
      setDescription("")
      onClose()
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import database data",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFtpImport = async () => {
    if (!selectedFtpConnection || selectedFtpFiles.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select an FTP connection and choose files to import.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      await evidenceAPI.importFromFTP(caseId, selectedFtpConnection, selectedFtpFiles, description)

      toast({
        title: "FTP import completed",
        description: `${selectedFtpFiles.length} file(s) imported successfully.`,
      })

      // Reset form
      setSelectedFtpConnection("")
      setSelectedFtpFiles([])
      setFtpFiles([])
      setDescription("")
      onClose()
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import FTP files",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSshImport = async () => {
    if (!selectedSshConnection || (!sshCommand.trim() && !sshPath.trim())) {
      toast({
        title: "Missing information",
        description: "Please select an SSH connection and enter a command or file path.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const sshData = {
        connection_id: selectedSshConnection,
        command: sshCommand.trim() || null,
        file_path: sshPath.trim() || null,
        description:
          description || `SSH import from ${sshConnections.find((c) => c.id === selectedSshConnection)?.name}`,
      }

      await evidenceAPI.createIntelligenceEvidence(
        caseId,
        "SSH_IMPORT",
        `SSH Import: ${sshCommand || sshPath}`,
        JSON.stringify(sshData),
        "SSH Server",
        description,
      )

      toast({
        title: "SSH import completed",
        description: "SSH data has been imported as evidence successfully.",
      })

      // Reset form
      setSelectedSshConnection("")
      setSshCommand("")
      setSshPath("")
      setDescription("")
      onClose()
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import SSH data",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleWebhookImport = async () => {
    if (!selectedWebhook) {
      toast({
        title: "Missing information",
        description: "Please select a webhook configuration.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const webhookConfig = webhookConfigs.find((w) => w.id === selectedWebhook)
      const webhookData = {
        webhook_id: selectedWebhook,
        url: webhookConfig?.url,
        method: webhookConfig?.method,
        parameters: webhookParams,
        description: description || `Webhook import from ${webhookConfig?.name}`,
      }

      await evidenceAPI.createIntelligenceEvidence(
        caseId,
        "WEBHOOK_IMPORT",
        `Webhook Import: ${webhookConfig?.name}`,
        JSON.stringify(webhookData),
        "Webhook API",
        description,
      )

      toast({
        title: "Webhook import completed",
        description: "Webhook data has been imported as evidence successfully.",
      })

      // Reset form
      setSelectedWebhook("")
      setWebhookParams("")
      setDescription("")
      onClose()
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import webhook data",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleServerImport = async () => {
    if (!serverUrl.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a server URL or path.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const serverData = {
        type: serverType,
        url: serverUrl,
        authentication: serverAuth,
        path: serverPath,
        description: description || `Server import from ${serverUrl}`,
      }

      await evidenceAPI.createIntelligenceEvidence(
        caseId,
        "SERVER_IMPORT",
        `Server Import: ${serverType}`,
        JSON.stringify(serverData),
        "Network Server",
        description,
      )

      toast({
        title: "Server import completed",
        description: "Server data has been imported as evidence successfully.",
      })

      // Reset form
      setServerUrl("")
      setServerAuth("")
      setServerPath("")
      setDescription("")
      onClose()
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import server data",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const browseFtpDirectory = async () => {
    if (!selectedFtpConnection) {
      toast({
        title: "No connection selected",
        description: "Please select an FTP connection first.",
        variant: "destructive",
      })
      return
    }

    try {
      const mockFiles = [
        "evidence_001.pdf",
        "screenshot_2024.png",
        "log_file.txt",
        "network_capture.pcap",
        "system_dump.zip",
      ]
      setFtpFiles(mockFiles)

      toast({
        title: "Directory loaded",
        description: `Found ${mockFiles.length} files in ${ftpPath}`,
      })
    } catch (error: any) {
      toast({
        title: "Browse failed",
        description: error.message || "Failed to browse FTP directory",
        variant: "destructive",
      })
    }
  }

  const toggleFtpFile = (file: string) => {
    setSelectedFtpFiles((prev) => (prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]))
  }

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "active":
        return "bg-green-600"
      case "disconnected":
      case "inactive":
        return "bg-yellow-600"
      case "error":
        return "bg-red-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Add Evidence to Case</DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload files from multiple sources or import data from connected systems
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800">
            <TabsTrigger value="local" className="data-[state=active]:bg-blue-600">
              <Upload className="w-4 h-4 mr-2" />
              Local Files
            </TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-blue-600">
              <Database className="w-4 h-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger value="ftp" className="data-[state=active]:bg-blue-600">
              <Server className="w-4 h-4 mr-2" />
              FTP/SFTP
            </TabsTrigger>
            <TabsTrigger value="ssh" className="data-[state=active]:bg-blue-600">
              <Terminal className="w-4 h-4 mr-2" />
              SSH
            </TabsTrigger>
            <TabsTrigger value="webhook" className="data-[state=active]:bg-blue-600">
              <Webhook className="w-4 h-4 mr-2" />
              Webhook
            </TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="space-y-4">
            <Card className="border-slate-800 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">Upload Local Files</CardTitle>
                <CardDescription className="text-slate-400">
                  Select files from your device to upload as evidence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="file-upload" className="text-white">
                    Select Files
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white">Selected Files ({selectedFiles.length})</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-white">{file.name}</span>
                            <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="description" className="text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the evidence..."
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="tags" className="text-white">
                    Tags (Optional)
                  </Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="evidence, document, analysis"
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <Button
                  onClick={handleLocalUpload}
                  disabled={uploading || selectedFiles.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? "Uploading..." : `Upload ${selectedFiles.length} File(s)`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-4">
            <Card className="border-slate-800 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">Database Import</CardTitle>
                <CardDescription className="text-slate-400">
                  Import data from connected databases as evidence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">Database Connections</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {dbConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedDbConnection === conn.id
                            ? "border-blue-500 bg-blue-900/20"
                            : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                        }`}
                        onClick={() => setSelectedDbConnection(conn.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Database className="w-4 h-4 text-slate-400" />
                            <span className="text-white font-medium">{conn.name}</span>
                          </div>
                          <Badge className={`${getConnectionStatusColor(conn.status)} text-white text-xs`}>
                            {conn.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {conn.type.toUpperCase()} • {conn.host}:{conn.port}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="db-query" className="text-white">
                    SQL Query
                  </Label>
                  <Textarea
                    id="db-query"
                    value={dbQuery}
                    onChange={(e) => setDbQuery(e.target.value)}
                    placeholder="SELECT * FROM evidence_table WHERE case_id = '...';"
                    className="bg-slate-800 border-slate-700 text-white mt-2 font-mono text-sm"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="db-description" className="text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="db-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the database evidence..."
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <div className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-yellow-400 font-medium">Security Notice</p>
                    <p className="text-yellow-300">
                      Only SELECT queries are allowed. All queries are logged and audited.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleDatabaseImport}
                  disabled={uploading || !selectedDbConnection || !dbQuery.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? "Importing..." : "Import Database Data"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ftp" className="space-y-4">
            <Card className="border-slate-800 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">FTP/SFTP Import</CardTitle>
                <CardDescription className="text-slate-400">Import files from FTP or SFTP servers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">FTP Connections</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {ftpConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFtpConnection === conn.id
                            ? "border-blue-500 bg-blue-900/20"
                            : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                        }`}
                        onClick={() => setSelectedFtpConnection(conn.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Server className="w-4 h-4 text-slate-400" />
                            <span className="text-white font-medium">{conn.name}</span>
                          </div>
                          <Badge className={`${getConnectionStatusColor(conn.status)} text-white text-xs`}>
                            {conn.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {conn.type.toUpperCase()} • {conn.host}:{conn.port}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="ftp-path" className="text-white">
                    Remote Path
                  </Label>
                  <Input
                    id="ftp-path"
                    value={ftpPath}
                    onChange={(e) => setFtpPath(e.target.value)}
                    placeholder="/evidence/"
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Available Files</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={browseFtpDirectory}
                      disabled={!selectedFtpConnection}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      Browse Directory
                    </Button>
                  </div>

                  {ftpFiles.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
                      {ftpFiles.map((file, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-slate-900/50 rounded">
                          <input
                            type="checkbox"
                            className="rounded border-slate-600 bg-slate-800"
                            checked={selectedFtpFiles.includes(file)}
                            onChange={() => toggleFtpFile(file)}
                          />
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-white">{file}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-500 border border-slate-700 rounded mt-2">
                      No files found. Click "Browse Directory" to load files.
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="ftp-description" className="text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="ftp-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the FTP evidence..."
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <Button
                  onClick={handleFtpImport}
                  disabled={uploading || !selectedFtpConnection || selectedFtpFiles.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? "Importing..." : `Import ${selectedFtpFiles.length} File(s)`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ssh" className="space-y-4">
            <Card className="border-slate-800 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">SSH Import</CardTitle>
                <CardDescription className="text-slate-400">
                  Execute commands or retrieve files from SSH servers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">SSH Connections</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {sshConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSshConnection === conn.id
                            ? "border-blue-500 bg-blue-900/20"
                            : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                        }`}
                        onClick={() => setSelectedSshConnection(conn.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Terminal className="w-4 h-4 text-slate-400" />
                            <span className="text-white font-medium">{conn.name}</span>
                          </div>
                          <Badge className={`${getConnectionStatusColor(conn.status)} text-white text-xs`}>
                            {conn.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          SSH • {conn.host}:{conn.port}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ssh-command" className="text-white">
                      Command to Execute
                    </Label>
                    <Textarea
                      id="ssh-command"
                      value={sshCommand}
                      onChange={(e) => setSshCommand(e.target.value)}
                      placeholder="ls -la /var/log/"
                      className="bg-slate-800 border-slate-700 text-white mt-2 font-mono text-sm"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ssh-path" className="text-white">
                      File Path to Retrieve
                    </Label>
                    <Input
                      id="ssh-path"
                      value={sshPath}
                      onChange={(e) => setSshPath(e.target.value)}
                      placeholder="/var/log/system.log"
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                    />
                    <p className="text-xs text-slate-400 mt-1">Leave empty if using command execution</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="ssh-description" className="text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="ssh-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the SSH evidence..."
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <div className="flex items-start space-x-2 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-red-400 font-medium">Security Warning</p>
                    <p className="text-red-300">
                      SSH commands are executed with limited privileges. All commands are logged and audited.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSshImport}
                  disabled={uploading || !selectedSshConnection || (!sshCommand.trim() && !sshPath.trim())}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? "Importing..." : "Import SSH Data"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <Card className="border-slate-800 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">Webhook Import</CardTitle>
                <CardDescription className="text-slate-400">
                  Import data from webhook endpoints and APIs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">Webhook Configurations</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {webhookConfigs.map((webhook) => (
                      <div
                        key={webhook.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedWebhook === webhook.id
                            ? "border-blue-500 bg-blue-900/20"
                            : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                        }`}
                        onClick={() => setSelectedWebhook(webhook.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Webhook className="w-4 h-4 text-slate-400" />
                            <span className="text-white font-medium">{webhook.name}</span>
                          </div>
                          <Badge className={`${getConnectionStatusColor(webhook.status)} text-white text-xs`}>
                            {webhook.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {webhook.method} • {webhook.url}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="webhook-params" className="text-white">
                    Request Parameters (JSON)
                  </Label>
                  <Textarea
                    id="webhook-params"
                    value={webhookParams}
                    onChange={(e) => setWebhookParams(e.target.value)}
                    placeholder='{"start_date": "2024-01-01", "end_date": "2024-01-31"}'
                    className="bg-slate-800 border-slate-700 text-white mt-2 font-mono text-sm"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="webhook-description" className="text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="webhook-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the webhook evidence..."
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <Button
                  onClick={handleWebhookImport}
                  disabled={uploading || !selectedWebhook}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? "Importing..." : "Import Webhook Data"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">Server/Network Import</CardTitle>
                <CardDescription className="text-slate-400">
                  Import data from network shares, web servers, or API endpoints
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="server-type" className="text-white">
                    Server Type
                  </Label>
                  <Select value={serverType} onValueChange={(value: any) => setServerType(value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="network_share">
                        <div className="flex items-center space-x-2">
                          <HardDrive className="w-4 h-4" />
                          <span>Network Share (SMB/CIFS)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="web_server">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4" />
                          <span>Web Server (HTTP/HTTPS)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="api_endpoint">
                        <div className="flex items-center space-x-2">
                          <Server className="w-4 h-4" />
                          <span>API Endpoint</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="server-url" className="text-white">
                    Server URL/Path
                  </Label>
                  <Input
                    id="server-url"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder={
                      serverType === "network_share"
                        ? "\\\\server\\share\\path"
                        : serverType === "web_server"
                          ? "https://server.com/files/"
                          : "https://api.server.com/data"
                    }
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="server-auth" className="text-white">
                      Authentication
                    </Label>
                    <Input
                      id="server-auth"
                      value={serverAuth}
                      onChange={(e) => setServerAuth(e.target.value)}
                      placeholder="username:password or API key"
                      type="password"
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="server-path" className="text-white">
                      Specific Path/Endpoint
                    </Label>
                    <Input
                      id="server-path"
                      value={serverPath}
                      onChange={(e) => setServerPath(e.target.value)}
                      placeholder="/evidence/ or /api/v1/data"
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="server-description" className="text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="server-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the server evidence..."
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>

                <Button
                  onClick={handleServerImport}
                  disabled={uploading || !serverUrl.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? "Importing..." : "Import Server Data"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
