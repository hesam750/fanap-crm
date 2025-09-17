/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AuthService } from "@/lib/auth"

interface LoginFormProps {
  onLogin: (user: any) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const auth = AuthService.getInstance()
    const user = auth.login(email, password)

    if (user) {
      onLogin(user)
    } else {
      setError("ایمیل یا رمز عبور اشتباه است")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">سیستم مدیریت مخازن</CardTitle>
          <CardDescription>وارد حساب کاربری خود شوید</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور خود را وارد کنید"
                required
              />
            </div>
            {error && <div className="text-destructive text-sm text-center">{error}</div>}
            <Button type="submit" className="w-full">
              ورود
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>حساب‌های آزمایشی:</p>
            <p>مدیر: manager@company.com</p>
            <p>اپراتور: operator1@company.com</p>
            <p>ناظر: supervisor@company.com</p>
            <p>رمز عبور: 123456</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
