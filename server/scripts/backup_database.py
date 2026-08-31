import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.database_backup import backup_database


def main() -> None:
    parser = argparse.ArgumentParser(description="Backup the AI TV SQLite database")
    parser.add_argument("--source", default=os.getenv("DB_PATH", "/data/db/app.db"))
    parser.add_argument("--output", default="")
    args = parser.parse_args()
    source = Path(args.source)
    output = Path(args.output) if args.output else source.parent / "backups" / f"app_{datetime.now():%Y%m%d_%H%M%S}.db"
    print(backup_database(source, output))


if __name__ == "__main__":
    main()
