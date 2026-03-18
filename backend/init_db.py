from app.db.migrate import run_migrations
from app.db.models import init_db
from app.db.session import get_db


def main() -> None:
    with get_db() as conn:
        init_db(conn)
        run_migrations(conn)
        conn.commit()


if __name__ == "__main__":
    main()
