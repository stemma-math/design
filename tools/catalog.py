"""Serves the catalog at the root of a local server, and the targets it is
drawn with at `/targets/`, as `catalog/` reaches them by `../targets/`.

    python -m tools catalog [port]

Nothing is cached, so a change to a target shows on the next reload.
"""

import functools
import http.server
import pathlib

from .common import ROOT

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


def main(argv):
    port = int(argv[0]) if argv else 8000
    handler = functools.partial(Handler, directory=str(CATALOG))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"The catalog is at http://localhost:{port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
