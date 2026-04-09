import importlib.util
import logging
import os
from pathlib import Path
from types import ModuleType
from typing import Callable, Optional

logger = logging.getLogger(__name__)

_CATEGORY_PREDICTOR: Optional[Callable[[str], str]] = None
_TOPIC_PREDICTOR: Optional[Callable[[str], str]] = None
_URGENT_PREDICTOR: Optional[Callable[[str], object]] = None
_PREDICTORS_LOADED = False
_RUNTIME_ERROR_KEYS: set[str] = set()


def _log_exception_once(key: str, message: str, *args) -> None:
    if key in _RUNTIME_ERROR_KEYS:
        return

    _RUNTIME_ERROR_KEYS.add(key)
    logger.exception(message, *args)


def _load_module(module_name: str, file_path: Path) -> Optional[ModuleType]:
    if not file_path.exists():
        logger.warning("Model module not found: %s", file_path)
        return None

    spec = importlib.util.spec_from_file_location(module_name, str(file_path))
    if spec is None or spec.loader is None:
        return None

    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
        return module
    except Exception:
        logger.exception("Failed to load model module %s from %s", module_name, file_path)
        return None


def _resolve_predictor(module: Optional[ModuleType], candidates: list[str]) -> Optional[Callable[[str], str]]:
    if module is None:
        return None

    for name in candidates:
        fn = getattr(module, name, None)
        if callable(fn):
            return fn
    return None


def _load_predictors_once() -> None:
    global _PREDICTORS_LOADED, _CATEGORY_PREDICTOR, _TOPIC_PREDICTOR, _URGENT_PREDICTOR

    if _PREDICTORS_LOADED:
        return

    _PREDICTORS_LOADED = True

    if os.getenv("USE_ML_PREDICTORS", "true").lower() != "true":
        logger.warning("USE_ML_PREDICTORS is disabled; fallback logic will be used.")
        return

    project_root = Path(__file__).resolve().parents[1]
    ml_src = project_root / "ml" / "src"

    classifier_module = _load_module("ml_classifier_runtime", ml_src / "classifier.py")
    topic_module = _load_module("ml_topic_runtime", ml_src / "topic.py")
    sentiment_module = _load_module("ml_sentiment_runtime", ml_src / "sentiment.py")

    _CATEGORY_PREDICTOR = _resolve_predictor(
        classifier_module,
        ["predict_category", "predict_ticket_category", "classify_category", "infer_category"],
    )
    _TOPIC_PREDICTOR = _resolve_predictor(
        topic_module,
        ["predict_topic", "predict_topic_label", "classify_topic", "infer_topic"],
    )
    _URGENT_PREDICTOR = _resolve_predictor(
        sentiment_module,
        ["predict_urgency", "predict_ticket_urgency", "classify_urgency", "infer_urgency"],
    )

    if _CATEGORY_PREDICTOR is None:
        logger.warning("Category predictor unavailable; fallback category='Complaint' will be used.")
    if _TOPIC_PREDICTOR is None:
        logger.warning("Topic predictor unavailable; fallback topic='internet outage' will be used.")
    if _URGENT_PREDICTOR is None:
        logger.warning("Urgency predictor unavailable; fallback urgency rules will be used.")


def _run_predictor(predictor: Optional[Callable[[str], str]], text: str) -> Optional[str]:
    if predictor is None:
        return None

    try:
        value = predictor(text)
    except Exception:
        predictor_name = getattr(predictor, "__name__", "unknown")
        _log_exception_once(
            f"predictor_runtime:{predictor_name}",
            "Error while running predictor %s; fallback will be used.",
            predictor_name,
        )
        return None

    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _normalize_category(category: str) -> str:
    mapping = {
        "Information Request": "Inquiry",
        "Service Request": "Request",
    }
    return mapping.get(category, category)


def _coerce_urgency(value: object) -> Optional[bool]:
    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return bool(value)

    if isinstance(value, str):
        normalized = value.strip().lower()

        truthy = {
            "true",
            "urgent",
            "yes",
            "high",
            "1",
            "escalation",
            "complaint",
        }
        falsy = {
            "false",
            "not urgent",
            "normal",
            "low",
            "no",
            "0",
            "neutral",
            "other",
            "compliment",
            "inquiry",
            "question",
        }

        if normalized in truthy:
            return True
        if normalized in falsy:
            return False

    return None


def get_predictors_runtime_status() -> dict[str, object]:
    _load_predictors_once()

    enabled = os.getenv("USE_ML_PREDICTORS", "true").lower() == "true"
    missing: list[str] = []

    category_available = _CATEGORY_PREDICTOR is not None
    topic_available = _TOPIC_PREDICTOR is not None
    urgency_available = _URGENT_PREDICTOR is not None

    if not category_available:
        missing.append("category")
    if not topic_available:
        missing.append("topic")
    if not urgency_available:
        missing.append("urgency")

    return {
        "ml_predictors_enabled": enabled,
        "category_available": category_available,
        "topic_available": topic_available,
        "urgency_available": urgency_available,
        "all_available": enabled and not missing,
        "missing": missing,
    }


def predict_category(text: str) -> str:
    _load_predictors_once()

    value = _run_predictor(_CATEGORY_PREDICTOR, text)
    if value:
        return _normalize_category(value)

    return "Complaint"


def predict_topic(text: str) -> str:
    _load_predictors_once()

    value = _run_predictor(_TOPIC_PREDICTOR, text)
    if value:
        return value

    return "internet outage"


def predict_urgency(category: str, text: str = "") -> bool:
    _load_predictors_once()

    if _URGENT_PREDICTOR is not None and text:
        try:
            value = _URGENT_PREDICTOR(text)
            parsed = _coerce_urgency(value)
            if parsed is not None:
                return parsed
        except Exception:
            _log_exception_once(
                "predictor_runtime:urgency",
                "Error while running urgency predictor; category-based fallback will be used.",
            )

    normalized = _normalize_category(category)
    return normalized in ("Complaint", "Escalation")
