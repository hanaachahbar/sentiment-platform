import os
import platform
from pathlib import Path
from time_utils import now_local

# Work around Windows Python 3.14 platform WMI hangs during SQLAlchemy import.
if os.name == "nt":
    arch = os.environ.get("PROCESSOR_ARCHITECTURE")
    if arch:
        platform.machine = lambda: arch

from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "tickets.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class TopicDictionary(Base):
    __tablename__ = "topics_dictionary"

    id = Column(Integer, primary_key=True, index=True)
    topic_name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  # FIX: nullable=False, always has a value
    created_at = Column(DateTime, default=now_local)
    updated_at = Column(DateTime, default=now_local)
 # FIX: Add back-reference so you can do topic.tickets if needed
    tickets = relationship("Ticket", back_populates="topic_ref")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    author = Column(String)
    platform = Column(String)
    source_link = Column(String)
    created_at = Column(DateTime)

    category = Column(String)
    category_manual = Column(String, nullable=True)
    manually_corrected = Column(Boolean, default=False)

    is_urgent = Column(Boolean, default=False)

    topic_id = Column(Integer, ForeignKey("topics_dictionary.id"), nullable=True)
    # FIX: back_populates must match the relationship name on TopicDictionary
    topic_ref = relationship("TopicDictionary", back_populates="tickets")

    sla_deadline = Column(DateTime)
    status = Column(String)

    fetched_at = Column(DateTime, default=now_local)

Base.metadata.create_all(bind=engine)
