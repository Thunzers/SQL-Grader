from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, users, datasets, assignments, exercises, statistic

app = FastAPI()

# Allow CORS from any origin by default (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(datasets.router)
app.include_router(assignments.router)
app.include_router(exercises.router)
app.include_router(statistic.router)


if __name__ == "__main__":
    import uvicorn
    print("Backend running on http://0.0.0.0:5000")
    uvicorn.run("server:app", host="0.0.0.0", port=5000, reload=True)
