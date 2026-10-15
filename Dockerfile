# ==============================================================================
# ÉTAPE 1 : Le "Builder" (Compilateur et téléchargement du cache)
# ==============================================================================
FROM docker.io/library/python:3.12-slim AS builder

# 1. Dépendances système temporaires nécessaires au téléchargement
RUN apt-get -o APT::Sandbox::User=root update && apt-get -o APT::Sandbox::User=root install -y --no-install-recommends \
    curl \
    tar \
    ca-certificates \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# 2. Installation de Tectonic (binaire statique Linux x86_64)
ARG TECTONIC_VERSION=0.15.0
RUN curl -L "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
    | tar -xz --no-same-owner -C /usr/local/bin/

# 3. Réchauffement du cache Tectonic
# On définit le répertoire de cache explicitement
ENV TECTONIC_CACHE_DIR=/app/tectonic_cache
WORKDIR /build

# On génère un fichier LaTeX factice contenant TOUS les paquets du template
RUN echo '\
\\documentclass{article}\n\
\\usepackage[utf8]{inputenc}\n\
\\usepackage[top=1cm,bottom=1cm,left=1.8cm,right=1.8cm]{geometry}\n\
\\usepackage{eurosym}\n\
\\usepackage{colortbl}\n\
\\usepackage{graphicx}\n\
\\usepackage[french]{babel}\n\
\\usepackage{ltablex}\n\
\\begin{document}\n\
Warmup compilation for Tectonic.\n\
\\end{document}' > warmup.tex

# On compile pour forcer Tectonic à télécharger et stocker les paquets dans le cache
RUN tectonic warmup.tex && rm -rf warmup.*


# ==============================================================================
# ÉTAPE 2 : Image finale de production (légère et sécurisée)
# ==============================================================================
FROM docker.io/library/python:3.12-slim

# 1. Dépendances d'exécution (Tectonic a besoin de fontconfig pour les polices)
RUN apt-get -o APT::Sandbox::User=root update && apt-get -o APT::Sandbox::User=root install -y --no-install-recommends \
    fontconfig \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. Copie du binaire Tectonic du builder
COPY --from=builder /usr/local/bin/tectonic /usr/local/bin/tectonic

# 3. Définition des variables d'environnement de production
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TECTONIC_CACHE_DIR=/app/tectonic_cache \
    PYTHONPATH=/app/src

WORKDIR /app

# 4. Récupération du cache Tectonic
COPY --from=builder /app/tectonic_cache /app/tectonic_cache

# 5. Installation des dépendances Python du projet (lues depuis flake.nix)
RUN pip install --no-cache-dir \
    fastapi[standard] \
    uvicorn \
    python-multipart \
    jinja2 \
    pillow \
    pydantic \
    pypdf \
    pyjwt

# 6. Copie du code de l'application et des ressources
COPY src/ /app/src/
COPY html/ /app/html/
COPY assets/ /app/assets/

# 7. Création du dossier pour les bases de données SQLite persistantes
RUN mkdir -p /app/databases

# Exposer le port de l'application
EXPOSE 8000

# Lancer FastAPI via Uvicorn
CMD ["uvicorn", "expense_report_creator.main:app", "--host", "0.0.0.0", "--port", "8000"]