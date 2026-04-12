import os
import pytest
import numpy as np
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "../models/sentiment")

@pytest.fixture(scope="module")
def topic_model():
    assert os.path.exists(MODEL_PATH), f"❌ Model folder not found at {MODEL_PATH}"
    embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    return BERTopic.load(MODEL_PATH, embedding_model=embedding_model)

def test_model_is_loaded_correctly(topic_model):
    topic_info = topic_model.get_topic_info()
    assert not topic_info.empty
    assert "Topic" in topic_info.columns

def test_model_can_transform_single_comment(topic_model):
    test_comment = ["الانترنت ثقيلة جدا في الليل"]
    topics, probabilities = topic_model.transform(test_comment)
    
    # FIX: Accept both lists and numpy arrays
    assert isinstance(topics, (list, np.ndarray)), "❌ Topics output should be a list or array."
    assert len(topics) == 1, "❌ Should return exactly one topic ID."
    
    # FIX: Convert the numpy integer to a standard Python integer safely
    topic_id = int(topics[0])
    assert isinstance(topic_id, int), "❌ The assigned topic must be an integer ID."

def test_model_can_handle_noise(topic_model):
    noise_comment = ["شسيبل شسيبل شسيبل 1234 xyz"]
    topics, _ = topic_model.transform(noise_comment)
    assert isinstance(topics, (list, np.ndarray))
    assert len(topics) == 1