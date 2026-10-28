import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info';
}

interface Props {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const Toast: React.FC<Props> = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div className={`toast${toast.type === 'success' ? ' success' : ''}`} onClick={() => onRemove(toast.id)}>
      {toast.type === 'success' ? '✓' : 'ℹ'} {toast.text}
    </div>
  );
};

export default Toast;
