// app/api/inventory/categories/route.ts
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
    const categories = await db.getInventoryCategories()
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Failed to get inventory categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Allow root and manager to create categories; adjust as needed
  if (!['root','manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { name, type, parentId } = body || {}
    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }
    const category = await db.createInventoryCategory({ name, type, parentId })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Failed to create inventory category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}