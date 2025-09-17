/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/lib/api-client.ts
class ApiClient {
  // Delete tank by id
  async deleteTank(tankId: string) {
    return this.delete<{ message: string }>(`/api/tanks/${tankId}`)
  }
  // Delete generator by id
  async deleteGenerator(generatorId: string) {
    return this.delete<{ message: string }>(`/api/generators/${generatorId}`)
  }
  // Delete user by id
  async deleteUser(userId: string) {
    return this.delete<{ message: string }>(`/api/users/${userId}`)
  }
  private baseUrl = process.env.NODE_ENV === 'production' 
    ? (process.env.NEXT_PUBLIC_API_URL || '') 
    : '' 

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    return headers
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      })
      if (!response.ok) {
        const errorDetails = await response.json()
        console.error("API Error details:", errorDetails)
        throw new Error(`API Error: ${response.statusText}`)
      }
      return response.json()
    } catch (error) {
      console.error("API Client Error:", error)
      throw error
    }
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  }

  // User operations
  async getUsers() {
    return this.get<{ users: User[] }>("/api/users")
  }

  async createUser(userData: any): Promise<any> {
    try {
      const { permissions, ...dataToSend } = userData;
      console.log('Sending to server:', dataToSend);

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Client Error:', error);
      throw error;
    }
  }

  async getUserById(id: string) {
    return this.get<{ user: User }>(`/api/users/${id}`)
  }

  async updateUser(id: string, updates: Partial<{ name: string; email: string; role: string; isActive: boolean; password: string }>) {
    try {
      console.log('Sending update request to server:', { id, updates });

      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Client Error:', error);
      throw error;
    }
  }

  // System Settings operations
  async getSystemSettings() {
    return this.get<{ settings: SystemSettings }>("/api/system/settings")
  }

  async updateSystemSettings(settings: Partial<SystemSettings>) {
    return this.put<{ message: string }>("/api/system/settings", settings)
  }

  // Tank operations
  async getTanks() {
    return this.get<{ tanks: Tank[] }>("/api/tanks")
  }

  async createTank(tankData: any) {
    try {
      const response = await fetch('/api/tanks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tankData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Client Error:', error);
      throw error;
    }
  }

  async updateTank(id: string, updates: any) {
    try {
      const response = await fetch(`/api/tanks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Client Error:', error);
      throw error;
    }
  }

  // Generator operations
  async getGenerators() {
    return this.get<{ generators: Generator[] }>("/api/generators")
  }

  async createGenerator(generatorData: any) {
    try {
      const response = await fetch('/api/generators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generatorData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Client Error:', error);
      throw error;
    }
  }

  async updateGenerator(id: string, updates: any) {
    try {
      const response = await fetch(`/api/generators/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Client Error:', error);
      throw error;
    }
  }

  // Task operations
  async getTasks(userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : ""
    return this.get<{ tasks: Task[] }>(`/api/tasks${qs}`)
  }

  async createTask(taskData: CreateTaskInput) {
    return this.post<{ task: Task }>("/api/tasks", taskData)
  }

  async updateTask(id: string, updates: Partial<Task>) {
    return this.put<{ task: Task }>(`/api/tasks/${id}`, updates)
  }

  // Weekly tasks operations
  async getWeeklyTasks() {
    return this.get<{ tasks: WeeklyTask[] }>("/api/weekly-tasks")
  }

  async createWeeklyTask(taskData: Omit<WeeklyTask, "id">) {
    return this.post<{ task: WeeklyTask }>("/api/weekly-tasks", taskData)
  }

  async updateWeeklyTask(id: string, updates: Partial<WeeklyTask>) {
    return this.put<{ task: WeeklyTask }>(`/api/weekly-tasks/${id}`, updates)
  }

  async deleteWeeklyTask(id: string) {
    return this.delete<{ message: string }>(`/api/weekly-tasks/${id}`)
  }

  // Alert operations
  async getAlerts() {
    const res = await this.get<{ alerts: any[] }>("/api/alerts")
    return {
      alerts: res.alerts.map((a) => ({
        ...a,
        createdAt: new Date(a.createdAt),
      })) as Alert[],
    }
  }

  async updateAlert(id: string, updates: Partial<Alert>) {
    return this.put<{ alert: Alert }>(`/api/alerts/${id}`, updates)
  }

  async deleteAlert(id: string) {
    return this.delete<{ message: string }>(`/api/alerts/${id}`)
  }

  // Activity Logs operations
  async getActivityLogs(params: {
    page?: number
    limit?: number
    type?: string
    userId?: string
    startDate?: Date | string
    endDate?: Date | string
    search?: string
    sort?: 'asc' | 'desc'
  } = {}) {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.type) q.set('type', params.type)
    if (params.userId) q.set('userId', params.userId)
    if (params.startDate) q.set('startDate', new Date(params.startDate).toISOString())
    if (params.endDate) q.set('endDate', new Date(params.endDate).toISOString())
    if (params.search) q.set('search', params.search)
    if (params.sort) q.set('sort', params.sort)

    const res = await this.get<{ logs: ActivityLog[]; total: number }>(`/api/activity-logs?${q.toString()}`)
    // اطمینان از Date بودن
    return {
      logs: res.logs.map(l => ({ ...l, createdAt: new Date(l.createdAt) })),
      total: res.total,
    }
  }

  // Notification operations
  async getNotifications(userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : ""
    return this.get<{ notifications: Notification[] }>(`/api/notifications${qs}`)
  }

  async createNotification(data: Partial<Notification> & { userId: string; title: string; message: string }) {
    return this.post<{ notification: Notification }>(`/api/notifications`, data)
  }

  async updateNotification(id: string, updates: Partial<Notification>) {
    return this.put<{ notification: Notification }>(`/api/notifications/${id}`, updates)
  }

  async deleteNotification(id: string) {
    return this.delete<{ message: string }>(`/api/notifications/${id}`)
  }
}

export const apiClient = new ApiClient()

// Types referenced in method signatures
import type { User, SystemSettings, Tank, Generator, Task, CreateTaskInput, Alert, Notification, WeeklyTask } from "./types"
import type { ActivityLog } from "./types"