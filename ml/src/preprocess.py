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