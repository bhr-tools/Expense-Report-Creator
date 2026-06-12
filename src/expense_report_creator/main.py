"""Point d'entrée de l'API FastAPI.

Ce module configure l'application, intègre les middlewares (CORS),
rattache les différents routeurs d'API, et initialise les bases de données.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_databases
from .routers.admin import router as admin_router
from .routers.auth import router as auth_router
from .routers.club import router as club_router
from .routers.expense_report import router as expense_report_router

app = FastAPI(title="N7 Trésorerie API", version="1.0")

# Autorisation de CORS pour le développement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    """Initialise les bases de données au démarrage de l'API."""
    init_databases()


# Rattachement des routeurs modulaires
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(club_router)
app.include_router(expense_report_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("expense_report_creator.main:app", host="0.0.0.0", port=8000, reload=True)
