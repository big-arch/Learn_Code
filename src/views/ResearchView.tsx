import { useState } from 'react'
import { ArrowUpRight, BookOpenCheck, Check, ExternalLink, FlaskConical, Gamepad2, HeartHandshake, Lightbulb, Route, ShieldCheck, Sparkles } from 'lucide-react'
import { researchSources } from '../data/research'

const categories = ['Все', 'Игровое обучение', 'Массовые курсы', 'Свободная практика'] as const

export function ResearchView() {
  const [category, setCategory] = useState<(typeof categories)[number]>('Все')
  const filtered = researchSources.filter((source) => category === 'Все' || source.category === category)

  return (
    <div className="research-view view-enter">
      <div className="view-heading"><div><span className="section-kicker">OPEN RESEARCH // 13 ОФИЦИАЛЬНЫХ ИСТОЧНИКОВ</span><h1>Не изобретали обучение.<br /><span>Собрали лучшее.</span></h1><p>Сравнили игровые механики и сильные стороны крупных платформ. Оставили то, что помогает учиться, и убрали то, что мешает.</p></div><div className="research-seal"><FlaskConical size={28} /><strong>13</strong><span>платформ<br />в обзоре</span></div></div>

      <section className="research-formula">
        <div><Gamepad2 size={23} /><span>01</span><h2>Игра</h2><p>Мгновенная реакция мира и желание попробовать ещё раз.</p></div>
        <div><Route size={23} /><span>02</span><h2>Маршрут</h2><p>Последовательные шаги и понятная конечная цель.</p></div>
        <div><BookOpenCheck size={23} /><span>03</span><h2>Практика</h2><p>Код и проекты вместо пассивного просмотра.</p></div>
        <div><HeartHandshake size={23} /><span>04</span><h2>Свобода</h2><p>Свой темп, открытый доступ и никаких платных зон.</p></div>
      </section>

      <div className="research-method"><ShieldCheck size={20} /><p><strong>Методология без преувеличений.</strong> Это репрезентативный обзор лидеров, а не буквально все сайты интернета. Факты взяты с официальных страниц; карточки ниже ведут на первоисточники.</p></div>

      <div className="research-filters" aria-label="Фильтр исследования">{categories.map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}<span>{item === 'Все' ? researchSources.length : researchSources.filter((source) => source.category === item).length}</span></button>)}</div>

      <section className="research-grid" aria-label="Результаты исследования">
        {filtered.map((source, index) => (
          <article className="research-card" key={source.name}>
            <div className="research-card-top"><span>{String(index + 1).padStart(2, '0')} // {source.category.toUpperCase()}</span><a href={source.url} target="_blank" rel="noreferrer" aria-label={`Открыть официальный сайт ${source.name}`}><ArrowUpRight size={19} /></a></div>
            <h2>{source.name}</h2>
            <div className="research-finding"><Lightbulb size={17} /><div><span>СИЛЬНАЯ СТОРОНА</span><p>{source.strength}</p></div></div>
            <div className="research-takeaway"><Sparkles size={17} /><div><span>ЧТО ВЗЯЛИ В КОД:АРЕНУ</span><p>{source.borrowed}</p></div></div>
            <a className="source-link" href={source.url} target="_blank" rel="noreferrer">Официальный источник<ExternalLink size={13} /></a>
          </article>
        ))}
      </section>

      <section className="decision-matrix">
        <div className="section-heading"><div><span className="section-kicker">ИТОГОВЫЕ ПРОДУКТОВЫЕ РЕШЕНИЯ</span><h2>Что осталось за кадром — и почему</h2></div></div>
        <div className="decision-table" role="table" aria-label="Сравнение подходов к обучению">
          <div className="decision-row header" role="row"><span role="columnheader">Подход</span><span role="columnheader">Взяли</span><span role="columnheader">Осознанно не взяли</span></div>
          <div className="decision-row" role="row"><strong role="cell">Udemy</strong><span role="cell">Короткие шаги, quizzes и coding exercises</span><span role="cell">Платный доступ, длинные видео и скидочный шум</span></div>
          <div className="decision-row" role="row"><strong role="cell">Coursera</strong><span role="cell">Проекты, маршруты к цели, собственный темп</span><span role="cell">Платные проверки и сертификаты как барьер</span></div>
          <div className="decision-row" role="row"><strong role="cell">Stepik</strong><span role="cell">Небольшие шаги и автоматическая практика</span><span role="cell">Ощущение классной комнаты вместо приключения</span></div>
          <div className="decision-row" role="row"><strong role="cell">Игровые платформы</strong><span role="cell">Мир реагирует на код, тесты, награды</span><span role="cell">Соревнование и наказания за пропущенный день</span></div>
        </div>
      </section>

      <section className="free-manifesto"><div><Check size={28} /><span>НАШ ГЛАВНЫЙ ПРИНЦИП</span></div><h2>Любопытство не должно заканчиваться<br />на странице оплаты.</h2><p>Все шесть направлений, все миссии и весь прогресс — бесплатны. Без кредитной карты и «специального предложения».</p><strong>0 ₽ <span>· сегодня и в дальнейшем</span></strong></section>
    </div>
  )
}
