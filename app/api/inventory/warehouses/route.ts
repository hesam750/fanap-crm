// app/api/inventory/warehouses/route.ts
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
    const warehouses = await db.getWarehouses()
    return NextResponse.json({ warehouses })
  } catch (error) {
    console.error('Failed to get warehouses:', error)
    return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const devBypass = process.env.NODE_ENV !== 'production'
  const user = devBypass ? null : await validateAuth(request)
  if (!devBypass && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!devBypass && user && !['root','manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { name, code, address } = body || {}
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (code) {
      const existing = await db.getWarehouseByCode(code)
      if (existing) {
        return NextResponse.json({ error: 'warehouse code already exists' }, { status: 409 })
      }
    }
    const wh = await db.createWarehouse({ name, code, address })
    return NextResponse.json({ warehouse: wh }, { status: 201 })
  } catch (error) {
    console.error('Failed to create warehouse:', error)
    return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 })
  }
}