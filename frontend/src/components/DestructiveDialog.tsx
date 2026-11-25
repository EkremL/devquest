import { useEffect, useId, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import './destructive-dialog.css'

interface Props {
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DestructiveDialog({title, description, cancelLabel, confirmLabel, pending, onCancel, onConfirm}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    cancel.current?.focus()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} className="dq-danger-dialog" role="alertdialog" aria-labelledby={id}
    aria-describedby={id+'-description'} aria-busy={pending}
    onCancel={event => { event.preventDefault(); if (!pending) onCancel() }}>
    <span className="dq-danger-icon"><Trash2 size={21} aria-hidden="true"/></span>
    <h2 id={id}>{title}</h2>
    <p id={id+'-description'}>{description}</p>
    <div className="dq-dialog-actions">
      <button ref={cancel} type="button" className="secondary-button" disabled={pending} onClick={onCancel}>{cancelLabel}</button>
      <button type="button" className="dq-danger-confirm" disabled={pending} onClick={onConfirm}>{pending?'Discarding…':confirmLabel}</button>
    </div>
  </dialog>
}
