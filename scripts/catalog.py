"""Serves the catalog at the root of a local server, and the targets it is
drawn with at `/targets/`, as `catalog/` reaches them by `../targets/`.

    python3 scripts/catalog.py [port]
"""

import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "catalog"


class Handler(http.server.SimpleHTTPRequestHandler):
    # The targets change while the catalog is open; never serve a stale one.
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        translated = pathlib.Path(super().translate_path(path))
        try:
            rest = translated.relative_to(CATALOG / "targets")
        except ValueError:
            return str(translated)
        return str(ROOT / "targets" / rest)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(Handler, directory=str(CATALOG))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"The catalog is at http://localhost:{port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
