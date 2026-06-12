"""
routes/glossary.py
GET /glossary → retorna glossário estático de conceitos Vibe Code
Não exige autenticação.
"""

from flask import Blueprint, jsonify

glossary_bp = Blueprint("glossary", __name__, url_prefix="/glossary")

_GLOSSARY: list[dict] = [
    {
        "term": "VPS vs Cloud Function",
        "short_explanation": (
            "VPS (Servidor Virtual Privado) é um servidor dedicado que fica rodando 24h, "
            "ideal para aplicações que precisam estar sempre online. "
            "Cloud Function é um código que só executa quando chamado e cobra por uso."
        ),
        "analogy": (
            "VPS é como alugar um apartamento: você paga o mês inteiro, "
            "use ou não. Cloud Function é como pagar um táxi: só paga quando usa."
        ),
        "when_you_need_it": (
            "Use VPS para APIs, backends e sites com tráfego contínuo. "
            "Use Cloud Function para tarefas esporádicas como envio de e-mail ou webhook."
        ),
    },
    {
        "term": "Git",
        "short_explanation": (
            "Sistema de controle de versão que registra todas as alterações feitas "
            "no código ao longo do tempo. Permite voltar a versões anteriores e "
            "trabalhar em equipe sem sobrescrever o trabalho dos outros."
        ),
        "analogy": (
            "Git é o histórico de edições de um documento do Google Docs, "
            "mas para código — com nomes, datas e comentários em cada alteração."
        ),
        "when_you_need_it": (
            "Sempre. Todo projeto de código deve usar Git desde o primeiro arquivo."
        ),
    },
    {
        "term": "Docker",
        "short_explanation": (
            "Ferramenta que empacota sua aplicação e todas as suas dependências "
            "em um 'container', garantindo que ela rode igual em qualquer máquina — "
            "no seu computador, no VPS ou na nuvem."
        ),
        "analogy": (
            "Docker é como uma marmita com tudo que a aplicação precisa para funcionar: "
            "você entrega a marmita fechada e ela funciona em qualquer microondas."
        ),
        "when_you_need_it": (
            "Quando você precisa garantir que o ambiente de produção seja idêntico "
            "ao de desenvolvimento, ou ao fazer deploy em qualquer servidor."
        ),
    },
    {
        "term": "API",
        "short_explanation": (
            "Interface que permite que dois sistemas se comuniquem. "
            "Uma API define as regras de como pedir e receber dados de um serviço."
        ),
        "analogy": (
            "API é o cardápio de um restaurante: você consulta o que está disponível, "
            "faz o pedido no formato certo e recebe o que pediu — sem entrar na cozinha."
        ),
        "when_you_need_it": (
            "Sempre que seu frontend precisar de dados do backend, "
            "ou quando você integrar serviços externos como pagamento, e-mail ou mapas."
        ),
    },
    {
        "term": "Frontend vs Backend",
        "short_explanation": (
            "Frontend é tudo que o usuário vê e interage no navegador (botões, telas, formulários). "
            "Backend é o servidor que processa os dados, aplica as regras de negócio "
            "e se comunica com o banco de dados."
        ),
        "analogy": (
            "Frontend é o salão do restaurante — o que o cliente vê. "
            "Backend é a cozinha — onde o trabalho real acontece."
        ),
        "when_you_need_it": (
            "Todo sistema web tem os dois. O frontend consome o backend via API."
        ),
    },
    {
        "term": "DevOps",
        "short_explanation": (
            "Conjunto de práticas que une desenvolvimento de software (Dev) "
            "e operações de infraestrutura (Ops) para entregar código mais rápido, "
            "com mais confiabilidade e automação."
        ),
        "analogy": (
            "DevOps é como um chef que também gerencia o estoque e a logística: "
            "ele cozinha E garante que os ingredientes cheguem no horário certo."
        ),
        "when_you_need_it": (
            "Quando você quer automatizar deploys, monitoramento e entregas contínuas "
            "em vez de fazer tudo na mão."
        ),
    },
    {
        "term": "Banco de Dados — quando usar qual",
        "short_explanation": (
            "PostgreSQL/MySQL: dados estruturados com relações (usuários, pedidos, produtos). "
            "MongoDB: documentos flexíveis sem esquema fixo. "
            "Redis: cache e dados temporários em memória. "
            "SQLite: projetos locais ou pequenos sem servidor."
        ),
        "analogy": (
            "PostgreSQL é uma planilha Excel organizada. "
            "MongoDB é uma pasta com arquivos Word de formato livre. "
            "Redis é um bloco de notas colado no monitor — rápido mas temporário."
        ),
        "when_you_need_it": (
            "Use PostgreSQL para a maioria dos projetos. "
            "Redis para sessões e cache. MongoDB para logs ou dados sem estrutura definida."
        ),
    },
    {
        "term": "Variáveis de Ambiente",
        "short_explanation": (
            "Configurações sensíveis (senhas, chaves de API, URLs de banco) "
            "armazenadas fora do código-fonte, em arquivos .env ou no painel do servidor. "
            "Nunca devem ser commitadas no Git."
        ),
        "analogy": (
            "É como guardar a senha do cofre num papel separado do cofre — "
            "você não escreve a senha dentro do cofre."
        ),
        "when_you_need_it": (
            "Sempre que tiver uma credencial, chave de API ou configuração "
            "que muda entre ambientes (local, produção)."
        ),
    },
    {
        "term": "Container",
        "short_explanation": (
            "Unidade isolada que empacota uma aplicação com tudo que ela precisa rodar. "
            "É como uma mini-máquina virtual, mas muito mais leve e rápida. "
            "Docker é a ferramenta mais comum para criar containers."
        ),
        "analogy": (
            "Container é como um módulo de nave espacial: isolado, autossuficiente, "
            "e pode ser acoplado ou desacoplado sem afetar o restante da nave."
        ),
        "when_you_need_it": (
            "Para isolar serviços, garantir reprodutibilidade e facilitar o deploy "
            "em qualquer infraestrutura."
        ),
    },
    {
        "term": "Deploy vs Subir Local",
        "short_explanation": (
            "Subir local significa rodar a aplicação no seu computador para desenvolvimento e testes. "
            "Deploy é o processo de publicar a aplicação em um servidor acessível pela internet."
        ),
        "analogy": (
            "Subir local é ensaiar uma peça de teatro no seu quarto. "
            "Deploy é apresentar no teatro para o público de verdade."
        ),
        "when_you_need_it": (
            "Você sobe local durante o desenvolvimento. "
            "Faz deploy quando a aplicação está pronta para usuários reais."
        ),
    },
]


@glossary_bp.route("", methods=["GET"])
def get_glossary():
    return jsonify({"glossary": _GLOSSARY, "total": len(_GLOSSARY)}), 200
