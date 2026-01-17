from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, func
from db import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)

    user_id = Column(Integer, nullable=False, index=True)
    user_first_name = Column(String(100), nullable=False)
    user_last_name = Column(String(100), nullable=False)

    project_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    status = Column(Enum("ONGOING", "COMPLETED"), nullable=False, default="ONGOING", index=True)

    started_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    ended_at = Column(DateTime, nullable=True, index=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
