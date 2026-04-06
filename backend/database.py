from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "tickets.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

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

    is_urgent = Column(Boolean)

    topic = Column(String)

    sla_deadline = Column(DateTime)
    status = Column(String)

    fetched_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)