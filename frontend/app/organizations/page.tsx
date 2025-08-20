"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/ui/protected-route"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { organizationsAPI, type Organization, type UserRole } from "@/lib/api"
import { Building2, Plus, Edit, Trash2, CheckCircle, XCircle, Users, FolderOpen } from 'lucide-react'
import { format } from "date-fns"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null)
  const { toast } = useToast()

  const [newOrganization, setNewOrganization] = useState({
    name: "",
    description: "",
    plan: "free",
    max_users: 10,
    max_cases: 50,
    is_active: true,
  })

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const data = await organizationsAPI.listOrganizations()
      setOrganizations(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch organizations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrganization = async () => {
    try {
      const createdOrg = await organizationsAPI.createOrganization(newOrganization)
      setOrganizations([...organizations, createdOrg])
      setIsCreateDialogOpen(false)
      setNewOrganization({
        name: "",
        description: "",
        plan: "free",
        max_users: 10,
        max_cases: 50,
        is_active: true,
      })
      toast({
        title: "Success",
        description: "Organization created successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      })
    }
  }

  const handleUpdateOrganization = async () => {
    if (!editingOrganization) return
    try {
      const updatedOrg = await organizationsAPI.updateOrganization(editingOrganization.id, editingOrganization)
      setOrganizations(organizations.map((org) => (org.id === updatedOrg.id ? updatedOrg : org)))
      setIsEditDialogOpen(false)
      setEditingOrganization(null)
      toast({
        title: "Success",
        description: "Organization updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      })
    }
  }

  const handleDeleteOrganization = async (orgId: number) => {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) return
    try {
      await organizationsAPI.deleteOrganization(orgId)
      setOrganizations(organizations.filter((org) => org.id !== orgId))
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive",
      })
    }
  }

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <ProtectedRoute requiredRoles={["SUPER_ADMIN"] as UserRole[]}>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">Organization Management</h1>
              <p className="text-slate-400">Manage organizations and their settings</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Organization
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Organization</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Define the details for a new organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="org-name" className="text-white">
                      Organization Name
                    </Label>
                    <Input
                      id="org-name"
                      value={newOrganization.name}
                      onChange={(e) => setNewOrganization({ ...newOrganization, name: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-description" className="text-white">
                      Description
                    </Label>
                    <Input
                      id="org-description"
                      value={newOrganization.description || ""}
                      onChange={(e) => setNewOrganization({ ...newOrganization, description: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-plan" className="text-white">
                      Plan
                    </Label>
                    <Select
                      value={newOrganization.plan}
                      onValueChange={(value) => setNewOrganization({ ...newOrganization, plan: value })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max-users" className="text-white">
                        Max Users
                      </Label>
                      <Input
                        id="max-users"
                        type="number"
                        value={newOrganization.max_users}
                        onChange={(e) => setNewOrganization({ ...newOrganization, max_users: Number.parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-cases" className="text-white">
                        Max Cases
                      </Label>
                      <Input
                        id="max-cases"
                        type="number"
                        value={newOrganization.max_cases}
                        onChange={(e) => setNewOrganization({ ...newOrganization, max_cases: Number.parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrganization} className="bg-blue-600 hover:bg-blue-700">
                    Create Organization
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="p-6 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Organizations</p>
                      <p className="text-2xl font-bold text-white">{organizations.length}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Active Organizations</p>
                      <p className="text-2xl font-bold text-green-400">{organizations.filter((o) => o.is_active).length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Inactive Organizations</p>
                      <p className="text-2xl font-bold text-red-400">{organizations.filter((o) => !o.is_active).length}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search organizations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organizations List */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Organizations ({filteredOrganizations.length})</CardTitle>
                <CardDescription className="text-slate-400">Manage registered organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
                      <p className="text-slate-400 mt-2">Loading organizations...</p>
                    </div>
                  ) : filteredOrganizations.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No organizations found</p>
                    </div>
                  ) : (
                    filteredOrganizations.map((org) => (
                      <div
                        key={org.id}
                        className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">{org.name.charAt(0)}</span>
                            </div>
                            <div>
                              <h3 className="text-white font-medium">{org.name}</h3>
                              <p className="text-sm text-slate-400">{org.description}</p>
                              <p className="text-sm text-slate-500">Created: {format(new Date(org.created_at), "MMM dd, yyyy")}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="flex items-center space-x-2 mb-1 justify-end">
                                <Badge className="bg-blue-600 text-white">{org.plan}</Badge>
                                <Badge variant={org.is_active ? "default" : "secondary"}>
                                  {org.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400">Users: {org.max_users} | Cases: {org.max_cases}</p>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingOrganization(org)
                                  setIsEditDialogOpen(true)
                                }}
                                className="border-slate-700 hover:bg-slate-800 bg-transparent"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteOrganization(org.id)}
                                className="border-red-700 text-red-400 hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Edit Organization Dialog */}
            {editingOrganization && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="text-white">Edit Organization</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Update the details for {editingOrganization.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-org-name" className="text-white">
                        Organization Name
                      </Label>
                      <Input
                        id="edit-org-name"
                        value={editingOrganization.name}
                        onChange={(e) => setEditingOrganization({ ...editingOrganization, name: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-org-description" className="text-white">
                        Description
                      </Label>
                      <Input
                        id="edit-org-description"
                        value={editingOrganization.description || ""}
                        onChange={(e) => setEditingOrganization({ ...editingOrganization, description: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-org-plan" className="text-white">
                        Plan
                      </Label>
                      <Select
                        value={editingOrganization.plan}
                        onValueChange={(value) => setEditingOrganization({ ...editingOrganization, plan: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-max-users" className="text-white">
                          Max Users
                        </Label>
                        <Input
                          id="edit-max-users"
                          type="number"
                          value={editingOrganization.max_users}
                          onChange={(e) => setEditingOrganization({ ...editingOrganization, max_users: Number.parseInt(e.target.value) })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-max-cases" className="text-white">
                          Max Cases
                        </Label>
                        <Input
                          id="edit-max-cases"
                          type="number"
                          value={editingOrganization.max_cases}
                          onChange={(e) => setEditingOrganization({ ...editingOrganization, max_cases: Number.parseInt(e.target.value) })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="edit-is-active" className="text-white">
                        Active
                      </Label>
                      <Select
                        value={editingOrganization.is_active ? "true" : "false"}
                        onValueChange={(value) => setEditingOrganization({ ...editingOrganization, is_active: value === "true" })}
                      >
                        <SelectTrigger className="w-24 bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateOrganization} className="bg-blue-600 hover:bg-blue-700">
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
