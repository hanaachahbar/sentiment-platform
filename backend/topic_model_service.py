import importlib.util
import logging
import os
from pathlib import Path
from types import ModuleType
from typing import Any, Callable, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

_TOPIC_MODEL = None
_TOPIC_MODEL_LOADED = False
_BERTOPIC_CLASS = None
_BERTOPIC_CHECKED = False
_LAST_TOPIC_SOURCE = "unknown"
_TOPIC_MODEL_DISABLED_REASON: Optional[str] = None

_DEFAULT_TOPIC_CONFIDENCE_THRESHOLD = 0.80
_DEFAULT_TOPIC_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

def _disable_topic_model_for_inference(reason: str) -> None:
    global _TOPIC_MODEL, _TOPIC_MODEL_DISABLED_REASON

    if _TOPIC_MODEL_DISABLED_REASON == reason:
        return

    _TOPIC_MODEL_DISABLED_REASON = reason
    _TOPIC_MODEL = None
    logger.warning("BERTopic inference disabled: %s.", reason)


def _log_topic_source(source: str, reason: str = "") -> None:
    global _LAST_TOPIC_SOURCE

    if _LAST_TOPIC_SOURCE == source:
        return

    _LAST_TOPIC_SOURCE = source

    if reason:
        logger.warning("Topic prediction source=%s (%s)", source, reason)
    else:
        logger.warning("Topic prediction source=%s", source)


def _project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_module(module_name: str, file_path: Path) -> Optional[ModuleType]:
    if not file_path.exists():
        return None

    spec = importlib.util.spec_from_file_location(module_name, str(file_path))
    if spec is None or spec.loader is None:
        return None

    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
        return module
    except Exception:
        logger.exception("Failed to load module %s from %s", module_name, file_path)
        return None


def _resolve_function(module: Optional[ModuleType], fn_name: str) -> Optional[Callable]:
    if module is None:
        return None
    fn = getattr(module, fn_name, None)
    return fn if callable(fn) else None


def _topic_confidence_threshold() -> float:
    raw = os.getenv("TOPIC_CONFIDENCE_THRESHOLD", str(_DEFAULT_TOPIC_CONFIDENCE_THRESHOLD)).strip()
    try:
        value = float(raw)
    except ValueError:
        return _DEFAULT_TOPIC_CONFIDENCE_THRESHOLD

    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def _resolve_topic_embedding_model() -> Optional[str]:
    raw = os.getenv("TOPIC_EMBEDDING_MODEL", "").strip()
    if raw:
        lowered = raw.lower()
        if lowered in {"none", "null", "off", "false", "disabled"}:
            return None
        return raw
    return _DEFAULT_TOPIC_EMBEDDING_MODEL


def _extract_max_confidence(probabilities: Any) -> Optional[float]:
    if probabilities is None:
        return None

    try:
        row = probabilities[0]
    except Exception:
        row = probabilities

    if row is None:
        return None

    if isinstance(row, (list, tuple)):
        if not row:
            return None
        try:
            return float(max(row))
        except Exception:
            return None

    try:
        arr = np.asarray(row, dtype=float)
    except Exception:
        try:
            return float(row)
        except Exception:
            return None

    if arr.size == 0:
        return None
    if arr.ndim == 0:
        return float(arr.item())
    return float(arr.max())


def _candidate_model_directories() -> list[Path]:
    root = _project_root()
    explicit = os.getenv("TOPIC_MODEL_DIRECTORY", "").strip()

    candidates = []
    if explicit:
        candidates.append(Path(explicit))

    candidates.append(root / "ml" / "models" / "algerie_telecom_bertopic")
    candidates.append(root / "ml" / "models" / "sentiment")

    unique_existing = []
    seen = set()
    for path in candidates:
        key = str(path.resolve()) if path.exists() else str(path)
        if key in seen:
            continue
        seen.add(key)
        if path.exists() and path.is_dir():
            unique_existing.append(path)

    return unique_existing


def get_topic_model_directory() -> Optional[Path]:
    candidates = _candidate_model_directories()
    return candidates[0] if candidates else None


def _load_bertopic_class():
    global _BERTOPIC_CLASS, _BERTOPIC_CHECKED

    if _BERTOPIC_CHECKED:
        return _BERTOPIC_CLASS

    _BERTOPIC_CHECKED = True

    try:
        module = importlib.import_module("bertopic")
    except Exception:
        logger.warning("BERTopic package is not available")
        return None

    topic_cls = getattr(module, "BERTopic", None)
    if topic_cls is None:
        logger.warning("BERTopic package loaded but BERTopic class was not found")
        return None

    _BERTOPIC_CLASS = topic_cls
    return _BERTOPIC_CLASS


def _topic_label_from_model(topic_model, topic_id: int) -> str:
    if topic_id == -1:
        return "Other Minor Issues"

    try:
        custom_labels = getattr(topic_model, "custom_labels_", None)
        outliers = int(getattr(topic_model, "_outliers", 1))
        index = topic_id + outliers
        if isinstance(custom_labels, list) and 0 <= index < len(custom_labels):
            label = str(custom_labels[index]).strip()
            if label:
                return label
    except Exception:
        pass

    try:
        topic_info = topic_model.get_topic_info()
        row = topic_info[topic_info["Topic"] == topic_id]
        if not row.empty:
            if "CustomName" in row.columns and row.iloc[0]["CustomName"]:
                return str(row.iloc[0]["CustomName"]).strip()
            if "Name" in row.columns and row.iloc[0]["Name"]:
                return str(row.iloc[0]["Name"]).strip()
    except Exception:
        pass

    return f"topic_{topic_id}"


