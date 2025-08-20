"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { Building2, Users, Edit, Trash2, UserCheck, UserX, Crown, Shield, Eye, KeyRound } from "lucide-react"
import { api } from "@/lib/api"
import type { Organization as OrganizationType, User as UserType } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { Switch } from "@/components/ui/switch"

export default function OrganizationDetailsPage() {
  const { user: currentUser } = useAuth()
  const params = useParams()
  const orgId = params.id as string // use string directly instead of parseInt

  const [organization, setOrganization] = useState<OrganizationType | null>(null)
  const [orgUsers, setOrgUsers] = useState<UserType[]>([])
  const [loadingOrg, setLoadingOrg] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const { toast } = useToast()

  const handleUpdateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const updatedUser = await api.updateUser(userId, {
        is_active: isActive,
      })
      setOrgUsers(orgUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
      toast({
        title: "Success",
        description: `User status updated successfully`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update user status: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchOrganizationDetails()
      fetchOrganizationUsers()
    }
  }, [orgId])

  const fetchOrganizationDetails = async () => {
    try {
      setLoadingOrg(true)
      const fetchedOrg = await api.getOrganization(orgId)
      setOrganization(fetchedOrg)
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch organization details: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setLoadingOrg(false)
    }
  }

  const fetchOrganizationUsers = async () => {
    try {
      setLoadingUsers(true)
      // Assuming the backend /users endpoint filters by organization for Org Admins
      // Or, if Super Admin, we filter client-side for this specific org
      const allUsers = await api.listUsers()
      const filteredUsers = allUsers.filter((user) => user.organization_id === orgId) // now comparing string to string
      setOrgUsers(filteredUsers)
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch organization users: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleUpdateOrganization = async () => {
    if (!organization) return
    try {
      const updatedOrg = await api.updateOrganization(organization.id, {
        name: organization.name,
        slug: organization.slug,
      })
      setOrganization(updatedOrg)
      toast({
        title: "Success",
        description: "Organization details updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update organization: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    try {
      const updatedUser = await api.updateUser(editingUser.id, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role,
        is_active: editingUser.is_active,
        organization_id: editingUser.organization_id, // now uses string UUID instead of number
      })
      setOrgUsers(orgUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
      setIsEditDialogOpen(false)
      setEditingUser(null)

      toast({
        title: "Success",
        description: "User updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    // parameter now string instead of number
    try {
      await api.deleteUser(userId)
      setOrgUsers(orgUsers.filter((user) => user.id !== userId))
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser || !newPassword) return
    try {
      await api.adminChangePassword(editingUser.id, newPassword)
      toast({
        title: "Success",
        description: `Password for ${editingUser.username} reset successfully.`,
      })
      setIsPasswordResetDialogOpen(false)
      setNewPassword("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to reset password: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Crown className="w-4 h-4" />
      case "ORG_ADMIN":
        return <Building2 className="w-4 h-4" />
      case "STAFF_USER":
        return <Shield className="w-4 h-4" />
      case "INDIVIDUAL_USER":
        return <Eye className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-600"
      case "ORG_ADMIN":
        return "bg-purple-600"
      case "STAFF_USER":
        return "bg-blue-600"
      case "INDIVIDUAL_USER":
        return "bg-gray-600"
      default:
        return "bg-gray-600"
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Full system access, global user & organization management"
      case "ORG_ADMIN":
        return "Organization-level administration and user management"
      case "STAFF_USER":
        return "Advanced analysis and case management within organization"
      case "INDIVIDUAL_USER":
        return "Standard user access, manages own cases"
      default:
        return "Standard user access"
    }
  }

  // Determine allowed roles for creation/editing based on current user's role
  const getAllowedRolesForOrgUsers = () => {
    if (currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ORG_ADMIN") {
      return ["STAFF_USER", "INDIVIDUAL_USER"]
    }
    return ["INDIVIDUAL_USER"] // Fallback, though ProtectedRoute should prevent this
  }

  return (
    <ProtectedRoute requiredRoles={["SUPER_ADMIN", "ORG_ADMIN"]}>
      {" "}
      {/* Only Super Admin and Org Admin can access this page */}
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">{organization?.name || "Loading Organization..."}</h1>
              <p className="text-slate-400">Manage organization details and users</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {loadingOrg ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 mt-2">Loading organization details...</p>
              </div>
            ) : (
              organization && (
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Organization Details</CardTitle>
                    <CardDescription className="text-slate-400">
                      View and update organization information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="org-detail-name" className="text-white">
                        Name
                      </Label>
                      <Input
                        id="org-detail-name"
                        value={organization.name}
                        onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                        disabled={currentUser?.role !== "SUPER_ADMIN"} // Only Super Admin can edit org details
                      />
                    </div>
                    <div>
                      <Label htmlFor="org-detail-slug" className="text-white">
                        Slug
                      </Label>
                      <Input
                        id="org-detail-slug"
                        value={organization.slug}
                        onChange={(e) => setOrganization({ ...organization, slug: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                        disabled={currentUser?.role !== "SUPER_ADMIN"} // Only Super Admin can edit org details
                      />
                    </div>
                    {currentUser?.role === "SUPER_ADMIN" && (
                      <Button onClick={handleUpdateOrganization} className="bg-blue-600 hover:bg-blue-700">
                        <Edit className="w-4 h-4 mr-2" />
                        Update Organization Details
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            )}

            {/* Organization Users List */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Organization Users ({orgUsers.length})</CardTitle>
                <CardDescription className="text-slate-400">Manage users within this organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingUsers ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
                      <p className="text-slate-400 mt-2">Loading users...</p>
                    </div>
                  ) : orgUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No users found in this organization</p>
                    </div>
                  ) : (
                    orgUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">{user.full_name.charAt(0)}</span>
                            </div>
                            <div>
                              <h3 className="text-white font-medium">{user.full_name}</h3>
                              <p className="text-sm text-slate-400">@{user.username}</p>
                              <p className="text-sm text-slate-400">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="flex items-center space-x-2 mb-1">
                                <div className={`${getRoleColor(user.role)} text-white`}>
                                  {getRoleIcon(user.role)}
                                  <span className="ml-1">{user.role.replace("_", " ")}</span>
                                </div>
                                <div className={user.is_active ? "text-white" : "text-slate-400"}>
                                  {user.is_active ? "Active" : "Inactive"}
                                </div>
                              </div>
                              <p className="text-xs text-slate-400">{getRoleDescription(user.role)}</p>
                            </div>

                            <div className="flex space-x-2">
                              {/* Toggle Active Status */}
                              {(currentUser?.role === "SUPER_ADMIN" ||
                                (currentUser?.role === "ORG_ADMIN" &&
                                  user.role !== "ORG_ADMIN" &&
                                  user.role !== "SUPER_ADMIN")) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateUserStatus(user.id, !user.is_active)}
                                  className="border-slate-700 hover:bg-slate-800"
                                >
                                  {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </Button>
                              )}

                              {/* Edit User */}
                              {(currentUser?.role === "SUPER_ADMIN" ||
                                (currentUser?.role === "ORG_ADMIN" &&
                                  user.role !== "ORG_ADMIN" &&
                                  user.role !== "SUPER_ADMIN")) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user)
                                    setIsEditDialogOpen(true)
                                  }}
                                  className="border-slate-700 hover:bg-slate-800 bg-transparent"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Reset Password (Super Admin only) */}
                              {currentUser?.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user)
                                    setIsPasswordResetDialogOpen(true)
                                  }}
                                  className="border-slate-700 hover:bg-slate-800 bg-transparent"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Delete User */}
                              {(currentUser?.role === "SUPER_ADMIN" ||
                                (currentUser?.role === "ORG_ADMIN" &&
                                  user.role !== "ORG_ADMIN" &&
                                  user.role !== "SUPER_ADMIN")) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="border-red-700 text-red-400 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User</DialogTitle>
            <DialogDescription className="text-slate-400">Update user details and permissions</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-full_name" className="text-white">
                  Full Name
                </Label>
                <Input
                  id="edit-full_name"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-email" className="text-white">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-role" className="text-white">
                  Role
                </Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value as any })}
                  disabled={
                    editingUser.id === currentUser?.id ||
                    editingUser.role === "ORG_ADMIN" ||
                    editingUser.role === "SUPER_ADMIN"
                  } // Prevent self-demotion or changing higher roles
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {getAllowedRolesForOrgUsers().map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-is_active" className="text-white">
                  Active
                </Label>
                <Switch
                  id="edit-is_active"
                  checked={editingUser.is_active}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_active: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reset Password Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Reset Password for {editingUser?.username}</DialogTitle>
            <DialogDescription className="text-slate-400">Enter a new password for this user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password-reset" className="text-white">
                New Password
              </Label>
              <Input
                id="new-password-reset"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordResetDialogOpen(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword} className="bg-blue-600 hover:bg-blue-700">
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
