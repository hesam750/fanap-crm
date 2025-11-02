// app/api/inventory/stock-levels/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { validateAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  const devBypass = process.env.NODE_ENV !== 'production'
  const user = devBypass ? null : await validateAuth(request)
  if (!devBypass && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!devBypass && user && !['root','manager','supervisor','operator'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const stockLevels = await db.getStockLevels()
    return NextResponse.json({ stockLevels })
  } catch (error) {
    console.error('Failed to get stock levels:', error)
    return NextResponse.json({ error: 'Failed to fetch stock levels' }, { status: 500 })
  }
}