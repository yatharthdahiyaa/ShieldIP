import os
import json
from google.cloud import firestore

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"e:\PROJECTS\BuildWithAI\shieldip-backend\credentials.json"
os.environ["GCP_PROJECT_ID"] = "sharp-avatar-494218-r8"

try:
    db = firestore.Client(project="sharp-avatar-494218-r8")
    violations = list(db.collection("violations").stream())
    
    print(f"Total violations in Firestore: {len(violations)}")
    urls = [v.to_dict().get("url") for v in violations]
    for u in urls:
        print(f"URL: {u}")
        
except Exception as e:
    print(f"Error: {e}")
