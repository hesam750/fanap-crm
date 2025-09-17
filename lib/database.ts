/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */


import { PrismaClient, Prisma } from '@prisma/client'
import type { User, Tank, Generator, HistoryRecord, WeeklyTask, PrismaHistoricalData, PrismaGetDataSummary, PrismaTank, PrismaGenerator, Notification } from './types'

// Initialize Prisma client (serverless-safe singleton)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Database service class
export class DatabaseService {
  private static instance: DatabaseService
  private notifications: Notification[] = []

  static getInstance(): DatabaseService
  {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  async isConnected(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('[Database] Connection failed:', error)
      return false
    }
  }

  // متد جدید برای دریافت داده‌های تاریخی با pagination
  async getHistoricalData(type: "tank" | "generator", id: string, days = 30, page = 1, limit = 50): Promise<{ data: any[], total: number }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const skip = (page - 1) * limit
      
      const [data, total] = await Promise.all([
        prisma.historicalData.findMany({
          where: {
            entityType: type, 
            OR: [
              { tankId: id },
              { generatorId: id }
            ],
            createdAt: {
              gte: startDate
            }
          },
          orderBy: { createdAt: 'asc' },
          skip,
          take: limit,
          include: {
            user: {
              select: { name: true }
            }
          }
        }),
        prisma.historicalData.count({
          where: {
            entityType: type, 
            OR: [
              { tankId: id },
              { generatorId: id }
            ],
            createdAt: {
              gte: startDate
            }
          }
        })
      ])
      
