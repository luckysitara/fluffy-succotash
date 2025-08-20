"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Users, UserPlus, UserMinus, Calendar, User } from "lucide-react"

interface AssignedUser {
  assignment_id: string
  user: {
    id: string
    username: string
    full_name: string
    role: string
  }
  assigned_by?: {
    id: string
    username: string
    full_name: string
  }
  assigned_at: string
  is_legacy?: boolean
}

interface AssignableUser {
  id: string
  username: string
  full_name: string
  role: string
}

interface CaseAssignmentManagerProps {
  caseId: string
  canManageAssignments: boolean
}

export function CaseAssignmentManager({ caseId, canManageAssignments }: CaseAssignmentManagerProps) {
  const [assignments, setAssignments] = useState<AssignedUser[]>([])
  const [availableUsers, setAvailableUsers] = useState<AssignableUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [removing, setRemoving] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    fetchAssignments()
    if (canManageAssignments) {
      fetchAvailableUsers()
    }
  }, [caseId, canManageAssignments])

  const fetchAssignments = async () => {
    try {
      const response = await api.get(`/cases/${caseId}/assignments`)
      setAssignments(response)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load case assignments",
        variant: "destructive",
      })
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get("/cases/assignment/users")
      setAvailableUsers(response)
    } catch (error: any) {
      if (error.status !== 403) {
        toast({
          title: "Error",
          description: "Failed to load available users",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) return

    setAssigning(true)
    try {
      await api.post(`/cases/${caseId}/assignments`, selectedUsers)

      toast({
        title: "Success",
        description: `Successfully assigned ${selectedUsers.length} user(s) to case`,
      })

      setSelectedUsers([])
      await fetchAssignments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.detail || "Failed to assign users",
        variant: "destructive",
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveAssignment = async (userId: string, assignmentId: string) => {
    if (removing.has(userId)) return

    setRemoving((prev) => new Set(prev).add(userId))

    try {
      await api.delete(`/cases/${caseId}/assignments/${userId}`)

      toast({
        title: "Success",
        description: "User assignment removed successfully",
      })

      await fetchAssignments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.detail || "Failed to remove assignment",
        variant: "destructive",
      })
    } finally {
      setRemoving((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const getAvailableUsersForSelection = () => {
    const assignedUserIds = assignments.map((a) => a.user.id)
    return availableUsers.filter((user) => !assignedUserIds.includes(user.id))
  }

  const handleUserSelection = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsers((prev) => [...prev, userId])
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId))
    }
  }

  if (loading) {
    return (
      <Card className="border-slate-800 bg-slate-800/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-800 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Case Assignments ({assignments.length})
        </CardTitle>
        <CardDescription className="text-slate-400">Manage users assigned to this case</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Assignments */}
        {assignments.length === 0 ? (
          <div className="text-center py-6 text-slate-500">No users assigned to this case yet.</div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.assignment_id}
                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {assignment.user.full_name?.charAt(0) || assignment.user.username?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{assignment.user.full_name || assignment.user.username}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                        {assignment.user.role.replace("_", " ")}
                      </Badge>
                      {assignment.is_legacy && (
                        <Badge variant="outline" className="text-xs border-yellow-600 text-yellow-400">
                          Legacy Assignment
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(assignment.assigned_at).toLocaleDateString()}</span>
                      </div>
                      {assignment.assigned_by && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>by {assignment.assigned_by.full_name || assignment.assigned_by.username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {canManageAssignments && !assignment.is_legacy && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveAssignment(assignment.user.id, assignment.assignment_id)}
                    disabled={removing.has(assignment.user.id)}
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    {removing.has(assignment.user.id) ? (
                      <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add New Assignments */}
        {canManageAssignments && (
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-white mb-3">Assign Additional Users</h4>

            {getAvailableUsersForSelection().length === 0 ? (
              <Alert className="border-slate-700 bg-slate-800/50">
                <AlertDescription className="text-slate-400">
                  All available users are already assigned to this case.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {getAvailableUsersForSelection().map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center space-x-3 p-2 bg-slate-900/30 rounded-lg cursor-pointer hover:bg-slate-900/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                        className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {user.full_name?.charAt(0) || user.username?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.full_name || user.username}</p>
                          <p className="text-xs text-slate-400">{user.role.replace("_", " ")}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedUsers.length > 0 && (
                  <Button
                    onClick={handleAssignUsers}
                    disabled={assigning}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {assigning ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Assign {selectedUsers.length} User{selectedUsers.length > 1 ? "s" : ""}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
