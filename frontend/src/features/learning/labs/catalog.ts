import { useQuery } from '@tanstack/react-query'
import { getLesson } from '../api'
import pilot from './http-401-and-403/1/brief.json'

const labs = [pilot]

export function labForLesson(lessonKey: string) {
  return labs.find(lab => lab.lessonKey === lessonKey)
}

export function useLabSession(sessionId: string, enabled = true) {
  // The lesson API verifies the portable binding against the active curriculum.
  return useQuery({
    queryKey: ['learning', 'lesson', sessionId],
    queryFn: () => getLesson(sessionId),
    enabled: !!sessionId && enabled,
    retry: false,
  })
}
