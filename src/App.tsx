import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { AccountDialog } from './components/AccountDialog'
import { AppShell } from './components/AppShell'
import { GameLab } from './views/GameLab'
import { Arena } from './components/Arena'
import { CommandPalette } from './components/CommandPalette'
import { CourseDialog } from './components/CourseDialog'
import { ProgressProvider } from './state/ProgressContext'
import { CoursesView } from './views/CoursesView'
import { AdventureView } from './views/AdventureView'
import { StudioHome } from './views/StudioHome'
import { PythonView } from './views/PythonView'
import { HandbookView } from './views/HandbookView'
import { MapView } from './views/MapView'
import { ProgressView } from './views/ProgressView'
import { PracticeView } from './views/PracticeView'
import type { PracticeTrack } from './lib/practice'
import type { Course, LanguageId, ViewId } from './types'
const GreenhouseView=lazy(()=>import('./views/GreenhouseView').then(module=>({default:module.GreenhouseView})))

const titles: Record<ViewId, string> = {
  greenhouse:'Умная теплица: условия Python — КОД:АРЕНА',
  practice: 'Практикум: Python, HTML и CSS — КОД:АРЕНА',
  games: 'Игровая мастерская — КОД:АРЕНА',
  adventure: 'Остров Тихой бухты — КОД:АРЕНА',
  home: 'КОД:АРЕНА — программирование через игру',
  courses: 'Курсы — КОД:АРЕНА',
  map: 'Карта знаний — КОД:АРЕНА',
  arena: 'Игровая арена — КОД:АРЕНА',
  progress: 'Мой прогресс — КОД:АРЕНА',
  research: 'Справочник — КОД:АРЕНА',
  python: 'Курс Python — КОД:АРЕНА',
}

function AppContent() {
  const [view, setView] = useState<ViewId>('home')
  const [activeCourseId, setActiveCourseId] = useState<LanguageId>('python')
  const [detailCourse, setDetailCourse] = useState<Course | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [pythonStart, setPythonStart] = useState<number | null>(null)
  const [practiceTrack, setPracticeTrack] = useState<PracticeTrack>('python')
  const [greenStart,setGreenStart]=useState({index:0,review:false})
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 8000)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  useEffect(() => {
    document.title = titles[view]
  }, [view])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const navigate = useCallback((nextView: ViewId) => {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const startMission = useCallback((id: LanguageId) => {
    setActiveCourseId(id)
    setDetailCourse(null)
    setPythonStart(null)
    setView(id === 'python' ? 'python' : 'arena')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <AppShell view={view} onNavigate={navigate} onOpenPalette={() => setPaletteOpen(true)}>
      {view === 'home' && <StudioHome onGreenhouse={(index=0,review=false)=>{setGreenStart({index,review});navigate('greenhouse')}} onNavigate={navigate} onPython={(chapter) => { setPythonStart(chapter ?? null); navigate('python') }} />}
      {view === 'adventure' && <AdventureView onCourse={() => { setPythonStart(null); navigate('python') }} />}
      {view === 'python' && <PythonView key={String(pythonStart)} startChapter={pythonStart} onGreenhouse={()=>{setGreenStart({index:0,review:false});navigate('greenhouse')}} onAdventure={()=>navigate('adventure')} onPractice={() => { setPracticeTrack('python'); navigate('practice') }} />}
      {view === 'greenhouse' && <Suspense fallback={<div className="loading-screen" role="status">Открываем теплицу…</div>}><GreenhouseView start={greenStart.index} review={greenStart.review} onHome={()=>navigate('home')} onPython={()=>{setPythonStart(1);navigate('python')}}/></Suspense>}
      {view === 'practice' && <PracticeView key={practiceTrack} startTrack={practiceTrack} onPython={chapter => { setPythonStart(chapter); navigate('python') }} />}
      {view === 'courses' && <CoursesView onOpenCourse={setDetailCourse} onStartMission={startMission} onPractice={track => { setPracticeTrack(track); navigate('practice') }} />}
      {view === 'map' && <MapView onStartMission={startMission} />}
      {view === 'games' && <GameLab />}
      {view === 'arena' && <Arena key={activeCourseId} courseId={activeCourseId} onCourseChange={setActiveCourseId} onNotify={notify} />}
      {view === 'progress' && <ProgressView onGreenhouse={(index,review)=>{setGreenStart({index,review});navigate('greenhouse')}} onStartMission={startMission} onGames={() => navigate('games')} onPractice={() => navigate('practice')} />}
      {view === 'research' && <HandbookView onPython={() => { setPythonStart(null); navigate('python') }} />}
      <AccountDialog />
      <CourseDialog course={detailCourse} onClose={() => setDetailCourse(null)} onStart={() => detailCourse && startMission(detailCourse.id)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} onStartMission={startMission} />
      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite" aria-atomic="true">
        {toast && <><CheckCircle2 size={19} aria-hidden="true" /><span>{toast}</span></>}
      </div>
    </AppShell>
  )
}

export default function App() {
  return <ProgressProvider><AppContent /></ProgressProvider>
}
