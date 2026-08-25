export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let nextId = 1;

/** Notificações efémeras, que confirmam acções sem interromper o trabalho. */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => []);

  function push(type: Toast['type'], message: string, durationMs = 4000): void {
    const id = nextId++;
    toasts.value = [...toasts.value, { id, type, message }];
    setTimeout(() => dismiss(id), durationMs);
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  return {
    toasts: readonly(toasts),
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message, 6000),
    info: (message: string) => push('info', message),
    dismiss,
  };
}