def preload_topic_model() -> bool:
    global _TOPIC_MODEL, _TOPIC_MODEL_LOADED, _TOPIC_MODEL_DISABLED_REASON

    if _TOPIC_MODEL_LOADED:
        return _TOPIC_MODEL is not None

    _TOPIC_MODEL_LOADED = True
    _TOPIC_MODEL_DISABLED_REASON = None

    model_dir = get_topic_model_directory()
    if model_dir is None:
        logger.warning("No BERTopic model directory found. Topic model runtime disabled.")
        return False

    try:
        BERTopic = _load_bertopic_class()
        if BERTopic is None:
            return False

        embedding_model = _resolve_topic_embedding_model()
        if embedding_model is not None:
            _TOPIC_MODEL = BERTopic.load(str(model_dir), embedding_model=embedding_model)
        else:
            _TOPIC_MODEL = BERTopic.load(str(model_dir))

        if getattr(_TOPIC_MODEL, "embedding_model", None) is None:
            _disable_topic_model_for_inference("embedding model is not configured in saved BERTopic artifact")
            return False

        logger.info("BERTopic model loaded from %s", model_dir)
        return True
    except Exception:
        logger.exception("Failed to load BERTopic model from %s", model_dir)
        _TOPIC_MODEL = None
        return False


def predict_topic(text: str) -> Tuple[Optional[int], str]:
    normalized_text = (text or "").strip()
    if not normalized_text:
        raise RuntimeError("Topic prediction failed: empty text input")

    if _TOPIC_MODEL_DISABLED_REASON is not None:
        raise RuntimeError(f"Topic model is disabled: {_TOPIC_MODEL_DISABLED_REASON}")

    if not preload_topic_model() or _TOPIC_MODEL is None:
        raise RuntimeError("BERTopic model unavailable or not loaded")

    try:
        topics, probabilities = _TOPIC_MODEL.transform([normalized_text])

        predicted_topic_id = int(topics[0])
        final_topic_id = predicted_topic_id
        max_confidence = _extract_max_confidence(probabilities)
        threshold = _topic_confidence_threshold()

        if max_confidence is not None and max_confidence < threshold:
            final_topic_id = -1

        topic_name = _topic_label_from_model(_TOPIC_MODEL, final_topic_id)

        if max_confidence is not None and final_topic_id == -1 and predicted_topic_id != -1:
            _log_topic_source(
                "bertopic",
                reason=f"confidence={max_confidence:.3f} below threshold={threshold:.2f}; routed to outlier",
            )
        else:
            _log_topic_source("bertopic")

        return final_topic_id, topic_name
    except Exception as exc:
        message = str(exc)
        if "No embedding model was found to embed the documents" in message:
            _disable_topic_model_for_inference("BERTopic transform cannot run without an embedding model")
            raise RuntimeError("Topic prediction failed: BERTopic transform cannot run without embedding model") from exc
        raise RuntimeError(f"Topic prediction failed: {message}") from exc


def run_monthly_topic_update() -> bool:
    if _load_bertopic_class() is None:
        logger.info("Monthly topic update skipped: BERTopic dependency unavailable")
        return False

    model_dir = get_topic_model_directory()
    if model_dir is None:
        logger.warning("Monthly topic update skipped: no model directory")
        return False

    data_file = os.getenv("MONTHLY_DATA_FILE", "").strip()
    if not data_file:
        logger.info("Monthly topic update skipped: MONTHLY_DATA_FILE is not set")
        return False

    data_path = Path(data_file)
    if not data_path.is_absolute():
        data_path = _project_root() / data_path

    if not data_path.exists():
        logger.warning("Monthly topic update skipped: data file does not exist (%s)", data_path)
        return False

    updater_module = _load_module(
        "ml_monthly_auto_updater_runtime",
        _project_root() / "ml" / "src" / "monthly_auto_updater.py",
    )
    run_fn = _resolve_function(updater_module, "run_monthly_pipeline")

    if run_fn is None:
        logger.warning("Monthly topic update skipped: run_monthly_pipeline not available")
        return False

    try:
        ok = bool(run_fn(str(data_path), str(model_dir)))
    except Exception:
        logger.exception("Monthly topic update execution failed")
        return False

    if ok:
        # Force reload of updated model on next request.
        global _TOPIC_MODEL_LOADED, _TOPIC_MODEL
        _TOPIC_MODEL = None
        _TOPIC_MODEL_LOADED = False
        preload_topic_model()

    return ok


def rename_topic_in_model(topic_id: int, new_name: str) -> bool:
    if _load_bertopic_class() is None:
        logger.info("Model rename skipped: BERTopic dependency unavailable")
        return False

    model_dir = get_topic_model_directory()
    if model_dir is None:
        logger.warning("Model rename skipped: no model directory")
        return False

    manager_module = _load_module(
        "ml_topic_manager_runtime",
        _project_root() / "ml" / "src" / "topic_manager.py",
    )
    rename_fn = _resolve_function(manager_module, "rename_topic")

    if rename_fn is None:
        logger.warning("Model rename skipped: rename_topic function not available")
        return False

    try:
        ok = bool(rename_fn(str(model_dir), int(topic_id), str(new_name)))
    except Exception:
        logger.exception("Model rename failed")
        return False

    if ok:
        global _TOPIC_MODEL_LOADED, _TOPIC_MODEL
        _TOPIC_MODEL = None
        _TOPIC_MODEL_LOADED = False
        preload_topic_model()

    return ok
