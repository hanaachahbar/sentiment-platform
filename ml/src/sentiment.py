import os
from pathlib import Path
from typing import Optional

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

_TOKENIZER = None
_MODEL = None

_MODEL_DIR = (
	Path(__file__).resolve().parents[1]
	/ "models"
	/ "classifier"
	/ "algerie_telecom_urgency"
)

_STRICT_TRUE_VALUES = {"1", "true", "yes", "on"}


def _strict_mode_enabled() -> bool:
	return os.getenv("ML_STRICT_MODE", "false").strip().lower() in _STRICT_TRUE_VALUES


def _fallback_default(reason: str) -> bool:
	if _strict_mode_enabled():
		raise RuntimeError(f"ML_STRICT_MODE blocked urgency fallback: {reason}")
	return False


def _load_model_once() -> None:
	global _TOKENIZER, _MODEL

	if _TOKENIZER is not None and _MODEL is not None:
		return

	_TOKENIZER = AutoTokenizer.from_pretrained(str(_MODEL_DIR), local_files_only=True)
	_MODEL = AutoModelForSequenceClassification.from_pretrained(
		str(_MODEL_DIR),
		local_files_only=True,
	)
	_MODEL.eval()


def _positive_label_index(num_labels: int) -> int:
	raw = os.getenv("URGENCY_POSITIVE_LABEL_INDEX", "1").strip()
	try:
		idx = int(raw)
	except ValueError:
		idx = 1

	if idx < 0:
		return 0
	if idx >= num_labels:
		return max(0, num_labels - 1)
	return idx


def _decode_urgency(pred_idx: int) -> bool:
	# If label names carry urgency semantics, trust them first.
	label_map = getattr(_MODEL.config, "id2label", {}) if _MODEL is not None else {}
	raw_label = str(label_map.get(pred_idx, "")).strip().lower()

	if raw_label in {"urgent", "high", "escalation", "complaint", "true", "1", "yes"}:
		return True
	if raw_label in {"not urgent", "normal", "low", "false", "0", "no"}:
		return False

	num_labels = int(getattr(_MODEL.config, "num_labels", 2)) if _MODEL is not None else 2
	return pred_idx == _positive_label_index(num_labels)


def predict_urgency(text: Optional[str]) -> bool:
	normalized_text = (text or "").strip()
	if not normalized_text:
		return _fallback_default("empty input text")

	try:
		_load_model_once()

		inputs = _TOKENIZER(
			normalized_text,
			return_tensors="pt",
			truncation=True,
			max_length=512,
		)

		with torch.no_grad():
			logits = _MODEL(**inputs).logits

		pred_idx = int(torch.argmax(logits, dim=-1).item())
		return _decode_urgency(pred_idx)
	except Exception as exc:
		return _fallback_default(f"inference runtime error: {exc}")


def predict_ticket_urgency(text: Optional[str]) -> bool:
	return predict_urgency(text)


def classify_urgency(text: Optional[str]) -> bool:
	return predict_urgency(text)


def infer_urgency(text: Optional[str]) -> bool:
	return predict_urgency(text)
