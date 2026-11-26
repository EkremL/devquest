import { request } from '../curriculum/api'

export interface Span { kind: 'text' | 'code' | 'link'; text: string; href: string | null }
export type Language = 'http' | 'text' | 'java' | 'json'
interface Block { kind: 'paragraph' | 'passage' | 'heading' | 'code' | 'note' | 'outcomes' | 'request-flow' | 'practice' | 'evidence' | 'visual' | 'security-decision' | 'mission'; spans: Span[]; language: Language | null; text: string | null; visual?: InstructionVisual }
export interface InstructionVisual {
  layout: 'flow' | 'comparison' | 'trace' | 'stepper'
  title: string
  groups: { title: string; items: { label: string; detail: string }[] }[]
}
export interface Practice {
  prompt: string
  choices: { label: string; reason: string }[]
  presentation?: 'prediction' | 'diagnosis' | 'experiment'
}
export interface Outcome { status: '401' | '403' | '200'; title: string; detail: string; action: string }
export interface FlowCase {
  label: string; authentication: string; authorization: string | null; translation: string | null
  destination: string; status: string; explanation: string
}
export interface ReadingSection {
  anchor: string
  title: string
  objectives: string[]
  practice?: Practice
  observations?: { request: string; status: string; challenge: string | null }[]
  blocks: Block[]
}
export interface Lesson {
  session: { id: string; title: string; moduleId: string; moduleTitle: string }
  key: string
  release: number
  cases: FlowCase[] | null
  outcomes: Outcome[] | null
  request: string | null
  transport: string | null
  sections: ReadingSection[]
}

export const getLessonCatalog = () => request<string[]>('/learning/catalog')
export const getAssessmentCatalog = () => request<string[]>('/learning/assessment-catalog')
export const getLesson = (sessionId: string, release: string | null = null) =>
  request<Lesson>(`/learning/sessions/${encodeURIComponent(sessionId)}/lesson${release === null ? '' : '?release=' + encodeURIComponent(release)}`)

export const getTopicLinks = (sessionId: string) =>
  request<Record<string, string>>(`/learning/sessions/${encodeURIComponent(sessionId)}/topics`)
