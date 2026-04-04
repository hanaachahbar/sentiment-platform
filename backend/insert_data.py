import random
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

from database import SessionLocal, Ticket, Base, engine
from ai_mock import predict_category, predict_urgency, predict_topic
from sla import calculate_sla_deadline

# Recreate tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Load CSV
BASE_DIR = Path(__file__).resolve().parent
csv_path = BASE_DIR / "data" / "comments.csv"

df = pd.read_csv(csv_path, header=None)
df.columns = ["platform", "category_raw", "text", "sentiment_raw", "urgent_flag"]

# Realistic author names
_AUTHORS = [
    "Youssef B.", "Fatima Z.", "Amine K.", "Sara M.", "Khalid R.",
    "Nadia L.", "Omar H.", "Leila A.", "Rachid T.", "Imane D.",
    "Hassan E.", "Khadija N.", "Mehdi S.", "Zineb F.", "Hamza O.",
    "Aicha G.", "Mouad C.", "Salma W.", "Ayoub J.", "Meryem P.",
]

db = SessionLocal()

# Insert CSV rows with varied timestamps
now = datetime.utcnow()

for idx, row in df.iterrows():
    text = str(row["text"])

    # Spread over the last 7 days for trend testing
    hours_ago = random.randint(1, 168)  # 1 hour to 7 days
    created_at = now - timedelta(hours=hours_ago)

    # Run mock AI
    category = predict_category(text)
    is_urgent = predict_urgency(category)
    topic = predict_topic(text)

    # Derive sentiment from category
    if category in ("Complaint", "Escalation"):
        sentiment = "Negative"
    elif category == "Compliment":
        sentiment = "Positive"
    else:
        sentiment = "Neutral"

    author = random.choice(_AUTHORS)
    fb_link = f"https://facebook.com/post/{random.randint(100000, 999999)}"

    ticket = Ticket(
        text=text,
        author=author,
        platform=row["platform"],
        fb_link=fb_link,
        created_at=created_at,
        category=category,
        category_manual=None,
        manually_corrected=False,
        sentiment=sentiment,
        is_urgent=is_urgent,
        topic=topic,
        sla_deadline=calculate_sla_deadline(created_at),
        status="open",
    )
    db.add(ticket)

# Generate ~100 synthetic tickets for richer dashboard
_SYNTHETIC_TEXTS = [
    "L'installation de la fibre a pris 3 semaines, c'est inadmissible !",
    "Merci pour le service rapide, technicien très professionnel",
    "Je voudrais connaître les tarifs de l'offre FTTH",
    "Internet coupé depuis hier soir, aucune réponse du support",
    "Le modem ne fonctionne plus après la mise à jour",
    "Votre service client est le pire que j'ai jamais vu",
    "Comment changer mon mot de passe wifi ?",
    "Bravo pour la couverture 4G dans ma région",
    "Ma facture est incorrecte, j'ai été surfacturé",
    "Le débit est trop lent, je paie pour 100 Mbps et j'ai 10",
    "J'ai besoin d'un rendez-vous pour l'installation",
    "Excellent service, continuez comme ça !",
    "Le routeur chauffe beaucoup, est-ce normal ?",
    "Je veux résilier mon abonnement",
    "La TV IPTV se coupe toutes les 5 minutes",
    "Pourquoi pas une offre sans engagement ?",
    "L'agence de Casablanca est toujours bondée",
    "Je n'arrive pas à joindre le service technique par téléphone",
    "هاد الخدمة ماشي مزيانة بزاف",
    "واش ممكن تبدلو ليا المودام ؟",
    "الأنترنت كيقطع بزاف فالليل",
    "شكرا على الخدمة الممتازة",
    "بغيت نعرف شحال الثمن ديال الفيبر",
    "الراوتر قديم بزاف خاصني واحد جديد",
    "Please fix my connection, it's been down for 2 days",
    "Great speed since the fiber upgrade, very happy!",
    "I need help with my bill, there are extra charges",
    "When will 5G be available in my area?",
    "The technician didn't show up for the appointment",
    "Can I upgrade my plan to include more TV channels?",
]

_STATUSES = ["open", "open", "open", "resolved", "breached"]

for i in range(100):
    text = random.choice(_SYNTHETIC_TEXTS)

    hours_ago = random.randint(1, 168)
    created_at = now - timedelta(hours=hours_ago)

    category = predict_category(text)
    is_urgent = predict_urgency(category)
    topic = predict_topic(text)

    if category in ("Complaint", "Escalation"):
        sentiment = "Negative"
    elif category == "Compliment":
        sentiment = "Positive"
    else:
        sentiment = "Neutral"

    status = random.choice(_STATUSES)

    ticket = Ticket(
        text=text,
        author=random.choice(_AUTHORS),
        platform=random.choice(["Facebook", "Facebook"]),
        fb_link=f"https://facebook.com/post/{random.randint(100000, 999999)}",
        created_at=created_at,
        category=category,
        category_manual=None,
        manually_corrected=False,
        sentiment=sentiment,
        is_urgent=is_urgent,
        topic=topic,
        sla_deadline=calculate_sla_deadline(created_at),
        status=status,
    )
    db.add(ticket)

db.commit()
db.close()

print(f" Data inserted: {len(df)} CSV rows + 100 synthetic tickets = {len(df) + 100} total")