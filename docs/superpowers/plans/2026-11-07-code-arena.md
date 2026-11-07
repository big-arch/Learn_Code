# КОД:АРЕНА Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать работающую бесплатную русскоязычную SPA-платформу с шестью игровыми миссиями, Three.js и локальным прогрессом.

**Architecture:** React 18 + TypeScript на Vite; состояние и контент отделены от экранов, учебный симулятор чистыми функциями проверяет ограниченный набор команд, Three.js инкапсулирован в компонент с полной очисткой ресурсов. Нативные диалоги и CSS design tokens обеспечивают доступность и адаптивность без тяжёлого UI-фреймворка.

**Tech Stack:** React 18, TypeScript, Vite, Three.js, Lucide React, CSS, Parcel/html-inline для автономной сборки.

**Spec:** `docs/superpowers/specs/2026-11-07-code-arena-design.md`

## Global Constraints

- Все шесть направлений и все миссии бесплатны, без регистрации и paywall.
- Одна полностью проходимая миссия на Python, C#, Go, JavaScript, HTML и CSS; четыре модуля в программе каждого курса.
- Никаких `eval`/`new Function`: для языковых миссий только ограниченный симулятор.
- Сохранять XP, завершения, черновики и настройки в localStorage; повреждённые данные не должны ломать приложение.
- WebGL уважает reduced motion, ручную паузу, скрытие вкладки и offscreen rendering.
- Не добавлять отдельную тестовую инфраструктуру в новый проект без существующих тестов; проверка через build, реальные браузерные сценарии и повторную загрузку.
- Не инициализировать git и не создавать коммиты без запроса пользователя.

## Review Focus

- Повреждённый или устаревший localStorage: ожидаются безопасные начальные значения; проверить в браузере перед инициализацией React.
- Неверные/бесконечные пользовательские команды: ограничить 24 командами и вернуть понятную ошибку; проверить каждую миссию отдельно.
- Потеря WebGL или отсутствие контекста: учебный интерфейс остаётся доступен; проверить fallback и отсутствие необработанного исключения.
- Повторное завершение одной миссии: XP начисляется один раз; проверить завершение и перезагрузку.
- Мобильная клавиатура и узкий экран: редактор и основное действие остаются доступны; проверить при 390×844 и 1440×1000.

---

### Task 1: Каркас, типизированный контент и состояние

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`
- Create: `src/types.ts`, `src/data/courses.ts`, `src/data/research.ts`
- Create: `src/state/ProgressContext.tsx`, `src/lib/storage.ts`

**Interfaces:**
- Produces: `Course`, `LanguageId`, `Mission`, `ProgressState`; `courses: Course[]`; `useProgress()` с `completeMission(id, xp)`, `saveDraft(id, code)`, `resetProgress()`.

- [ ] **Step 1:** Инициализировать проект через `web-artifacts-builder/scripts/init-artifact.sh`, установить `three`, `@types/three` и `lucide-react`, зафиксировать русские metadata и title.
- [ ] **Step 2:** Описать шесть курсов, миссии, стартовый/эталонный код, четыре модуля и официальные источники исследования.
- [ ] **Step 3:** Реализовать версионированное чтение/запись localStorage в `try/catch`, валидацию формы состояния и начисление XP только для нового `missionId`.
- [ ] **Step 4:** Запустить `npm run build`; ожидается успешная компиляция каркаса.

### Task 2: App shell и выразительная дизайн-система

**Files:**
- Create: `src/App.tsx`, `src/components/AppShell.tsx`, `src/components/IconButton.tsx`
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/layout.css`

**Interfaces:**
- Consumes: `useProgress()`.
- Produces: `ViewId = 'home' | 'courses' | 'map' | 'arena' | 'progress' | 'research'`, общий `onNavigate(view)` и `onStartMission(courseId)`.

- [ ] **Step 1:** Собрать sidebar, мобильную навигацию, верхнюю строку, skip-link, единственный `<main>` и live-region.
- [ ] **Step 2:** Реализовать графит/лайм/циан/коралл, Unbounded/Manrope/JetBrains Mono с fallback, фокус `:focus-visible`, адаптивную типографику `clamp()` и dynamic viewport units.
- [ ] **Step 3:** Проверить переключение всех разделов и `npm run build`.

### Task 3: Three.js learning island

**Files:**
- Create: `src/components/LearningIsland.tsx`, `src/styles/island.css`

