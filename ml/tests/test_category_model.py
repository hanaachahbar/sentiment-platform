import sys
import re
import os
import pandas as pd
import random
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

def clean_darija_text(text):
    if not isinstance(text, str):
        return ""

    # 1. Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)

    # 2. Remove user mentions (@name) and hashtags
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#\w+', '', text)

    # 3. Standardize Arabic characters (Normalizing Alif, Ya, etc.)
    text = re.sub(r'[إأآا]', 'ا', text) # Normalize all forms of Alif to bare Alif
    text = re.sub(r'ى', 'ي', text)      # Normalize Alif Maqsura to Ya
    text = re.sub(r'ة', 'ه', text)      # Normalize Ta Marbuta to Ha (common in informal typing)

    # 4. Remove repeating characters (e.g., "bzzzaaaaf" -> "bzzaf")
    text = re.sub(r'(.)\1+', r'\1\1', text)

    # 5. Remove punctuation and numbers (Customize this if numbers are important for Idoom complaints)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)

    # 6. Remove extra whitespace and newlines
    text = re.sub(r'\s+', ' ', text).strip()

    return text

def generate_mock_data(num_rows=200):
    """Generates a 200-row dataset of Algerian Darija telecom comments."""
    comments = [
        "الكونيكسيون راهي ثقيلة بزاف في باتنة، ديرولنا حل", 
        "ياودي لحقنا للعين و ما شربناش باطة عند الباب واصلة هاذي 4 شهور",
        "Debit taya7 bezaf chaque soir!", 
        "راني مخلص الانترنيت وماكان والو، خدمة عيانة",
        "زعما جابو المودام ؟", 
        "وقتاش تدخلو لا فيبر لولاية وهران؟",
        "Svp chhal le prix ta3 l'abonnement 20 mega?",
        "يعطيكم الصحة على الخدمة المليحة، لا فيبر طيارة", 
        "Merci l'équipe Algerie Telecom",
        "نقتارح عليكم تزيدو سرعة التدفق في الليل", 
        "Madabikoum dirou application pour payer la facture",
        "شكون شاف الماتش البارح؟", 
        "Mdrrr",
        "mfhmtch",
        "i need phone",
        "winta tbdaw t5dmo bhad system djdid??"
    ]
    
    data = []
    for _ in range(num_rows):
        comment = random.choice(comments)
        noise = random.choice(["", " !!!", " 🤔", " bzzzaaaaf", " 1234", " .", "ew"])
        data.append({"Commentaire client": comment + noise})
        
    return pd.DataFrame(data)

def test_category_model():
    print("Generating 200 rows of mock data...")
    df_test = generate_mock_data(200)
    
    print("Applying text cleaning function...")
    df_test['cleaned_comment'] = df_test['Commentaire client'].apply(clean_darija_text)
    
    # --- DYNAMIC PATH CALCULATION ---
    # This finds the 'ml' folder regardless of where you call the script from
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "..", "models", "classifier", "algerie_telecom_categories")
    
    # Mapping for your specific model outputs
    category_map = {0: "interrogative", 1: "negative", 2: "off-topic", 3: "positive", 4: "suggestion"}
    
    device = 0 if torch.cuda.is_available() else -1

    try:
        print(f"Loading Model from: {model_path}")
        # Load BOTH from the local path
        tokenizer = AutoTokenizer.from_pretrained(model_path) 
        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        
        classifier = pipeline("text-classification", model=model, tokenizer=tokenizer, device=device)
        
        print("Running predictions...")
        preds = classifier(df_test['cleaned_comment'].to_list())
        
        # Handling different label formats (e.g., 'LABEL_0' or '0')
        df_test['Predicted_Category'] = [
            category_map[int(p['label'].split('_')[-1])] if '_' in p['label'] else category_map[int(p['label'])] 
            for p in preds
        ]
        df_test['Confidence'] = [round(p['score'] * 100, 2) for p in preds]
        
        # Save output in the tests folder or specify a full path
        output_file = os.path.join(script_dir, "category_test_results.xlsx")
        df_test.to_excel(output_file, index=False)
        print(f"✅ Success! Results saved to {output_file}")
        
    except Exception as e:
        print(f"Error testing Category Model: {e}")
        # Hint for common error
        if "safetensors" in str(e).lower():
            print("Tip: Install safetensors with 'pip install safetensors'")

if __name__ == "__main__":
    test_category_model()