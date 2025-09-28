export class PersianCalendar {
  static getWeekStart(date: Date): Date {
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 6 ? 0 : 1); // Adjust for Saturday as first day
    return new Date(date.setDate(diff));
  }

  static getWeekDays(startDate: Date): Date[] {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  }

  static getWeekdayName(date: Date): string {
    // نام روز هفته بر اساس تقویم شمسی
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long" }).format(date);
  }

  static formatPersianDate(date: Date, format: "short" | "long" = "short"): string {
    // نمایش تاریخ به‌صورت کاملاً شمسی با اعداد فارسی
    const optionsShort: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
    const optionsLong: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", format === "short" ? optionsShort : optionsLong).format(date);
  }

  static convertToPersianDay(gregorianDay: number): number {
    // Convert Gregorian day (0=Sunday) to Persian day (0=Saturday)
    return (gregorianDay + 1) % 7;
  }
}