import time

from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from .recommender import recommend
from .schemas import RecommendRequest

app = FastAPI(title="Mentor-Match Recommender", version="1.0.0")
RECOMMEND_REQUESTS = Counter("ml_recommend_requests_total", "Recommendation requests")
RECOMMEND_DURATION = Histogram("ml_recommend_duration_seconds", "Recommendation duration")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/recommend")
def recommendations(request: RecommendRequest):
    started = time.perf_counter()
    RECOMMEND_REQUESTS.inc()
    try:
        items = recommend(request.learner, request.mentors, request.limit)
        return {"items": items}
    finally:
        RECOMMEND_DURATION.observe(time.perf_counter() - started)