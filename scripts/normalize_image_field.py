"""
Normalize product.image values by stripping any leading path, leaving only the filename.
Run: python scripts/normalize_image_field.py
"""

import os
import sys

# Ensure project root is on sys.path so `import app` works when running this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
    
from app.core.database import SessionLocal
from app.models import Product
from sqlalchemy import func
import os

def main():
    session = SessionLocal()
    try:
        products = session.query(Product).all()
        updated = 0
        for p in products:
            if not p.image:
                continue
            # If image contains a path, extract basename
            if '/' in p.image or '\\' in p.image:
                new = os.path.basename(p.image)
                if new != p.image:
                    p.image = new
                    updated += 1
        if updated:
            session.commit()
        print(f"Normalized image field for {updated} products")
    except Exception as e:
        session.rollback()
        print('Error:', e)
    finally:
        session.close()

if __name__ == '__main__':
    main()
