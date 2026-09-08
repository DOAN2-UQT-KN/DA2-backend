"""AI-service background worker entrypoint.

Run:
  python -m app.worker
"""

from app.queue.sqs_worker import run_worker

if __name__ == "__main__":
    run_worker()
