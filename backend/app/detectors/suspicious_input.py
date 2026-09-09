import re
from typing import Optional
from sqlalchemy.orm import Session

from app.detectors.base import Detector
from app.models.request_log import RequestLog
from app.models.security_event import AttackType, Severity

# Predefined, well-known signature patterns used purely for DEFENSIVE
# detection of malicious-looking input submitted to this application's
# own endpoints. This is not an offensive toolkit.
SQLI_PATTERNS = [
    r"(\bunion\b.+\bselect\b)", r"(\bor\b\s+1\s*=\s*1)", r"(--\s*$)", r"(;\s*drop\s+table)",
]
XSS_PATTERNS = [
    r"<script.*?>", r"onerror\s*=", r"javascript:", r"<img[^>]+onerror",
]
PATH_TRAVERSAL_PATTERNS = [
    r"\.\./", r"\.\.\\", r"%2e%2e%2f", r"/etc/passwd",
]

CATEGORY_PATTERNS = {
    "SQL_INJECTION_LIKE": SQLI_PATTERNS,
    "XSS_LIKE": XSS_PATTERNS,
    "PATH_TRAVERSAL_LIKE": PATH_TRAVERSAL_PATTERNS,
}

COMPILED = {
    category: [re.compile(p, re.IGNORECASE) for p in patterns]
    for category, patterns in CATEGORY_PATTERNS.items()
}


class SuspiciousInputDetector(Detector):
    """
    Scans a captured request field (e.g. search query, form field) that the
    middleware attaches to the RequestLog's transient `.raw_input` attribute
    for this request only (never persisted in full — see middleware).
    """
    name = "suspicious_input"

    def check(self, db: Session, log: RequestLog) -> Optional[dict]:
        raw_input = getattr(log, "raw_input", None)
        if not raw_input:
            return None

        for category, patterns in COMPILED.items():
            for pattern in patterns:
                if pattern.search(raw_input):
                    return {
                        "attack_type": AttackType.SUSPICIOUS_INPUT,
                        "severity": Severity.HIGH,
                        "event_type": "input_validation",
                        "description": (
                            f"Suspicious input pattern matching category '{category}' "
                            f"submitted to {log.endpoint} from {log.source_ip}."
                        ),
                        "confidence": 0.75,
                        "is_repeat": False,
                        "meta": {"category": category},
                    }
        return None
