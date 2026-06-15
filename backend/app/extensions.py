"""
extensions.py
Instâncias de extensões Flask criadas aqui para evitar importações circulares.
Importar db daqui, nunca de app/__init__.py.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
