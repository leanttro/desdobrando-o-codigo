"""
file_parser.py
Processa arquivos enviados pelo usuário (zip ou arquivos soltos) e extrai
o conteúdo em texto para análise pela Groq.
"""

from __future__ import annotations

import io
import zipfile
from typing import BinaryIO

from werkzeug.datastructures import FileStorage

# Extensões de código suportadas
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rb", ".php",
    ".cs", ".cpp", ".c", ".h", ".rs", ".swift", ".kt", ".scala",
    ".html", ".css", ".scss", ".sass", ".less",
    ".json", ".yaml", ".yml", ".toml", ".env", ".ini", ".cfg",
    ".md", ".txt", ".sh", ".bash", ".zsh", ".dockerfile",
    ".sql", ".graphql", ".proto",
}

# Pastas que devem ser ignoradas
IGNORED_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".pytest_cache",
    ".mypy_cache", "vendor",
}

MAX_FILE_SIZE_BYTES = 100_000   # 100 KB por arquivo individual
MAX_TOTAL_CHARS = 120_000       # limite total enviado ao prompt
MAX_FILES = 50                  # máximo de arquivos extraídos


class FileParserError(Exception):
    """Erros de parsing de arquivo."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _is_supported(filename: str) -> bool:
    """Verifica se a extensão do arquivo é suportada."""
    lower = filename.lower()
    # Dockerfile sem extensão
    if lower.endswith("dockerfile") or lower == "makefile":
        return True
    dot = lower.rfind(".")
    if dot == -1:
        return False
    return lower[dot:] in CODE_EXTENSIONS


def _in_ignored_dir(path: str) -> bool:
    """Verifica se o arquivo está dentro de uma pasta ignorada."""
    parts = path.replace("\\", "/").split("/")
    return any(part in IGNORED_DIRS for part in parts)


def _decode_bytes(raw: bytes, filename: str) -> str:
    """Tenta decodificar bytes como UTF-8, com fallback para latin-1."""
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return raw.decode(encoding)
        except (UnicodeDecodeError, ValueError):
            continue
    return f"[Arquivo {filename} não pôde ser decodificado como texto]"


def _extract_from_zip(file_obj: BinaryIO) -> str:
    """Extrai e concatena o conteúdo de arquivos suportados dentro de um zip."""
    parts: list[str] = []
    total_chars = 0
    file_count = 0

    try:
        with zipfile.ZipFile(file_obj, "r") as zf:
            entries = sorted(zf.namelist())
            for name in entries:
                if file_count >= MAX_FILES:
                    parts.append(f"\n[Limite de {MAX_FILES} arquivos atingido — demais ignorados]")
                    break

                # Ignora diretórios e pastas bloqueadas
                if name.endswith("/") or _in_ignored_dir(name):
                    continue

                if not _is_supported(name):
                    continue

                info = zf.getinfo(name)
                if info.file_size > MAX_FILE_SIZE_BYTES:
                    parts.append(f"\n### {name}\n[Arquivo muito grande ({info.file_size // 1024} KB) — ignorado]\n")
                    continue

                try:
                    raw = zf.read(name)
                except Exception:
                    continue

                content = _decode_bytes(raw, name)
                block = f"\n### {name}\n```\n{content}\n```\n"

                if total_chars + len(block) > MAX_TOTAL_CHARS:
                    parts.append("\n[Limite de caracteres atingido — arquivos restantes ignorados]")
                    break

                parts.append(block)
                total_chars += len(block)
                file_count += 1

    except zipfile.BadZipFile as exc:
        raise FileParserError("Arquivo ZIP inválido ou corrompido.") from exc

    if not parts:
        raise FileParserError("Nenhum arquivo de código suportado encontrado no ZIP.")

    return "".join(parts)


def _extract_single_file(storage: FileStorage) -> str:
    """Extrai conteúdo de um único arquivo enviado."""
    filename = storage.filename or "arquivo"

    if not _is_supported(filename):
        raise FileParserError(
            f"Tipo de arquivo não suportado: '{filename}'. "
            f"Envie arquivos de código ou um ZIP."
        )

    raw = storage.read(MAX_FILE_SIZE_BYTES + 1)
    if len(raw) > MAX_FILE_SIZE_BYTES:
        raise FileParserError(
            f"Arquivo '{filename}' excede o limite de {MAX_FILE_SIZE_BYTES // 1024} KB."
        )

    content = _decode_bytes(raw, filename)
    return f"### {filename}\n```\n{content}\n```\n"


def parse_uploaded_files(files: list[FileStorage]) -> str:
    """
    Ponto de entrada principal.
    Recebe a lista de FileStorage do Flask e retorna uma string
    com o conteúdo concatenado de todos os arquivos.

    Args:
        files: Lista de arquivos vindos de request.files.getlist("files")

    Returns:
        String com o conteúdo extraído, pronto para enviar ao prompt.

    Raises:
        FileParserError: Se nenhum arquivo válido for encontrado.
    """
    if not files:
        raise FileParserError("Nenhum arquivo enviado.")

    parts: list[str] = []

    for storage in files:
        filename = storage.filename or ""
        if not filename:
            continue

        if filename.lower().endswith(".zip"):
            zip_content = _extract_from_zip(storage.stream)
            parts.append(zip_content)
        else:
            file_content = _extract_single_file(storage)
            parts.append(file_content)

    if not parts:
        raise FileParserError(
            "Nenhum arquivo de código válido encontrado. "
            "Envie arquivos .py, .js, .ts, .json, .yaml ou um ZIP."
        )

    combined = "\n".join(parts)

    # Truncagem final de segurança
    if len(combined) > MAX_TOTAL_CHARS:
        combined = combined[:MAX_TOTAL_CHARS] + "\n\n[Conteúdo truncado por exceder o limite]"

    return combined
