import type { Item, Section } from '../curriculum/api'

export interface TopicContext { item: Item; session: Section; module: Section }

const inOrder = <T extends { position: number }>(items: T[]) => [...items].sort((a, b) => a.position - b.position)

export function summarize(root: Section) {
  const modules = inOrder(root.children.filter(section => section.kind === 'MODULE'))
  const lessons = modules.flatMap(module => inOrder(module.children.filter(section => section.kind === 'SESSION'))
    .map(session => ({ module, session })))
  const topics = lessons.flatMap(({ module, session }) => inOrder(session.items).map(item => ({ item, session, module })))
  const inProgress = topics.filter(({ item }) => item.progress.status === 'IN_PROGRESS')
  const review = topics.filter(({ item }) => item.progress.status === 'NEEDS_REVIEW')
  const recommendation = inProgress[0] ?? review[0] ?? topics.find(({ item }) => item.progress.status !== 'COMPLETED')
  return { modules, sessionCount: lessons.length, inProgress, review, recommendation }
}

export const sessionPath = (sessionId: string) => `/roadmap/sessions/${sessionId}`
