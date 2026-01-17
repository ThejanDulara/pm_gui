import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import select, desc, and_
from db import SessionLocal, engine, Base
from models import Project

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)  # store naive UTC in MySQL DATETIME

app = Flask(__name__)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")
CORS(app, resources={r"/api/*": {"origins": frontend_origin}}, supports_credentials=True)

# Optional auto-create (safe)
if os.getenv("AUTO_CREATE_TABLES", "0") == "1":
    Base.metadata.create_all(bind=engine)

@app.get("/api/health")
def health():
    return {"ok": True}

def get_auth_from_request():
    """
    Child app auth: frontend sends the authenticated user info from mother app.
    We validate presence and basic types.
    """
    data = request.get_json(silent=True) or {}
    auth = data.get("auth") or {}

    user_id = auth.get("user_id")
    first_name = auth.get("first_name", "")
    last_name = auth.get("last_name", "")
    is_admin = bool(auth.get("is_admin"))

    if not user_id:
        return None, ("Missing auth.user_id", 401)

    return {
        "user_id": int(user_id),
        "first_name": str(first_name),
        "last_name": str(last_name),
        "is_admin": is_admin
    }, None

def project_to_dict(p: Project):
    return {
        "id": p.id,
        "user_id": p.user_id,
        "user_first_name": p.user_first_name,
        "user_last_name": p.user_last_name,
        "project_name": p.project_name,
        "description": p.description,
        "status": p.status,
        "started_at": p.started_at.isoformat() if p.started_at else None,
        "ended_at": p.ended_at.isoformat() if p.ended_at else None,
    }

@app.post("/api/projects/list")
def list_projects():
    """
    POST body:
    {
      "auth": { user_id, first_name, last_name, is_admin },
      "filters": { "status": "", "user_id": "" }   // user_id filter is admin only
    }
    """
    auth, err = get_auth_from_request()
    if err:
        msg, code = err
        return jsonify({"ok": False, "error": msg}), code

    data = request.get_json(silent=True) or {}
    filters = data.get("filters") or {}

    status = (filters.get("status") or "").strip()
    filter_user_id = filters.get("user_id")

    with SessionLocal() as db:
        conds = []

        if not auth["is_admin"]:
            conds.append(Project.user_id == auth["user_id"])
        else:
            if filter_user_id:
                conds.append(Project.user_id == int(filter_user_id))

        if status in ("ONGOING", "COMPLETED"):
            conds.append(Project.status == status)

        stmt = select(Project)
        if conds:
            stmt = stmt.where(and_(*conds))

        # Sorting rule:
        # Ongoing first (started_at desc), Completed later (ended_at desc)
        # We do this by pulling all and sorting in Python (simple + correct).
        rows = db.execute(stmt).scalars().all()

        ongoing = [r for r in rows if r.status == "ONGOING"]
        completed = [r for r in rows if r.status == "COMPLETED"]

        ongoing.sort(key=lambda x: x.started_at or datetime.min, reverse=True)
        completed.sort(key=lambda x: x.ended_at or datetime.min, reverse=True)

        items = [project_to_dict(x) for x in (ongoing + completed)]

        return jsonify({"ok": True, "items": items})

@app.post("/api/projects")
def create_project():
    """
    POST body:
    {
      "auth": { user_id, first_name, last_name, is_admin },
      "project_name": "...",
      "description": "..." (optional)
    }
    """
    auth, err = get_auth_from_request()
    if err:
        msg, code = err
        return jsonify({"ok": False, "error": msg}), code

    data = request.get_json(silent=True) or {}
    name = (data.get("project_name") or "").strip()
    desc_txt = (data.get("description") or "").strip()

    if not name:
        return jsonify({"ok": False, "error": "project_name is required"}), 400

    with SessionLocal() as db:
        p = Project(
            user_id=auth["user_id"],
            user_first_name=auth["first_name"],
            user_last_name=auth["last_name"],
            project_name=name,
            description=desc_txt if desc_txt else None,
            status="ONGOING",
            started_at=utcnow(),
            ended_at=None
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        return jsonify({"ok": True, "item": project_to_dict(p)})

@app.patch("/api/projects/<int:project_id>/status")
def update_status(project_id: int):
    """
    PATCH body:
    {
      "auth": { user_id, first_name, last_name, is_admin },
      "status": "ONGOING" | "COMPLETED"
    }
    """
    auth, err = get_auth_from_request()
    if err:
        msg, code = err
        return jsonify({"ok": False, "error": msg}), code

    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()

    if new_status not in ("ONGOING", "COMPLETED"):
        return jsonify({"ok": False, "error": "Invalid status"}), 400

    with SessionLocal() as db:
        p = db.get(Project, project_id)
        if not p:
            return jsonify({"ok": False, "error": "Project not found"}), 404

        # Authorization: owner OR admin
        if (not auth["is_admin"]) and (p.user_id != auth["user_id"]):
            return jsonify({"ok": False, "error": "Not allowed"}), 403

        p.status = new_status
        if new_status == "COMPLETED":
            if p.ended_at is None:
                p.ended_at = utcnow()
        else:
            # back to ongoing
            p.ended_at = None

        db.commit()
        db.refresh(p)
        return jsonify({"ok": True, "item": project_to_dict(p)})

if __name__ == "__main__":
    # Local run
    app.run(host="0.0.0.0", port=5000, debug=True)
