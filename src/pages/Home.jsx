import { For, onMount } from 'solid-js';
import './home.css';

const CARDS = [
  {
    id: 'qimen', name: '奇门遁甲', verb: '起局', tone: 'qm',
    good: '看时机与方位：此刻做一件事，从哪个方向、在什么时候更顺。',
    asks: ['这周去面试顺不顺', '出差往哪个方向好', '现在是不是开口的时机'],
    how: '时家转盘，九宫里排天盘九星、人盘八门、神盘八神。',
  },
  {
    id: 'liuren', name: '大六壬', verb: '起课', tone: 'lr',
    good: '问一件具体的事：在想问的那一刻起课，看事情的起因、变化和结局。',
    asks: ['这次合作能不能谈成', '丢的东西还能找回吗', '他会不会答应'],
    how: '月将加占时，起四课、发三传、布十二天将。',
  },
  {
    id: 'taiyi', name: '太乙神数', verb: '起式', tone: 'ty',
    good: '看大势与主客：一年或一段时间的整体走向，双方谁占上风。',
    asks: ['今年整体形势如何', '这场竞争谁占主动', '眼下宜攻还是宜守'],
    how: '按《太乙统宗宝鉴》，排太乙行宫、文昌始击、主客算将。',
  },
];

const MINGLI = [
  {
    id: 'bazi', name: '八字', verb: '排盘', tone: 'bz',
    good: '看一个人的命局：以出生时刻排出四柱，看日主强弱、十神配置与大运流年。',
    asks: ['我适合什么方向', '这几年运势如何', '性格上的长处和短板'],
    how: '四柱、十神、藏干、纳音、十二长生，精确起运排大运。',
  },
];

export default function Home() {
  onMount(() => { document.title = '三式排盘'; });
  return (
    <main class="home fade-in">
      <header class="hero">
        <h1>三式</h1>
        <p class="lead">奇门遁甲 · 大六壬 · 太乙神数</p>
        <p class="intro">古人称这三门术数为“三式”。这里把每一式的排盘过程一步步做成动画：节气、干支、宫位怎么推出来，一眼看得见。排完会生成一段完整的盘面文字，可以交给 AI 或懂行的人解读。</p>
      </header>
      <section class="cards" aria-label="选择一式">
        <For each={CARDS}>{(c) => (
          <a class={'card ' + c.tone} href={'#' + c.id}>
            <span class="name">{c.name}</span>
            <span class="good">{c.good}</span>
            <span class="asks">适合问：{c.asks.join('；')}</span>
            <span class="how">{c.how}</span>
            <span class="card-go">去{c.verb} ›</span>
          </a>
        )}</For>
      </section>
      <section class="group">
        <h2>命理</h2>
        <p>三式问事，命理看人。命理以出生时刻排盘，看的是一个人的大致格局和各阶段的起伏。</p>
      </section>
      <section class="cards" aria-label="命理">
        <For each={MINGLI}>{(c) => (
          <a class={'card ' + c.tone} href={'#' + c.id}>
            <span class="name">{c.name}</span>
            <span class="good">{c.good}</span>
            <span class="asks">适合问：{c.asks.join('；')}</span>
            <span class="how">{c.how}</span>
            <span class="card-go">去{c.verb} ›</span>
          </a>
        )}</For>
      </section>
      <section class="notes">
        <h2>怎么选</h2>
        <p>想知道<b>什么时候、往哪里</b>做一件事，用奇门；心里有<b>一件具体的事</b>要问，在想问的那一刻用六壬；想看<b>一段时间的大势</b>或双方胜负，用太乙。三式都不是用来断一生命运的，问得越具体，盘越好读；想了解<b>一个人的整体命局</b>，用八字。</p>
        <h2>排盘有多可靠</h2>
        <p>节气用天文算法计算，交节时刻和已知值吻合到分钟。各式的规则都先查古籍定下口径，在页面上写明采用哪一派；再用古籍课例和成熟排盘软件的结果写成自动测试逐项核对。各家有分歧的地方做成了设置项，并会告诉你这个选项对你填的时间有没有影响。</p>
        <p class="fine">排盘只是按规则推演，解读也只是传统术数的一种看法，请把它当作参考，不要替代现实中的判断。</p>
      </section>
    </main>
  );
}
