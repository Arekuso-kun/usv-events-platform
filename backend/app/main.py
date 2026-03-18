from fastapi import FastAPI

app = FastAPI(title="USV Events Platform")

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}