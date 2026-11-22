"""Local file storage for company logos (a Docker volume in production)."""
import secrets
import uuid
from pathlib import Path


class LogoStorage:
    def __init__(self, root: str) -> None:
        self.root = Path(root).resolve()

    def save(self, company_id: uuid.UUID, png_bytes: bytes) -> str:
        """Returns the stored path relative to the root. The name is server-generated, never user-supplied."""
        folder = self.root / "logos"
        folder.mkdir(parents=True, exist_ok=True)
        relative = f"logos/{company_id}-{secrets.token_hex(8)}.png"
        (self.root / relative).write_bytes(png_bytes)
        return relative

    def resolve(self, relative: str | None) -> Path | None:
        """Absolute path for a stored file, or None if missing or outside the storage root."""
        if not relative:
            return None
        path = (self.root / relative).resolve()
        if self.root not in path.parents or not path.is_file():
            return None
        return path

    def delete(self, relative: str | None) -> None:
        path = self.resolve(relative)
        if path:
            path.unlink(missing_ok=True)
