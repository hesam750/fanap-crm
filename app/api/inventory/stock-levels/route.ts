// app/api/inventory/stock-levels/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET() {
  try {
    const stockLevels = await db.getStockLevels()
    return NextResponse.json({ stockLevels })
  } catch (error) {
    console.error('Failed to get stock levels:', error)
    return NextResponse.json({ error: 'Failed to fetch stock levels' }, { status: 500 })
  }
}