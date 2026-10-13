"""Stemma's design tools.

    python -m tools generate [step …]   regenerate every target from source/, or only some steps
    python -m tools check [step …]      fail if a generated file is out of date
    python -m tools bundle --out FILE …  write an inline bundle; see tools/bundle.py
    python -m tools catalog [port]      serve the catalog

The steps run in this order, each from what the ones before it wrote:
version, tokens, fonts, glyphs, brand and targets. `check` also builds every inline
bundle once, to see that it holds together.
"""

import importlib
import sys
import time

STEPS = ["version", "tokens", "fonts", "glyphs", "brand", "targets"]


def steps(asked):
    unknown = [step for step in asked if step not in STEPS]
    if unknown:
        sys.exit(
            f"Unknown step: {', '.join(unknown)}. The steps are {', '.join(STEPS)}."
        )
    return [step for step in STEPS if step in asked] if asked else STEPS


def generate(asked):
    for step in steps(asked):
        start = time.monotonic()
        written = importlib.import_module(f"tools.{step}").generate().write()
        took = time.monotonic() - start
        print(
            f"{step:<8} {written} file{'' if written == 1 else 's'} written ({took:.1f}s)"
        )


def check(asked):
    ok = True
    for step in steps(asked):
        ok &= importlib.import_module(f"tools.{step}").generate().check()
    if not asked:
        from . import bundle

        ok &= bundle.check()
    if not ok:
        sys.exit("Run `just generate`.")
    print("Every generated file is up to date.")


def main():
    command, *rest = sys.argv[1:] or ["help"]
    if command == "generate":
        generate(rest)
    elif command == "check":
        check(rest)
    elif command == "bundle":
        from . import bundle

        bundle.main(rest)
    elif command == "catalog":
        from . import catalog

        catalog.main(rest)
    else:
        print(__doc__.strip())
        sys.exit(0 if command in ("help", "-h", "--help") else 2)


if __name__ == "__main__":
    main()
