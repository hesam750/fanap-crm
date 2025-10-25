// app/api/inventory/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { validateAuth } from '@/lib/auth-middleware'

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!['root','manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id } = await ctx.params
    const updates = await request.json()
    const category = await db.updateInventoryCategory(id, updates)
    if (!category) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    return NextResponse.json({ category })
  } catch (error) {
    console.error('Failed to update inventory category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!['root','manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id } = await ctx.params
    const ok = await db.deleteInventoryCategory(id)
    if (!ok) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Failed to delete inventory category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}