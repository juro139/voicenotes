#!/usr/bin/env python3
"""faster-whisper transcription helper for voicenotes worker.

Reads model name + audio path from CLI args, writes one JSON line on stdout
with the transcript text and detected language.

Usage:
    python scripts/transcribe.py --model medium --audio /path/to/file.webm
"""
import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="medium")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument("--beam-size", type=int, default=5)
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            json.dumps(
                {
                    "error": "faster-whisper not installed. "
                    "pip install faster-whisper"
                }
            ),
            file=sys.stderr,
        )
        return 2

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, info = model.transcribe(args.audio, beam_size=args.beam_size)

    text_parts = []
    for seg in segments:
        text_parts.append(seg.text.strip())

    print(
        json.dumps(
            {
                "text": " ".join(text_parts),
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
