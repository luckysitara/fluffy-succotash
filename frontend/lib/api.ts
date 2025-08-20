const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

// Types
export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "STAFF_USER" | "INDIVIDUAL_USER"

export interface User {
  id: string
  username: string
  email: string
  full_name: string
  role: UserRole
  organization_id?: string // Optional for Super Admin
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Organization {
  id: string
  name: string
  description?: string
  plan: string
  max_users: number
  max_cases: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Case {
  id: string
  title: string
  description: string
  status: string
  priority: string
  case_number: string // Added case_number
  created_by: string
  assigned_to?: string
  organization_id: string // Added organization_id
  created_at: string
  updated_at?: string
  closed_at?: string
  created_by_user?: User
  assigned_to_user?: User
}

export interface Evidence {
  id: string
  case_id: string
  title: string // Changed from 'name' to 'title'
  type: string
  file_path?: string
  file_size: number // Added file_size
  file_type: string // Added file_type
  hash_sha256?: string
  uploaded_by_id: string // Changed from 'uploaded_by' to 'uploaded_by_id'
  description?: string // Added description
  is_verified: boolean
  uploaded_at: string // Changed from 'created_at' to 'uploaded_at'
  updated_at?: string
}

export class ApiError extends Error {
  public status: number
  public detail: string
  public originalError?: any

  constructor(message: string, status = 500, detail?: string, originalError?: any) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.detail = detail || message
    this.originalError = originalError
  }
}

class ApiClient {
  private getAuthHeaders(contentType = "application/json") {
    const token = localStorage.getItem("access_token")
    return {
      "Content-Type": contentType,
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      localStorage.removeItem("access_token")
      window.location.href = "/login"
      throw new ApiError("Session expired. Please log in again.", 401, "Unauthorized")
    }

    if (!response.ok) {
      let errorData: any
      let errorMessage = `HTTP error! status: ${response.status}`

      try {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } else {
          const textError = await response.text()
          errorMessage = textError || errorMessage
        }
      } catch (parseError) {
        console.warn("Failed to parse error response:", parseError)
      }

      throw new ApiError(errorMessage, response.status, errorMessage, errorData)
    }

    if (response.status === 204) {
      return null // No content to return for successful deletions
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    }

    return await response.text()
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const config = {
      headers: this.getAuthHeaders(options.headers ? (options.headers as any)["Content-Type"] : undefined),
      ...options,
    }

