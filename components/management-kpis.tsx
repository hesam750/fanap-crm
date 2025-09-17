'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, DropletIcon, FlameIcon, ZapIcon, AlertTriangleIcon } from "lucide-react";

interface KPIsSummaryData {
  timeRange: number;
  summary: {
    fuel: {
      average: number;
      trend: number;
      efficiency: number;
      daysRemaining: number;
      totalCapacity: number;
    };
    water: {
      average: number;
      trend: number;
      efficiency: number;
      daysRemaining: number;
      totalCapacity: number;
    };
    generator: {
      performance: number;
      totalCapacity: number;
      averagesByGenerator: Record<string, number>;
    };
    alerts: {
      average: number;
      trend: number;
    };
  };
  timestamp: string;
}

interface AggregatedKPIsData {
  aggregation: "daily" | "weekly" | "monthly";
  timeRange: number;
  kpis: Array<{
    period: string;
    startDate: string;
    endDate: string;
    consumption: {
      fuel: {
        average: number;
        total: number;
        efficiency: number;
      };
      water: {
        average: number;
        total: number;
        efficiency: number;
      };
      generator: {
        averages: Record<string, number>;
        total: number;
        performance: number;
      };
    };
    alerts: number;
  }>;
  timestamp: string;
}

export function ManagementKPIs() {
  const [timeRange, setTimeRange] = useState<string>("30");
  const [aggregation, setAggregation] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [summaryData, setSummaryData] = useState<KPIsSummaryData | null>(null);
  const [aggregatedData, setAggregatedData] = useState<AggregatedKPIsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // دریافت داده‌های خلاصه KPI
  useEffect(() => {
    const fetchSummaryData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/analytics/kpis/summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeRange }),
        });

        if (!response.ok) {
          throw new Error(`خطا در دریافت داده‌ها: ${response.status}`);
        }

        const data = await response.json();
        setSummaryData(data);
      } catch (err) {
        console.error('خطا در دریافت داده‌های خلاصه KPI:', err);
        setError('خطا در دریافت داده‌های خلاصه. لطفاً دوباره تلاش کنید.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [timeRange]);

  // دریافت داده‌های تجمیعی KPI
  useEffect(() => {
    const fetchAggregatedData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/analytics/kpis/aggregated', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeRange, aggregation }),
        });

        if (!response.ok) {
          throw new Error(`خطا در دریافت داده‌ها: ${response.status}`);
        }

        const data = await response.json();
        setAggregatedData(data);
      } catch (err) {
        console.error('خطا در دریافت داده‌های تجمیعی KPI:', err);
        setError('خطا در دریافت داده‌های تجمیعی. لطفاً دوباره تلاش کنید.');
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedData();
  }, [timeRange, aggregation]);

  // نمایش آیکون روند بر اساس مقدار
  const renderTrendIcon = (trend: number) => {
    if (trend > 5) return <ArrowUpIcon className="h-4 w-4 text-red-500" />;
    if (trend < -5) return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
    return <ArrowRightIcon className="h-4 w-4 text-yellow-500" />;
  };

  // فرمت‌کننده اعداد به فارسی
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toLocaleString('fa-IR', { maximumFractionDigits: decimals });
  };

  // تبدیل درصد به کلاس رنگ
  const getEfficiencyColorClass = (efficiency: number): string => {
    if (efficiency >= 80) return "text-green-500";
    if (efficiency >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-4 rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">شاخص‌های کلیدی عملکرد مدیریتی</h2>
        <div className="flex space-x-4 space-x-reverse">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="بازه زمانی" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">۷ روز گذشته</SelectItem>
              <SelectItem value="30">۳۰ روز گذشته</SelectItem>
              <SelectItem value="90">۹۰ روز گذشته</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* کارت‌های خلاصه KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* کارت مصرف سوخت */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مصرف سوخت</CardTitle>
            <FlameIcon className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loading || !summaryData ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="text-2xl font-bold">
                    {formatNumber(summaryData.summary.fuel.average)} لیتر
                  </div>
                  <div className="flex items-center">
                    {renderTrendIcon(summaryData.summary.fuel.trend)}
                    <span className="text-xs text-muted-foreground mr-1">
                      {formatNumber(Math.abs(summaryData.summary.fuel.trend))}%
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>بهره‌وری:</span>
                    <span className={getEfficiencyColorClass(summaryData.summary.fuel.efficiency)}>
                      {formatNumber(summaryData.summary.fuel.efficiency)}%
                    </span>
                  </div>
                  <Progress value={summaryData.summary.fuel.efficiency} className="h-1" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  تخمین روزهای باقی‌مانده: <span className="font-medium">{formatNumber(summaryData.summary.fuel.daysRemaining)} روز</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* کارت مصرف آب */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مصرف آب</CardTitle>
            <DropletIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading || !summaryData ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="text-2xl font-bold">
                    {formatNumber(summaryData.summary.water.average)} لیتر
                  </div>
                  <div className="flex items-center">
                    {renderTrendIcon(summaryData.summary.water.trend)}
                    <span className="text-xs text-muted-foreground mr-1">
                      {formatNumber(Math.abs(summaryData.summary.water.trend))}%
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>بهره‌وری:</span>
                    <span className={getEfficiencyColorClass(summaryData.summary.water.efficiency)}>
                      {formatNumber(summaryData.summary.water.efficiency)}%
                    </span>
                  </div>
                  <Progress value={summaryData.summary.water.efficiency} className="h-1" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  تخمین روزهای باقی‌مانده: <span className="font-medium">{formatNumber(summaryData.summary.water.daysRemaining)} روز</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* کارت عملکرد ژنراتور */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عملکرد ژنراتور</CardTitle>
            <ZapIcon className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loading || !summaryData ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(summaryData.summary.generator.performance)}%
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>کارایی:</span>
                    <span className={getEfficiencyColorClass(summaryData.summary.generator.performance)}>
                      {formatNumber(summaryData.summary.generator.performance)}%
                    </span>
                  </div>
                  <Progress value={summaryData.summary.generator.performance} className="h-1" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  ظرفیت کل: <span className="font-medium">{formatNumber(summaryData.summary.generator.totalCapacity)} کیلووات</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* کارت هشدارها */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">هشدارها</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading || !summaryData ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="text-2xl font-bold">
                    {formatNumber(summaryData.summary.alerts.average, 0)} در روز
                  </div>
                  <div className="flex items-center">
                    {renderTrendIcon(summaryData.summary.alerts.trend)}
                    <span className="text-xs text-muted-foreground mr-1">
                      {formatNumber(Math.abs(summaryData.summary.alerts.trend))}%
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {summaryData.summary.alerts.trend > 0 ? (
                    <span className="text-red-500">افزایش هشدارها نسبت به دوره قبل</span>
                  ) : (
                    <span className="text-green-500">کاهش هشدارها نسبت به دوره قبل</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* نمودارهای تجمیعی */}
      <Card>
        <CardHeader>
          <CardTitle>روند مصرف تجمیعی</CardTitle>
          <CardDescription>نمایش روند مصرف بر اساس دوره‌های زمانی</CardDescription>
          <div className="flex space-x-2 space-x-reverse">
            <Tabs value={aggregation} onValueChange={(value: string) => setAggregation(value as "daily" | "weekly" | "monthly")}>
              <TabsList>
                <TabsTrigger value="daily">روزانه</TabsTrigger>
                <TabsTrigger value="weekly">هفتگی</TabsTrigger>
                <TabsTrigger value="monthly">ماهانه</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading || !aggregatedData ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="space-y-8">
              {/* جدول داده‌های تجمیعی */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-4">دوره</th>
                      <th className="text-right py-2 px-4">مصرف سوخت</th>
                      <th className="text-right py-2 px-4">بهره‌وری سوخت</th>
                      <th className="text-right py-2 px-4">مصرف آب</th>
                      <th className="text-right py-2 px-4">بهره‌وری آب</th>
                      <th className="text-right py-2 px-4">عملکرد ژنراتور</th>
                      <th className="text-right py-2 px-4">هشدارها</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedData.kpis.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4">{item.period}</td>
                        <td className="py-2 px-4">{formatNumber(item.consumption.fuel.average)} لیتر</td>
                        <td className="py-2 px-4">
                          <span className={getEfficiencyColorClass(item.consumption.fuel.efficiency)}>
                            {formatNumber(item.consumption.fuel.efficiency)}%
                          </span>
                        </td>
                        <td className="py-2 px-4">{formatNumber(item.consumption.water.average)} لیتر</td>
                        <td className="py-2 px-4">
                          <span className={getEfficiencyColorClass(item.consumption.water.efficiency)}>
                            {formatNumber(item.consumption.water.efficiency)}%
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <span className={getEfficiencyColorClass(item.consumption.generator.performance)}>
                            {formatNumber(item.consumption.generator.performance)}%
                          </span>
                        </td>
                        <td className="py-2 px-4">{formatNumber(item.alerts, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}