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
	/ "algerie_telecom_categories"
)

# LabelEncoder sorts labels alphabetically; this mapping follows the training convention.
_INDEX_TO_RAW_LABEL = {
	0: "interrogative",
	1: "negative",
	2: "off-topic",
	3: "positive",
	4: "suggestion",
}

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


def _decode_index(pred_idx: int) -> str:
	label = _INDEX_TO_RAW_LABEL.get(pred_idx)
	if label is None:
		raise RuntimeError(f"Classifier returned unknown label index: {pred_idx}")
	return label


def predict_category(text: Optional[str]) -> str:
	normalized_text = (text or "").strip()
	if not normalized_text:
		raise RuntimeError("Classifier prediction failed: empty input text")

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
		return _decode_index(pred_idx)
	except Exception as exc:
		raise RuntimeError(f"Classifier inference runtime error: {exc}") from exc

