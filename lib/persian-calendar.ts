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
    const days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
    return days[date.getDay()];
  }

  static formatPersianDate(date: Date, format: "short" | "long" = "short"): string {
    // This is a simplified version - in a real app you'd use a proper Persian date library
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    if (format === "short") {
      return `${year}/${month}/${day}`;
    } else {
      const monthNames = [
        "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
        "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
      ];
      return `${day} ${monthNames[month - 1]} ${year}`;
    }
  }

  static convertToPersianDay(gregorianDay: number): number {
    // Convert Gregorian day (0=Sunday) to Persian day (0=Saturday)
    return (gregorianDay + 1) % 7;
  }
}