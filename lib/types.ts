
export interface User {
  id: string
  name: string
  role: "root" | "manager" | "operator" | "supervisor" | "monitor"
  email: string
  permissions: string[]
  createdAt: Date | string
  isActive: boolean
  avatarUrl?: string
}
export interface PrismaUser {
  id: string
  name: string
  role: "root" | "manager" | "operator" | "supervisor" | "monitor"
  email: string
  permissions: string[]
  createdAt: Date | string
  updatedAt:Date | string
  isActive: boolean
  avatarUrl?: string
}
export interface PrismaHistoricalData {
  id: string
  levelValue: number
  createdAt: Date
  recordedBy: string
  entityType: 'tank' | 'generator'
  tankId: string | null
  generatorId: string | null
  user?: {
    name: string | null
  }
}

export interface PrismaGetDataSummary{
  id: string
  level: number
  timestamp: Date
  recordedBy: string
  entityId: string | null
}
export interface Tank {
  id: string
  name: string
  type: "fuel" | "water"
  capacity: number // in liters
  currentLevel: number // percentage
  location?: string | null
  lastUpdated: Date
  recordedBy: string;
}

export interface Generator {
  id: string
  name: string
  capacity: number // 900L each
  currentLevel: number // percentage
  status: "running" | "stopped" | "maintenance"
  lastUpdated: Date
  location?: string | null // تغییر به string | null | undefined
  recordedBy: string
}

// New: PrismaTank aligned with prisma.schema
export interface PrismaTank {
  id: string
  name: string
  type: "fuel" | "water"
  capacity: number
  currentLevel: number
  location?: string | null
  isActive?: boolean
  lastUpdated: Date
  user?: {
    name: string | null
  }
}

export interface PrismaGenerator {
  id: string
  name: string
  capacity: number // 900L each
  currentLevel: number // percentage
  status: "running" | "stopped" | "maintenance"
  lastUpdated: Date
  location?: string | null // تغییر به string | null | undefined
  user?: { name: string | null }
}

export interface HistoricalDataPoint {
  id: string
  tankId?: string
  generatorId?: string
  level: number
  timestamp: Date
  recordedBy: string
}
// در lib/types.ts
export interface Task {
  id: string
  title: string
  description?: string
  assignedTo: string
  assignedBy: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  dueDate?: Date | string 
  completedAt?: Date
  checklist?: ChecklistItem[]
  operatorNote?: string // added: operator's note visible to root
  createdAt: Date
  updatedAt: Date
  assignedToUser?: User
  assignedByUser?: User
}
export interface PrismaTask {
  id: string
  name:string
  type: "fuel" | "water"
  capacity:number
  currentLevel:string
  location:string
  lastUpdated:Date
  user?:User
  // title: string
  // description?: string
  // assignedTo: string
  // assignedBy: string
  // status: "pending" | "in_progress" | "completed" | "cancelled"
  // priority: "low" | "medium" | "high" | "critical"
  // dueDate?: Date | string // اضافه کردن string به عنوان type ممکن
  // completedAt?: Date
  // checklist?: any[]
  // createdAt: Date
  // updatedAt: Date
  // assignedToUser?: User
  // assignedByUser?: User
}


export interface CreateTaskInput {
  title: string
  description?: string
  assignedTo: string
  assignedBy: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  dueDate?: Date | string
  checklist?: ChecklistItem[]
  operatorNote?: string // added
}


export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  report?: string
}

export interface TaskReport {
  id: string
  checklistItemId: string
  content: string
  createdAt: Date
  createdBy: string
}

export interface Alert {
  id: string
  // Use standardized Prisma enum values
  type: "low_fuel" | "low_water" | "maintenance" | "critical"
  message: string
  severity: "low" | "medium" | "high" | "critical"
  tankId?: string
  generatorId?: string
  createdAt: Date
  acknowledged: boolean
}

