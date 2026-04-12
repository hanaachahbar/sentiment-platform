import os
import pytest
import tempfile
import numpy as np
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "../models/sentiment")

@pytest.fixture(scope="module")
def base_model():
    """Loads the baseline master model safely in read-only mode."""
    assert os.path.exists(MODEL_PATH), f"❌ Model folder not found at {MODEL_PATH}"
    embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    return BERTopic.load(MODEL_PATH, embedding_model=embedding_model)


def test_monthly_auto_updater_simulation(base_model):
    """
    Simulates the exact logic of the monthly cron job.
    """
    embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    
    # 1. Simulate a month of mixed traffic (Known + 5G + Total Garbage)
    mixed_traffic = [
        "الالياف البصرية كارثة في وهران", # Fiber 
        "المودم لا يشتعل ابدا",       # 4G 
    ] * 10 + [
        "عندي مشكل في شريحة 5G",     # 5G (High similarity to 4G)
        "طريقة تحضير البيتزا بالجبن", # Pizza (GUARANTEED Outlier)
    ] * 10 
    
    # 2. Predict and force unknowns into -1 using a STRICT threshold
    raw_topics, probabilities = base_model.transform(mixed_traffic)
    
    strict_topics = []
    print("\n--- AI CONFIDENCE SCORES ---")
    for i, prob in enumerate(probabilities):
        max_confidence = np.max(prob) if isinstance(prob, (list, np.ndarray)) else prob
        
        # Print the score to the terminal so we can see how it thinks
        if i % 10 == 0: # Print only a few to save space
            print(f"Comment: '{mixed_traffic[i][:20]}...' -> Confidence: {max_confidence:.2f}")
        
        # INCREASED THRESHOLD: Must be 80% confident!
        if max_confidence > 0.80: 
            strict_topics.append(int(raw_topics[i])) 
        else:
            strict_topics.append(-1) 

    # 3. Isolate the -1 bucket
    outlier_comments = [mixed_traffic[i] for i, topic_id in enumerate(strict_topics) if topic_id == -1]
    
    assert len(outlier_comments) > 0, "❌ The threshold logic failed to catch any outliers!"

    # 4. Train Mini-Model ONLY on the outliers
    mini_model = BERTopic(embedding_model=embedding_model, min_topic_size=3, language="multilingual")
    mini_model.fit(outlier_comments)
    
    assert len(mini_model.get_topic_info()) > 1, "❌ Mini-model failed to find a topic in the -1 data."

    # 5. Safe Merge in the Sandbox
    merged_model = BERTopic.merge_models([base_model, mini_model])
    
    with tempfile.TemporaryDirectory() as temp_dir:
        merged_model.save(temp_dir, serialization="safetensors")
        safe_test_model = BERTopic.load(temp_dir, embedding_model=embedding_model)
        
        # 6. Final Proof
        unseen_comment = ["أريد وصفة بيتزا جديدة"] # Test with the guaranteed new cluster
        new_topic_ids, _ = safe_test_model.transform(unseen_comment)
        assigned_id = int(new_topic_ids[0])
        
        assert assigned_id != -1, "❌ The merged model still doesn't recognize the new topic!"
        assert assigned_id > 0, "❌ Failed to assign a valid positive ID."