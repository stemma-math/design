"""Writes the repository's version, from `VERSION`, everywhere else it
appears: the Rust crates and their lock file, the npm packages and the
dependency of one on the other, the Lake package, and the tools' own
project and lock file.

Releasing is changing `VERSION` in a pull request and running
`just generate`; the release workflow tags what reaches main. While the
version is 0.0.0 nothing has been released, and nothing is tagged.
"""

import re
import sys

from .common import ROOT, Outputs

SEMVER = re.compile(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?")


def version():
    text = (ROOT / "VERSION").read_text().strip()
    if not SEMVER.fullmatch(text):
        sys.exit(f"VERSION: {text!r} is not a semantic version, as 1.2.3")
    return text


def replace(path, pattern, value, count=1):
    """The file at `path` with the version in each of the `count` matches of
    `pattern` (whose group 1 is what comes before the version, and group 2
    what comes after) set to `value`. Fails unless there are exactly
    `count` matches, so a moved version is noticed rather than missed."""
    text = (ROOT / path).read_text()
    found = len(re.findall(pattern, text, flags=re.M))
    if found != count:
        sys.exit(f"{path}: expected {count} version(s) to set, found {found}")
    return re.sub(pattern, rf"\g<1>{value}\g<2>", text, flags=re.M)


def generate():
    v = version()
    out = Outputs()
    # The crates take the workspace's version.
    out.add(
        "Cargo.toml",
        replace(
            "Cargo.toml", r'(\[workspace\.package\][^\[]*?\nversion = ")[^"]*(")', v
        ),
    )
    out.add(
        "Cargo.lock",
        replace(
            "Cargo.lock",
            r'(name = "stemma-design(?:-terminal)?"\nversion = ")[^"]*(")',
            v,
            count=2,
        ),
    )
    out.add(
        "targets/web/package.json",
        replace("targets/web/package.json", r'^(  "version": ")[^"]*(")', v),
    )
    elements = "targets/elements/package.json"
    text = replace(elements, r'^(  "version": ")[^"]*(")', v)
    # The elements draw with the classes of the same version of the styles.
    text = re.sub(r'("@stemma-math/design": ")[^"]*(")', rf"\g<1>{v}\g<2>", text)
    out.add(elements, text)
    out.add(
        "targets/verso/lakefile.toml",
        replace("targets/verso/lakefile.toml", r'^(version = ")[^"]*(")', v),
    )
    out.add("pyproject.toml", replace("pyproject.toml", r'^(version = ")[^"]*(")', v))
    out.add(
        "uv.lock",
        replace("uv.lock", r'(name = "stemma-design-tools"\nversion = ")[^"]*(")', v),
    )
    return out
