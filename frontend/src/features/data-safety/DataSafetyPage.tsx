import { Link } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, FileText, ShieldCheck } from 'lucide-react'
import { getCurriculum } from '../curriculum/api'
import { downloadRoadmap } from './export'
import './data-safety.css'
import { ImportRoadmap } from './ImportRoadmap'

export function DataSafetyPage() {
  const curriculum = useQuery({ queryKey: ['curriculum'], queryFn: getCurriculum })
  const download = useMutation({ mutationFn: (id: string) => downloadRoadmap(id) })
  const stats = curriculum.data?.root.statistics
  const total = stats ? stats.sessionTopics.total + stats.moduleRequirements.total + stats.finalCompetencies.total : 0
  const completed = stats ? stats.sessionTopics.completed + stats.moduleRequirements.completed + stats.finalCompetencies.completed : 0
  return <div className="data-safety-page">
    <div className="page-heading"><div><p className="eyebrow">YOUR LEARNING, PRESERVED</p><h1>Data safety.</h1><p className="subtitle">Export your progress. Review curriculum changes with confidence.</p></div><span className="milestone-badge">M2.2 <span>Safe re-import</span></span></div>
    <section className="export-card" aria-labelledby="export-heading">
      <div className="export-icon"><FileText size={26} /></div>
      <h2 id="export-heading">Your roadmap, ready for Markdown.</h2>
      <p>Download the stored curriculum with your current saved progress. Original headings, wording, topic order, and formatting stay intact.</p>
      {curriculum.isPending && <p role="status">Loading current curriculum…</p>}
      {curriculum.isError && <div><p className="error-message" role="alert">{curriculum.error.message}</p><button className="secondary-button" onClick={() => void curriculum.refetch()}>Retry loading curriculum</button></div>}
      {curriculum.data && !curriculum.isError && <div className="export-source"><strong>{curriculum.data.root.title}</strong><p>{total} checklist items · {completed} completed at last refresh</p><p>Source revision <code>{curriculum.data.revisionId}</code></p></div>}
      <button className="primary-button export-button" disabled={!curriculum.data || curriculum.isError || download.isPending} onClick={() => { if (curriculum.data) download.mutate(curriculum.data.curriculumId) }}><Download size={18} />{download.isPending ? 'Preparing Markdown…' : 'Export Roadmap as Markdown'}</button>
      {download.isPending && <p className="export-feedback" role="status">Reading a consistent snapshot of your saved progress…</p>}
      {download.isSuccess && <p className="export-feedback" role="status">Download requested. Check your browser’s downloads for ROADMAP.md.</p>}
      {download.isError && <p className="error-message" role="alert">{download.error instanceof TypeError || download.error.name === 'TimeoutError' ? 'The backend could not be reached or the download timed out. Check the local services and retry.' : download.error.message}</p>}
    </section>
    {curriculum.data && !curriculum.isError && <ImportRoadmap curriculumId={curriculum.data.curriculumId} />}
    <section className="export-notes" aria-labelledby="export-notes-heading"><h2 id="export-notes-heading"><ShieldCheck size={19} />What this copy preserves</h2>
      <ul><li>Completed items become <code>[x]</code>. Not started, In progress, and Needs review become <code>[ ]</code>.</li><li>Your four-state progress, timestamps, and activity history remain in PostgreSQL. Markdown is not a full database backup.</li><li>Each download reads freshly saved progress. Unsaved selections are not included.</li><li>DevQuest does not overwrite the original curriculum file, change progress, or commit or push the download.</li></ul>
      <Link className="secondary-button" to="/roadmap">Return to roadmap</Link>
    </section>
    <section className="export-notes" aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backup &amp; recovery</h2>
      <p>Markdown records completed checkboxes. A full PostgreSQL backup also preserves revisions, item identities, all four progress states, and activity history.</p>
      <p>Keep an encrypted copy on a separate drive. Follow <code>docs/WINDOWS_RECOVERY.md</code> in your DevQuest repository to create a backup and test it in a new database.</p>
    </section>
  </div>
}
