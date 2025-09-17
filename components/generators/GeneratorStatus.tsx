/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/generators/GeneratorStatus.tsx
'use client';

import { useState, useEffect } from 'react';

interface Generator {
  id: number;
  name: string;
  capacity: number;
  currentLevel: number;
  percentage: number;
  status: 'active' | 'inactive' | 'maintenance';
  updatedAt: string;
  updatedBy: string;
}

export default function GeneratorStatus({ detailed = false }) {
  const [generators, setGenerators] = useState<Generator[]>([]);
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 useEffect(() => {
    const fetchGenerators = async () => {
      try {
        const response = await fetch('/api/generators'); 
        const data = await response.json();
        setGenerators(data);  
      } catch (err) {
        setError("خطا در بارگذاری داده‌ها");
      } finally {
        setLoading(false);
      }
    };

    fetchGenerators();
  }, []);

  const getAlertLevel = (percentage: number) => {
    if (percentage < 20) return 'critical';
    if (percentage < 30) return 'warning';
    return 'normal';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'فعال';
      case 'inactive':
        return 'غیرفعال';
      case 'maintenance':
        return 'در حال تعمیر';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900 text-green-300';
      case 'inactive':
        return 'bg-gray-700 text-gray-300';
      case 'maintenance':
        return 'bg-yellow-900 text-yellow-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">وضعیت ژنراتورها</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="text-xs uppercase bg-gray-700">
            <tr>
              <th className="px-4 py-2">نام ژنراتور</th>
              <th className="px-4 py-2">ظرفیت (لیتر)</th>
              <th className="px-4 py-2">موجودی (لیتر)</th>
              <th className="px-4 py-2">درصد</th>
              <th className="px-4 py-2">وضعیت</th>
              <th className="px-4 py-2">وضعیت سوخت</th>
              {detailed && <th className="px-4 py-2">آخرین بروزرسانی</th>}
              {detailed && <th className="px-4 py-2">توسط</th>}
            </tr>
          </thead>
          <tbody>
            {generators.map((generator) => (
              <tr key={generator.id} className="border-b border-gray-700">
                <td className="px-4 py-2">{generator.name}</td>
                <td className="px-4 py-2">{generator.capacity.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-2">{generator.currentLevel.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-2">
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        getAlertLevel(generator.percentage) === 'critical'
                          ? 'bg-red-600'
                          : getAlertLevel(generator.percentage) === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${generator.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs">{generator.percentage}%</span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${getStatusColor(generator.status)}`}
                  >
                    {getStatusText(generator.status)}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      getAlertLevel(generator.percentage) === 'critical'
                        ? 'bg-red-900 text-red-300'
                        : getAlertLevel(generator.percentage) === 'warning'
                        ? 'bg-yellow-900 text-yellow-300'
                        : 'bg-green-900 text-green-300'
                    }`}
                  >
                    {getAlertLevel(generator.percentage) === 'critical'
                      ? 'بحرانی'
                      : getAlertLevel(generator.percentage) === 'warning'
                      ? 'هشدار'
                      : 'نرمال'}
                  </span>
                </td>
                {detailed && (
                  <td className="px-4 py-2">
                    {new Date(generator.updatedAt).toLocaleString('fa-IR')}
                  </td>
                )}
                {detailed && (
                  <td className="px-4 py-2">
                    {generator.updatedBy}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
