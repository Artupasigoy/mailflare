import { writable } from 'svelte/store';

export type ToastKind = 'success' | 'info' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

const toasts = writable<ToastItem[]>([]);
let nextId = 1;

function push(message: string, kind: ToastKind, duration = 3500) {
  const id = nextId++;
  toasts.update((items) => [...items, { id, message, kind }]);
  setTimeout(() => {
    toasts.update((items) => items.filter((item) => item.id !== id));
  }, duration);
  return id;
}

export const toastStore = {
  subscribe: toasts.subscribe,
  success: (message: string) => push(message, 'success'),
  info: (message: string) => push(message, 'info'),
  error: (message: string) => push(message, 'error', 5000),
  dismiss: (id: number) => toasts.update((items) => items.filter((item) => item.id !== id))
};
