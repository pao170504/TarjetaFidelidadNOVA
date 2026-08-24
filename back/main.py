import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, text
import secrets

from database import get_db, engine, Base
import models
from push import notificar_cliente

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")

# Las dos modalidades de premio que puede tener asignada una clienta.
# Son fijas (definidas por el negocio), por eso van hardcodeadas acá en vez
# de vivir en una tabla editable desde el admin.
MODALIDADES_PREMIO = {
    "2x50": {"sellos_requeridos": 2, "descripcion": "50% de descuento en cualquier depilación"},
    "4xgratis": {"sellos_requeridos": 4, "descripcion": "Una depilación completamente gratis"},
}

def premio_de(cliente: models.Cliente):
    return MODALIDADES_PREMIO.get(cliente.modalidad_premio)

# Catálogo fijo de servicios que ofrece el studio. Se siembra en la tabla
# "servicios" al arrancar (si ya existen, ON CONFLICT los ignora), y el admin
# solo puede sumar sellos con un servicio que ya exista ahí.
CATALOGO_SERVICIOS = [
    ("Depilación", "Depilación con cera o hilo de cejas"),
    ("Depilación", "Bozo"),
    ("Depilación", "Mentón"),
    ("Depilación", "Barbilla"),
    ("Depilación", "Nariz"),
    ("Depilación", "Oído"),
    ("Depilación", "Rostro completo"),
    ("Cejas", "Pigmento semi permanente"),
    ("Cejas", "Pigmento larga duración"),
    ("Cejas", "Henna"),
    ("Cejas", "Laminado"),
    ("Cejas", "Micropigmentación"),
    ("Pestañas", "Lifting"),
    ("Pestañas", "Por punto"),
    ("Pestañas", "Extensiones pelo a pelo"),
    ("Cursos", "Maquillaje"),
    ("Cursos", "Depilación con cera y hilo"),
    ("Cursos", "Laminado de cejas"),
    ("Cursos", "Micropigmentación"),
    ("Cursos", "Pestañas por punto efecto anime"),
    ("Cursos", "Pestaña lifting, pelo a pelo"),
]

Base.metadata.create_all(bind=engine)  # crea tablas si no existen (no rompe las que ya están)

# create_all no agrega columnas nuevas a tablas que ya existen en producción,
# así que las columnas agregadas después de la primera versión se crean acá
# a mano (si ya existen, el IF NOT EXISTS hace que no pase nada).
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS modalidad_premio VARCHAR(20)"))
    conn.execute(text("ALTER TABLE canjes ADD COLUMN IF NOT EXISTS modalidad_premio VARCHAR(20)"))
    for categoria, nombre in CATALOGO_SERVICIOS:
        conn.execute(
            text("INSERT INTO servicios (categoria, nombre) VALUES (:categoria, :nombre) ON CONFLICT (nombre) DO NOTHING"),
            {"categoria": categoria, "nombre": nombre},
        )

app = FastAPI()

# En Render, definí la variable de entorno FRONTEND_URL con la URL de Vercel
# (ej: https://tarjeta-fidelidad.vercel.app) para no tener que tocar el código.
origenes = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://192.168.0.104:5173", "http://192.168.0.104:5174",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origenes.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Registrar cliente ---
@app.post("/clientes")
def registrar_cliente(nombre: str, telefono: str, db: Session = Depends(get_db)):
    existente = db.query(models.Cliente).filter(models.Cliente.telefono == telefono).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ese teléfono ya está registrado")

    codigo_qr = secrets.token_urlsafe(8)  # código único random para el link/QR
    nuevo_cliente = models.Cliente(nombre=nombre, telefono=telefono, codigo_qr=codigo_qr)
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    return nuevo_cliente

# --- Eliminar cliente (lo hace el admin) ---
@app.delete("/clientes/{codigo_qr}")
def eliminar_cliente(codigo_qr: str, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.codigo_qr == codigo_qr).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    db.query(models.Suscripcion).filter(models.Suscripcion.cliente_id == cliente.id).delete()
    db.query(models.Canje).filter(models.Canje.cliente_id == cliente.id).delete()
    db.query(models.Sello).filter(models.Sello.cliente_id == cliente.id).delete()
    db.delete(cliente)
    db.commit()

    return {"mensaje": "Cliente eliminado"}

# --- Listar clientes (panel admin) ---
@app.get("/clientes")
def listar_clientes(db: Session = Depends(get_db)):
    clientes = db.query(models.Cliente).order_by(models.Cliente.fecha_registro.desc()).all()

    resultado = []
    for cliente in clientes:
        premio = premio_de(cliente)
        sellos_activos = db.query(models.Sello).filter(
            models.Sello.cliente_id == cliente.id,
            models.Sello.canjeado == False
        ).count()
        resultado.append({
            "nombre": cliente.nombre,
            "telefono": cliente.telefono,
            "codigo_qr": cliente.codigo_qr,
            "sellos_actuales": sellos_activos,
            "sellos_requeridos": premio["sellos_requeridos"] if premio else None,
            "modalidad_premio": cliente.modalidad_premio,
        })
    return resultado

