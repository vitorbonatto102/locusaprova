import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Locus Aprova — seu lugar é do outro lado da prova",
  description: "Preparação para OAB e concursos com conteúdo estruturado, prática, revisão e direção. Escolha sua prova; a Locus organiza o próximo passo.",
};

const method = [
  { number: "01", title: "Um caminho, não um depósito", text: "O objetivo define o que importa. Você enxerga o percurso antes de começar a acumular conteúdo." },
  { number: "02", title: "Prática que revela lacunas", text: "Questões, microcasos e simulados mostram o que já está firme — e o que ainda precisa de trabalho." },
  { number: "03", title: "Revisão com motivo", text: "Erros e respostas inseguras voltam no momento certo. Seu próximo treino nasce do que aconteceu no anterior." },
];

function ArchitectureSketch() {
  return <svg viewBox="0 0 620 240" fill="none" aria-hidden="true" className={styles.architectureSketch}>
    <path d="M0 196h620v44H0z" fill="#d9d7d0" />
    <path d="M24 128 170 74l32 13 73-32 70 20 42-8 82 37 90 18v91H24z" fill="#b7b9b5" />
    <path d="M24 128 170 74l32 13 73-32 70 20 42-8 82 37 90 18" stroke="#50575b" strokeWidth="2" />
    <path d="M170 74v119m105-138v138m70-118v118m42-126v126m82-89v89" stroke="#6d7371" strokeWidth="2" />
    <path d="M0 193h620M0 209h620M0 224h620" stroke="#424a4b" strokeWidth="2" />
    {Array.from({ length: 22 }, (_, index) => <path key={index} d={`M${21 + index * 27} 130v63`} stroke="#6c7270" strokeWidth="1" opacity=".55" />)}
    {Array.from({ length: 17 }, (_, index) => <path key={index} d={`M${21 + index * 34} 162h21`} stroke="#404748" strokeWidth="2" opacity=".65" />)}
    <path d="M140 193v-61h240v61" stroke="#333b3c" strokeWidth="3" />
    <path d="M149 191h222M149 177h222M149 163h222M149 149h222" stroke="#737b78" strokeWidth="2" />
    <path d="M0 195h620" stroke="#252d2d" strokeWidth="4" />
  </svg>;
}