      return {
        data: data.map((record: PrismaHistoricalData) => ({
  id: record.id,
  level: record.levelValue,
  timestamp: record.createdAt,
  recordedBy: record.user?.name || record.recordedBy,
  entityType: record.entityType,
  tankId: record.tankId,
  generatorId: record.generatorId
})),
        total
      }
    } catch (error) {
      console.error('[Database] Failed to get historical data:', error)
      return { data: [], total: 0 }
    }
  }

  // متد جدید برای دریافت خلاصه داده‌ها
  async getDataSummary(entityType: "tank" | "generator", entityIds: string[], hours: number = 24, limit: number = 50): Promise<PrismaGetDataSummary[]> {
    try {
      const startDate = new Date()
      startDate.setHours(startDate.getHours() - hours)

      const data = await prisma.historicalData.findMany({
        where: {
          entityType,
          OR: [
            ...(entityType === 'tank' 
              ? [{ tankId: { in: entityIds } }] 
              : [{ generatorId: { in: entityIds } }]
            )
          ],
          createdAt: {
            gte: startDate
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        distinct: ['tankId', 'generatorId'],
        include: {
          user: {
            select: { name: true }
          }
        }
      })

      return data.map((record: PrismaHistoricalData) => ({
        id: record.id,
        level: record.levelValue,
        timestamp: record.createdAt,
        recordedBy: record.user?.name || record.recordedBy,
        entityId: record.tankId || record.generatorId
      }))
    } catch (error) {
      console.error('[Database] Failed to get data summary:', error)
      return []
    }
  }

  // متد جدید برای bulk operations
  async getBulkTrends(tankIds: string[], generatorIds: string[], period: number = 24) {
    try {
      const [tankTrends, generatorTrends] = await Promise.all([
        Promise.all(tankIds.map(id => this.calculateTankTrends(id, period))),
        Promise.all(generatorIds.map(id => this.calculateGeneratorTrends(id, period)))
      ])

      return {
        tanks: Object.fromEntries(tankIds.map((id, index) => [id, tankTrends[index]])),
        generators: Object.fromEntries(generatorIds.map((id, index) => [id, generatorTrends[index]]))
      }
    } catch (error) {
      console.error('[Database] Failed to get bulk trends:', error)
      return { tanks: {}, generators: {} }
    }
  }

  // متد جدید برای bulk predictions
  async getBulkPredictions(tankIds: string[], generatorIds: string[]) {
    try {
      const [tankPredictions, generatorPredictions] = await Promise.all([
        Promise.all(tankIds.map(id => this.predictTankUsage(id))),
        Promise.all(generatorIds.map(id => this.predictGeneratorUsage(id)))
      ])

      return {
        tanks: Object.fromEntries(tankIds.map((id, index) => [id, tankPredictions[index]])),
        generators: Object.fromEntries(generatorIds.map((id, index) => [id, generatorPredictions[index]]))
      }
    } catch (error) {
      console.error('[Database] Failed to get bulk predictions:', error)
      return { tanks: {}, generators: {} }
    }
  }

  // User operations
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      })
      
      if (!user) return null
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as "root" | "manager" | "operator" | "supervisor",
        permissions: this.mapRolePermissions(user.role),
        createdAt: user.createdAt,
        isActive: user.isActive,
      }
    } catch (error) {
      console.error('[Database] Failed to get user by email:', error)
      return null
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      })
      
      if (!user) return null
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as "root" | "manager" | "operator" | "supervisor",
        permissions: this.mapRolePermissions(user.role),
        createdAt: user.createdAt,
        isActive: user.isActive,
      }
    } catch (error) {
      console.error('[Database] Failed to get user by ID:', error)
      return null
    }
  }

  async getUserWithPassword(email: string): Promise<any | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      })
      return user
    } catch (error) {
      console.error('[Database] Failed to get user with password:', error)
      return null
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'asc' }
      })
      
      return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as "root" | "manager" | "operator" | "supervisor",
        permissions: this.mapRolePermissions(user.role),
        createdAt: user.createdAt,
        lastLogin: user.updatedAt,
        isActive: user.isActive,
      }))
    } catch (error) {
      console.error('[Database] Failed to get users:', error)
      return []
    }
  }

  async createUser(userData: any): Promise<any[]> {
    try {
      console.log("Creating user with data:", userData)

      const user = await prisma.user.create({
        data: userData
      })

      return [user]
    } catch (error) {
      console.error('[Database] Failed to create user:', error)
      throw error
    }
  }

  async getSystemSettings(): Promise<any> {
    try {
      return {
        lowAlertThreshold: 20,
        criticalAlertThreshold: 10,
        autoUpdateInterval: 5,
        maintenanceMode: false,
        dataRetentionDays: 30,
      }
    } catch (error) {
      console.error('[Database] Failed to get system settings:', error)
      throw error
    }
  }

  async updateSystemSettings(settings: any): Promise<void> {
    try {
      console.log('Saving system settings:', settings)
    } catch (error) {
      console.error('[Database] Failed to update system settings:', error)
      throw error
    }
  }

  async updateUser(userId: string, updates: any): Promise<any> {
    try {
      console.log('Database update called with:', { userId, updates })

      const user = await prisma.user.update({
        where: { id: userId },
        data: updates
      })

      console.log('Database update result - password changed:', user.password)
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    } catch (error) {
      console.error('[Database] Failed to update user:', error)
      throw error
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      console.log('Deleting user from database:', userId)
      
      await prisma.user.delete({
        where: { id: userId }
      })
      
      console.log('User deleted successfully')
    } catch (error) {
      console.error('[Database] Failed to delete user:', error)
      // Surface FK constraint errors to API layer with a recognizable code
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        // Foreign key constraint failed on the field
        const err = new Error('Cannot delete user because related records exist (e.g., tanks/generators/historical data). Consider deactivating the user instead.') as Error & { code?: string }
        err.code = 'P2003'
        throw err
      }
      throw error
    }
  }

  // Tank operations
  async getTanks(): Promise<Tank[]> {
    try {
      const tanks = await prisma.tank.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { name: true }
          }
        }
      })
      
      return tanks.map((tank:PrismaTank) => ({
        id: tank.id,
        name: tank.name,
        type: tank.type as "fuel" | "water",
        capacity: tank.capacity,
        currentLevel: tank.currentLevel,
        location: tank.location || '',
        lastUpdated: tank.lastUpdated,
        recordedBy: tank.user?.name || 'Unknown',
      }))
    } catch (error) {
      console.error('[Database] Failed to get tanks:', error)
      return []
    }
  }

  async getTankById(tankId: string): Promise<Tank | null> {
    try {
      const tank = await prisma.tank.findUnique({
        where: { id: tankId },
        include: {
          user: {
            select: { name: true }
          }
        }
      })
      
      if (!tank) return null
      
      return {
        id: tank.id,
        name: tank.name,
        type: tank.type as "fuel" | "water",
        capacity: tank.capacity,
        currentLevel: tank.currentLevel,
        location: tank.location || '',
        lastUpdated: tank.lastUpdated,
        recordedBy: tank.user?.name || 'Unknown',
      }
    } catch (error) {
      console.error('[Database] Failed to get tank by ID:', error)
      return null
    }
  }

  async createTank(tankData: {
    name: string
    type: "fuel" | "water"
    capacity: number
    location?: string
    createdBy: string
  }): Promise<any> {
    try {
      const tank = await prisma.tank.create({
        data: {
          name: tankData.name,
          type: tankData.type,
          capacity: tankData.capacity,
          location: tankData.location || null,
          updatedBy: tankData.createdBy,
          currentLevel: 0,
          percentage: 0,
          isActive: true,
        }
      })

      return tank
    } catch (error) {
      console.error('[Database] Failed to create tank:', error)
      throw error
    }
  }

  async updateTank(tankId: string, updates: any): Promise<Tank> {
  try {
    const dataToUpdate: any = { ...updates }
    // اگر سطح فعلی تغییر کند، زمان آخرین بروزرسانی را نیز به‌روزرسانی کن
    if (typeof updates?.currentLevel === 'number') {
      dataToUpdate.lastUpdated = new Date()
    }

    const tank = await prisma.tank.update({
      where: { id: tankId },
      data: dataToUpdate,
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    // اگر سطح تغییر کرده بود، رکورد تاریخچه ثبت شود
    if (typeof updates?.currentLevel === 'number') {
      try {
        await this.addHistoryRecord({
          tankId: tank.id,
          level: tank.currentLevel,
          recordedBy: (tank as any).updatedBy || updates?.updatedBy || 'system'
        })
      } catch (e) {
        console.error('[Database] Failed to add tank history record on updateTank:', e)
      }
    }

    // ایجاد خودکار هشدار سطح پایین بر اساس آستانه‌ها
    try {
      const { lowAlertThreshold, criticalAlertThreshold } = await this.getSystemSettings()
      const levelPercent = tank.currentLevel
      const tankType = String(tank.type).toLowerCase()

      let alertType: string | null = null
      let severity: string | null = null

      if (typeof levelPercent === 'number') {
        if (levelPercent <= criticalAlertThreshold) {
          alertType = tankType === 'fuel' ? 'low_fuel' : 'low_water'
          severity = 'critical'
        } else if (levelPercent <= lowAlertThreshold) {
          alertType = tankType === 'fuel' ? 'low_fuel' : 'low_water'
          severity = 'high'
        }
      }

      if (alertType && severity) {
        const existing = await prisma.alert.findFirst({
          where: {
            tankId: tank.id,
            type: alertType as any,
            acknowledged: false,
          }
        })

        if (!existing) {
          await prisma.alert.create({
            data: {
              type: alertType as any,
              message: `سطح ${tankType === 'fuel' ? 'سوخت' : 'آب'} مخزن ${tank.name} ${severity === 'critical' ? 'بحرانی' : 'کم'} است: ${Math.round(levelPercent)}%`,
              severity: severity as any,
              tankId: tank.id,
              acknowledged: false,
            }
          })
        }
      }
    } catch (e) {
      console.error('[Database] Failed to auto-create tank alert:', e)
    }

    return {
      id: tank.id,
      name: tank.name,
      type: tank.type.toLowerCase() as "fuel" | "water",
      capacity: tank.capacity,
      currentLevel: tank.currentLevel,
      location: tank.location || '',
      lastUpdated: tank.lastUpdated,
      recordedBy: tank.user?.name || tank.updatedBy, // استفاده از updatedBy برای recordedBy
    }
  } catch (error) {
    console.error('[Database] Failed to update tank:', error)
    throw error
  }
}

  async updateTankLevel(tankId: string, level: number, updatedBy: string): Promise<Tank | null> {
    try {
      const tank = await prisma.tank.update({
        where: { id: tankId },
        data: {
          currentLevel: level,
          lastUpdated: new Date(),
          updatedBy: updatedBy,
        },
        include: {
          user: {
            select: { name: true }
          }
        }
      })

      // ثبت رکورد تاریخچه به‌محض بروزرسانی سطح
      try {
        await this.addHistoryRecord({
          tankId: tank.id,
          level: tank.currentLevel,
          recordedBy: updatedBy
        })
      } catch (e) {
        console.error('[Database] Failed to add tank history record on updateTankLevel:', e)
      }

      // ثبت فعالیت
      await this.logActivity("tank_update", `Tank ${tankId} level updated to ${level}%`, updatedBy)

      // ایجاد خودکار هشدار سطح پایین بر اساس آستانه‌ها
      try {
        const { lowAlertThreshold, criticalAlertThreshold } = await this.getSystemSettings()
        const levelPercent = tank.currentLevel
        const tankType = String(tank.type).toLowerCase()

        let alertType: string | null = null
        let severity: string | null = null

        if (typeof levelPercent === 'number') {
          if (levelPercent <= criticalAlertThreshold) {
            alertType = tankType === 'fuel' ? 'low_fuel' : 'low_water'
            severity = 'critical'
          } else if (levelPercent <= lowAlertThreshold) {
            alertType = tankType === 'fuel' ? 'low_fuel' : 'low_water'
            severity = 'high'
          }
        }

        if (alertType && severity) {
          const existing = await prisma.alert.findFirst({
            where: {
              tankId: tank.id,
              type: alertType as any,
              acknowledged: false,
            }
          })

          if (!existing) {
            await prisma.alert.create({
              data: {
                type: alertType as any,
                message: `سطح ${tankType === 'fuel' ? 'سوخت' : 'آب'} مخزن ${tank.name} ${severity === 'critical' ? 'بحرانی' : 'کم'} است: ${Math.round(levelPercent)}%`,
                severity: severity as any,
                tankId: tank.id,
                acknowledged: false,
              }
            })
          }
        }
      } catch (e) {
        console.error('[Database] Failed to auto-create tank alert:', e)
      }

      return {
        id: tank.id,
        name: tank.name,
        type: tank.type.toLowerCase() as "fuel" | "water",
        capacity: tank.capacity,
        currentLevel: tank.currentLevel,
        location: tank.location || '',
        lastUpdated: tank.lastUpdated,
        recordedBy: tank.user?.name || updatedBy,
      }
    } catch (error) {
      console.error('[Database] Failed to update tank level:', error)
      throw error
    }
  }

  async deleteTank(tankId: string, deletedBy: string): Promise<boolean> {
    try {
      await prisma.tank.update({
        where: { id: tankId },
        data: { isActive: false }
      })
      
      await this.logActivity("tank_deleted", `Tank ${tankId} deleted`, deletedBy)
      return true
    } catch (error) {
      console.error('[Database] Failed to delete tank:', error)
      throw error
    }
  }

  // Generator operations
  async getGenerators(): Promise<Generator[]> {
    try {
      const generators = await prisma.generator.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { name: true }
          }
        }
      })
      
      return generators.map((gen:PrismaGenerator) => ({
        id: gen.id,
        name: gen.name,
        capacity: gen.capacity,
        currentLevel: gen.currentLevel,
        status: gen.status as "running" | "stopped" | "maintenance",
        location: gen.location || '',
        lastUpdated: gen.lastUpdated,
        recordedBy: gen.user?.name || 'Unknown',
      }))
    } catch (error) {
      console.error('[Database] Failed to get generators:', error)
      return []
    }
  }

  async getGeneratorById(generatorId: string): Promise<Generator | null> {
    try {
      const generator = await prisma.generator.findUnique({
        where: { id: generatorId },
        include: {
          user: { select: { name: true } }
        }
      })
      
      if (!generator) return null

      return {
        id: generator.id,
        name: generator.name,
        capacity: generator.capacity,
        currentLevel: generator.currentLevel,
        status: generator.status as "running" | "stopped" | "maintenance",
        location: generator.location || '',
        lastUpdated: generator.lastUpdated,
        recordedBy: generator.user?.name || 'Unknown',
      }
    } catch (error) {
      console.error('[Database] Failed to get generator by ID:', error)
      return null
    }
  }

  async createGenerator(generatorData: {
    name: string
    capacity: number
    location?: string
    createdBy: string
    status?: "running" | "stopped" | "maintenance"
    currentLevel?: number
  }): Promise<any[]> {
    try {
      const generator = await prisma.generator.create({
        data: {
          name: generatorData.name,
          capacity: generatorData.capacity,
          location: generatorData.location || '',
          updatedBy: generatorData.createdBy,
          status: (generatorData.status || 'stopped') as any,
          currentLevel: typeof generatorData.currentLevel === 'number' ? generatorData.currentLevel : 0,
        }
      })
      
      await this.logActivity(
        "generator_created",
        `New generator "${generatorData.name}" created with capacity ${generatorData.capacity}L`,
        generatorData.createdBy,
      )
      
      return [generator]
    } catch (error) {
      console.error('[Database] Failed to create generator:', error)
      throw error
    }
  }

  async updateGenerator(generatorId: string, updates: any): Promise<Generator> {
  try {
    const dataToUpdate: any = { ...updates }
    // اگر سطح فعلی تغییر کند، زمان آخرین بروزرسانی را نیز به‌روزرسانی کن
    if (typeof updates?.currentLevel === 'number') {
      dataToUpdate.lastUpdated = new Date()
    }

    const generator = await prisma.generator.update({
      where: { id: generatorId },
      data: dataToUpdate,
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    return {
      id: generator.id,
      name: generator.name,
      capacity: generator.capacity,
      currentLevel: generator.currentLevel,
      status: generator.status.toLowerCase() as "running" | "stopped" | "maintenance",
      location: generator.location || '',
      lastUpdated: generator.lastUpdated,
      recordedBy: generator.user?.name || generator.updatedBy, // استفاده از updatedBy برای recordedBy
    }
  } catch (error) {
    console.error('[Database] Failed to update generator:', error)
    throw error
  }
}

  async updateGeneratorLevel(generatorId: string, level: number, updatedBy: string): Promise<any[]> {
    try {
      const generator = await prisma.generator.update({
        where: { id: generatorId },
        data: {
          currentLevel: level,
          lastUpdated: new Date(),
          updatedBy: updatedBy,
        }
      })
      
      await this.logActivity("generator_update", `Generator ${generatorId} level updated to ${level}%`, updatedBy)
      return [generator]
    } catch (error) {
      console.error('[Database] Failed to update generator level:', error)
      throw error
    }
  }

  async deleteGenerator(generatorId: string, deletedBy: string): Promise<any[]> {
    try {
      await prisma.generator.update({
        where: { id: generatorId },
        data: { isActive: false }
      })
      
      await this.logActivity("generator_deleted", `Generator ${generatorId} deleted`, deletedBy)
      return []
    } catch (error) {
      console.error('[Database] Failed to delete generator:', error)
      throw error
    }
  }

  // Task operations
  async createTask(taskData: any): Promise<any> {
    try {
      const task = await prisma.task.create({
        data: {
          title: taskData.title,
          description: taskData.description || "",
          assignedTo: taskData.assignedTo,
          assignedBy: taskData.assignedBy,
          status: taskData.status || "pending",
          completedAt: (typeof taskData.status === 'string' && taskData.status.toLowerCase() === 'completed') ? new Date() : null,
          priority: taskData.priority || "medium",
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          checklist: taskData.checklist || [],
          operatorNote: taskData.operatorNote || null,
        },
        include: {
          assignedToUser: {
            select: { name: true, email: true }
          },
          assignedByUser: {
            select: { name: true, email: true }
          }
        }
      })
      return task
    } catch (error) {
      console.error('[Database] Failed to create task:', error)
      throw error
    }
  }

  async getTasks(): Promise<any[]> {
    try {
      const tasks = await prisma.task.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          assignedToUser: {
            select: { name: true, email: true }
          },
          assignedByUser: {
            select: { name: true, email: true }
          }
        }
      })
      return tasks
    } catch (error) {
      console.error('[Database] Failed to get tasks:', error)
      return []
    }
  }

  async getTasksByUser(userId: string): Promise<any[]> {
    try {
      const tasks = await prisma.task.findMany({
        where: { assignedTo: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          assignedToUser: {
            select: { name: true, email: true }
          },
          assignedByUser: {
            select: { name: true, email: true }
          }
        }
      })
      return tasks
    } catch (error) {
      console.error('[Database] Failed to get tasks by user:', error)
      return []
    }
  }

  async getTaskById(taskId: string): Promise<any | null> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignedToUser: { select: { name: true, email: true } },
          assignedByUser: { select: { name: true, email: true } },
        },
      })
      return task
    } catch (error) {
      console.error('[Database] Failed to get task by ID:', error)
      return null
    }
  }

  async updateTask(taskId: string, updates: any): Promise<any[]> {
    try {
      const dataToUpdate: any = { ...updates }

      // اگر وضعیت به completed تغییر کرد، completedAt را ست کن؛ در غیر این صورت null شود
      if (typeof updates?.status === 'string') {
        const status = updates.status.toLowerCase()
        if (status === 'completed') {
          if (!("completedAt" in updates)) {
            dataToUpdate.completedAt = new Date()
          }
        } else {
          dataToUpdate.completedAt = null
        }
      }

      const task = await prisma.task.update({
        where: { id: taskId },
        data: dataToUpdate
      })
      return [task]
    } catch (error) {
      console.error('[Database] Failed to update task:', error)
      throw error
    }
  }

  async deleteTask(taskId: string): Promise<any[]> {
    try {
      await prisma.task.delete({
        where: { id: taskId }
      })
      return []
    } catch (error) {
      console.error('[Database] Failed to delete task:', error)
      throw error
    }
  }

  // Alert operations
  async getAlerts(): Promise<any[]> {
    try {
      const alerts = await prisma.alert.findMany({
        orderBy: { createdAt: 'desc' }
      })
      return alerts
    } catch (error) {
      console.error('[Database] Failed to get alerts:', error)
      return []
    }
  }

  async createAlert(alertData: any): Promise<any[]> {
    try {
      const alert = await prisma.alert.create({
        data: {
          type: alertData.type,
          message: alertData.message,
          severity: alertData.severity,
          tankId: alertData.tankId || null,
          generatorId: alertData.generatorId || null,
          acknowledged: alertData.acknowledged || false,
          acknowledgedBy: alertData.acknowledgedBy || null,
          acknowledgedAt: alertData.acknowledgedAt || null,
        }
      })
      return [alert]
    } catch (error) {
      console.error('[Database] Failed to create alert:', error)
      throw error
    }
  }

  async updateAlert(alertId: string, updates: any): Promise<any[]> {
    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: updates
      })
      return [alert]
    } catch (error) {
      console.error('[Database] Failed to update alert:', error)
      throw error
    }
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<any[]> {
    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          acknowledged: true,
          acknowledgedBy: acknowledgedBy,
          acknowledgedAt: new Date(),
        }
      })
      return [alert]
    } catch (error) {
      console.error('[Database] Failed to acknowledge alert:', error)
      return []
    }
  }

  async deleteAlert(alertId: string): Promise<any[]> {
    try {
      await prisma.alert.delete({
        where: { id: alertId }
      })
      return []
    } catch (error) {
      console.error('[Database] Failed to delete alert:', error)
      throw error
    }
  }

  // Activity logging
  async logActivity(type: string, description: string, userId: string): Promise<any[]> {
    try {
      const log = await prisma.activityLog.create({
        data: {
          type,
          description,
          userId: userId,
        }
      })
      return [log]
    } catch (error) {
      console.error('[Database] Failed to log activity:', error)
      return []
    }
  }

  async getActivityLogs(params: {
    page?: number
    limit?: number
    type?: string
    userId?: string
    startDate?: Date | string
    endDate?: Date | string
    search?: string
    sort?: 'asc' | 'desc'
  } = {}): Promise<{ logs: any[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 50,
        type,
        userId,
        startDate,
        endDate,
        search,
        sort = 'desc',
      } = params

      const where: any = {}
      if (type) where.type = type
      if (userId) where.userId = userId

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [total, items] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.findMany({
          where,
          orderBy: { createdAt: sort },
          skip: (page - 1) * limit,
          take: limit,
          include: { user: { select: { name: true } } },
        }),
      ])

      const logs = items.map((i) => ({
        id: i.id,
        type: i.type,
        description: i.description,
        userId: i.userId ?? undefined,
        userName: i.user?.name ?? undefined,
        metadata: i.metadata ?? undefined,
        createdAt: i.createdAt,
      }))

      return { logs, total }
    } catch (error) {
      console.error('[Database] Failed to get activity logs:', error)
      return { logs: [], total: 0 }
    }
  }

  // Historical data
  async addHistoryRecord(record: { tankId?: string; generatorId?: string; level: number; recordedBy: string }): Promise<HistoryRecord | null> {
    try {
      const data: any = {
        levelValue: record.level,
        recordedBy: record.recordedBy,
      }

      if (record.tankId) {
        data.entityType = 'tank'
        data.tankId = record.tankId
      } else if (record.generatorId) {
        data.entityType = 'generator'
        data.generatorId = record.generatorId
      }

      const historyRecord = await prisma.historicalData.create({
        data: data,
        include: {
          user: {
            select: { name: true }
          }
        }
      })

      return {
        id: historyRecord.id,
        tankId: record.tankId,
        generatorId: record.generatorId,
        level: historyRecord.levelValue,
        timestamp: historyRecord.createdAt,
        recordedBy: historyRecord.user?.name || historyRecord.recordedBy,
      }
    } catch (error) {
      console.error('[Database] Failed to add history record:', error)
      return null
    }
  }

  async getTankHistory(tankId: string, hours: number, limit: number = 100): Promise<any[]> {
    try {
      const startDate = new Date()
      startDate.setHours(startDate.getHours() - hours)

      const history = await prisma.historicalData.findMany({
        where: {
          entityType: 'tank',
          tankId: tankId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        include: {
          user: {
            select: { name: true }
          }
        }
      })

      return history.map(record => ({
        level: record.levelValue,
        timestamp: record.createdAt,
        recordedBy: record.user?.name || record.recordedBy || "سیستم"
      }))
    } catch (error) {
      console.error('[Database] Failed to get tank history:', error)
      return []
    }
  }

  async getGeneratorHistory(generatorId: string, hours: number, limit: number = 100): Promise<any[]> {
    try {
      const startDate = new Date()
      startDate.setHours(startDate.getHours() - hours)

      const history = await prisma.historicalData.findMany({
        where: {
          entityType: 'generator',
          generatorId: generatorId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        include: {
          user: {
            select: { name: true }
          }
        }
      })

      return history.map(record => ({
        level: record.levelValue,
        timestamp: record.createdAt,
        recordedBy: record.user?.name || record.recordedBy || "سیستم"
      }))
    } catch (error) {
      console.error('[Database] Failed to get generator history:', error)
      return []
    }
  }

  // Analytics functions
  async calculateTankTrends(tankId: string, period: number): Promise<any> {
    try {
      const history = await this.getTankHistory(tankId, period)
      
      if (history.length < 2) {
        return {
          trend: "stable",
          changeRate: 0,
          message: "داده کافی برای تحلیل روند وجود ندارد"
        }
      }
      
      const latest = history[history.length - 1].level
      const previous = history[0].level
      const changeRate = ((latest - previous) / previous) * 100
      
      let trend: "up" | "down" | "stable" = "stable"
      if (changeRate > 5) trend = "up"
      else if (changeRate < -5) trend = "down"
      
      return {
        trend,
        changeRate: parseFloat(changeRate.toFixed(2)),
        currentLevel: latest,
        previousLevel: previous,
        dataPoints: history.length
      }
    } catch (error) {
      console.error('[Database] Failed to calculate tank trends:', error)
      return {
        trend: "stable",
        changeRate: 0,
        error: "خطا در محاسبه روند"
      }
    }
  }

  async calculateGeneratorTrends(generatorId: string, period: number): Promise<any> {
    try {
      const history = await this.getGeneratorHistory(generatorId, period)
      
      if (history.length < 2) {
        return {
          trend: "stable",
          changeRate: 0,
          message: "داده کافی برای تحلیل روند وجود ندارد"
        }
      }
      
      const latest = history[history.length - 1].level
      const previous = history[0].level
      const changeRate = ((latest - previous) / previous) * 100
      
      let trend: "up" | "down" | "stable" = "stable"
      if (changeRate > 5) trend = "up"
      else if (changeRate < -5) trend = "down"
      
      return {
        trend,
        changeRate: parseFloat(changeRate.toFixed(2)),
        currentLevel: latest,
        previousLevel: previous,
        dataPoints: history.length
      }
    } catch (error) {
      console.error('[Database] Failed to calculate generator trends:', error)
      return {
        trend: "stable",
        changeRate: 0,
        error: "خطا در محاسبه روند"
      }
    }
  }

  async predictTankUsage(tankId: string): Promise<any> {
    try {
      const tank = await this.getTankById(tankId)
      if (!tank) {
        return {
          predictedDays: null,
          recommendation: "مخزن یافت نشد",
          confidence: "low"
        }
      }
      
      const history = await this.getTankHistory(tankId, 168)
      
      if (history.length < 10) {
        return {
          predictedDays: null,
          recommendation: "داده کافی برای پیش‌بینی وجود ندارد",
          confidence: "low"
        }
      }
      
      const totalConsumption = history[0].level - history[history.length - 1].level
      const totalDays = history.length / 24
      const dailyConsumption = Math.abs(totalConsumption) / totalDays
      
      const currentLevel = tank.currentLevel
      let predictedDays = null
      let recommendation = ""
      
      if (dailyConsumption > 0) {
        predictedDays = currentLevel / dailyConsumption
        
        if (predictedDays < 1) {
          recommendation = "سطح مخزن بحرانی است. لطفاً فوراً اقدام کنید."
        } else if (predictedDays < 3) {
          recommendation = "سطح مخزن کم است. برنامه‌ریزی برای پرکردن مخزن انجام دهید."
        } else {
          recommendation = "سطح مخزن در وضعیت مطلوبی قرار دارد."
        }
      }
      
      return {
        predictedDays: predictedDays ? parseFloat(predictedDays.toFixed(1)) : null,
        dailyConsumption: parseFloat(dailyConsumption.toFixed(2)),
        currentLevel,
        recommendation,
        confidence: history.length > 48 ? "high" : "medium"
      }
    } catch (error) {
      console.error('[Database] Failed to predict tank usage:', error)
      return {
        predictedDays: null,
        recommendation: "خطا در پیش‌بینی",
        confidence: "low"
      }
    }
  }

  async predictGeneratorUsage(generatorId: string): Promise<any> {
    try {
      const generator = await this.getGeneratorById(generatorId)
      if (!generator) {
        return {
          predictedHours: null,
          recommendation: "ژنراتور یافت نشد",
          confidence: "low"
        }
      }
      
      const history = await this.getGeneratorHistory(generatorId, 168)
      
      if (history.length < 10) {
        return {
          predictedHours: null,
          recommendation: "داده کافی برای پیش‌بینی وجود ندارد",
          confidence: "low"
        }
      }
      
      const totalConsumption = history[0].level - history[history.length - 1].level
      const totalHours = history.length
      const hourlyConsumption = Math.abs(totalConsumption) / totalHours
      
      const currentLevel = generator.currentLevel
      let predictedHours = null
      let recommendation = ""
      
      if (hourlyConsumption > 0) {
        predictedHours = currentLevel / hourlyConsumption
        
        if (predictedHours < 24) {
          recommendation = "سوخت ژنراتور در حال اتمام است. لطفاً فوراً سوخت‌گیری کنید."
        } else if (predictedHours < 72) {
          recommendation = "سوخت ژنراتور کم است. برنامه‌ریزی برای سوخت‌گیری انجام دهید."
        } else {
          recommendation = "سوخت ژنراتور در سطح مطلوبی قرار دارد."
        }
      }
      
      return {
        predictedHours: predictedHours ? parseFloat(predictedHours.toFixed(1)) : null,
        predictedDays: predictedHours ? parseFloat((predictedHours / 24).toFixed(1)) : null,
        hourlyConsumption: parseFloat(hourlyConsumption.toFixed(3)),
        currentLevel,
        recommendation,
        confidence: history.length > 48 ? "high" : "medium"
      }
    } catch (error) {
      console.error('[Database] Failed to predict generator usage:', error)
      return {
        predictedHours: null,
        recommendation: "خطا در پیش‌بینی",
        confidence: "low"
      }
    }
  }

  // Helper methods
  private mapRolePermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      root: ["*"],
      manager: [
        "view_dashboard",
        "view_analytics",
        "view_reports",
        "manage_users",
        "manage_tasks",
        "manage_devices",
        "acknowledge_alerts",
        "update_levels",
        "add_generators",
      ],
      supervisor: [
        "view_dashboard",
        "view_analytics",
        "view_reports",
        "manage_tasks",
        "acknowledge_alerts",
        "update_levels",
      ],
      operator: ["view_dashboard", "view_assigned_tasks", "update_levels", "acknowledge_alerts"],
    }
    return permissions[role] || []
  }

  // Notification operations
  async getNotifications(): Promise<any[]> {
    try {
      // Return from in-memory store (placeholder until schema/model is added)
      return this.notifications
    } catch (error) {
      console.error('[Database] Failed to get notifications:', error)
      return []
    }
  }

  async getNotificationsByUser(userId: string): Promise<any[]> {
    try {
      // Filter from in-memory store (placeholder until schema/model is added)
      return this.notifications.filter(n => n.userId === userId)
    } catch (error) {
      console.error('[Database] Failed to get notifications by user:', error)
      return []
    }
  }

  async createNotification(data: Partial<Notification> & { userId: string; title: string; message: string }): Promise<Notification> {
    try {
      const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
        ? (globalThis.crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

      const notification: Notification = {
        id,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: (data.type as Notification['type']) || 'system',
        read: data.read ?? false,
        actionUrl: data.actionUrl,
        createdAt: new Date(),
      }

      this.notifications.unshift(notification)
      return notification
    } catch (error) {
      console.error('[Database] Failed to create notification:', error)
      throw error
    }
  }

  async updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | null> {
    try {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index === -1) return null
      const existing = this.notifications[index]
      const updated: Notification = {
        ...existing,
        ...updates,
      }
      this.notifications[index] = updated
      return updated
    } catch (error) {
      console.error('[Database] Failed to update notification:', error)
      throw error
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      const before = this.notifications.length
      this.notifications = this.notifications.filter(n => n.id !== id)
      return this.notifications.length < before
    } catch (error) {
      console.error('[Database] Failed to delete notification:', error)
      throw error
    }
  }

  // Weekly Task operations
 async getWeeklyTasks(): Promise<WeeklyTask[]> {
  try {
    const tasks = await prisma.weeklyTask.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });
    
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo,
      dayOfWeek: task.dayOfWeek,
      timeSlot: task.timeSlot,
      priority: task.priority as "low" | "medium" | "high" | "critical",
      recurring: task.recurring,
      status: task.status as "pending" | "in_progress" | "completed" | "cancelled",
      type: task.type as "maintenance" | "fuel" | "water" | "generator" | "other",
      equipment: task.equipment || undefined,
      duration: task.duration || undefined,
      dueDate: task.dueDate || undefined,
      completedBy: task.completedBy || undefined,
    }));
  } catch (error) {
    console.error('[Database] Failed to get weekly tasks:', error);
    return [];
  }
}

