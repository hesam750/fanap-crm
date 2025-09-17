import { useState, useCallback } from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

interface Toast {
  title: string;
  description: string;
  variant: ToastVariant;
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const toastFn = useCallback((t: Toast) => {
    const next = { ...t, variant: t.variant ?? 'default' } as Toast;
    setToast(next);
    setTimeout(() => {
      setToast(null); 
    }, 5000);
  }, []);

  return { toast: toastFn };
}
