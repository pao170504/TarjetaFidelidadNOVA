from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), nullable=False)
    telefono = Column(String(20), unique=True, nullable=False)
    codigo_qr = Column(String(50), unique=True, nullable=False)
    fecha_registro = Column(DateTime, server_default=func.now())
    modalidad_premio = Column(String(20), nullable=True)  # "2x50" | "4xgratis" | None

class Servicio(Base):
    __tablename__ = "servicios"
    id = Column(Integer, primary_key=True)
    categoria = Column(String(50), nullable=False)
    nombre = Column(String(100), unique=True, nullable=False)

class Sello(Base):
    __tablename__ = "sellos"
    id = Column(Integer, primary_key=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"))
    servicio = Column(String(100))
    fecha = Column(DateTime, server_default=func.now())
    canjeado = Column(Boolean, default=False)

class Canje(Base):
    __tablename__ = "canjes"
    id = Column(Integer, primary_key=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"))
    modalidad_premio = Column(String(20))
    fecha = Column(DateTime, server_default=func.now())

class Suscripcion(Base):
    __tablename__ = "suscripciones"
    id = Column(Integer, primary_key=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"))
    endpoint = Column(String(500), unique=True, nullable=False)
    p256dh = Column(String(200), nullable=False)
    auth = Column(String(100), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())