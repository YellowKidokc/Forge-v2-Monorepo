"""
FORGE TTS Server — Edge TTS (Free Forever)
==========================================
Serves TTS via Microsoft Edge's neural voices.
No API key. No cost. No limits.

Run:  python tts_server.py
Serves on: http://localhost:5050

Test: curl -X POST http://localhost:5050/tts -H "Content-Type: application/json" -d "{\"text\":\"Hello world\",\"voice\":\"en-GB-RyanNeural\"}" --output test.mp3
"""

import asyncio
import io
import json
import os
import sys
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Install edge-tts if not present
try:
    import edge_tts
except ImportError:
    print("Installing edge-tts...")
    os.system(f"{sys.executable} -m pip install edge-tts")
    import edge_tts

# ─── Available Voices ───────────────────────────────────────

VOICES = {
    # British (Brian-style)
    "brian": "en-GB-RyanNeural",
    "ryan": "en-GB-RyanNeural",
    "thomas": "en-GB-ThomasNeural",
    "sonia": "en-GB-SoniaNeural",
    "libby": "en-GB-LibbyNeural",
    "maisie": "en-GB-MaisieNeural",

    # American
    "guy": "en-US-GuyNeural",
    "davis": "en-US-DavisNeural",
    "aria": "en-US-AriaNeural",
    "jenny": "en-US-JennyNeural",
    "andrew": "en-US-AndrewMultilingualNeural",
    "brian-us": "en-US-BrianMultilingualNeural",
    "emma": "en-US-EmmaMultilingualNeural",

    # Default
    "alloy": "en-GB-RyanNeural",       # Map OpenAI voice names
    "echo": "en-US-GuyNeural",
    "fable": "en-GB-ThomasNeural",
    "nova": "en-US-AriaNeural",
    "onyx": "en-US-DavisNeural",
    "shimmer": "en-US-JennyNeural",
}

DEFAULT_VOICE = "en-GB-RyanNeural"  # Brian-style

# ─── TTS Generation ────────────────────────────────────────

async def generate_tts(text: str, voice: str = DEFAULT_VOICE, rate: str = "+0%", pitch: str = "+0Hz") -> bytes:
    """Generate MP3 audio from text using edge-tts."""
    # Resolve voice alias
    resolved_voice = VOICES.get(voice.lower(), voice)

    communicate = edge_tts.Communicate(text, resolved_voice, rate=rate, pitch=pitch)

    # Collect audio chunks
    audio_data = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.write(chunk["data"])

    return audio_data.getvalue()

# ─── HTTP Server ────────────────────────────────────────────

class TTSHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/status":
            self._json_response({"status": "ok", "engine": "edge-tts", "default_voice": DEFAULT_VOICE})
            return

        if path == "/voices":
            self._json_response({"voices": VOICES, "default": DEFAULT_VOICE})
            return

        self._json_response({"service": "FORGE TTS", "endpoints": ["/tts", "/voices", "/status"]})

    def do_POST(self):
        path = urlparse(self.path).path

        if path != "/tts":
            self._json_response({"error": "Not found"}, 404)
            return

        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._json_response({"error": "Invalid JSON"}, 400)
            return

        text = data.get("text", "")
        if not text:
            self._json_response({"error": "No text provided"}, 400)
            return

        voice = data.get("voice", DEFAULT_VOICE)
        rate = data.get("rate", "+0%")
        pitch = data.get("pitch", "+0Hz")

        print(f"[TTS] Generating {len(text)} chars with voice={voice}")

        try:
            # Run async TTS
            loop = asyncio.new_event_loop()
            audio_bytes = loop.run_until_complete(generate_tts(text, voice, rate, pitch))
            loop.close()

            if not audio_bytes:
                self._json_response({"error": "No audio generated"}, 500)
                return

            print(f"[TTS] Generated {len(audio_bytes)} bytes")

            # Send MP3 response
            self.send_response(200)
            self._cors_headers()
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(audio_bytes)))
            self.send_header("Content-Disposition", 'attachment; filename="tts-output.mp3"')
            self.end_headers()
            self.wfile.write(audio_bytes)

        except Exception as e:
            print(f"[TTS] Error: {e}")
            self._json_response({"error": str(e)}, 500)

    def _json_response(self, data, status=200):
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        # Cleaner log format
        print(f"[TTS] {args[0]}")

# ─── Main ──────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    server = HTTPServer(("0.0.0.0", port), TTSHandler)
    print(f"\n  FORGE TTS Server - Edge TTS (Free)")
    print(f"  http://localhost:{port}")
    print(f"  Default voice: Brian (en-GB-RyanNeural)")
    print(f"  Voices: /voices\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[TTS] Shutting down...")
        server.shutdown()
