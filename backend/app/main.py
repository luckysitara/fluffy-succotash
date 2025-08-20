from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, users, organizations, cases, evidence, dashboard, audit_log, pii, domain, ip

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development - restrict in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(organizations.router, prefix=f"{settings.API_V1_STR}/organizations", tags=["Organizations"])
app.include_router(cases.router, prefix=f"{settings.API_V1_STR}/cases", tags=["Cases"])
app.include_router(evidence.router, prefix=f"{settings.API_V1_STR}/evidence", tags=["Evidence"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])
app.include_router(audit_log.router, prefix=f"{settings.API_V1_STR}/audit", tags=["Audit Logs"])
app.include_router(pii.router, prefix=f"{settings.API_V1_STR}/pii", tags=["PII Analysis"])
app.include_router(domain.router, prefix=f"{settings.API_V1_STR}/domain", tags=["Domain Analysis"])
app.include_router(ip.router, prefix=f"{settings.API_V1_STR}/ip", tags=["IP Analysis"])

@app.get("/")
def read_root():
    return {"message": "Welcome to SentinelOSINT API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
