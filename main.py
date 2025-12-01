"""
Main FastAPI application for DALI E-Commerce.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.routers import (
    home,
    auth,
    products,
    cart,
    checkout,
    orders,
    addresses,
    stores,
    locations,
    admin
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="DALI E-Commerce",
    description="E-Commerce application built with FastAPI",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware (for session-based cart before login)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET_KEY,
    max_age=settings.SESSION_MAX_AGE,
    https_only=False  # Set to True in production with HTTPS
)

# Include routers
app.include_router(home.router)
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(addresses.router)
app.include_router(stores.router)
app.include_router(locations.router)
app.include_router(admin.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