export interface HistoryRecord {
  id: string
  tankId?: string
  generatorId?: string
  level: number
  timestamp: Date
  recordedBy: string
}
export interface getTankHistory{
  levelValue : number
  createdAt:Date | string
  user?:User
  recordedBy:string
}
export interface getGeneratorHistory{
  levelValue : number
  createdAt:Date | string
  user?:User
  recordedBy:string
}
export interface SystemSettings {
  id: string
  key: string
  value: string
  updatedBy: string
  updatedAt: Date
  lowAlertThreshold?: number
  criticalAlertThreshold?: number
  autoUpdateInterval?: number
  maintenanceMode?: boolean
  dataRetentionDays?: number
  // RBAC: tab access mapping per role
  tabAccessByRole?: Record<Role, string[]>
}


export interface WeeklyPlan {
  id: string
  weekStart: Date 
  tasks: WeeklyTask[]
  createdBy: string
  createdAt: Date
}

export interface WeeklyTask {
  id: string
  title: string
  description: string
  assignedTo: string[]
  dayOfWeek: number
  timeSlot: string
  priority: "low" | "medium" | "high" | "critical"
  recurring: boolean
  status?: "pending" | "in_progress" | "completed" | "cancelled"
  type?: "maintenance" | "fuel" | "water" | "generator" | "other"
  equipment?: string
  duration?: number
  dueDate?: Date
  completedBy?: string
}
export interface getWeeklyTasks{
  id: string
  title: string
  description: string
  assignedTo: string[]
  dayOfWeek: number
  timeSlot: string
  priority: "low" | "medium" | "high" | "critical"
  recurring: boolean
  status?: "pending" | "in_progress" | "completed" | "cancelled"
  type?: "maintenance" | "fuel" | "water" | "generator" | "other"
  equipment?: string
  duration?: number
  dueDate?: Date
  completedBy?: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "task-assigned" | "alert" | "reminder" | "system"
  read: boolean
  createdAt: Date
  actionUrl?: string
}

// فعالیت‌ها
export interface ActivityLog {
  id: string
  type: string
  description: string
  userId?: string
  userName?: string | null
  metadata?: Record<string, any> | null
  createdAt: Date
}
export type Role = User["role"]

// =========================
// Inventory Management Types
// =========================
export type InventoryCategoryType = "spare" | "tool" | "consumable" | "other"

export interface InventoryCategory {
  id: string
  name: string
  type: InventoryCategoryType
  parentId?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface InventoryItem {
  id: string
  sku: string
  name: string
  description?: string | null
  categoryId: string
  unit: string // مثل: "عدد", "کیلوگرم", "لیتر", "متر"
  minStock?: number | null
  reorderPoint?: number | null
  serializable?: boolean
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Warehouse {
  id: string
  name: string
  code?: string | null
  address?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Location {
  id: string
  warehouseId: string
  name: string
  code?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Supplier {
  id: string
  name: string
  code?: string | null
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export type InventoryTransactionType =
  | "receipt" // ورودی
  | "issue"   // خروجی
  | "return"  // مرجوعی
  | "transfer" // انتقال بین مکان‌ها
  | "adjustment" // اصلاح موجودی

export type InventoryTransactionStatus =
  | "requested"
  | "approved"
  | "posted"
  | "rejected"
  | "void"

export interface StockTransaction {
  id: string
  type: InventoryTransactionType
  itemId: string
  lotNumber?: string | null
  supplierId?: string | null
  quantity: number
  unit: string
  fromLocationId?: string | null
  toLocationId?: string | null
  requestedBy: string
  approvedBy?: string | null
  postedBy?: string | null
  status: InventoryTransactionStatus
  referenceType?: string | null // مثلا: "task", "workOrder"
  referenceId?: string | null
  note?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface StockLevel {
  itemId: string
  locationId: string
  quantity: number
  unit: string
  updatedAt: Date | string
}

export interface Document {
  id: string
  name: string
  url: string
  size: number
  contentType?: string | null
  uploadedAt: Date | string
}
