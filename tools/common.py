"""What every generator shares: where the repository is, and how its
outputs are written, or checked against what is committed."""

import sys
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def header(source, generator):
    """The line every generated file opens with, in its own comment syntax."""
    return f"Generated from {source} by tools/{generator}.py. Do not edit."


def identical(path, data):
    """Whether the file at `path` holds exactly `data`."""
    return path.exists() and path.read_bytes() == data


@dataclass
class Outputs:
    """What a generator writes: each file's bytes by its path in the
    repository, the folders it owns wholly, so whatever else is in them is
    stale, and how a committed file is compared with a generated one."""

    files: dict[str, bytes] = field(default_factory=dict)
    owned: list[str] = field(default_factory=list)
    same: Callable[[str, Path, bytes], bool] = lambda _name, path, data: identical(
        path, data
    )

    def add(self, path, data):
        self.files[path] = data.encode() if isinstance(data, str) else data

    def extra(self):
        """Files in an owned folder that are no longer generated."""
        found = set()
        for folder in self.owned:
            directory = ROOT / folder
            if directory.exists():
                found.update(
                    str(p.relative_to(ROOT))
                    for p in directory.rglob("*")
                    if p.is_file()
                )
        return sorted(found - set(self.files))

    def check(self):
        """Fails unless every file is as generated; returns whether it is."""
        stale = [
            name
            for name, data in self.files.items()
            if not self.same(name, ROOT / name, data)
        ]
        extra = self.extra()
        for name in stale:
            print(f"Out of date: {name}", file=sys.stderr)
        for name in extra:
            print(f"Not generated: {name}", file=sys.stderr)
        return not (stale or extra)

    def write(self):
        """Writes what changed, and removes what is no longer generated."""
        for name in self.extra():
            (ROOT / name).unlink()
        written = 0
        for name, data in self.files.items():
            path = ROOT / name
            if self.same(name, path, data):
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            written += 1
        return written
