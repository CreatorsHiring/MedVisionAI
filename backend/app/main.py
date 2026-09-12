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
            
            # Screenings migrations
            s_cols = [row[1] for row in cursor.execute("PRAGMA table_info(screenings)").fetchall()]
            if s_cols and "ai_context" not in s_cols:
                cursor.execute("ALTER TABLE screenings ADD COLUMN ai_context TEXT;")
                conn.commit()
            if s_cols and "reviewed" not in s_cols:
                cursor.execute("ALTER TABLE screenings ADD COLUMN reviewed BOOLEAN DEFAULT 0;")
                conn.commit()

            # Users migrations
            u_cols = [row[1] for row in cursor.execute("PRAGMA table_info(users)").fetchall()]
            if u_cols and "is_activated" not in u_cols:
                cursor.execute("ALTER TABLE users ADD COLUMN is_activated BOOLEAN DEFAULT 0;")
                conn.commit()

            # Patients migrations
            p_cols = [row[1] for row in cursor.execute("PRAGMA table_info(patients)").fetchall()]
            if p_cols and "diabetes_type" not in p_cols:
                cursor.execute("ALTER TABLE patients ADD COLUMN diabetes_type TEXT;")
                conn.commit()
            if p_cols and "year_of_diagnosis" not in p_cols:
                cursor.execute("ALTER TABLE patients ADD COLUMN year_of_diagnosis INTEGER;")
                conn.commit()
            if p_cols and "existing_eye_conditions" not in p_cols:
                cursor.execute("ALTER TABLE patients ADD COLUMN existing_eye_conditions TEXT;")
                conn.commit()

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


