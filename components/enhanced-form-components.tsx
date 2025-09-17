"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  description?: string
  success?: boolean
}

export function FormField({ label, error, required, children, description, success }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label className={cn("text-sm font-medium", error && "text-destructive", success && "text-green-600")}>
        {label}
        {required && <span className="text-destructive mr-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          {description}
        </p>
      )}
      <div className="relative">
        {children}
        {success && (
          <CheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
        {error && (
          <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-destructive" />
        )}
      </div>
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  success?: boolean
  description?: string
  icon?: React.ReactNode
}

export function EnhancedInput({ label, error, success, description, icon, className, ...props }: EnhancedInputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <FormField label={label} error={error} success={success} description={description} required={props.required}>
      <div className="relative">
        {icon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">{icon}</div>
        )}
        <Input
          className={cn(
            "transition-all duration-200",
            icon && "pr-10",
            (success || error) && "pl-10",
            focused && "ring-2 ring-primary/20",
            error && "border-destructive focus:ring-destructive/20",
            success && "border-green-500 focus:ring-green-500/20",
            className,
          )}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </div>
    </FormField>
  )
}

interface EnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  success?: boolean
  description?: string
  maxLength?: number
}

export function EnhancedTextarea({
  label,
  error,
  success,
  description,
  maxLength,
  className,
  ...props
}: EnhancedTextareaProps) {
  const [focused, setFocused] = useState(false)
  const [charCount, setCharCount] = useState(0)

  return (
    <FormField label={label} error={error} success={success} description={description} required={props.required}>
      <div className="space-y-2">
        <Textarea
          className={cn(
            "transition-all duration-200 resize-none",
            focused && "ring-2 ring-primary/20",
            error && "border-destructive focus:ring-destructive/20",
            success && "border-green-500 focus:ring-green-500/20",
            className,
          )}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setCharCount(e.target.value.length)
            props.onChange?.(e)
          }}
          maxLength={maxLength}
          {...props}
        />
        {maxLength && (
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {charCount} / {maxLength} کاراکتر
            </span>
            <Progress value={(charCount / maxLength) * 100} className="w-20 h-1" />
          </div>
        )}
      </div>
    </FormField>
  )
}

interface EnhancedSelectProps {
  label: string
  error?: string
  success?: boolean
  description?: string
  placeholder?: string
  options: { value: string; label: string; disabled?: boolean }[]
  value?: string
  onValueChange?: (value: string) => void
  required?: boolean
}

export function EnhancedSelect({
  label,
  error,
  success,
  description,
  placeholder,
  options,
  value,
  onValueChange,
  required,
}: EnhancedSelectProps) {
  return (
    <FormField label={label} error={error} success={success} description={description} required={required}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "transition-all duration-200",
            error && "border-destructive focus:ring-destructive/20",
            success && "border-green-500 focus:ring-green-500/20",
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  className,
  variant = "default",
  size = "default",
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={cn("transition-all duration-200 hover:scale-[1.02]", className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          {loadingText || "در حال پردازش..."}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

interface StatusBadgeProps {
  status: "success" | "error" | "warning" | "info" | "pending"
  children: React.ReactNode
  pulse?: boolean
}

export function StatusBadge({ status, children, pulse }: StatusBadgeProps) {
  const variants = {
    success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100",
    error: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100",
    info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100",
    pending: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-100",
  }

  return (
    <Badge className={cn("border transition-all duration-200", variants[status], pulse && "animate-pulse")}>
      {children}
    </Badge>
  )
}
