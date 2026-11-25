import { useEffect, useId, useRef, type RefObject } from 'react'
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

interface ConfirmationProps extends Props {
  destructive?: boolean
  note?: string
  pendingLabel?: string
  confirmDisabled?: boolean
  returnFocus?: RefObject<HTMLButtonElement | null>
  fallbackFocus?: RefObject<HTMLElement | null>
}

export function ConfirmationDialog({title, description, cancelLabel, confirmLabel, pending, onCancel, onConfirm,
  destructive = false, note, pendingLabel = 'Submitting…', confirmDisabled = false, returnFocus, fallbackFocus}: ConfirmationProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    cancel.current?.focus()
    return () => {
      element.close()
      const trigger = returnFocus?.current
      if (trigger && !trigger.disabled) trigger.focus()
      else fallbackFocus?.current?.focus()
    }
  }, [returnFocus,fallbackFocus])
  return <dialog ref={dialog} className="dq-confirm-dialog" role={destructive?'alertdialog':'dialog'} aria-labelledby={id}
    aria-describedby={id+'-description'+(note?' '+id+'-note':'')} aria-busy={pending}
    onCancel={event => { event.preventDefault(); if (!pending) onCancel() }}>
    {destructive && <span className="dq-danger-icon"><Trash2 size={21} aria-hidden="true"/></span>}
    <h2 id={id}>{title}</h2>
    <p id={id+'-description'}>{description}</p>
    {note && <p className="dq-dialog-note" id={id+'-note'}>{note}</p>}
    <div className="dq-dialog-actions">
      <button ref={cancel} type="button" className="secondary-button" disabled={pending} onClick={onCancel}>{cancelLabel}</button>
      <button type="button" className={destructive?'dq-danger-confirm':'primary-button'} aria-disabled={pending || confirmDisabled}
        onClick={()=>{if (!pending && !confirmDisabled) onConfirm()}}>{pending?pendingLabel:confirmLabel}</button>
    </div>
  </dialog>
}

export function DestructiveDialog(props: Props) {
  return <ConfirmationDialog {...props} destructive pendingLabel="Discarding…"/>
}
