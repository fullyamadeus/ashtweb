'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from './language-provider';

export function Modal({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useLanguage();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title"
    onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}
    onClick={e => { if (e.target === ref.current && !busy) onClose(); }}>
    <div className="modal-inner"><div className="modal-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label={t.close} onClick={onClose} disabled={busy}><X size={18}/></button></div>{children}</div>
  </dialog>;
}