# --- Asignar/cambiar la modalidad de premio de una clienta (lo hace el admin) ---
@app.patch("/clientes/{codigo_qr}/modalidad")
def asignar_modalidad(codigo_qr: str, modalidad_premio: str, db: Session = Depends(get_db)):
    if modalidad_premio not in MODALIDADES_PREMIO:
        raise HTTPException(status_code=400, detail="Modalidad de premio inválida")

    cliente = db.query(models.Cliente).filter(models.Cliente.codigo_qr == codigo_qr).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    cliente.modalidad_premio = modalidad_premio
    db.commit()
    return {"mensaje": "Modalidad de premio asignada", "modalidad_premio": modalidad_premio}

# --- Listar catálogo de servicios ---
@app.get("/servicios")
def listar_servicios(db: Session = Depends(get_db)):
    servicios = db.query(models.Servicio).order_by(models.Servicio.id).all()
    return [{"categoria": s.categoria, "nombre": s.nombre} for s in servicios]

# --- Sumar sello (lo hace el admin) ---
@app.post("/sellos/{codigo_qr}")
def sumar_sello(codigo_qr: str, servicio: str, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.codigo_qr == codigo_qr).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    existe = db.query(models.Servicio).filter(models.Servicio.nombre == servicio).first()
    if not existe:
        raise HTTPException(status_code=400, detail="Elegí un servicio válido del catálogo")

    nuevo_sello = models.Sello(cliente_id=cliente.id, servicio=servicio)
    db.add(nuevo_sello)
    db.commit()

    premio = premio_de(cliente)
    if premio:
        sellos_activos = db.query(models.Sello).filter(
            models.Sello.cliente_id == cliente.id,
            models.Sello.canjeado == False
        ).count()
        if sellos_activos == premio["sellos_requeridos"]:
            notificar_cliente(
                db, cliente.id,
                titulo="¡Ya puedes reclamar tu premio! 🎉",
                cuerpo=premio["descripcion"],
                url=f"/c/{codigo_qr}",
            )

    return {"mensaje": "Sello agregado", "cliente": cliente.nombre}

# --- Clave pública VAPID (la usa el front para suscribirse) ---
@app.get("/push/clave-publica")
def clave_publica():
    return {"clave": VAPID_PUBLIC_KEY}

class SuscripcionIn(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

# --- Guardar suscripción push de una clienta ---
@app.post("/push/suscribirse/{codigo_qr}")
def suscribirse(codigo_qr: str, datos: SuscripcionIn, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.codigo_qr == codigo_qr).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    existente = db.query(models.Suscripcion).filter(
        models.Suscripcion.endpoint == datos.endpoint
    ).first()
    if existente:
        existente.cliente_id = cliente.id
        existente.p256dh = datos.p256dh
        existente.auth = datos.auth
    else:
        db.add(models.Suscripcion(
            cliente_id=cliente.id,
            endpoint=datos.endpoint,
            p256dh=datos.p256dh,
            auth=datos.auth,
        ))
    db.commit()
    return {"mensaje": "Suscripción guardada"}

# --- Consultar progreso (lo ve la clienta) ---
@app.get("/clientes/{codigo_qr}/progreso")
def ver_progreso(codigo_qr: str, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.codigo_qr == codigo_qr).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    sellos_activos = db.query(models.Sello).filter(
        models.Sello.cliente_id == cliente.id,
        models.Sello.canjeado == False
    ).count()

    premio = premio_de(cliente)

    historial = db.query(models.Sello).filter(
        models.Sello.cliente_id == cliente.id
    ).order_by(models.Sello.fecha.desc()).all()

    categoria_por_servicio = {s.nombre: s.categoria for s in db.query(models.Servicio).all()}

    def etiqueta_servicio(nombre: str) -> str:
        nombre = nombre or "Servicio"
        # "Bozo", "Mentón", etc. son partes del cuerpo, no se entienden solas
        # en el historial - las de la categoría Depilación se muestran como
        # "Depilación de Bozo" salvo que ya digan "Depilación" (como la de cejas).
        if categoria_por_servicio.get(nombre) == "Depilación" and not nombre.startswith("Depilación"):
            return f"Depilación de {nombre}"
        return nombre

    return {
        "nombre": cliente.nombre,
        "telefono": cliente.telefono,
        "codigo_qr": cliente.codigo_qr,
        "sellos_actuales": sellos_activos,
        "sellos_requeridos": premio["sellos_requeridos"] if premio else None,
        "premio": premio["descripcion"] if premio else "Sin modalidad de premio asignada",
        "modalidad_premio": cliente.modalidad_premio,
        "historial": [
            {
                "servicio": etiqueta_servicio(sello.servicio),
                "fecha": sello.fecha.strftime("%d %b") if sello.fecha else ""
            }
            for sello in historial
        ]
    }

# --- Canjear premio (lo hace el admin) ---
@app.post("/canjes/{codigo_qr}")
def canjear_premio(codigo_qr: str, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.codigo_qr == codigo_qr).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    premio = premio_de(cliente)
    if not premio:
        raise HTTPException(status_code=400, detail="Esta clienta no tiene una modalidad de premio asignada")

    sellos_activos = db.query(models.Sello).filter(
        models.Sello.cliente_id == cliente.id,
        models.Sello.canjeado == False
    ).all()
    if len(sellos_activos) < premio["sellos_requeridos"]:
        raise HTTPException(status_code=400, detail="Aún no completa los sellos requeridos")

    for sello in sellos_activos:
        sello.canjeado = True

    nuevo_canje = models.Canje(cliente_id=cliente.id, modalidad_premio=cliente.modalidad_premio)
    db.add(nuevo_canje)
    db.commit()

    return {"mensaje": "Premio canjeado", "cliente": cliente.nombre}