    try {
      const response = await fetch(url, config)
      return await this.handleResponse(response)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        "Network error. Please check your connection and try again.",
        0,
        error instanceof Error ? error.message : "Unknown network error",
        error,
      )
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint)
  }

  async post(endpoint: string, data: any, contentType = "application/json") {
    const headers =
      contentType === "multipart/form-data"
        ? { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
        : this.getAuthHeaders(contentType)

    return this.request(endpoint, {
      method: "POST",
      headers,
      body: contentType === "application/json" ? JSON.stringify(data) : data,
    })
  }

  async put(endpoint: string, data: any, contentType = "application/json") {
    const headers =
      contentType === "multipart/form-data"
        ? { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
        : this.getAuthHeaders(contentType)

    return this.request(endpoint, {
      method: "PUT",
      headers,
      body: contentType === "application/json" ? JSON.stringify(data) : data,
    })
  }

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: "DELETE",
    })
  }

  async login(username: string, password: string) {
    const formData = new URLSearchParams()
    formData.append("username", username)
    formData.append("password", password)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      return await this.handleResponse(response)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError("Login failed. Please check your credentials.", 401, "Authentication failed", error)
    }
  }

  async verifyAdminPassword(data: { admin_password: string }) {
    return this.post("/users/admin/verify-password", data)
  }

  // User endpoints
  async getCurrentUser(): Promise<User> {
    return this.get("/users/me")
  }

  async listUsers(): Promise<User[]> {
    return this.get("/users/")
  }

  async createUser(userData: Omit<User, "id" | "created_at" | "updated_at"> & { password: string }): Promise<User> {
    return this.post("/users/", userData)
  }

  async updateUser(id: string, userData: Partial<Omit<User, "id" | "created_at" | "updated_at">>): Promise<User> {
    return this.put(`/users/${id}`, userData)
  }

  async deleteUser(id: string) {
    return this.delete(`/users/${id}`)
  }

  async changePassword(data: { current_password: string; new_password: string }) {
    return this.post("/users/change-password", data)
  }

  async adminResetPassword(data: { admin_password: string; user_id: string; new_password: string }) {
    return this.post("/users/admin/reset-password", data)
  }

  // Organization endpoints
  async listOrganizations(): Promise<Organization[]> {
    return this.get("/organizations/")
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.get(`/organizations/${id}`)
  }

  async createOrganization(orgData: Omit<Organization, "id" | "created_at" | "updated_at">): Promise<Organization> {
    return this.post("/organizations/", orgData)
  }

  async updateOrganization(
    id: string,
    orgData: Partial<Omit<Organization, "id" | "created_at" | "updated_at">>,
  ): Promise<Organization> {
    return this.put(`/organizations/${id}`, orgData)
  }

  async deleteOrganization(id: string) {
    return this.delete(`/organizations/${id}`)
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.get("/dashboard/stats")
  }

  // Case endpoints
  async getCases(): Promise<Case[]> {
    return this.get("/cases/")
  }

  async getCase(id: string): Promise<Case> {
    return this.get(`/cases/${id}`)
  }

  async createCase(
    caseData: Omit<
      Case,
      | "id"
      | "case_number"
      | "created_at"
      | "updated_at"
      | "closed_at"
      | "created_by"
      | "created_by_user"
      | "assigned_to_user"
      | "organization_id"
    > & { assigned_to_id?: string },
  ): Promise<Case> {
    return this.post("/cases/", caseData)
  }

  async updateCase(
    id: string,
    caseData: Partial<
      Omit<
        Case,
        | "id"
        | "case_number"
        | "created_at"
        | "updated_at"
        | "closed_at"
        | "created_by"
        | "created_by_user"
        | "assigned_to_user"
        | "organization_id"
      >
    > & { assigned_to_id?: string },
  ): Promise<Case> {
    try {
      console.log("[v0] Updating case with data:", caseData)
      const result = await this.put(`/cases/${id}`, caseData)
      console.log("[v0] Case update successful:", result)
      return result
    } catch (error) {
      console.error("[v0] Case update failed:", error)
      throw error
    }
  }

  async deleteCase(id: string) {
    return this.delete(`/cases/${id}`)
  }

  // Evidence endpoints
  async listCaseEvidence(caseId: string): Promise<Evidence[]> {
    return this.get(`/evidence/case/${caseId}`)
  }

  async uploadEvidence(caseId: string, file: File, description?: string): Promise<Evidence> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("case_id", caseId.toString())
    if (description) {
      formData.append("description", description)
    }

    return this.post("/evidence/upload", formData, "multipart/form-data")
  }

  async deleteEvidence(id: string) {
    return this.delete(`/evidence/${id}`)
  }

  async analyzePII(text: string) {
    return this.post("/pii/analyze", { text })
  }

  async searchUsername(username: string) {
    return this.post("/pii/username/search", { username })
  }

  async analyzeDomain(domain: string) {
    return this.post("/domain/analyze", { domain })
  }

  async analyzeIP(ip_address: string) {
    return this.post("/ip/analyze", { ip_address })
  }

  // New evidence import methods
  async importFromDatabase(caseId: string, connectionId: string, query: string, description?: string) {
    const formData = new FormData()
    formData.append("case_id", caseId)
    formData.append("connection_id", connectionId)
    formData.append("query", query)
    if (description) formData.append("description", description)

    return this.post("/evidence/import/database", formData, "multipart/form-data")
  }

  async importFromFTP(caseId: string, connectionId: string, files: string[], description?: string) {
    const formData = new FormData()
    formData.append("case_id", caseId)
    formData.append("connection_id", connectionId)
    formData.append("files", JSON.stringify(files))
    if (description) formData.append("description", description)

    return this.post("/evidence/import/ftp", formData, "multipart/form-data")
  }

  async createIntelligenceEvidence(
    caseId: string,
    evidenceType: string,
    name: string,
    intelligenceData: string,
    source: string,
    description?: string,
  ) {
    const formData = new FormData()
    formData.append("case_id", caseId)
    formData.append("evidence_type", evidenceType)
    formData.append("name", name)
    formData.append("intelligence_data", intelligenceData)
    formData.append("source", source)
    if (description) formData.append("description", description)

    return this.post("/evidence/intelligence", formData, "multipart/form-data")
  }
}

export const apiClient = new ApiClient()

// Export the main API instance as 'api'
export const api = apiClient

// Export specific API modules for backward compatibility
export const casesAPI = {
  listCases: () => apiClient.getCases(),
  getCase: (id: string) => apiClient.getCase(id),
  createCase: (data: any) => apiClient.createCase(data),
  updateCase: (id: string, data: any) => apiClient.updateCase(id, data),
  deleteCase: (id: string) => apiClient.deleteCase(id),
}

export const usersAPI = {
  listUsers: () => apiClient.listUsers(),
  getCurrentUser: () => apiClient.getCurrentUser(),
  createUser: (data: any) => apiClient.createUser(data),
  updateUser: (id: string, data: any) => apiClient.updateUser(id, data),
  deleteUser: (id: string) => apiClient.deleteUser(id),
}

export const organizationsAPI = {
  listOrganizations: () => apiClient.listOrganizations(),
  getOrganization: (id: string) => apiClient.getOrganization(id),
  createOrganization: (data: any) => apiClient.createOrganization(data),
  updateOrganization: (id: string, data: any) => apiClient.updateOrganization(id, data),
  deleteOrganization: (id: string) => apiClient.deleteOrganization(id),
}

export const evidenceAPI = {
  listCaseEvidence: (caseId: string) => apiClient.listCaseEvidence(caseId),
  uploadEvidence: (caseId: string, file: File, description?: string) =>
    apiClient.uploadEvidence(caseId, file, description),
  deleteEvidence: (id: string) => apiClient.deleteEvidence(id),
  importFromDatabase: (caseId: string, connectionId: string, query: string, description?: string) =>
    apiClient.importFromDatabase(caseId, connectionId, query, description),
  importFromFTP: (caseId: string, connectionId: string, files: string[], description?: string) =>
    apiClient.importFromFTP(caseId, connectionId, files, description),
  createIntelligenceEvidence: (
    caseId: string,
    evidenceType: string,
    name: string,
    intelligenceData: string,
    source: string,
    description?: string,
  ) => apiClient.createIntelligenceEvidence(caseId, evidenceType, name, intelligenceData, source, description),
}
