import { BarChart3, BookOpen, Code2, Compass, Gamepad2, Home, Search, Sparkles, Volume2, VolumeX, Zap } from 'lucide-react'
import { LofiPlayer } from './LofiPlayer'
import type { ReactNode } from 'react'
import { useProgress } from '../state/useProgress'
import type { ViewId } from '../types'

const navigation: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'courses', label: 'Курсы', icon: BookOpen },
  { id: 'python', label: 'Курс Python', icon: Code2 },
  { id: 'adventure', label: 'Приключение', icon: Compass },
  { id: 'arena', label: 'Арена', icon: Gamepad2 },
  { id: 'progress', label: 'Прогресс', icon: BarChart3 },
  { id: 'research', label: 'Справочник', icon: BookOpen },
]

interface AppShellProps {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onOpenPalette: () => void
  children: ReactNode
}

export function AppShell({ view, onNavigate, onOpenPalette, children }: AppShellProps) {
  const { progress, setSound } = useProgress()
  const level = Math.floor(progress.xp / 500) + 1
  const levelXp = progress.xp % 500

  return (
    <div data-motion={progress.motion?'on':'off'} className={'app-shell'+(view==='adventure'?' adventure-mode':'')}>
      <a className="skip-link" href="#main-content">Перейти к содержанию</a>
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => onNavigate('home')} aria-label="КОД:АРЕНА — на главную">
          <span className="brand-mark">&lt;/&gt;</span>
          <span>КОД<span>:АРЕНА</span></span>
        </button>
        <nav className="side-nav" aria-label="Основная навигация">
          <span className="nav-caption">ТВОЙ МИР</span>
          <ul>
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={view === item.id ? 'active' : ''}
                    onClick={() => onNavigate(item.id)}
                    aria-current={view === item.id ? 'page' : undefined}
                  >
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.id === 'arena' && <i className="nav-live" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="sidebar-quest">
          <Sparkles size={20} aria-hidden="true" />
          <strong>Знания без границ</strong>
          <p>24 урока Python.<br />От основ до проекта.</p>
          <span>OPEN LEARNING</span>
        </div>
        <div className="sidebar-footer"><i /> Система в сети <span>v2.0</span></div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="search-trigger" type="button" onClick={onOpenPalette} aria-label="Открыть быстрый поиск">
            <Search size={17} aria-hidden="true" />
            <span>Найти курс или миссию...</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-actions">
            <div className="streak-chip" title="Серия учебных дней"><Zap size={16} aria-hidden="true" /><b>{progress.streak}</b><span>дней</span></div>
            <div className="level-chip">
              <span>УРОВЕНЬ {String(level).padStart(2, '0')}</span>
              <div className="mini-progress" aria-label={`${levelXp} из 500 XP до следующего уровня`}><i style={{ width: `${levelXp / 5}%` }} /></div>
              <b>{progress.xp} XP</b>
            </div>
            <button className="icon-button" type="button" onClick={() => setSound(!progress.sound)} aria-label={progress.sound ? 'Выключить звуки победы' : 'Включить звуки победы'} aria-pressed={progress.sound}>
              {progress.sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            </button>
            <button className="avatar" type="button" onClick={() => onNavigate('progress')} aria-label="Открыть профиль и прогресс">YOU</button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>

      <LofiPlayer />
      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} type="button" className={view === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)} aria-current={view === item.id ? 'page' : undefined}>
              <Icon size={20} aria-hidden="true" /><span>{item.id === 'adventure' ? 'Остров' : item.id === 'python' ? 'Python' : item.id === 'research' ? 'Словарь' : item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
