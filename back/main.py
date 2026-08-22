import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import secrets

from database import get_db, engine, Base
import models

Base.metadata.create_all(bind=engine)  # crea tablas si no existen (no rompe las que ya están)

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

# --- Listar clientes (panel admin) ---
@app.get("/clientes")
def listar_clientes(db: Session = Depends(get_db)):
    premio = db.query(models.Premio).filter(models.Premio.activo == True).first()
    clientes = db.query(models.Cliente).order_by(models.Cliente.fecha_registro.desc()).all()

    resultado = []
    for cliente in clientes:
        sellos_activos = db.query(models.Sello).filter(
            models.Sello.cliente_id == cliente.id,
            models.Sello.canjeado == False
        ).count()
        resultado.append({
            "nombre": cliente.nombre,
            "telefono": cliente.telefono,
            "codigo_qr": cliente.codigo_qr,
            "sellos_actuales": sellos_activos,
            "sellos_requeridos": premio.sellos_requeridos if premio else None,
        })
    return resultado

# --- Sumar sello (lo hace el admin) ---
@app.post("/sellos/{codigo_qr}")
def sumar_sello(codigo_qr: str, servicio: str = "", db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.codigo_qr == codigo_qr).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    nuevo_sello = models.Sello(cliente_id=cliente.id, servicio=servicio)
    db.add(nuevo_sello)
    db.commit()
    return {"mensaje": "Sello agregado", "cliente": cliente.nombre}

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

    premio = db.query(models.Premio).filter(models.Premio.activo == True).first()

    historial = db.query(models.Sello).filter(
        models.Sello.cliente_id == cliente.id
    ).order_by(models.Sello.fecha.desc()).all()

    return {
        "nombre": cliente.nombre,
        "telefono": cliente.telefono,
        "codigo_qr": cliente.codigo_qr,
        "sellos_actuales": sellos_activos,
        "sellos_requeridos": premio.sellos_requeridos if premio else None,
        "premio": premio.descripcion if premio else "Sin premio configurado",
        "historial": [
            {
                "servicio": sello.servicio or "Servicio",
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

    premio = db.query(models.Premio).filter(models.Premio.activo == True).first()
    if not premio:
        raise HTTPException(status_code=400, detail="No hay premio configurado")

    sellos_activos = db.query(models.Sello).filter(
        models.Sello.cliente_id == cliente.id,
        models.Sello.canjeado == False
    ).all()
    if len(sellos_activos) < premio.sellos_requeridos:
        raise HTTPException(status_code=400, detail="Aún no completa los sellos requeridos")

    for sello in sellos_activos:
        sello.canjeado = True

    nuevo_canje = models.Canje(cliente_id=cliente.id, premio_id=premio.id)
    db.add(nuevo_canje)
    db.commit()

    return {"mensaje": "Premio canjeado", "cliente": cliente.nombre}