async createWeeklyTask(taskData: Omit<WeeklyTask, "id">): Promise<WeeklyTask> {
  try {
    console.log('Creating weekly task in database:', taskData);
    
    const assignedToArray = Array.isArray(taskData.assignedTo) 
      ? taskData.assignedTo 
      : [taskData.assignedTo].filter(Boolean);
    
    const task = await prisma.weeklyTask.create({
      data: {
        title: taskData.title,
        description: taskData.description || "",
        assignedTo: assignedToArray,
        dayOfWeek: taskData.dayOfWeek,
        timeSlot: taskData.timeSlot,
        priority: taskData.priority,
        recurring: taskData.recurring || false,
        status: taskData.status || "pending",
        type: taskData.type || "maintenance",
        equipment: taskData.equipment || null,
        duration: taskData.duration || null,
        dueDate: taskData.dueDate || null,
        completedBy: taskData.completedBy || null,
      },
    });
    
    return {
      id: task.id,
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo,
      dayOfWeek: task.dayOfWeek,
      timeSlot: task.timeSlot,
      priority: task.priority as "low" | "medium" | "high" | "critical",
      recurring: task.recurring,
      status: task.status as "pending" | "in_progress" | "completed" | "cancelled",
      type: task.type as "maintenance" | "fuel" | "water" | "generator" | "other",
      equipment: task.equipment || undefined,
      duration: task.duration || undefined,
      dueDate: taskData.dueDate || undefined,
      completedBy: task.completedBy || undefined,
    };
  } catch (error) {
    console.error('[Database] Failed to create weekly task:', error);
    throw error;
  }
}

