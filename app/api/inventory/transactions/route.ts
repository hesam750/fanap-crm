// app/api/inventory/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { validateAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const type = searchParams.get('type') as any
    const itemId = searchParams.get('itemId')
    const transactions = await db.getStockTransactions({ status, type, itemId: itemId || undefined })
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Failed to get inventory transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const devBypass = process.env.NODE_ENV !== 'production'
  const user = devBypass ? null : await validateAuth(request)
  if (!devBypass && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!devBypass && user && !['root','manager','supervisor'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const trx = await db.createStockTransaction(body)
    return NextResponse.json({ transaction: trx }, { status: 201 })
  } catch (error) {
    console.error('Failed to create inventory transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}