// app/api/inventory/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { validateAuth } from '@/lib/auth-middleware'

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const devBypass = process.env.NODE_ENV !== 'production'
  const user = devBypass ? null : await validateAuth(request)
  if (!devBypass && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!devBypass && user && !['root','manager','supervisor'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id } = await ctx.params
    const updates = await request.json()

    // اعمال قوانین workflow در صورت تغییر وضعیت
    const existing = await db.getStockTransactionById(id)
    if (!existing) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const nextStatus = updates?.status as import('@/lib/types').InventoryTransactionStatus | undefined

    if (nextStatus && nextStatus !== existing.status) {
      const { canTransition, validateForStatusTransition, actorFieldForStatus } = await import('@/lib/workflow')

      if (!canTransition(existing.status, nextStatus)) {
        return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
      }

      // داده ادغام‌شده برای اعتبارسنجی
      const merged = { ...existing, ...updates, status: nextStatus } as import('@/lib/types').StockTransaction
      const validationError = validateForStatusTransition(nextStatus, merged)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      const actorField = actorFieldForStatus(nextStatus)
      const patch: Record<string, any> = { status: nextStatus }
      if (actorField) {
        patch[actorField] = devBypass ? (updates?.[actorField] ?? null) : (user?.id ?? null)
      }

      // سایر فیلدهای قابل بروزرسانی (به جز status/actor ها)
      const { status, approvedBy, postedBy, ...rest } = updates || {}
      const trx = await db.updateStockTransaction(id, { ...rest, ...patch })
      return NextResponse.json({ transaction: trx })
    }

    // اگر وضعیت تغییر نمی‌کند، بروزرسانی ساده
    const trx = await db.updateStockTransaction(id, updates)
    if (!trx) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    return NextResponse.json({ transaction: trx })
  } catch (error) {
    console.error('Failed to update inventory transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}