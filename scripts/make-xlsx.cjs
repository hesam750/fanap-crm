#!/usr/bin/env node
/*
 * ساخت فایل Excel از CSV برای جدول تطبیق نقشه برق
 * ورودی: docs/cross-reference.csv
 * خروجی: docs/cross-reference.xlsx
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const csvPath = path.join(__dirname, '..', 'docs', 'cross-reference.csv');
const xlsxPath = path.join(__dirname, '..', 'docs', 'cross-reference.xlsx');

function makeWorkbookFromCSV(csvFile) {
  const csv = fs.readFileSync(csvFile, 'utf8');
  const wb = xlsx.read(csv, { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // تنظیم عرض ستون‌ها برای خوانایی بهتر
  ws['!cols'] = [
    { wch: 6 },   // صفحه
    { wch: 20 },  // عنوان/عنصر
    { wch: 12 },  // آدرس ترمینال
    { wch: 12 },  // نوع فرمان
    { wch: 10 },  // نوع کنتاکت
    { wch: 12 },  // ولتاژ موجود
    { wch: 18 },  // رله پیشنهادی
    { wch: 22 },  // وضعیت فعلی
    { wch: 28 },  // اصلاح پیشنهادی
    { wch: 12 },  // صفحه اصلاح
    { wch: 14 },  // مبدا ترمینال
    { wch: 14 },  // مقصد ترمینال
    { wch: 30 },  // توضیحات
  ];

  // افزودن فیلتر خودکار به سطر اول (Excel AutoFilter)
  const range = xlsx.utils.decode_range(ws['!ref']);
  ws['!autofilter'] = { ref: xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };

  return wb;
}

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }
  const wb = makeWorkbookFromCSV(csvPath);
  xlsx.writeFile(wb, xlsxPath);
  console.log('Excel generated at:', xlsxPath);
}

if (require.main === module) {
  main();
}