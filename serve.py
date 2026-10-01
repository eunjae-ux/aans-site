"""Local preview server for the site: like `python3 -m http.server`, but tells
the browser not to cache anything, so edits always show up on reload.

    cd ~/Desktop/aans-site && python3 serve.py        # http://localhost:5173
"""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    print(f"Serving on http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
