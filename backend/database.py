import os
import platform
from pathlib import Path

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from time_utils import now_local

# Work around Windows Python 3.14 platform WMI hangs during SQLAlchemy import.
if os.name == "nt":
    arch = os.environ.get("PROCESSOR_ARCHITECTURE")
    if arch:
        platform.machine = lambda: arch

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "tickets.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class TopicDictionary(Base):
    __tablename__ = "topics_dictionary"

    id = Column(Integer, primary_key=True, index=True)
    topic_name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=now_local, nullable=False)
    updated_at = Column(DateTime, default=now_local, nullable=False)

    tickets = relationship("Ticket", back_populates="topic_ref")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    author = Column(String, default="unknown")

    # facebook / instagram
    platform = Column(String, nullable=False, index=True)
    source_link = Column(String, nullable=True)

    created_at = Column(DateTime, nullable=False, index=True)
    fetched_at = Column(DateTime, default=now_local, nullable=False)

    category = Column(String, nullable=False)
    category_manual = Column(String, nullable=True)
    manually_corrected = Column(Boolean, default=False, nullable=False)

    is_urgent = Column(Boolean, default=False, nullable=False)

    topic_id = Column(Integer, ForeignKey("topics_dictionary.id"), nullable=True)
    topic_ref = relationship("TopicDictionary", back_populates="tickets")

    sla_deadline = Column(DateTime, nullable=True)
    status = Column(String, default="open", nullable=False, index=True)


Base.metadata.create_all(bind=engine)
