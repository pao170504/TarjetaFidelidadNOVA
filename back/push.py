import json
import os

from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

import models

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:cambiame@tudominio.com")


def notificar_cliente(db: Session, cliente_id, titulo: str, cuerpo: str, url: str = "/"):
    if not VAPID_PRIVATE_KEY:
        return  # notificaciones no configuradas todavía

    suscripciones = db.query(models.Suscripcion).filter(
        models.Suscripcion.cliente_id == cliente_id
    ).all()

    payload = json.dumps({"titulo": titulo, "cuerpo": cuerpo, "url": url})

    for sub in suscripciones:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
            )
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else None
            if status in (404, 410):
                # la suscripción ya no es válida (el navegador la revocó)
                db.delete(sub)
                db.commit()
