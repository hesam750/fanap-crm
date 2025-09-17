/* eslint-disable @typescript-eslint/no-unused-vars */
// prisma/seed.ts
import { PrismaClient, Role, TankType, GeneratorStatus, TaskStatus, Priority, AlertType, Severity, EntityType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // پاک کردن داده‌های موجود
  await prisma.activityLog.deleteMany()
  await prisma.historicalData.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.task.deleteMany()
  await prisma.generator.deleteMany()
  await prisma.tank.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Cleaned existing data')

  // ایجاد کاربران
  const users = await prisma.user.createMany({
    data: [
      {
        email: 'root@example.com',
        password: await hash('root123', 12),
        name: 'سوپر ادمین سیستم',
        role: Role.root,
        isActive: true,
      },
      {
        email: 'manager@example.com',
        password: await hash('manager123', 12),
        name: 'مدیر سیستم',
        role: Role.manager,
        isActive: true,
      },
      {
        email: 'operator@example.com',
        password: await hash('operator123', 12),
        name: 'اپراتور سیستم',
        role: Role.operator,
        isActive: true,
      },
      {
        email: 'supervisor@example.com',
        password: await hash('supervisor123', 12),
        name: 'ناظر سیستم',
        role: Role.supervisor,
        isActive: true,
      },
    ],
  })

  console.log('👥 Created users')

  // گرفتن آی دی کاربران
  const userRoot = await prisma.user.findFirst({ where: { email: 'root@example.com' } })
  const userManager = await prisma.user.findFirst({ where: { email: 'manager@example.com' } })
  const userOperator = await prisma.user.findFirst({ where: { email: 'operator@example.com' } })

  // ایجاد مخازن
  const tanks = await prisma.tank.createMany({
    data: [
      {
        name: 'مخزن سوخت اصلی',
        type: TankType.fuel,
        capacity: 10000,
        currentLevel: 85.5,
        location: 'سالن اصلی - قسمت شرقی',
        updatedBy: userRoot!.id,
        isActive: true,
      },
      {
        name: 'مخزن سوخت یدکی',
        type: TankType.fuel,
        capacity: 5000,
        currentLevel: 45.2,
        location: 'سالن ذخیره‌سازی',
        updatedBy: userManager!.id,
        isActive: true,
      },
      {
        name: 'مخزن آب اصلی',
        type: TankType.water,
        capacity: 15000,
        currentLevel: 92.1,
        location: 'ساختمان مرکزی',
        updatedBy: userRoot!.id,
        isActive: true,
      },
      {
        name: 'مخزن آب اضطراری',
        type: TankType.water,
        capacity: 8000,
        currentLevel: 78.3,
        location: 'طبقه همکف',
        updatedBy: userManager!.id,
        isActive: true,
      },
    ],
  })

  console.log('🛢️ Created tanks')

  // ایجاد ژنراتورها
  const generators = await prisma.generator.createMany({
    data: [
      {
        name: 'ژنراتور اصلی',
        capacity: 900,
        currentLevel: 65.4,
        status: GeneratorStatus.running,
        location: 'اتاق ژنراتور اصلی',
        updatedBy: userRoot!.id,
        isActive: true,
      },
      {
        name: 'ژنراتور یدکی',
        capacity: 750,
        currentLevel: 88.9,
        status: GeneratorStatus.stopped,
        location: 'انبار تجهیزات',
        updatedBy: userManager!.id,
        isActive: true,
      },
      {
        name: 'ژنراتور اضطراری',
        capacity: 1200,
        currentLevel: 42.1,
        status: GeneratorStatus.maintenance,
        location: 'ساختمان پشتیبانی',
        updatedBy: userRoot!.id,
        isActive: true,
      },
    ],
  })

  console.log('⚡ Created generators')

  // ایجاد تسک‌ها
  const tasks = await prisma.task.createMany({
    data: [
      {
        title: 'بررسی سطح مخزن سوخت اصلی',
        description: 'بررسی روزانه سطح مخزن و ثبت در سیستم',
        assignedTo: userOperator!.id,
        assignedBy: userManager!.id,
        status: TaskStatus.pending,
        priority: Priority.medium,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        checklist: ['بررسی سطح', 'ثبت در سیستم', 'گزارش مشکل'],
      },
      {
        title: 'تعمیرات ژنراتور اضطراری',
        description: 'تعویض فیلتر و روغن ژنراتور',
        assignedTo: userOperator!.id,
        assignedBy: userRoot!.id,
        status: TaskStatus.in_progress,
        priority: Priority.high,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        checklist: ['تعویض فیلتر', 'تعویض روغن', 'تست عملکرد'],
      },
      {
        title: 'بازرسی ماهانه مخازن',
        description: 'بازرسی کامل تمام مخازن',
        assignedTo: userManager!.id,
        assignedBy: userRoot!.id,
        status: TaskStatus.completed,
        priority: Priority.low,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        checklist: ['بازدید مخازن', 'بررسی اتصالات', 'ثبت گزارش'],
      },
    ],
  })

  console.log('✅ Created tasks')

  // ایجاد وظایف هفتگی
  const weeklyTasks = await prisma.weeklyTask.createMany({
    data: [
      {
        title: 'بازرسی روزانه مخزن سوخت اصلی',
        description: 'چک‌لیست روزانه و ثبت در سیستم',
        assignedTo: [userOperator!.id],
        dayOfWeek: 0, // شنبه
        timeSlot: '09:00',
        priority: 'medium',
        recurring: true,
        status: 'pending',
        type: 'fuel',
        equipment: 'گیج سطح سوخت',
        duration: 30,
      },
      {
        title: 'سرویس ماهانه ژنراتور اصلی',
        description: 'تعویض فیلتر و روغن ژنراتور',
        assignedTo: [userOperator!.id, userManager!.id],
        dayOfWeek: 2, // دوشنبه
        timeSlot: '11:00',
        priority: 'high',
        recurring: true,
        status: 'in_progress',
        type: 'generator',
        equipment: 'فیلتر روغن، روغن موتور',
        duration: 90,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'بررسی فشار آب سیستم',
        description: 'بازرسی هفتگی فشار آب و ثبت نتیجه',
        assignedTo: [userManager!.id],
        dayOfWeek: 4, // چهارشنبه
        timeSlot: '14:30',
        priority: 'low',
        recurring: false,
        status: 'completed',
        type: 'water',
        equipment: 'مانومتر',
        duration: 20,
        completedBy: userManager!.id,
      },
    ],
  })

  console.log('🗓️ Created weekly tasks')

  // ایجاد هشدارها
  const tankFuel = await prisma.tank.findFirst({ where: { name: 'مخزن سوخت یدکی' } })
  const generatorEmergency = await prisma.generator.findFirst({ where: { name: 'ژنراتور اضطراری' } })

  const alerts = await prisma.alert.createMany({
    data: [
      {
        type: AlertType.low_fuel,
        message: 'سطح مخزن سوخت یدکی به زیر ۵۰٪ رسیده است',
        severity: Severity.medium,
        tankId: tankFuel!.id,
        acknowledged: false,
      },
      {
        type: AlertType.maintenance,
        message: 'ژنراتور اضطراری نیاز به تعمیرات دارد',
        severity: Severity.high,
        generatorId: generatorEmergency!.id,
        acknowledged: true,
        acknowledgedBy: userManager!.id,
        acknowledgedAt: new Date(),
      },
      {
        type: AlertType.critical,
        message: 'سیستم با موفقیت راه‌اندازی شد',
        severity: Severity.low,
        acknowledged: true,
        acknowledgedBy: userRoot!.id,
        acknowledgedAt: new Date(),
      },
    ],
  })

  console.log('🚨 Created alerts')

  // ایجاد داده‌های تاریخی (سری زمانی مبتنی بر الگوی مصرف قبض‌ها)
  const tankMain = await prisma.tank.findFirst({ where: { name: 'مخزن سوخت اصلی' } })
  const waterMain = await prisma.tank.findFirst({ where: { name: 'مخزن آب اصلی' } })
  const generatorMain = await prisma.generator.findFirst({ where: { name: 'ژنراتور اصلی' } })

  // توابع کمکی برای تولید سری زمانی: سطح مخزن به صورت روزانه کاهش می‌یابد و هر چند روز یکبار شارژ/پر می‌شود
  const rand = (min: number, max: number) => Math.random() * (max - min) + min

  function generateTankSeries(params: {
    tankId: string
    days: number
    startLevel: number // درصد 0..100
    dailyConsumptionPctRange: [number, number] // درصد کاهش روزانه
    refillEveryDays: number // هر چند روز یکبار شارژ شود
    refillToPct: number // درصد سطح پس از شارژ
  }) {
    const { tankId, days, startLevel, dailyConsumptionPctRange, refillEveryDays, refillToPct } = params
    const data: any[] = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let level = startLevel
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)

      // هر refillEveryDays روز یکبار شارژ مخزن
      if (i > 0 && i % refillEveryDays === 0) {
        level = Math.min(100, refillToPct)
      } else {
        // مصرف روزانه با کمی نوفه تصادفی
        const dec = rand(dailyConsumptionPctRange[0], dailyConsumptionPctRange[1])
        level = Math.max(0, level - dec)
      }

      data.push({
        entityType: EntityType.tank,
        tankId,
        levelValue: parseFloat(level.toFixed(2)),
        recordedBy: userOperator!.id,
        createdAt: d,
      })
    }
    return data
  }

  function generateGeneratorSeries(params: {
    generatorId: string
    days: number
    baseLoadPct: number
    dailyNoisePct: number
  }) {
    const { generatorId, days, baseLoadPct, dailyNoisePct } = params
    const data: any[] = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      // بار ژنراتور حول یک مقدار پایه با نوسان روزانه (نماینده الگوی مصرف برق)
      const noise = rand(-dailyNoisePct, dailyNoisePct)
      const load = Math.max(0, Math.min(100, baseLoadPct + noise))
      data.push({
        entityType: EntityType.generator,
        generatorId,
        levelValue: parseFloat(load.toFixed(2)),
        recordedBy: userOperator!.id,
        createdAt: d,
      })
    }
    return data
  }

  const DAYS = 180 // ۶ ماه گذشته برای داشتن روند معنادار

  const fuelSeries = tankMain
    ? generateTankSeries({
        tankId: tankMain.id,
        days: DAYS,
        startLevel: 95,
        dailyConsumptionPctRange: [0.4, 1.2], // سوخت روزانه مصرف می‌شود
        refillEveryDays: 14,
        refillToPct: 85,
      })
    : []

  const waterSeries = waterMain
    ? generateTankSeries({
        tankId: waterMain.id,
        days: DAYS,
        startLevel: 98,
        dailyConsumptionPctRange: [0.6, 1.6], // آب با شیب بیشتری مصرف می‌شود
        refillEveryDays: 7,
        refillToPct: 90,
      })
    : []

  const generatorSeries = generatorMain
    ? generateGeneratorSeries({
        generatorId: generatorMain.id,
        days: DAYS,
        baseLoadPct: 62, // بار پایه معادل مصرف معمول برق
        dailyNoisePct: 12, // نوسان روزانه
      })
    : []

  await prisma.historicalData.createMany({
    data: [...fuelSeries, ...waterSeries, ...generatorSeries],
  })

  console.log('📊 Created historical data (6 months synthetic series)')

  // ایجاد لاگ فعالیت
  const activityLogs = await prisma.activityLog.createMany({
    data: [
      {
        type: 'system_start',
        description: 'سیستم با موفقیت راه‌اندازی شد',
        userId: userRoot!.id,
        metadata: { version: '1.0.0' },
      },
      {
        type: 'user_login',
        description: 'کاربر وارد سیستم شد',
        userId: userManager!.id,
        metadata: { ip: '192.168.1.100' },
      },
      {
        type: 'tank_update',
        description: 'سطح مخزن به روز شد',
        userId: userOperator!.id,
        metadata: { tankId: tankMain!.id, level: 85.5 },
      },
    ],
  })

  console.log('📝 Created activity logs')
  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })