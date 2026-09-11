from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.database.session import engine, Base
import app.models

def ensure_db_migrations():
    try:
        import sqlite3
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cols = [row[1] for row in cursor.execute("PRAGMA table_info(screenings)").fetchall()]
            if cols and "ai_context" not in cols:
                cursor.execute("ALTER TABLE screenings ADD COLUMN ai_context TEXT;")
                conn.commit()
                print("Auto-migrated screenings table with ai_context column.")
            if cols and "reviewed" not in cols:
                cursor.execute("ALTER TABLE screenings ADD COLUMN reviewed BOOLEAN DEFAULT 0;")
                conn.commit()
                print("Auto-migrated screenings table with reviewed column.")
            conn.close()
    except Exception as e:
        print("Migration check note:", e)

ensure_db_migrations()
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, set this to FRONTEND_URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded retinal fundus images and Grad-CAM heatmaps
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}

from app.api.api import api_router

app.include_router(api_router, prefix=settings.API_V1_STR)


