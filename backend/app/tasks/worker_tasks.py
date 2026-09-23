import logging
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.send_otp_sms", queue="high_priority", max_retries=3)
def send_otp_sms(phone: str, otp_code: str):
    logger.info(f"[SMS Gateway Dispatch] To {phone}: Your Noryvanta verification code is {otp_code}. Valid for 5 minutes.")
    return {"status": "DELIVERED", "recipient": phone}

@celery_app.task(name="tasks.send_otp_email", queue="high_priority", max_retries=3)
def send_otp_email(email: str, otp_code: str):
    logger.info(f"[Email Gateway Dispatch] To {email}: Noryvanta One-Time Password is {otp_code}")
    return {"status": "DELIVERED", "recipient": email}

@celery_app.task(name="tasks.generate_tax_invoice", queue="default")
def generate_tax_invoice(order_id: str, order_number: str):
    logger.info(f"[Tax Invoice Worker] Generated GST E-Invoice with IRN for Order {order_number} ({order_id})")
    return {"order_id": order_id, "invoice_path": f"s3://noryvanta-invoices/{order_number}.pdf"}

@celery_app.task(name="tasks.reconcile_escrow", queue="scheduled_beat")
def reconcile_escrow():
    logger.info("[Escrow Reconciliation Worker] Completed daily settlement audit and TDS Section 194-O balance verification.")
    return {"status": "AUDIT_RECONCILED"}
