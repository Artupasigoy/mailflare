import { writable } from 'svelte/store';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean;
}

const initial: ConfirmDialogState = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Ya, lanjutkan',
  cancelLabel: 'Batal',
  danger: false
};

const state = writable<ConfirmDialogState>(initial);
let resolver: ((value: boolean) => void) | null = null;

export const confirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  state.set({ ...initial, ...options, open: true });
  return new Promise<boolean>((resolve) => {
    resolver = resolve;
  });
};

export const confirmDialogStore = {
  subscribe: state.subscribe,
  accept: () => {
    state.update((s) => ({ ...s, open: false }));
    resolver?.(true);
    resolver = null;
  },
  cancel: () => {
    state.update((s) => ({ ...s, open: false }));
    resolver?.(false);
    resolver = null;
  }
};
