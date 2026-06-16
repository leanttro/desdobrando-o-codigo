import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <section className="home__hero">
        <h1 className="home__title">{'{'}<span>desdobrando</span>{'}'}</h1>

        <p className="home__tagline">Entenda o software que você cria.</p>

        <p className="home__subtitle">
          A Inteligência Artificial tornou a criação de software mais rápida do que nunca.
          Mas construir não significa compreender.
          <br /><br />
          O {'{'}desdobrando{'}'} transforma projetos, workflows e erros em explicações claras,
          organizadas e fáceis de entender — ajudando desenvolvedores e estudantes
          a aprender enquanto constroem.
        </p>

        <p className="home__slogan">
          Fazer funcionar é importante.<br />
          <strong>Mas entender é o que faz você evoluir.</strong>
        </p>

        <div className="home__actions">
          <Link to="/register" className="home__button home__button--primary">
            Começar agora
          </Link>
          <Link to="/login" className="home__button home__button--secondary">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="home__features">
        <div className="home__feature">
          <h3>📂 Desdobrar código</h3>
          <p>Envie arquivos, um .zip ou cole o link de um repositório do GitHub e receba uma explicação completa do projeto em 6 etapas — estrutura, dependências, lógica, riscos e deploy.</p>
        </div>
        <div className="home__feature">
          <h3>⚡ Desdobrar workflows n8n</h3>
          <p>Cole o JSON exportado do n8n e entenda o que cada nó faz, como eles se conectam e onde podem falhar.</p>
        </div>
        <div className="home__feature">
          <h3>🔍 Desdobrar erros</h3>
          <p>Cole uma mensagem de erro e receba uma explicação clara do que aconteceu e um prompt pronto para corrigir.</p>
        </div>
        <div className="home__feature">
          <h3>🎯 Simular entrevista</h3>
          <p>Baseado no seu projeto, a IA gera perguntas técnicas e avalia suas respostas — para você saber defender o que criou.</p>
        </div>
        <div className="home__feature">
          <h3>💬 Tirar dúvidas</h3>
          <p>Com o projeto analisado, pergunte qualquer coisa — o que é JWT, por que usou Flask, o que pode dar errado — e receba respostas no contexto do seu código.</p>
        </div>
        <div className="home__feature">
          <h3>📖 Glossário</h3>
          <p>Termos técnicos explicados com analogias simples. Sem enrolação, sem Wikipedia.</p>
        </div>
      </section>
    </div>
  );
}

export default Home;
