from sqlalchemy import create_engine, text
from app.core.config import settings
from app.core.database import engine, Base


def main():
    e = create_engine(settings.DATABASE_URL)
    with e.connect() as c:
        c.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE"))
        c.execute(text("ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE"))
        c.commit()

    # Create missing tables (e.g., audit_logs)
    Base.metadata.create_all(bind=engine)
    print('Schema updates applied')


if __name__ == '__main__':
    main()
