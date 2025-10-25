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
  // پاک‌سازی موجودی و انبار برای جلوگیری از تضاد یکتا
  await prisma.stockTransaction.deleteMany()
  await prisma.location.deleteMany()
  await prisma.warehouse.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.inventoryCategory.deleteMany()
  await prisma.supplier.deleteMany()

  console.log('🧹 Cleaned existing data')

  // ایجاد کاربران (طبق درخواست)
  const users = await prisma.user.createMany({
    data: [
      {
        email: 'hossein.karjou@fanap.com',
        password: await hash('root123', 12),
        name: 'حسین کارجو',
        role: Role.root,
        isActive: true,
      },
      {
        email: 'ebrahim.rezai@fanap.com',
        password: await hash('a123', 12),
        name: 'ابراهیم رضایی',
        role: Role.manager,
        isActive: true,
      },
      {
        email: 'mohammad.binandeh@fanap.com',
        password: await hash('os123', 12),
        name: 'محمد بیننده',
        role: Role.operator,
        isActive: true,
      },
      {
        email: 'seyed.taher.mohammadi.asl@fanap.com',
        password: await hash('a123', 12),
        name: 'سید طاهر محمدی اصل',
        role: Role.operator,
        isActive: true,
      },
      {
        email: 'mahdi.rezai@fanap.com',
        password: await hash('a123', 12),
        name: 'مهدی رضایی',
        role: Role.operator,
        isActive: true,
      },
    ],
  })

  console.log('👥 Created users')

  // گرفتن آی دی کاربران
  const userRoot = await prisma.user.findFirst({ where: { email: 'hossein.karjou@fanap.com' } })
  const userManager = await prisma.user.findFirst({ where: { email: 'ebrahim.rezai@fanap.com' } })
  const userOperator = await prisma.user.findFirst({ where: { email: 'mohammad.binandeh@fanap.com' } })

  // ایجاد مخازن (طبق مشخصات پمپ‌خانه)
  const tanks = await prisma.tank.createMany({
    data: [
      // آب - پمپ‌خانه
      { name: 'آب مصرفی', type: TankType.water, capacity: 20000, currentLevel: 80.0, location: 'پمپ خانه', updatedBy: userManager!.id, isActive: true },
      { name: 'آتش‌نشانی', type: TankType.water, capacity: 20000, currentLevel: 85.0, location: 'پمپ خانه', updatedBy: userRoot!.id, isActive: true },
      { name: 'فضای سبز', type: TankType.water, capacity: 10000, currentLevel: 70.0, location: 'پمپ خانه', updatedBy: userManager!.id, isActive: true },
      { name: 'پیش‌تصفیه', type: TankType.water, capacity: 5000, currentLevel: 65.0, location: 'پمپ خانه', updatedBy: userManager!.id, isActive: true },
      { name: 'آب شرب', type: TankType.water, capacity: 1000, currentLevel: 90.0, location: 'پمپ خانه', updatedBy: userRoot!.id, isActive: true },
      // سوخت - ۴ تانکر ۵۰۰۰ لیتری
      { name: 'تانکر سوخت 1', type: TankType.fuel, capacity: 5000, currentLevel: 75.0, location: 'پمپ خانه', updatedBy: userRoot!.id, isActive: true },
      { name: 'تانکر سوخت 2', type: TankType.fuel, capacity: 5000, currentLevel: 60.0, location: 'پمپ خانه', updatedBy: userManager!.id, isActive: true },
      { name: 'تانکر سوخت 3', type: TankType.fuel, capacity: 5000, currentLevel: 55.0, location: 'پمپ خانه', updatedBy: userManager!.id, isActive: true },
      { name: 'تانکر سوخت 4', type: TankType.fuel, capacity: 5000, currentLevel: 50.0, location: 'پمپ خانه', updatedBy: userRoot!.id, isActive: true },
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
        title: 'بررسی سطح تانکر سوخت 1',
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
  const tankFuel = await prisma.tank.findFirst({ where: { name: 'تانکر سوخت 2' } })
  const generatorEmergency = await prisma.generator.findFirst({ where: { name: 'ژنراتور اضطراری' } })

  const alerts = await prisma.alert.createMany({
    data: [
      {
        type: AlertType.low_fuel,
        message: 'سطح تانکر سوخت 2 به زیر ۵۰٪ رسیده است',
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

  // ایجاد داده‌های تاریخی برای ۶۰ روز گذشته (برای تمامی مخازن و ژنراتورها)
  const sampleTank = await prisma.tank.findFirst({ where: { name: 'تانکر سوخت 1' } })
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

  const DAYS = 60 // ۲ ماه گذشته مطابق درخواست

  const allTanks = await prisma.tank.findMany()
  const allGenerators = await prisma.generator.findMany()

  const tankHistorical = allTanks.flatMap((t) =>
    generateTankSeries({
      tankId: t.id,
      days: DAYS,
      startLevel: Math.min(100, Math.max(0, t.currentLevel)),
      dailyConsumptionPctRange: t.type === TankType.fuel ? [0.4, 1.2] : [0.6, 1.6],
      refillEveryDays: t.type === TankType.fuel ? 14 : 7,
      refillToPct: t.type === TankType.fuel ? 85 : 90,
    })
  )

  const generatorHistorical = allGenerators.flatMap((g) =>
    generateGeneratorSeries({
      generatorId: g.id,
      days: DAYS,
      baseLoadPct: 62,
      dailyNoisePct: 12,
    })
  )

  await prisma.historicalData.createMany({
    data: [...tankHistorical, ...generatorHistorical],
  })

  console.log('📊 Created historical data (60 days synthetic series for all entities)')

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
        metadata: { tankId: sampleTank!.id, level: 75.0 },
      },
    ],
  })

  console.log('📝 Created activity logs')

  // ========== Inventory seed ==========
  const catSpare = await prisma.inventoryCategory.create({
    data: { name: 'قطعات یدکی', type: 'spare' }
  })
  const catTool = await prisma.inventoryCategory.create({
    data: { name: 'ابزارآلات', type: 'tool' }
  })

  const itemBearing = await prisma.inventoryItem.create({
    data: {
      sku: 'BRG-6205',
      name: 'بلبرینگ 6205',
      categoryId: catSpare.id,
      unit: 'عدد',
      minStock: 5,
      reorderPoint: 10,
      serializable: false,
      isActive: true,
    }
  })
  const itemWrench = await prisma.inventoryItem.create({
    data: {
      sku: 'WR-10MM',
      name: 'آچار تخت 10mm',
      categoryId: catTool.id,
      unit: 'عدد',
      isActive: true,
    }
  })

  const whCentral = await prisma.warehouse.create({
    data: { name: 'انبار مرکزی', code: 'WH-01', address: 'سایت صنعتی فناپ' }
  })
  const locA1 = await prisma.location.create({
    data: { warehouseId: whCentral.id, name: 'ردیف A - قفسه 1', code: 'A1' }
  })

  const supLocal = await prisma.supplier.create({
    data: { name: 'تامین‌کننده محلی', code: 'SUP-LOCAL', phone: '02112345678' }
  })

  await prisma.stockTransaction.create({
    data: {
      type: 'receipt',
      itemId: itemBearing.id,
      supplierId: supLocal.id,
      quantity: 50,
      unit: 'عدد',
      toLocationId: locA1.id,
      requestedBy: userManager!.id,
      approvedBy: userRoot!.id,
      postedBy: userRoot!.id,
      status: 'posted',
      note: 'ورود اولیه موجودی',
    }
  })

  console.log('📦 Seeded inventory base data')
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