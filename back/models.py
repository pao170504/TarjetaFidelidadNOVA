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

class Premio(Base):
    __tablename__ = "premios"
    id = Column(Integer, primary_key=True)
    descripcion = Column(String(150), nullable=False)
    sellos_requeridos = Column(Integer, nullable=False)
    activo = Column(Boolean, default=True)

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
    premio_id = Column(Integer, ForeignKey("premios.id"))
    fecha = Column(DateTime, server_default=func.now())

class Suscripcion(Base):
    __tablename__ = "suscripciones"
    id = Column(Integer, primary_key=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"))
    endpoint = Column(String(500), unique=True, nullable=False)
    p256dh = Column(String(200), nullable=False)
    auth = Column(String(100), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())