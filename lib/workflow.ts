import type { InventoryTransactionStatus, StockTransaction } from "./types"

export type WorkflowAction = "approve" | "post" | "reject" | "void"

export const allowedTransitions: Record<InventoryTransactionStatus, InventoryTransactionStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["posted", "rejected", "void"],
  posted: ["void"],
  rejected: [],
  void: [],
}

export function canTransition(from: InventoryTransactionStatus, to: InventoryTransactionStatus): boolean {
  return allowedTransitions[from]?.includes(to) ?? false
}

export function actionToStatus(action: WorkflowAction): InventoryTransactionStatus {
  switch (action) {
    case "approve": return "approved"
    case "post": return "posted"
    case "reject": return "rejected"
    case "void": return "void"
  }
}

export function actorFieldForStatus(status: InventoryTransactionStatus): keyof StockTransaction | undefined {
  if (status === "approved") return "approvedBy"
  if (status === "posted") return "postedBy"
  return undefined
}

// اعتبارسنجی ساده برای انتقال وضعیت‌ها
// این تابع داده فعلی/جدید تراکنش را بررسی می‌کند تا قبل از انتقال وضعیت، شروط پایه رعایت شوند
export function validateForStatusTransition(nextStatus: InventoryTransactionStatus, trx: StockTransaction): string | null {
  // مقدار و اقلام همیشه لازم
  if (!trx.itemId) return "انتخاب کالا الزامی است."
  if (!trx.unit) return "واحد کالا مشخص نیست."
  if (!trx.quantity || trx.quantity <= 0) return "مقدار باید بزرگ‌تر از صفر باشد."

  // قوانین ویژه وضعیت‌ها
  if (nextStatus === "approved") {
    // برای receipt، issue، transfer معمولاً باید مسیر/مکان‌ها معلوم شوند
    if (trx.type === "issue" && !trx.fromLocationId) return "برای حواله خروج، مکان مبدأ الزامی است."
    if (trx.type === "transfer") {
      if (!trx.fromLocationId || !trx.toLocationId) return "برای انتقال، مکان مبدأ و مقصد الزامی است."
      if (trx.fromLocationId === trx.toLocationId) return "مکان مبدأ و مقصد نمی‌تواند یکسان باشد."
    }
  }

  if (nextStatus === "posted") {
    // باید قبلاً approve شده باشد
    if (trx.status !== "approved") return "برای ثبت نهایی، وضعیت باید قبلاً تأیید شده باشد."
    // همان قواعد پایه
    if (trx.type === "issue" && !trx.fromLocationId) return "برای حواله خروج، مکان مبدأ الزامی است."
    if (trx.type === "transfer") {
      if (!trx.fromLocationId || !trx.toLocationId) return "برای انتقال، مکان مبدأ و مقصد الزامی است."
      if (trx.fromLocationId === trx.toLocationId) return "مکان مبدأ و مقصد نمی‌تواند یکسان باشد."
    }
  }

  // برای reject/void معمولاً قواعد اضافی نداریم
  return null
}