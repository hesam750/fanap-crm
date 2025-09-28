export class PersianCalendar {
  static getWeekStart(date: Date): Date {
    // Start of week should be Saturday (0 = Saturday in our app's mapping)
    // JS getDay(): 0=Sunday ... 6=Saturday
    // Days since Saturday = (day + 1) % 7
    const d = new Date(date)
    const day = d.getDay()
    const daysSinceSaturday = (day + 1) % 7
    d.setDate(d.getDate() - daysSinceSaturday)
    d.setHours(0, 0, 0, 0)
    return d
  }

  static getWeekDays(startDate: Date): Date[] {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    return days
  }

  static getWeekdayName(date: Date): string {
    // نام روز هفته بر اساس تقویم شمسی
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long" }).format(date)
  }

  static formatPersianDate(date: Date, format: "short" | "long" = "short"): string {
    // نمایش تاریخ به‌صورت کاملاً شمسی با اعداد فارسی
    const optionsShort: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" }
    const optionsLong: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", format === "short" ? optionsShort : optionsLong).format(date)
  }

  static convertToPersianDay(gregorianDay: number): number {
    // Convert Gregorian day (0=Sunday) to Persian day (0=Saturday)
    return (gregorianDay + 1) % 7
  }
}