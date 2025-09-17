// app/weekly-plan/page.tsx
"use client"

import { WeeklyPlanningPanel } from "@/components/weekly-planning-panel"
import { useState, useEffect } from "react"
import type { WeeklyTask, User, Tank, Generator } from "@/lib/types"

export default function WeeklyPlanPage() {
  const [currentUser, setCurrentUser] = useState<User>({
    id: "1",
    name: "مدیر سیستم",
    role: "manager",
    email: "admin@example.com",
    permissions: [],
    createdAt: new Date(),
    isActive: true
  })
  
  const [users, setUsers] = useState<User[]>([])
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])

  useEffect(() => {
  
    fetchUsers()
    fetchWeeklyTasks()
    fetchTanks()
    fetchGenerators()
  }, [])

  const fetchUsers = async () => {
  
    const mockUsers: User[] = [
      {
        id: "1",
        name: "مدیر سیستم",
        role: "manager",
        email: "admin@example.com",
        permissions: [],
        createdAt: new Date(),
        isActive: true
      },
      {
        id: "2",
        name: "اپراتور ۱",
        role: "operator",
        email: "operator1@example.com",
        permissions: [],
        createdAt: new Date(),
        isActive: true
      },
      {
        id: "3",
        name: "اپراتور ۲",
        role: "operator",
        email: "operator2@example.com",
        permissions: [],
        createdAt: new Date(),
        isActive: true
      }
    ]
    setUsers(mockUsers)
  }

  const fetchWeeklyTasks = async () => {
  
    const mockTasks: WeeklyTask[] = [
      {
        id: "1",
        title: "بررسی مخزن سوخت اصلی",
        description: "کنترل سطح سوخت و بررسی نشتی",
        assignedTo: ["2"],
        dayOfWeek: 0, // شنبه
        timeSlot: "09:00",
        priority: "high",
        recurring: true,
        status: "pending",
        type: "fuel"
      },
      {
        id: "2",
        title: "سرویس ژنراتور پشتیبان",
        description: "تعویض فیلتر و بررسی عملکرد",
        assignedTo: ["3"],
        dayOfWeek: 2, // دوشنبه
        timeSlot: "11:00",
        priority: "medium",
        recurring: false,
        status: "pending",
        type: "generator"
      }
    ]
    setWeeklyTasks(mockTasks)
  }

  const fetchTanks = async () => {
    
    const mockTanks: Tank[] = [
      {
        id: "1",
        name: "مخزن سوخت اصلی",
        type: "fuel",
        capacity: 10000,
        currentLevel: 75,
        location: "محوطه جنوبی",
        lastUpdated: new Date(),
        recordedBy: "1"
      },
      {
        id: "2",
        name: "مخزن آب خنک‌کننده",
        type: "water",
        capacity: 5000,
        currentLevel: 60,
        location: "کنار ژنراتور",
        lastUpdated: new Date(),
        recordedBy: "1"
      }
    ]
    setTanks(mockTanks)
  }

  const fetchGenerators = async () => {
   
    const mockGenerators: Generator[] = [
      {
        id: "1",
        name: "ژنراتور اصلی",
        capacity: 900,
        currentLevel: 85,
        status: "running",
        location: "اتاق ژنراتور",
        lastUpdated: new Date(),
        recordedBy: "1"
      },
      {
        id: "2",
        name: "ژنراتور پشتیبان",
        capacity: 900,
        currentLevel: 90,
        status: "stopped",
        location: "اتاق ژنراتور",
        lastUpdated: new Date(),
        recordedBy: "1"
      }
    ]
    setGenerators(mockGenerators)
  }

  const handleCreateTask = async (task: Omit<WeeklyTask, "id">) => {
   
    const newTask: WeeklyTask = {
      ...task,
      id: Math.random().toString(36).substr(2, 9),
    }
    setWeeklyTasks([...weeklyTasks, newTask])
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<WeeklyTask>) => {
   
    setWeeklyTasks(weeklyTasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ))
  }

  const handleTaskClick = (task: WeeklyTask) => {
    console.log("Task clicked:", task)
  
  }

  return (
    <div className="container mx-auto py-6">
      <WeeklyPlanningPanel
        currentUser={currentUser}
        users={users}
        weeklyTasks={weeklyTasks}
        tanks={tanks}
        generators={generators}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
        onTaskClick={handleTaskClick}
      />
    </div>
  )
}