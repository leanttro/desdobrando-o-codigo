import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <section className="home__hero">
        <h1 className="home__title">Desdobrando o Código</h1>
        <p className="home__subtitle">
          Entenda qualquer código ou workflow do n8n em linguagem simples.
          Faça upload do seu projeto, cole um JSON de automação ou um erro,
          e deixe a IA explicar tudo passo a passo.
        </p>

        <div className="home__actions">
          <Link to="/login" className="home__button home__button--primary">
            Entrar
          </Link>
          <Link to="/register" className="home__button home__button--secondary">
            Criar conta
          </Link>
        </div>
      </section>

      <section className="home__features">
        <div className="home__feature">
          <h3>Analisar código</h3>
          <p>Envie seus arquivos ou um zip e receba uma explicação completa do projeto, em 6 etapas.</p>
        </div>
        <div className="home__feature">
          <h3>Analisar workflow n8n</h3>
          <p>Cole o JSON exportado do n8n e entenda o que cada nó faz e como eles se conectam.</p>
        </div>
        <div className="home__feature">
          <h3>Identificar erros</h3>
          <p>Cole uma mensagem de erro e receba uma explicação clara, além de um prompt de correção.</p>
        </div>
        <div className="home__feature">
          <h3>Glossário</h3>
          <p>Consulte termos técnicos explicados com analogias simples do dia a dia.</p>
        </div>
      </section>
    </div>
  );
}

export default Home;
