import shutil
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


def backup_database(source: Path, destination: Path) -> Path:
    """Create a transactionally consistent SQLite backup."""
    source = Path(source)
    destination = Path(destination)
    if not source.is_file():
        raise FileNotFoundError(f"数据库不存在：{source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(f"{destination.suffix}.part")
    partial.unlink(missing_ok=True)
    try:
        with closing(sqlite3.connect(source)) as source_conn:
            with closing(sqlite3.connect(partial)) as target_conn:
                source_conn.backup(target_conn)
                _ensure_integrity(target_conn)
        partial.replace(destination)
    except Exception:
        partial.unlink(missing_ok=True)
        raise
    return destination


def restore_database(backup: Path, destination: Path) -> Path | None:
    """Restore a verified SQLite backup and preserve an existing database copy."""
    backup = Path(backup)
    destination = Path(destination)
    if not backup.is_file():
        raise FileNotFoundError(f"备份不存在：{backup}")
    with closing(sqlite3.connect(backup)) as connection:
        _ensure_integrity(connection)

    destination.parent.mkdir(parents=True, exist_ok=True)
    previous = None
    if destination.exists():
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        previous = destination.with_name(f"{destination.name}.pre_restore_{timestamp}.bak")
        shutil.copy2(destination, previous)

    partial = destination.with_suffix(f"{destination.suffix}.restore.part")
    partial.unlink(missing_ok=True)
    try:
        shutil.copy2(backup, partial)
        with closing(sqlite3.connect(partial)) as connection:
            _ensure_integrity(connection)
        partial.replace(destination)
    except Exception:
        partial.unlink(missing_ok=True)
        raise
    return previous


def _ensure_integrity(connection: sqlite3.Connection) -> None:
    result = connection.execute("PRAGMA integrity_check").fetchone()
    if not result or result[0] != "ok":
        raise RuntimeError("SQLite 完整性检查失败")
