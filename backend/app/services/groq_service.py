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

GROQ_MODELS: list[tuple[str, int]] = [
    ("llama-3.3-70b-versatile", 12_000),
    ("llama-3.1-8b-instant", 20_000),
    ("llama-3.1-70b-versatile", 12_000),
    ("openai/gpt-oss-120b", 8_000),
]
MAX_TOKENS = 4096

_SAFETY_MARGIN_TOKENS = 500
_CHARS_PER_TOKEN_ESTIMATE = 3.0


def _estimate_tokens(text: str) -> int:
    return int(len(text) / _CHARS_PER_TOKEN_ESTIMATE) + 1


def _truncate_for_budget(text: str, system_prompt: str, tpm_limit: int) -> str:
    overhead = _estimate_tokens(system_prompt) + MAX_TOKENS + _SAFETY_MARGIN_TOKENS
    budget_tokens = tpm_limit - overhead

    if budget_tokens <= 0:
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
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def call_groq(
    *,
    system_prompt: str,
    user_message: str,
    groq_key: str,
    temperature: float = 0.3,
    response_format: str | None = None,
) -> str:
    if not groq_key or not groq_key.strip():
        raise GroqError("X-Groq-Key ausente ou vazio.", status_code=400)

    last_error: GroqError | None = None

    for model_name, tpm_limit in GROQ_MODELS:
        truncated_message = _truncate_for_budget(user_message, system_prompt, tpm_limit)
        payload: dict[str, Any] = {
            "model": model_name,
            "max_tokens": MAX_TOKENS,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": truncated_message},
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

            # 429, 400 (model decommissioned) e 413 → tenta próximo modelo
            if exc.code in (429, 413) or (
                exc.code == 400 and "model_decommissioned" in raw
            ):
                last_error = GroqError(
                    f"Modelo {model_name} indisponível ({exc.code}), tentando próximo...",
                    status_code=502,
                )
                continue

            raise GroqError(
                f"Erro da API Groq ({exc.code}): {raw[:300]}", status_code=502
            ) from exc

        except urllib.error.URLError as exc:
            raise GroqError(
                f"Falha de conexão com a Groq: {exc.reason}", status_code=503
            ) from exc

    raise last_error or GroqError(
        "Nenhum modelo disponível na Groq no momento. Tente novamente em instantes.",
        status_code=502,
    )
