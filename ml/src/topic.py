import json
import re
from pathlib import Path
from typing import Optional

_TOPIC_MODEL_JSON = Path(__file__).resolve().parents[1] / "models" / "sentiment" / "topics.json"

_TOPIC_PROFILES = None


def _normalize_tokens(text: str) -> set[str]:
	return set(re.findall(r"[\w\u0600-\u06FF]+", text.lower()))


def _load_profiles_once() -> None:
	global _TOPIC_PROFILES

	if _TOPIC_PROFILES is not None:
		return

	if not _TOPIC_MODEL_JSON.exists():
		_TOPIC_PROFILES = []
		return

	payload = json.loads(_TOPIC_MODEL_JSON.read_text(encoding="utf-8"))
	custom_labels = payload.get("custom_labels", [])
	topic_representations = payload.get("topic_representations", {})
	outlier_offset = int(payload.get("_outliers", 1))

	profiles = []

	for topic_id_str, words in topic_representations.items():
		if topic_id_str == "-1":
			continue

		try:
			topic_id = int(topic_id_str)
		except ValueError:
			continue

		label_idx = topic_id + outlier_offset
		if isinstance(custom_labels, list) and 0 <= label_idx < len(custom_labels):
			label = custom_labels[label_idx]
		else:
			label = f"topic_{topic_id}"

		keyword_tokens = {
			str(item[0]).strip().lower()
			for item in words[:20]
			if isinstance(item, list) and item and str(item[0]).strip()
		}

		if keyword_tokens:
			profiles.append((label, keyword_tokens))

	_TOPIC_PROFILES = profiles


def predict_topic(text: Optional[str]) -> str:
	normalized_text = (text or "").strip()
	if not normalized_text:
		raise RuntimeError("Topic prediction failed: empty input text")

	_load_profiles_once()

	if not _TOPIC_PROFILES:
		raise RuntimeError("Topic prediction failed: no topic profiles loaded")

	tokens = _normalize_tokens(normalized_text)
	if not tokens:
		raise RuntimeError("Topic prediction failed: tokenization produced no tokens")

	best_label = ""
	best_score = 0

	for label, keywords in _TOPIC_PROFILES:
		score = len(tokens.intersection(keywords))
		if score > best_score:
			best_score = score
			best_label = label

	if best_score > 0:
		return best_label

	raise RuntimeError("Topic prediction failed: no topic keyword overlap")

