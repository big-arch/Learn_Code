import { courses } from './courses'
import type { Course, LanguageId, Mission } from '../types'

const loops: Partial<Record<LanguageId, string>> = {
  python: 'for step in range(2):\n    hero.move("right")\n    hero.move("up")',
  javascript: 'for (let i = 0; i < 2; i++) {\n  hero.move("right");\n  hero.move("up");\n}',
  csharp: 'for (int i = 0; i < 2; i++) {\n  Hero.Move("right");\n  Hero.Move("up");\n}',
  go: 'for i := 0; i < 2; i++ {\n  hero.Move("right")\n  hero.Move("up")\n}',
}

export function getLessons(course: Course): Mission[] {
  const first = { ...course.mission, expectedSteps: course.mission.kind === 'robot' ? 4 : undefined }
  if (course.mission.kind === 'robot') {
    const solution = loops[course.id]!
    return [first, {
      ...first, id: course.id + '-repeat', title: 'Меньше строк, больше шагов', eyebrow: 'МИССИЯ 02 · ЦИКЛЫ', xp: 160,
      briefing: 'Повторяющийся маршрут можно описать один раз. Цикл выполняет вложенные команды несколько раз подряд.',
      objective: 'Повтори пару движений «вправо, вверх» два раза с помощью цикла. Всего получится четыре шага.',
      starterCode: solution.replace(/< 2/g, '< 1').replace('range(2)', 'range(1)'), solution, requireLoop: true,
      hint: ['Сейчас цикл выполняется один раз. Робот остановится в центре.', 'Число в range(...) или после знака < определяет количество повторений.', 'Замени 1 на 2 в заголовке цикла. Команды внутри менять не нужно.'],
    }]
  }
  if (course.id === 'html') return [first, {
    ...first, id: 'html-first-link', title: 'Свяжи страницы', eyebrow: 'МИССИЯ 02 · ССЫЛКИ', xp: 140, variant: 'link',
    briefing: 'Ссылка соединяет страницы. Тег a описывает ссылку, а атрибут href хранит адрес перехода.',
    objective: 'Внутри main добавь ссылку «Изучать HTML» с адресом https://developer.mozilla.org/ru/docs/Web/HTML.',
    starterCode: '<main>\n  <h1>Мой учебник</h1>\n  <a href="">Изучать HTML</a>\n</main>',
    solution: '<main>\n  <h1>Мой учебник</h1>\n  <a href="https://developer.mozilla.org/ru/docs/Web/HTML">Изучать HTML</a>\n</main>',
    hint: ['Адрес записывается между кавычками после href=.', 'Текст между <a> и </a> видит читатель.', 'Вставь https://developer.mozilla.org/ru/docs/Web/HTML в пустые кавычки href.'],
  }]
  return [first, {
    ...first, id: 'css-center', title: 'Найди равновесие', eyebrow: 'МИССИЯ 02 · ВЫРАВНИВАНИЕ', xp: 140, variant: 'center',
    briefing: 'Один и тот же flex-контейнер умеет выравнивать элементы у края и в центре. Меняется только значение свойства.',
    objective: 'Оставь display: flex и расположи лягушку по центру: justify-content: center.',
    starterCode: '#pond {\n  display: flex;\n  justify-content: flex-end;\n}',
    solution: '#pond {\n  display: flex;\n  justify-content: center;\n}',
    hint: ['Свойство уже правильное. Изменить нужно значение.', 'flex-end — конец оси. center — её середина.', 'Замени flex-end на center.'],
  }]
}

export const allMissions = courses.flatMap(getLessons)
export const completedWorlds = (ids: string[]) => courses.filter(c => getLessons(c).every(m => ids.includes(m.id))).length
export const nextCourseFor = (ids: string[]) => courses.find(c => getLessons(c).some(m => !ids.includes(m.id))) ?? courses[0]

export function lessonNotes(course: Course) {
  if (course.mission.kind === 'html' && !course.mission.variant) return { title: 'Теги описывают элементы страницы', example: '<h1>Мой заголовок</h1>', parts: ['<h1> открывает заголовок первого уровня, </h1> закрывает его.', 'Текст между тегами увидит читатель.', '<button> создаёт кнопку. Вложи заголовок и кнопку внутрь <main> — основного содержания страницы.'], transfer: 'HTML — язык разметки. Он задаёт структуру; CSS оформляет её, а JavaScript добавляет поведение.' }
  if (course.mission.kind === 'html') return { title: 'HTML описывает содержание', example: '<a href="адрес">Текст ссылки</a>', parts: ['<a> — открывающий тег ссылки.', 'href — атрибут с адресом назначения.', 'Текст внутри тегов виден на странице. </a> закрывает элемент.'], transfer: 'Такие же теги используются в настоящих сайтах. HTML — язык разметки, он задаёт структуру страницы.' }
  if (course.mission.kind === 'css') return { title: 'CSS задаёт оформление', example: '#pond { justify-content: center; }', parts: ['#pond — селектор: выбирает элемент с id="pond".', 'justify-content — свойство выравнивания по главной оси.', 'center — значение свойства. Точка с запятой завершает объявление.'], transfer: 'Flexbox используют для меню, карточек и панелей. CSS — язык стилей, он меняет внешний вид HTML.' }
  const call = course.id === 'csharp' ? 'Hero.Move' : course.id === 'go' ? 'hero.Move' : 'hero.move'
  return { title: course.mission.requireLoop ? 'Цикл повторяет блок команд' : 'Программа — последовательность команд', example: call + '("right")' + (course.id === 'csharp' || course.id === 'javascript' ? ';' : ''), parts: [call.split('.')[0] + ' — объект, которым мы управляем.', call.split('.')[1] + ' — действие (метод). Точка связывает объект и действие.', '"right" — строка с направлением. Скобки передают её методу.', ...(course.mission.requireLoop ? [course.id === 'python' ? 'range(2) даёт два повторения. Четыре пробела показывают тело цикла.' : 'Счётчик i начинается с 0. Пока i < 2, блок выполняется; i++ увеличивает счётчик.'] : ['Компьютер выполняет команды сверху вниз. Измени порядок — изменится маршрут.'])], transfer: 'hero — объект нашей учебной игры. В реальных программах так же вызывают методы, но объекты нужно создать или получить из библиотеки.' }
}
