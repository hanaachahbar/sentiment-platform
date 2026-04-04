# 7 categories from the spec
_CATEGORY_KEYWORDS = {
    "Complaint": [
        "problème", "problem", "issue", "panne", "مشكل", "مشكلة",
        "lent", "slow", "horrible", "worst", "mauvais", "nul",
        "débit", "coupure", "bug", "broken", "ماعندكمش", "خايب",
    ],
    "Escalation": [
        "escalade", "escalation", "manager", "superviseur", "plainte",
        "réclamation", "avocat", "lawyer", "tribunal", "تصعيد",
    ],
    "Information Request": [
        "comment", "how", "quand", "when", "où", "where", "كيفاش",
        "واش", "est-ce que", "possible", "prix", "tarif", "offre",
        "formule", "abonnement", "information", "renseignement",
    ],
    "Compliment": [
        "merci", "thank", "bravo", "excellent", "super", "شكرا",
        "bien", "good", "great", "parfait", "satisfait", "top",
    ],
    "Suggestion": [
        "suggestion", "propose", "améliorer", "improve", "اقتراح",
        "devrait", "should", "pourquoi pas", "il faudrait",
    ],
    "Service Request": [
        "demande", "request", "besoin", "need", "طلب", "بغيت",
        "je veux", "i want", "svp", "s'il vous plaît", "please",
        "activation", "installation", "rendez-vous",
    ],
    "Other": [
        "avis", "opinion", "feedback", "retour", "expérience",
        "رأي", "تجربة", "review",
    ],
}


def predict_category(text: str) -> str:
    text_lower = text.lower()
    scores = {}
    for category, keywords in _CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score

    if not scores:
        return "Other"
    return max(scores, key=scores.get)


# Urgency prediction 
def predict_urgency(category: str) -> bool:
    return category in ("Complaint", "Escalation")


# Topic extraction
_TOPIC_MAP = {
    "FTTH installation": [
        "fibre", "ftth", "installation", "technicien", "raccordement",
        "rendez-vous", "تركيب", "الألياف",
    ],
    "internet outage": [
        "panne", "coupure", "connexion", "internet", "débit",
        "انقطاع", "أنترنت", "الأنترنت",
    ],
    "billing": [
        "facture", "paiement", "prix", "tarif", "facturation",
        "فاتورة", "الدفع", "الفلوس",
    ],
    "4G network": [
        "4g", "5g", "mobile", "réseau", "couverture", "sim",
        "forfait", "الهاتف", "الشبكة",
    ],
    "app / website": [
        "application", "app", "idoom", "my idoom", "site",
    ],
    "technician visit": [
        "technicien", "intervention", "réparation", "déplacement",
    ],
    "subscription": [
        "abonnement", "résiliation", "inscription", "renouvellement",
    ],
}


def predict_topic(text: str) -> str:
    text_lower = text.lower()
    scores = {}
    for topic, keywords in _TOPIC_MAP.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[topic] = score

    if not scores:
        return "Other"
    return max(scores, key=scores.get)
