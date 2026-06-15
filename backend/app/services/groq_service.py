"""
groq_service.py
Responsável exclusivamente por chamar a API da Groq.
A groq_key chega por parâmetro, nunca é armazenada.
"""

import json
import urllib.request
import urllib.error
from typing import Any

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Lista de modelos a tentar, em ordem de preferência, com o limite de
# tokens por minuto (TPM) de cada um no tier gratuito ("on_demand").
# Esses valores podem mudar — confira em https://console.groq.com/settings/limits
GROQ_MODELS: list[tuple[str, int]] = [
    ("llama-3.3-70b-versatile", 12_000),
    ("llama-3.1-8b-instant", 20_000),
    ("llama-3.1-70b-versatile", 12_000),
    ("openai/gpt-oss-120b", 8_000),
]
MAX_TOKENS = 4096

# Margem de segurança e estimativa de chars-por-token usada para
# truncar o conteúdo do usuário antes de enviar à Groq.
_SAFETY_MARGIN_TOKENS = 500
_CHARS_PER_TOKEN_ESTIMATE = 3.0


def _estimate_tokens(text: str) -> int:
    """Estimativa grosseira de tokens a partir do tamanho do texto."""
    return int(len(text) / _CHARS_PER_TOKEN_ESTIMATE) + 1


def _truncate_for_budget(text: str, system_prompt: str, tpm_limit: int) -> str:
    """Trunca `text` para caber no orçamento de tokens do modelo."""
    overhead = _estimate_tokens(system_prompt) + MAX_TOKENS + _SAFETY_MARGIN_TOKENS
    budget_tokens = tpm_limit - overhead

    if budget_tokens <= 0:
        # Nem o system prompt + resposta cabem — não há o que enviar.
        return ""

    budget_chars = int(budget_tokens * _CHARS_PER_TOKEN_ESTIMATE)
    if len(text) <= budget_chars:
        return text

    truncated = text[:budget_chars]
    return (
        truncated
        + "\n\n[... conteúdo truncado por limite de tokens da Groq — "
        "projeto maior do que o suportado no plano gratuito ...]"
    )


class GroqError(Exception):
    """Erros originados da API da Groq."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def call_groq(
    *,
    system_prompt: str,
    user_message: str,
    groq_key: str,
    temperature: float = 0.3,
    response_format: str | None = None,  # "json_object" para respostas estruturadas
) -> str:
    """
    Faz uma chamada à API da Groq e retorna o texto da resposta.

    Args:
        system_prompt: Instrução de papel + contexto do usuário.
        user_message:  Conteúdo a ser analisado.
        groq_key:      Chave passada no header X-Groq-Key — usada aqui e descartada.
        temperature:   Criatividade da resposta (padrão baixo para análises técnicas).
        response_format: Se "json_object", força resposta JSON.

    Raises:
        GroqError: 401 chave inválida, 429 rate limit, outros erros HTTP.
    """
    if not groq_key or not groq_key.strip():
        raise GroqError("X-Groq-Key ausente ou vazio.", status_code=400)

    last_error: GroqError | None = None

    for model in GROQ_MODELS:
        payload: dict[str, Any] = {
            "model": model,
            "max_tokens": MAX_TOKENS,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        }
        if response_format == "json_object":
            payload["response_format"] = {"type": "json_object"}

        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            GROQ_API_URL,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {groq_key.strip()}",
                "User-Agent": "Mozilla/5.0 (compatible; LeanttroBackend/1.0)",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"]

        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")

            if exc.code == 401:
                raise GroqError(
                    "Chave da Groq inválida ou sem permissão.", status_code=401
                ) from exc
            if exc.code == 429:
                raise GroqError(
                    "Limite de requisições da Groq atingido. Tente novamente em instantes.",
                    status_code=429,
                ) from exc

            # Se o modelo foi descontinuado, tenta o próximo da lista
            if exc.code == 400 and "model_decommissioned" in raw:
                last_error = GroqError(
                    f"Erro da API Groq ({exc.code}): {raw[:300]}", status_code=502
                )
                continue

            raise GroqError(
                f"Erro da API Groq ({exc.code}): {raw[:300]}", status_code=502
            ) from exc

        except urllib.error.URLError as exc:
            raise GroqError(
                f"Falha de conexão com a Groq: {exc.reason}", status_code=503
            ) from exc

    # Todos os modelos da lista falharam por descontinuação
    raise last_error or GroqError(
        "Nenhum modelo disponível na Groq no momento.", status_code=502
    )
