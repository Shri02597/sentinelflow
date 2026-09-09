"""
Base interface for detectors. Each detector inspects the latest RequestLog
(plus recent history) and optionally returns a dict describing a detected
security event. Returning None means "no detection."

Adding a new detector = subclass Detector, implement `check`, register it
in services/detection_engine.py's DETECTORS list.
"""
from abc import ABC, abstractmethod
from typing import Optional
from sqlalchemy.orm import Session

from app.models.request_log import RequestLog


class Detector(ABC):
    name: str = "base"

    @abstractmethod
    def check(self, db: Session, log: RequestLog) -> Optional[dict]:
        """
        Return a dict shaped like:
        {
            "attack_type": AttackType,
            "severity": Severity,
            "event_type": str,
            "description": str,
            "confidence": float,
            "is_repeat": bool,
        }
        or None if nothing was detected.
        """
        raise NotImplementedError