function BlueStroke({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 420 22" preserveAspectRatio="none" aria-hidden="true"><path d="M5 14C98 4 188 20 283 10c53-6 99-4 132-5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><path d="M72 18c109-6 178-1 296-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".8" /></svg>;
}

export default function LandingPage() {
  return <div className={styles.landing}>
    <header className={styles.header}>
      <Link href="/" className={styles.logoLink} aria-label="Locus Aprova, início"><Image src="/logo.png" alt="Locus Aprova" width={58} height={58} className={styles.logoImage} priority /></Link>
      <nav className={styles.nav} aria-label="Navegação principal">
        <a href="#metodo">Método</a>
        <a href="#percursos">Percursos</a>
        <a href="#plataforma">A plataforma</a>
        <Link href="/login">Entrar</Link>
        <Link href="/login" className={styles.navCta}>Começar <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>

    <main>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <h1 id="hero-title">Seu lugar é<br />do outro lado<br />da <span className={styles.markedWord}>prova.<BlueStroke className={styles.heroStroke} /></span></h1>
          <p className={styles.heroDescription}>Preparação para concursos e OAB com conteúdo estruturado, prática e um próximo passo claro.</p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryButton}>Começar a estudar <span aria-hidden="true">↗</span></Link>
            <a href="#metodo" className={styles.textLink}>Entenda o método <span aria-hidden="true">↓</span></a>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.visualIndex} aria-hidden="true">01</div>
          <div className={styles.blueBlock} aria-hidden="true" />
          <div className={styles.quizPaper}>
            <span className={styles.paperTop}>CADERNO DE CAMINHOS · LOCUS</span>
            <p className={styles.quizNumber}>QUESTÃO 01</p>
            <h2>Onde você quer chegar?</h2>
            <div className={styles.quizChoices}>
              <a href="#concursos"><span>A</span> Concurso público</a>
              <a href="#oab"><span>B</span> OAB</a>
              <a href="#carreiras"><span>C</span> Outra carreira</a>
            </div>
            <span className={styles.paperBottom}>MARQUE UMA DIREÇÃO. O CAMINHO SE AJUSTA.</span>
          </div>
          <div className={styles.handwrittenNote}>Mesma<br />dedicação.<br /><em>Outro futuro.</em><BlueStroke className={styles.noteStroke} /></div>
          <div className={styles.architecture}><ArchitectureSketch /><span className={styles.photoCaption}>FIG. 01 — CONSTRUÇÃO DE UM CAMINHO</span></div>
          <div className={styles.visualMargin}>DISCIPLINA<br />ESTRATÉGIA<br />PRÁTICA<br />RESULTADO<span /></div>
          <div className={styles.pen} aria-hidden="true" />
        </div>
      </section>

      <div className={styles.processBand} aria-label="Conteúdo, questões, simulados, revisão e aprovação">
        <span>CONTEÚDO</span><b>→</b><span>QUESTÕES</span><b>→</b><span>SIMULADOS</span><b>→</b><span>REVISÃO</span><b>→</b><span>APROVAÇÃO</span>
      </div>

      <section className={styles.method} id="metodo" aria-labelledby="method-title">
        <div className={styles.methodIntro}>
          <h2 id="method-title">Não é sobre estudar mais.<br /><em>É sobre saber onde concentrar esforço.</em></h2>
          <p>A Locus conecta objetivo, prática, erros e revisão para transformar tempo de estudo em avanço real.</p>
        </div>
        <div className={styles.methodList}>
          {method.map((item) => <article key={item.number} className={styles.methodItem}>
            <span className={styles.smallBlue}>{item.number}</span>
            <div><h3>{item.title}</h3><p>{item.text}</p></div>
          </article>)}
        </div>
      </section>

      <section className={styles.paths} id="percursos" aria-labelledby="paths-title">
        <div className={styles.pathsContent}>
          <div className={styles.pathsHeading}>
            <div><h2 id="paths-title">Escolha seu <em>Locus.</em></h2></div>
            <p>Diferentes provas.<br />O mesmo compromisso:<br /><strong>dar direção ao estudo.</strong></p>
          </div>
          <div className={styles.pathRows}>
            <Link href="/login" id="concursos" className={styles.pathRow}><span className={styles.pathNumber}>01</span><strong>Concursos públicos</strong><span className={styles.pathArrow}>↗</span><span className={styles.pathSummary}>PF e PRF: trilhas policiais disponíveis</span></Link>
            <Link href="/login" id="oab" className={styles.pathRow}><span className={styles.pathNumber}>02</span><strong>OAB</strong><span className={styles.pathArrow}>↗</span><span className={styles.pathSummary}>2ª fase Penal: prática, revisão e simulado</span></Link>
            <div id="carreiras" className={`${styles.pathRow} ${styles.pathRowPlanned}`}><span className={styles.pathNumber}>03</span><strong>Outras carreiras</strong><span className={styles.pathArrow}>—</span><span className={styles.pathSummary}>Novos percursos em preparação</span></div>
          </div>
        </div>
        <div className={styles.stairPanel}><Image src="/LP/SESSAO2.jpg" alt="Pessoa subindo uma escada em direção a um edifício" width={1150} height={1367} className={styles.stairImage} /></div>
      </section>

      <section className={styles.platform} id="plataforma" aria-labelledby="platform-title">
        <div className={styles.platformHeading}><div><h2 id="platform-title">Você não precisa de mais conteúdo.<br /><span>Precisa saber o que fazer com ele.<BlueStroke className={styles.platformStroke} /></span></h2></div><p>MENOS RUÍDO.<br />MAIS CRITÉRIO.<br />UM PASSO DE CADA VEZ.</p></div>
        <div className={styles.fragments}>
          <article className={`${styles.fragment} ${styles.questionFragment}`}>
            <div className={styles.fragmentHeading}><span>OAB · PENAL</span><span>MICROCASO</span></div>
            <h3>Um caso. Uma decisão.</h3>
            <p>Na instrução, nenhuma testemunha reconheceu o acusado. A imputação de autoria consta apenas do relato inquisitorial.</p>
            <div className={styles.exampleAnswer}><span>A</span><p>Repetir o relato do inquérito</p></div>
            <div className={`${styles.exampleAnswer} ${styles.selectedAnswer}`}><span>B</span><p>Examinar o que foi confirmado em juízo</p><b>✓</b></div>
            <div className={styles.exampleAnswer}><span>C</span><p>Ignorar a prova oral</p></div>
            <span className={styles.fragmentFoot}>MICROCASO AUTORAL · EXEMPLO ILUSTRATIVO</span>
          </article>
          <article className={`${styles.fragment} ${styles.progressFragment}`}>
            <div className={styles.fragmentHeading}><span>VISÃO DE ESTUDO</span><span>SEU MAPA</span></div>
            <h3>O que já está firme?</h3>
            <p className={styles.progressDescription}>O mapa não adivinha: ele muda conforme suas respostas.</p>
            <div className={styles.bars} aria-hidden="true">{[27, 34, 30, 42, 46, 40, 55, 61, 58, 69, 64, 78, 84, 91].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div>
            <div className={styles.barAxis}><span>PRIMEIROS TREINOS</span><span>PRÓXIMOS PASSOS →</span></div>
            <span className={styles.fragmentFoot}>VISUALIZAÇÃO ILUSTRATIVA</span>
          </article>
          <article className={`${styles.fragment} ${styles.planFragment}`}>
            <div className={styles.fragmentHeading}><span>SEU DIA</span><span>PLANO DE ESTUDO</span></div>
            <h3>Uma coisa de cada vez.</h3>
            <div className={styles.planLine}><span>01</span><div><strong>Retomar um erro</strong><p>Volte ao ponto que custou confiança.</p></div></div>
            <div className={styles.planLine}><span>02</span><div><strong>Praticar uma tese</strong><p>Recupere da memória antes de consultar.</p></div></div>
            <div className={styles.planLine}><span>03</span><div><strong>Avançar com critério</strong><p>O próximo treino acompanha seu domínio.</p></div></div>
            <span className={styles.fragmentFoot}>SEQUÊNCIA ILUSTRATIVA</span>
          </article>
        </div>
        <div className={styles.platformTail}><span>QUESTÃO → TENTATIVA → ERRO → REVISÃO → DOMÍNIO</span><Link href="/login">Conhecer a plataforma <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className={styles.statement} aria-labelledby="statement-title"><div className={styles.statementBody}><span aria-hidden="true">“</span><h2 id="statement-title">Estudar não é passar os olhos por tudo.<br /><em>É voltar ao que importa até saber usar.</em></h2><p>— UMA CONVICÇÃO DA LOCUS</p></div><div className={styles.statementMarks} aria-hidden="true">A ○ &nbsp; B ● &nbsp; C ○ &nbsp; D ○</div></section>

      <section className={styles.finalCta} id="final" aria-labelledby="final-title"><div><h2 id="final-title">Seu próximo resultado<br /><span>começa aqui.<BlueStroke className={styles.finalStroke} /></span></h2></div><div className={styles.finalAction}><p>CONCURSOS · OAB · SEU CAMINHO</p><Link href="/login" className={styles.primaryButton}>Entrar na Locus <span aria-hidden="true">↗</span></Link><span>Seu estudo tem um lugar.</span></div></section>
    </main>

    <footer className={styles.footer}><Link href="/" className={styles.logoLink} aria-label="Locus Aprova, início"><Image src="/logo.png" alt="Locus Aprova" width={48} height={48} className={styles.logoImage} /></Link><p>Preparação com direção.</p><span>© {new Date().getFullYear()} Locus Aprova</span></footer>
  </div>;
}
