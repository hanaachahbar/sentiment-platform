"""Backward-compatible wrapper; use ai_service module directly."""

from ai_service import predict_category, predict_topic, predict_urgency

__all__ = ["predict_category", "predict_topic", "predict_urgency"]