**Interfaces:**
- Produces: `<LearningIsland paused={boolean} completed={boolean} onCrystalClick={() => void} />`.

- [ ] **Step 1:** Построить orthographic-сцену из программной геометрии: остров, робот, шесть кристаллов языков, орбиты, свет и частицы без внешних моделей.
- [ ] **Step 2:** Добавить pointer-parallax и raycaster, responsive resize, DPR cap 1.75 и статичный fallback при ошибке WebGL.
- [ ] **Step 3:** Останавливать loop при paused/reduced-motion/hidden/offscreen; использовать `contentvisibilityautostatechange` и IntersectionObserver fallback; освобождать geometry/material/renderer/listeners.
- [ ] **Step 4:** В браузере проверить движение, паузу, resize и отсутствие ошибок консоли.

### Task 4: Безопасный игровой движок и шесть миссий

**Files:**
- Create: `src/lib/missionEngine.ts`, `src/components/Arena.tsx`, `src/components/CodeEditor.tsx`
- Create: `src/components/MissionPreview.tsx`, `src/styles/arena.css`

**Interfaces:**
- Consumes: `courses`, `saveDraft()`, `completeMission()`.
- Produces: `validateMission(course: Course, code: string): ValidationResult` с `ok`, `message`, `commands`, `tests`; `<Arena courseId={string} />`.

- [ ] **Step 1:** Реализовать parser робота для четырёх синтаксисов, лимит 24 команды, допустимые направления и детерминированную проверку маршрута до цели.
- [ ] **Step 2:** Реализовать HTML-проверку обязательных элементов и CSS-проверку `display:flex` + `justify-content:flex-end` с live preview, без вставки пользовательского HTML в основной DOM.
- [ ] **Step 3:** Собрать редактор с постоянным label, номерами строк, Tab-вводом, кнопками запуска/сброса/подсказки и понятным списком тестов.
- [ ] **Step 4:** Подключить награду, завершение, следующий курс и сохранение черновика; повторный запуск не должен увеличивать XP.
- [ ] **Step 5:** В браузере пройти успешный и неуспешный сценарий для каждого из шести языков; выполнить `npm run build`.

### Task 5: Главная, каталог, карта, прогресс и исследование

**Files:**
- Create: `src/views/HomeView.tsx`, `src/views/CoursesView.tsx`, `src/views/MapView.tsx`
- Create: `src/views/ProgressView.tsx`, `src/views/ResearchView.tsx`
- Create: `src/components/CourseDialog.tsx`, `src/components/CommandPalette.tsx`
- Create: `src/styles/views.css`, `src/styles/dialogs.css`

**Interfaces:**
- Consumes: общие navigation/mission callbacks и `useProgress()`.

- [ ] **Step 1:** Собрать главную с текущей миссией, шестью направлениями, целью недели, активностью и достижениями без фиктивных ссылок.
- [ ] **Step 2:** Реализовать поиск и фильтры каталога, empty state и программу курса в нативном `<dialog>` с запуском миссии.
- [ ] **Step 3:** Реализовать связанную карту навыков, графики прогресса, badges и подтверждение сброса данных.
- [ ] **Step 4:** Добавить репрезентативное исследование Udemy/Coursera/Stepik и игровых платформ с официальными ссылками и конкретными заимствованными механиками.
- [ ] **Step 5:** Добавить Ctrl/Cmd+K command palette с нативным dialog и проверить все кнопки.

### Task 6: Сквозная проверка и автономная сборка

**Files:**
- Modify: файлы, выявленные проверкой
- Create: `dist/bundle.html` через bundler, не вручную

- [ ] **Step 1:** Запустить `npm run build`; устранить TypeScript/Vite-ошибки и проверить production output.
- [ ] **Step 2:** Запустить dev server и встроенный браузер; проверить 1440×1000 и 390×844, клавиатуру, dialog Esc/focus, reduced motion, отсутствие overflow и console errors.
- [ ] **Step 3:** Проверить завершение миссии, единоразовое XP, черновик и прогресс после reload; отдельно проверить повреждённый localStorage.
- [ ] **Step 4:** Собрать `dist/bundle.html` через `web-artifacts-builder/scripts/bundle-artifact.sh`, открыть именно автономный файл и повторить критический сценарий.
- [ ] **Step 5:** Проверить `git status` при наличии репозитория либо список файлов; удалить только самостоятельно созданные ненужные логи/временные артефакты.
