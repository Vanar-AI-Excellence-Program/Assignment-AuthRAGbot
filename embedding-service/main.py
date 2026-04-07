import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
import torch

app = FastAPI(title="Passly Embedding Service")

model: SentenceTransformer = None
MODEL_NAME = "all-MiniLM-L6-v2"
DIMENSIONS = 384
# Max texts per batch to prevent OOM on low-memory systems
MAX_BATCH_SIZE = int(os.environ.get("EMBED_MAX_BATCH_SIZE", "64"))


@app.on_event("startup")
def load_model():
    global model
    # Force CPU and limit threads for low-memory environments
    torch.set_num_threads(int(os.environ.get("TORCH_THREADS", "2")))
    model = SentenceTransformer(MODEL_NAME, device="cpu")


class EmbedRequest(BaseModel):
    text: str


class EmbedBatchRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    embedding: list[float]
    dimensions: int


class EmbedBatchResponse(BaseModel):
    embeddings: list[list[float]]
    dimensions: int


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "dimensions": DIMENSIONS,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text must not be empty")
    vec = model.encode(req.text, normalize_embeddings=True, show_progress_bar=False)
    return EmbedResponse(
        embedding=vec.tolist(),
        dimensions=DIMENSIONS,
    )


@app.post("/embed-batch", response_model=EmbedBatchResponse)
def embed_batch(req: EmbedBatchRequest):
    if not req.texts or len(req.texts) == 0:
        raise HTTPException(status_code=400, detail="Texts list must not be empty")
    if len(req.texts) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size {len(req.texts)} exceeds max {MAX_BATCH_SIZE}. Split into smaller batches."
        )
    # Use smaller batch_size for encoding to limit peak memory
    vecs = model.encode(
        req.texts,
        normalize_embeddings=True,
        batch_size=min(16, len(req.texts)),
        show_progress_bar=False
    )
    return EmbedBatchResponse(
        embeddings=[v.tolist() for v in vecs],
        dimensions=DIMENSIONS,
    )
