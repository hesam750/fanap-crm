// src/components/tanks/TankStatus.tsx
'use client';

import { useState, useEffect } from 'react';

interface Tank {
  id: number;
  name: string;
  type: 'fule' | 'water';
  capacity: number;
  currentLevel: number;
  percentage: number;
  updatedAt: string;
}

export default function TankStatus({ detailed = false }) {
  const [tanks, setTanks] = useState<Tank[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTanks = async () => {
      try {
        const response = await fetch('/api/tanks'); 
        if (!response.ok) {
          throw new Error('خطا در بارگذاری داده‌ها');
        }
        const data = await response.json();
        setTanks(data);  
      } catch  {
        setError('خطا در بارگذاری داده‌ها');  
      } finally {
        setLoading(false);
      }
    };

    fetchTanks();
  }, []);

  const getAlertLevel = (percentage: number) => {
    if (percentage < 20) return 'critical';
    if (percentage < 30) return 'warning';
    return 'normal';
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">وضعیت مخازن</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="text-xs uppercase bg-gray-700">
            <tr>
              <th className="px-4 py-2">نام مخزن</th>
              <th className="px-4 py-2">نوع</th>
              <th className="px-4 py-2">ظرفیت (لیتر)</th>
              <th className="px-4 py-2">موجودی (لیتر)</th>
              <th className="px-4 py-2">درصد</th>
              <th className="px-4 py-2">وضعیت</th>
              {detailed && <th className="px-4 py-2">آخرین بروزرسانی</th>}
            </tr>
          </thead>
          <tbody>
            {tanks.map((tank) => (
              <tr key={tank.id} className="border-b border-gray-700">
                <td className="px-4 py-2">{tank.name}</td>
                <td className="px-4 py-2">{tank.type === 'fule' ? 'سوخت' : 'آب'}</td>
                <td className="px-4 py-2">{tank.capacity.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-2">{tank.currentLevel.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-2">
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        getAlertLevel(tank.percentage) === 'critical'
                          ? 'bg-red-600'
                          : getAlertLevel(tank.percentage) === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${tank.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs">{tank.percentage}%</span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      getAlertLevel(tank.percentage) === 'critical'
                        ? 'bg-red-900 text-red-300'
                        : getAlertLevel(tank.percentage) === 'warning'
                        ? 'bg-yellow-900 text-yellow-300'
                        : 'bg-green-900 text-green-300'
                    }`}
                  >
                    {getAlertLevel(tank.percentage) === 'critical'
                      ? 'بحرانی'
                      : getAlertLevel(tank.percentage) === 'warning'
                      ? 'هشدار'
                      : 'نرمال'}
                  </span>
                </td>
                {detailed && (
                  <td className="px-4 py-2">
                    {new Date(tank.updatedAt).toLocaleString('fa-IR')}
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
