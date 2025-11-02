// app/api/inventory/suppliers/route.ts
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
    const suppliers = await db.getSuppliers()
    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('Failed to get suppliers:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!['root','manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { name, code, contactPerson, phone, email, address } = body || {}
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const sup = await db.createSupplier({ name, code, contactPerson, phone, email, address })
    return NextResponse.json({ supplier: sup }, { status: 201 })
  } catch (error) {
    console.error('Failed to create supplier:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}