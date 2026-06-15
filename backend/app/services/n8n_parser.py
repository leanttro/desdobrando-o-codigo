"""
n8n_parser.py
Valida e extrai informações de um JSON exportado do n8n.
Retorna uma representação textual estruturada do workflow para o prompt da Groq.
"""

from __future__ import annotations

import json
from typing import Any

MAX_INPUT_CHARS = 80_000   # limite do JSON bruto aceito
MAX_NODE_PARAMS_CHARS = 500  # trunca parâmetros longos de cada node


class N8nParserError(Exception):
    """Erros de parsing do JSON do n8n."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _truncate(value: Any, max_chars: int = MAX_NODE_PARAMS_CHARS) -> str:
    """Serializa e trunca um valor para caber no prompt."""
    if isinstance(value, str):
        text = value
    else:
        text = json.dumps(value, ensure_ascii=False)
    if len(text) > max_chars:
        return text[:max_chars] + "... [truncado]"
    return text


def _parse_connections(connections: dict) -> list[str]:
    """
    Transforma o mapa de conexões do n8n em frases legíveis.
    Formato n8n: { "NodeA": { "main": [[{ "node": "NodeB", "type": "main", "index": 0 }]] } }
    """
    lines: list[str] = []
    for source, outputs in connections.items():
        for output_type, branches in outputs.items():
            for branch_idx, targets in enumerate(branches):
                if not targets:
                    continue
                target_names = [t.get("node", "?") for t in targets]
                lines.append(
                    f"  {source} → {', '.join(target_names)} "
                    f"(saída {output_type}[{branch_idx}])"
                )
    return lines


def _describe_node(node: dict) -> str:
    """Gera descrição textual de um node."""
    name = node.get("name", "sem nome")
    node_type = node.get("type", "desconhecido")
    disabled = node.get("disabled", False)
    parameters = node.get("parameters", {})

    lines = [f"**{name}** (type: `{node_type}`{', DESATIVADO' if disabled else ''})"]

    # Parâmetros mais relevantes
    if parameters:
        for key, val in list(parameters.items())[:8]:  # máx 8 parâmetros
            lines.append(f"  - {key}: {_truncate(val, 200)}")

    # Credenciais referenciadas (sem expor valores)
    credentials = node.get("credentials", {})
    if credentials:
        cred_names = list(credentials.keys())
        lines.append(f"  - credenciais referenciadas: {', '.join(cred_names)}")

    return "\n".join(lines)


def parse_n8n_json(raw_input: str | dict) -> tuple[str, dict]:
    """
    Ponto de entrada principal.

    Args:
        raw_input: String JSON ou dict já parseado do workflow n8n.

    Returns:
        Tupla (texto_para_prompt, metadata_dict).
        - texto_para_prompt: string formatada para injetar no prompt da Groq.
        - metadata_dict: dict com name, node_count, node_types para salvar no banco.

    Raises:
        N8nParserError: Se o JSON for inválido ou não parecer um workflow n8n.
    """
    # Parse do JSON se necessário
    if isinstance(raw_input, str):
        if len(raw_input) > MAX_INPUT_CHARS:
            raise N8nParserError(
                f"JSON do workflow excede o limite de {MAX_INPUT_CHARS // 1000} KB."
            )
        try:
            data = json.loads(raw_input)
        except json.JSONDecodeError as exc:
            raise N8nParserError(f"JSON inválido: {exc}") from exc
    else:
        data = raw_input

    if not isinstance(data, dict):
        raise N8nParserError("O JSON deve ser um objeto, não uma lista ou valor primitivo.")

    # Validação mínima de estrutura n8n
    if "nodes" not in data:
        raise N8nParserError(
            "JSON não parece ser um workflow n8n válido. Campo 'nodes' não encontrado."
        )

    nodes: list[dict] = data.get("nodes", [])
    connections: dict = data.get("connections", {})
    workflow_name: str = data.get("name", "Workflow sem nome")
    workflow_id: str = str(data.get("id", ""))
    active: bool = data.get("active", False)
    settings: dict = data.get("settings", {})

    if not nodes:
        raise N8nParserError("O workflow não contém nenhum node.")

    # Monta o texto descritivo
    sections: list[str] = []

    # Cabeçalho
    sections.append(
        f"# Workflow n8n: {workflow_name}\n"
        f"- ID: {workflow_id or 'não informado'}\n"
        f"- Ativo: {'sim' if active else 'não'}\n"
        f"- Total de nodes: {len(nodes)}\n"
    )

    # Configurações globais relevantes
    if settings:
        relevant_settings = {
            k: v for k, v in settings.items()
            if k in ("executionOrder", "saveExecutionProgress", "timezone", "errorWorkflow")
        }
        if relevant_settings:
            sections.append("## Configurações\n" + _truncate(relevant_settings))

    # Nodes
    sections.append("## Nodes")
    node_types: list[str] = []
    for node in nodes:
        sections.append(_describe_node(node))
        sections.append("")  # linha em branco entre nodes
        ntype = node.get("type", "")
        if ntype and ntype not in node_types:
            node_types.append(ntype)

    # Conexões
    if connections:
        conn_lines = _parse_connections(connections)
        if conn_lines:
            sections.append("## Fluxo de conexões")
            sections.extend(conn_lines)

    # Possíveis problemas detectados estaticamente
    warnings: list[str] = []

    for node in nodes:
        params_str = json.dumps(node.get("parameters", {}))

        # Credenciais hardcoded (heurística básica)
        suspicious_keys = ["password", "secret", "token", "apiKey", "api_key", "Authorization"]
        for sk in suspicious_keys:
            if sk.lower() in params_str.lower():
                warnings.append(
                    f"⚠ Node '{node.get('name')}' pode conter credencial hardcoded "
                    f"(encontrado: '{sk}')"
                )
                break

        # Nodes desativados
        if node.get("disabled"):
            warnings.append(f"⚠ Node '{node.get('name')}' está DESATIVADO")

    # Nodes sem saídas (possíveis dead-ends)
    connected_sources = set(connections.keys())
    for node in nodes:
        name = node.get("name", "")
        node_type = node.get("type", "")
        # Nodes de trigger ou resposta não precisam de saída
        is_terminal = any(
            t in node_type.lower()
            for t in ("respondtowebhook", "nooop", "set", "stickyNote")
        )
        if name and name not in connected_sources and not is_terminal and len(nodes) > 1:
            warnings.append(f"ℹ Node '{name}' não tem conexões de saída definidas")

    if warnings:
        sections.append("\n## Alertas detectados automaticamente")
        sections.extend(warnings)

    text_for_prompt = "\n".join(sections)

    # Truncagem final de segurança
    if len(text_for_prompt) > MAX_INPUT_CHARS:
        text_for_prompt = (
            text_for_prompt[:MAX_INPUT_CHARS]
            + "\n\n[Conteúdo truncado por exceder o limite]"
        )

    metadata = {
        "workflow_name": workflow_name,
        "node_count": len(nodes),
        "node_types": node_types[:30],  # máx 30 tipos no metadata
        "active": active,
    }

    return text_for_prompt, metadata
