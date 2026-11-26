import { ArrowRight, Check, Circle, FlaskConical, RotateCcw, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MissionState } from './missionIds'

export type Tone = 'identity' | 'trusted' | 'pending' | 'rejected' | 'quiet'

export function LabHeading({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return <header className="mx-lab-heading">
    <span className="mx-label">{label}</span>
    <h3>{title}</h3><p>{children}</p>
  </header>
}

export function Feedback({ title, tone, children }: { title: string; tone: Tone; children: ReactNode }) {
  return <div className="mx-feedback" data-tone={tone} role="status" aria-atomic="true">
    {tone === 'trusted' ? <Check size={18} aria-hidden="true"/> : <Circle size={15} aria-hidden="true"/>}
    <div><strong>{title}</strong><p>{children}</p></div>
  </div>
}

export function Switcher<T extends string>({ label, options, value, onChange }: {
  label: string; options: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void
}) {
  return <div className="mx-switcher" role="group" aria-label={label}>
    {options.map(option => <button type="button" key={option.id}
      aria-pressed={option.id === value} onClick={() => onChange(option.id)}>{option.label}</button>)}
  </div>
}

export interface PathNode { id: string; label: string; value: string; tone: Tone; icon: LucideIcon; boundary?: boolean }

export function TechnicalPath({ label, nodes, selected, onSelect }: {
  label: string; nodes: PathNode[]; selected?: string; onSelect?: (id: string) => void
}) {
  return <ol className="mx-path" aria-label={label}>
    {nodes.map(({ id, label: name, value, tone, icon: Icon, boundary }, index) =>
      <li key={id} data-tone={tone} data-boundary={boundary || undefined}>
        {onSelect
          ? <button className="mx-path-node" aria-pressed={selected === id} onClick={() => onSelect(id)}>
            <Icon size={20} aria-hidden="true"/><strong>{name}</strong><span>{value}</span>
          </button>
          : <div className="mx-path-node"><Icon size={20} aria-hidden="true"/>
            <strong>{name}</strong><span>{value}</span></div>}
        {index < nodes.length - 1 && <ArrowRight aria-hidden="true" className="mx-connector" size={20}/>}
      </li>)}
  </ol>
}

export function MissionProgress({ states, onReplay }: { states: MissionState[]; onReplay: () => void }) {
  const complete = states.filter(state => state === 'Activity completed').length
  return <div className="mx-progress">
    <div className="mx-progress-heading"><FlaskConical size={16} aria-hidden="true"/>
      <strong>Mission progress</strong>
      <span role="status" aria-label={`${complete} of ${states.length} activities complete`}>{complete} / {states.length}</span>
    </div>
    <div className="mx-progress-track" aria-hidden="true">
      {states.map((state, index) => <i data-state={state} key={index}/>)}
    </div>
    <div className="mx-progress-foot"><small>This visit only</small>
      <button type="button" onClick={onReplay}><RotateCcw size={15} aria-hidden="true"/>Replay</button>
    </div>
  </div>
}