async updateWeeklyTask(taskId: string, updates: Partial<WeeklyTask>): Promise<WeeklyTask> {
  try {
    console.log('Updating weekly task in database:', taskId, updates);
    
    if (updates.assignedTo && !Array.isArray(updates.assignedTo)) {
      updates.assignedTo = [updates.assignedTo].filter(Boolean);
    }
    
    const task = await prisma.weeklyTask.update({
      where: { id: taskId },
      data: updates,
    });
    
    return {
      id: task.id,
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo,
      dayOfWeek: task.dayOfWeek,
      timeSlot: task.timeSlot,
      priority: task.priority as "low" | "medium" | "high" | "critical",
      recurring: task.recurring,
      status: task.status as "pending" | "in_progress" | "completed" | "cancelled",
      type: task.type as "maintenance" | "fuel" | "water" | "generator" | "other",
      equipment: task.equipment || undefined,
      duration: task.duration || undefined,
      dueDate: task.dueDate || undefined,
      completedBy: task.completedBy || undefined,
    };
  } catch (error) {
    console.error('[Database] Failed to update weekly task:', error);
    throw error;
  }
}

  async deleteWeeklyTask(taskId: string): Promise<void> {
  try {
    await prisma.weeklyTask.delete({
      where: { id: taskId }
    });
    
    console.log('Weekly task deleted:', taskId);
  } catch (error) {
    console.error('[Database] Failed to delete weekly task:', error);
    throw error;
  }
}
  async calculateTankPrediction(id: string): Promise<any> {
    // پیاده‌سازی منطق پیش‌بینی تانک
    try {
      // مثال: محاسبه پیش‌بینی بر اساس داده‌های تاریخی
      const historicalData = await this.getTankHistoricalData(id);
      return this.calculatePredictionFromData(historicalData);
    } catch (error) {
      console.error("Error calculating tank prediction:", error);
      throw error;
    }
  }
async calculateGeneratorPrediction(id: string): Promise<any> {
    // پیاده‌سازی منطق پیش‌بینی ژنراتور
    try {
      const historicalData = await this.getGeneratorHistoricalData(id);
      return this.calculatePredictionFromData(historicalData);
    } catch (error) {
      console.error("Error calculating generator prediction:", error);
      throw error;
    }
  }
    private async getTankHistoricalData(id: string): Promise<any[]> {
    // دریافت داده‌های تاریخی تانک
    return []; // پیاده‌سازی واقعی
  }

  private async getGeneratorHistoricalData(id: string): Promise<any[]> {
    // دریافت داده‌های تاریخی ژنراتور
    return []; // پیاده‌سازی واقعی
  }

  private calculatePredictionFromData(data: any[]): any {
    // منطق پیش‌بینی بر اساس داده‌ها
    return {
      predictedValue: 0,
      confidence: 0.8,
      timestamp: new Date().toISOString()
    };
  }
  // Cleanup
  async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }
}

export const db = DatabaseService.getInstance()
export { prisma }