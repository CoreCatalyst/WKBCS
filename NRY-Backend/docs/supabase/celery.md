# Celery Asynchronous Processing Architecture: Noryvanta

## 1. Overview
Noryvanta utilizes **Celery** with **Redis** as the message broker and result backend to offload all resource-intensive, non-blocking, and scheduled tasks from the main HTTP FastAPI event loop.

```
+--------------------+            +--------------------+            +--------------------+
|  FastAPI Endpoints | ---------> |   Redis Broker     | ---------> |   Celery Workers   |
|  (User Requests)   | task.delay |   (Queue Store)    | pulls jobs |  (Distributed CPUs)|
+--------------------+            +--------------------+            +---------+----------+
                                                                              |
                                                    +-------------------------+-------------------------+
                                                    |                         |                         |
                                                    v                         v                         v
                                          [OTP SMS / Email]         [GST Tax E-Invoicing]      [Escrow Reconciliation]
```

---

## 2. Dedicated Task Queues & Priorities

To prevent background jobs (like batch report generation) from blocking real-time critical tasks (such as OTP SMS dispatch), tasks are partitioned across three dedicated queues:

| Queue Name | Concurrency / Workers | Priority | Tasks Assigned |
| :--- | :--- | :--- | :--- |
| `high_priority` | 4 workers | Urgent (10) | `send_otp_sms`, `send_otp_email`, `send_escrow_funded_alert` |
| `default` | 2 workers | Normal (5) | `generate_tax_invoice_pdf`, `notify_vendor_new_order`, `upload_media_s3` |
| `scheduled_beat` | 1 worker | Low (1) | `daily_escrow_settlement`, `poll_logistics_status`, `check_expired_rfqs` |

---

## 3. Celery Task Implementations

### 1. High-Priority OTP Dispatch Task
```python
from app.tasks.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.send_otp_sms", queue="high_priority", max_retries=3)
def send_otp_sms_task(phone_number: str, otp_code: str):
    try:
        # Integrated with SMS Gateway (Twilio / Gupshup / MSG91)
        logger.info(f"[SMS Gateway] Dispatched OTP {otp_code} to {phone_number}")
        return {"status": "DELIVERED", "recipient": phone_number}
    except Exception as exc:
        logger.error(f"Failed to dispatch SMS: {exc}")
        raise send_otp_sms_task.retry(exc=exc, countdown=5)
```

### 2. Tax Invoice & E-Way Bill Generation Task
```python
@celery_app.task(name="tasks.generate_e_invoice", queue="default")
def generate_e_invoice_task(order_id: str):
    logger.info(f"Generating GST E-Invoice with IRN for Order {order_id}")
    # Compiles PDF with ReportLab / WeasyPrint and uploads to Supabase S3 bucket
    return {"order_id": order_id, "invoice_url": f"/invoices/{order_id}.pdf"}
```

---

## 4. Periodic Schedules (Celery Beat)
Configured in `celery_app.py`:
- **Every 15 minutes**: Check active shipments against logistics tracking APIs.
- **Daily at 00:01 IST**: Compile previous day's Platform Fee & TDS (Sec 194-O) reports for accountants.
- **Hourly**: Sweep unverified draft purchase orders older than 72 hours.
