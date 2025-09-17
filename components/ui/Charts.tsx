// src/components/ui/Charts.tsx
'use client';

import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Charts() {
  const tankData = {
    labels: ['مخزن سوخت اصلی', 'مخزن آب ساختمان', 'مخزن آب باغبانی', 'مخزن پیش تصفیه'],
    datasets: [
      {
        label: 'درصد پر بودن',
        data: [70, 75, 20, 90],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const generatorData = {
    labels: ['ژنراتور ۱', 'ژنراتور ۲', 'ژنراتور ۳', 'ژنراتور ۴'],
    datasets: [
      {
        label: 'درصد سوخت',
        data: [65, 45, 80, 25],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        rtl: true,
      },
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">وضعیت مخازن</h3>
        <Doughnut data={tankData} options={options} />
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">وضعیت ژنراتورها</h3>
        <Bar data={generatorData} options={options} />
      </div>
    </div>
  );
}
