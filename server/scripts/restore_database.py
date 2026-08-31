import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.database_backup import restore_database


def main() -> None:
    parser = argparse.ArgumentParser(description="Restore an AI TV SQLite database while the app is stopped")
    parser.add_argument("backup")
    parser.add_argument("--destination", default=os.getenv("DB_PATH", "/data/db/app.db"))
    args = parser.parse_args()
    previous = restore_database(Path(args.backup), Path(args.destination))
    print(f"restored: {args.destination}")
    if previous:
        print(f"previous database: {previous}")


if __name__ == "__main__":
    main()
