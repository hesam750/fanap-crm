/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/tasks/TasksOverview.tsx
'use client';

import { useState, useEffect } from 'react';

interface Task {
  id: number;
  title: string;
  description: string;
  assignedTo: string;
  assignedToUser?: { name?: string };
  assignedBy: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  dueDate: string;
  checklist: ChecklistItem[];
}

interface ChecklistItem {
  id: number;
  item: string;
  isCompleted: boolean;
}

export default function TasksOverview({ detailed = false }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks'); 
        if (!response.ok) {
          throw new Error('خطا در بارگذاری داده‌ها');
        }
        const data = await response.json();
        setTasks(data);
      } catch (err) {
        setError('خطا در بارگذاری داده‌ها');  
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []); 

  useEffect(() => {
    // subscribe to SSE events
    const es = new EventSource('/api/events');

    es.addEventListener('task:created', (ev: MessageEvent) => {
      try {
        const task = JSON.parse(ev.data);
        setTasks(prev => [task, ...prev]);
      } catch {}
    });

    es.addEventListener('task:updated', (ev: MessageEvent) => {
      try {
        const updated = JSON.parse(ev.data);
        setTasks(prev => prev.map(t => (String(t.id) === String(updated.id) ? { ...t, ...updated } : t)));
      } catch {}
    });

    es.addEventListener('task:deleted', (ev: MessageEvent) => {
      try {
        const { id } = JSON.parse(ev.data);
        setTasks(prev => prev.filter(t => String(t.id) !== String(id)));
      } catch {}
    });

    es.onerror = () => {
      // Optional: show a small reconnect indicator
    };

    return () => {
      es.close();
    };
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'در انتظار';
      case 'in-progress':
        return 'در حال انجام';
      case 'completed':
        return 'تکمیل شده';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900 text-yellow-300';
      case 'in-progress':
        return 'bg-blue-900 text-blue-300';
      case 'completed':
        return 'bg-green-900 text-green-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const getProgressPercentage = (checklist: ChecklistItem[]) => {
    const completed = checklist.filter(item => item.isCompleted).length;
    return Math.round((completed / checklist.length) * 100);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">تسک‌ها</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="text-xs uppercase bg-gray-700">
            <tr>
              <th className="px-4 py-2">عنوان تسک</th>
              <th className="px-4 py-2">تخصیص داده شده به</th>
              {detailed && <th className="px-4 py-2">تخصیص داده شده توسط</th>}
              <th className="px-4 py-2">وضعیت</th>
              <th className="px-4 py-2">پیشرفت</th>
              {detailed && <th className="px-4 py-2">تاریخ ایجاد</th>}
              {detailed && <th className="px-4 py-2">مهلت انجام</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-gray-700">
                <td className="px-4 py-2">
                  <div className="font-medium">{task.title}</div>
                  {detailed && <div className="text-xs text-gray-400">{task.description}</div>}
                </td>
                <td className="px-4 py-2">{task.assignedToUser?.name ?? task.assignedTo}</td>
                {detailed && <td className="px-4 py-2">{task.assignedBy}</td>}
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${getStatusColor(task.status)}`}
                  >
                    {getStatusText(task.status)}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-blue-600"
                      style={{ width: `${getProgressPercentage(task.checklist)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs">{getProgressPercentage(task.checklist)}%</span>
                </td>
                {detailed && (
                  <td className="px-4 py-2">
                    {new Date(task.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                )}
                {detailed && (
                  <td className="px-4 py-2">
                    {new Date(task.dueDate).toLocaleDateString('fa-IR')}
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
