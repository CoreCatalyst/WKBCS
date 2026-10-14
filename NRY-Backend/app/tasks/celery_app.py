import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "noryvanta_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_routes={
        "tasks.send_otp_*": {"queue": "high_priority"},
        "tasks.generate_tax_invoice": {"queue": "default"},
        "tasks.reconcile_escrow": {"queue": "scheduled_beat"}
    }
)
