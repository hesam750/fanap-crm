/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AuthService } from "@/lib/auth"
import { Eye, EyeOff, Loader2, Shield, User, Lock, AlertCircle, CheckCircle, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"


interface LoginFormProps {
  onLogin: (user: any) => void
}

export function EnhancedLoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null)
  const { toast } = useToast()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Ensure hydration-safe client-only UI
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  // PWA install prompt on login page
  const [installPromptEvent, setInstallPromptEvent] = useState<any | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  useEffect(() => {
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPromptEvent(e)
      setCanInstall(true)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setInstallPromptEvent(null)
      setCanInstall(false)
    }
    const checkStandalone = () => {
      const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
      const isIosStandalone = (navigator as any).standalone === true
      setIsStandalone(isStandaloneDisplay || isIosStandalone)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    checkStandalone()
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  // instantiate email change handler with component state setters
  const handleEmailChange = createHandleEmailChange(setEmail, setAvatarPreview)

  // const demoAccounts = [
  //   {
  //     role: "super-admin",
  //     email: "root@system.com",
  //     name: "سوپر ادمین",
  //     description: "دسترسی کامل به سیستم",
  //     color: "destructive" as const,
  //     icon: Shield,
  //   },
  //   {
  //     role: "manager",
  //     email: "manager@company.com",
  //     name: "مدیر",
  //     description: "مدیریت عملیات و گزارش‌ها",
  //     color: "default" as const,
  //     icon: User,
  //   },
  //   {
  //     role: "operator",
  //     email: "operator1@company.com",
  //     name: "اپراتور ۱",
  //     description: "ثبت داده‌ها و انجام وظایف",
  //     color: "secondary" as const,
  //     icon: User,
  //   },
  //   {
  //     role: "operator",
  //     email: "operator2@company.com",
  //     name: "اپراتور ۲",
  //     description: "ثبت داده‌ها و انجام وظایف",
  //     color: "secondary" as const,
  //     icon: User,
  //   },
  //   {
  //     role: "supervisor",
  //     email: "supervisor@company.com",
  //     name: "ناظر",
  //     description: "مشاهده گزارش‌ها و داشبورد",
  //     color: "outline" as const,
  //     icon: User,
  //   },
  // ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Simulate network delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 800))

      const auth = AuthService.getInstance()
      const user = await auth.login(email, password)

      if (user) {
        toast({
          title: "ورود موفق",
          description: `خوش آمدید ${user.name}`,
           variant: "default"
        })
        
        onLogin(user)
      } else {
        setError("ایمیل یا رمز عبور اشتباه است")
        toast({
          title: "خطا در ورود",
          description: "لطفاً اطلاعات ورود خود را بررسی کنید",
          variant: "destructive",
        })
      }
    } catch (error) {
      setError("خطا در اتصال به سرور")
    } finally {
      setLoading(false)
    }
  }

  // const handleDemoLogin = async (account: (typeof demoAccounts)[0]) => {
  //   setSelectedDemo(account.email)
  //   setEmail(account.email)
  //   setPassword("123456")

    // Auto-submit after a short delay
  //   setTimeout(async () => {
  //     const auth = AuthService.getInstance()
  //     const user = await auth.login(account.email, "123456")
  //     if (user) {
  //       toast({
  //         title: "ورود با حساب نمونه",
  //         description: `وارد شدید به عنوان ${account.name}`,
  //         variant: "default"
  //       })
  //       onLogin(user)
  //     }
  //   }, 500)
  // }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {/* <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div> */}
          <h1 className="text-3xl font-bold tracking-tight">سیستم مدیریت مخازن</h1>
          <p className="text-muted-foreground">سامانه نظارت و کنترل مخازن سوخت و آب</p>

          {/* Install App button on login page */}
          {mounted && !isStandalone && !installed && (
            <Dialog open={installDialogOpen && !canInstall} onOpenChange={setInstallDialogOpen}>
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      if (canInstall && installPromptEvent) {
                        await installPromptEvent.prompt()
                        const choice = await installPromptEvent.userChoice
                        if (choice && choice.outcome === 'accepted') {
                          setCanInstall(false)
                        }
                      } else {
                        setInstallDialogOpen(true)
                      }
                    } catch (err) {
                      console.log('install error', err)
                    }
                  }}
                >
                  <Download className="mr-1 h-4 w-4" />
                  نصب اپلیکیشن
                </Button>
              </div>
              {!canInstall && (
                <DialogContent className="max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>نصب اپلیکیشن</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium">دسکتاپ (Chrome/Edge)</div>
                      <div className="text-muted-foreground">آیکون نصب کنار نوار آدرس یا منو → Install App</div>
                    </div>
                    <div>
                      <div className="font-medium">اندروید (Chrome)</div>
                      <div className="text-muted-foreground">منوی مرورگر → Add to Home screen</div>
                    </div>
                    <div>
                      <div className="font-medium">iOS (Safari)</div>
                      <div className="text-muted-foreground">دکمه Share → Add to Home Screen</div>
                    </div>
                    <div className="text-xs text-muted-foreground">اگر دکمه نصب مستقیم ندارید، از روش‌های بالا نصب را انجام دهید.</div>
                  </div>
                </DialogContent>
              )}
            </Dialog>
          )}
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center">ورود به سیستم</CardTitle>
            <CardDescription className="text-center">لطفاً اطلاعات ورود خود را وارد کنید</CardDescription>
            {/* Big avatar preview under the description */}
            <div className="flex justify-center pt-3 ">
              <Avatar className="h-24 w-24 ring-2 ring-primary/40 shadow-sm">
                <AvatarImage src={avatarPreview || "/placeholder-user.jpg"} alt="avatar" />
                <AvatarFallback className="text-3xl">
                  {email ? email.charAt(0).toUpperCase() : "A"}
                </AvatarFallback>
              </Avatar>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  آدرس ایمیل
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="example@company.com"
                    className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  رمز عبور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور خود را وارد کنید"
                    className="pr-10 pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 transition-all duration-200 hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    ورود به سیستم
                  </>
                )}
              </Button>
            </form>

            <Separator className="my-6" />

            {/* Demo Accounts */}
            {/* <div className="space-y-3">
              <h3 className="text-sm font-medium text-center text-muted-foreground">حساب‌های نمونه برای آزمایش</h3>
              <div className="grid gap-2">
                {demoAccounts.map((account) => {
                  const Icon = account.icon
                  const isSelected = selectedDemo === account.email

                  return (
                    <Button
                      key={account.email}
                      variant="outline"
                      className={`w-full justify-start h-auto p-3 transition-all duration-200 hover:scale-[1.01] ${
                        isSelected ? "ring-2 ring-primary/50 bg-primary/5" : ""
                      }`}
                      onClick={() => handleDemoLogin(account)}
                      disabled={loading}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-right">
                          <div className="flex items-center justify-between">
                            <Badge variant={account.color} className="text-xs">
                              {account.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{account.email}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{account.description}</p>
                        </div>
                        {isSelected && loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      </div>
                    </Button>
                  )
                })}
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  رمز عبور همه حساب‌ها: <code className="bg-muted px-1 py-0.5 rounded text-xs">123456</code>
                </p>
              </div>
            </div> */}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>سیستم مدیریت مخازن نسخه ۱.۰</p>
          <p>طراحی شده برای نظارت و کنترل بهینه مخازن</p>
        </div>
      </div>
    </div>
  )
}

const createHandleEmailChange = (setEmail: (v: string) => void, setAvatarPreview: (v: string | null) => void) => async (value: string) => {
  setEmail(value)
  // Try to fetch user by email for avatar preview
  try {
    if (value && value.includes("@")) {
      const res = await fetch(`/api/users?email=${encodeURIComponent(value)}`)
      if (res.ok) {
        const data = await res.json()
        const url = data?.user?.avatarUrl as string | undefined
        setAvatarPreview(url || null)
      } else {
        setAvatarPreview(null)
      }
    } else {
      setAvatarPreview(null)
    }
  } catch {
    setAvatarPreview(null)
  }
}
