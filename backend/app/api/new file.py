
import os

# --- Paths ---
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(BASE_DIR, "models", "classifier_model"))

# --- Neo4j ---
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "intelligence")  # change in prod!

# --- CORS (optional override from env) ---
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
import os
from pathlib import Path
from datetime import datetime

# Add backend directory to path for imports
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Import configuration with fallback
try:
    from backend.config import CORS_ORIGINS
except ImportError:
    CORS_ORIGINS = ["*"]

# Create FastAPI app
app = FastAPI(
    title="OSINT Criminal Intelligence Platform",
    description="Advanced OSINT platform for law enforcement criminal intelligence gathering",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('osint_backend.log', mode='a')
    ]
)
logger = logging.getLogger("OSINT-Backend")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_id": f"ERR_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        }
    )

# Health check endpoint
@app.get("/", tags=["System Health"])
async def root():
    """System health check and API information endpoint"""
    return {
        "message": "OSINT Criminal Intelligence Platform API",
        "status": "operational",
        "version": "2.0.0",
        "classification": "RESTRICTED - LAW ENFORCEMENT USE ONLY",
        "features": {
            "criminal_intelligence": "Multi-database criminal search",
            "social_media_intel": "Real-time threat monitoring", 
            "image_analysis": "Facial recognition & weapon detection",
            "threat_classification": "AI-powered threat analysis",
            "relationship_mapping": "Criminal network analysis",
            "identity_search": "Cross-platform identification",
            "real_time_alerts": "Live threat notifications",
            "intelligence_reports": "Comprehensive analytics"
        },
        "endpoints": {
            "classify": "/classify/ - Threat classification engine",
            "graph": "/graph/ - Criminal relationship mapping",
            "assistant": "/ask/ - AI intelligence assistant",
            "reports": "/report/ - Intelligence report generation",
            "alerts": "/alerts/ - Real-time threat alerts",
            "people": "/people/ - Identity search & analysis",
            "criminal-intel": "/criminal-intel/ - Criminal intelligence & database search",
            "admin": "/admin/ - System administration",
            "websocket": "/ws/alerts - Live alert stream"
        },
        "security_notice": "All activities logged for audit. Unauthorized access prohibited.",
        "docs": "/docs - Interactive API documentation"
    }

# Import and mount routers with error handling
mounted_routers = []
failed_routers = []

# Router configurations
router_configs = [
    ("backend.api.threat_classifier", "/classify", "Threat Classification"),
    ("backend.api.relationship_graph", "/graph", "Criminal Relationship Mapping"),
    ("backend.api.generative_assistant", "/ask", "AI Intelligence Assistant"),
    ("backend.api.report_generator", "/report", "Intelligence Reports"),
    ("backend.api.alerts", "/alerts", "Real-time Threat Alerts"),
    ("backend.api.person_search", "/people", "Identity Search & Analysis"),
    ("backend.api.criminal_intelligence", "/criminal-intel", "Criminal Intelligence Platform"),
    ("backend.api.admin", "/admin", "System Administration"),
    ("backend.realtime.ws_manager", "", "WebSocket Services")
]

# Mount each router with error handling
for module_name, prefix, tag in router_configs:
    try:
        # Dynamic import
        module = __import__(module_name, fromlist=['router'])
        router = getattr(module, 'router')
        
        # Mount the router
        app.include_router(router, prefix=prefix, tags=[tag])
        mounted_routers.append(f"{tag} ({prefix})")
        logger.info(f"â Mounted router: {tag} at {prefix}")
        
    except ImportError as e:
        failed_routers.append(f"{tag} - Import Error: {str(e)}")
        logger.warning(f"â ïž Could not import router {tag}: {e}")
    except AttributeError as e:
        failed_routers.append(f"{tag} - Attribute Error: {str(e)}")
        logger.warning(f"â ïž Router not found in module {tag}: {e}")
    except Exception as e:
        failed_routers.append(f"{tag} - Error: {str(e)}")
        logger.error(f"â Failed to mount router {tag}: {e}")

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("ð OSINT Criminal Intelligence Platform starting up...")
    
    # Database connectivity checks
    try:
        from neo4j import GraphDatabase
        neo4j_uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        neo4j_user = os.environ.get("NEO4J_USER", "neo4j")
        neo4j_password = os.environ.get("NEO4J_PASSWORD", "intelligence")
        
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        with driver.session() as session:
            result = session.run("RETURN 1 as test")
            test_result = result.single()
            if test_result and test_result["test"] == 1:
                logger.info("â Neo4j database connection successful")
            else:
                logger.warning("â ïž Neo4j connection test failed")
        driver.close()
    except Exception as e:
        logger.error(f"â Neo4j connection failed: {e}")
    
    # ML model availability check
    try:
        model_dir = os.environ.get("MODEL_DIR", "./models/classifier_model")
        model_path = Path(model_dir)
        if model_path.exists():
            logger.info(f"â ML model directory found: {model_dir}")
        else:
            logger.warning(f"â ïž ML model directory not found: {model_dir}")
    except Exception as e:
        logger.error(f"â ML model check failed: {e}")
    
    # Log final status
    logger.info(f"ð¡ïž OSINT Platform ready - Mounted: {len(mounted_routers)}, Failed: {len(failed_routers)}")
    if mounted_routers:
        logger.info(f"â Working modules: {', '.join(mounted_routers)}")
    if failed_routers:
        logger.warning(f"â ïž Failed modules: {', '.join(failed_routers)}")
    
    logger.info("ðš CLASSIFICATION: RESTRICTED - LAW ENFORCEMENT USE ONLY")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("ð OSINT Criminal Intelligence Platform shutting down...")
    logger.info("ð Shutdown complete")

# Security middleware for request logging
@app.middleware("http")
async def security_audit_middleware(request: Request, call_next):
    start_time = datetime.utcnow()
    
    # Log sensitive endpoint access
    sensitive_paths = ["/criminal-intel", "/people", "/admin"]
    if any(path in str(request.url) for path in sensitive_paths):
        logger.info(
            f"ð SENSITIVE ACCESS: {request.method} {request.url} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
    
    response = await call_next(request)
    
    # Log response time for monitoring
    process_time = (datetime.utcnow() - start_time).total_seconds()
    if process_time > 1.0:  # Log slow requests
        logger.warning(
            f"â±ïž SLOW REQUEST: {request.method} {request.url} - "
            f"Status: {response.status_code} - Time: {process_time:.3f}s"
        )
    
    return response

# Add security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Classification"] = "RESTRICTED"
    
    return response

# Development server runner
if __name__ == "__main__":
    import uvicorn
    
    logger.info("ð§ Starting development server...")
    logger.warning("â ïž Development mode - not for production use")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import aiohttp
import feedparser
import tweepy
import re
import json
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
import os
from urllib.parse import urljoin
import time
import random
from contextlib import asynccontextmanager

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================

# Nigerian News RSS Sources (Real)
NIGERIAN_NEWS_RSS = {
    'Punch': 'https://punchng.com/feed/',
    'Vanguard': 'https://www.vanguardngr.com/feed/',
    'Daily Trust': 'https://dailytrust.com/feed/',
    'Premium Times': 'https://www.premiumtimesng.com/feed/',
    'Leadership': 'https://leadership.ng/feed/',
    'The Nation': 'https://thenationonlineng.net/feed/',
    'Guardian': 'https://guardian.ng/feed/',
    'This Day': 'https://www.thisdaylive.com/index.php/feed/',
    'Channels TV': 'https://www.channelstv.com/feed/',
    'Sahara Reporters': 'http://saharareporters.com/feeds/latest/feed.xml'
}

# Twitter API Configuration - Now loads from .env file
TWITTER_CONFIG = {
    "bearer_token": os.getenv("TWITTER_BEARER_TOKEN"),
    "api_key": os.getenv("TWITTER_API_KEY"),
    "api_secret": os.getenv("TWITTER_API_SECRET"),
    "access_token": os.getenv("TWITTER_ACCESS_TOKEN"),
    "access_token_secret": os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
}

# Debug: Print loaded config (remove in production)
print("ð§ DEBUG - Loaded Twitter Config:")
for key, value in TWITTER_CONFIG.items():
    if value:
        print(f"  {key}: {'*' * (len(value) - 4) + value[-4:]}")  # Show only last 4 chars
    else:
        print(f"  {key}: NOT SET")

# Nigerian Security Keywords
NIGERIAN_SECURITY_KEYWORDS = [
    'banditry', 'kidnapping', 'terrorism', 'boko haram', 'security', 'attack',
    'robbery', 'shooting', 'explosion', 'insurgency', 'militants', 'criminals',
    'violence', 'threat', 'danger', 'emergency', 'crisis', 'conflict'
]

NIGERIAN_LOCATIONS = [
    'Lagos', 'Kano', 'Kaduna', 'Abuja', 'Rivers', 'Borno', 'Oyo', 'Imo',
    'Anambra', 'Delta', 'Edo', 'Enugu', 'Plateau', 'Cross River', 'Adamawa',
    'Bauchi', 'Bayelsa', 'Benue', 'Ebonyi', 'Ekiti', 'Gombe', 'Jigawa',
    'Kebbi', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
    'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
]

# ==================== DATA MODELS ====================

class NewsArticle(BaseModel):
    title: str
    summary: str
    source: str
    url: str
    published_date: datetime
    threat_level: str = "medium"
    location: Optional[str] = None
    security_classification: Optional[str] = None
    confidence_score: float = 0.0

class Tweet(BaseModel):
    id: str
    text: str
    user: str
    created_at: datetime
    location: Optional[str] = None
    threat_detected: bool = False
    threat_score: float = 0.0
    url: str

class MonitoringStatus(BaseModel):
    twitter_active: bool = False
    news_active: bool = False
    telegram_active: bool = False
    last_update: Optional[datetime] = None

# ==================== GLOBAL STORAGE ====================

news_articles: List[NewsArticle] = []
tweets: List[Tweet] = []
monitoring_status = MonitoringStatus()
twitter_client = None
monitoring_task = None

# ==================== TWITTER INTEGRATION ====================

def initialize_twitter():
    """Initialize Twitter API client"""
    global twitter_client
    try:
        if all(TWITTER_CONFIG.values()):
            # Twitter API v2 client
            twitter_client = tweepy.Client(
                bearer_token=TWITTER_CONFIG["bearer_token"],
                consumer_key=TWITTER_CONFIG["api_key"],
                consumer_secret=TWITTER_CONFIG["api_secret"],
                access_token=TWITTER_CONFIG["access_token"],
                access_token_secret=TWITTER_CONFIG["access_token_secret"],
                wait_on_rate_limit=True
            )
            logger.info("Twitter API client initialized successfully")
            return True
        else:
            logger.warning("Twitter API credentials not fully configured")
            return False
    except Exception as e:
        logger.error(f"Failed to initialize Twitter client: {e}")
        return False

async def fetch_nigeria_tweets(keywords: List[str], max_results: int = 50):
    """Fetch real tweets about Nigerian security"""
    global tweets
    
    if not twitter_client:
        logger.warning("Twitter client not initialized")
        return []
    
    try:
        # Construct search query for Nigerian security
        location_query = " OR ".join([f'"{loc}"' for loc in NIGERIAN_LOCATIONS[:10]])
        keyword_query = " OR ".join(keywords)
        
        query = f"({keyword_query}) AND ({location_query}) -is:retweet lang:en"
        
        # Search recent tweets
        response = twitter_client.search_recent_tweets(
            query=query,
            max_results=max_results,
            tweet_fields=['created_at', 'author_id', 'geo', 'context_annotations'],
            user_fields=['username', 'name'],
            expansions=['author_id']
        )
        
        if not response.data:
            logger.info("No tweets found for query")
            return []
        
        # Process tweets
        users = {user.id: user for user in response.includes.get('users', [])}
        processed_tweets = []
        
        for tweet in response.data:
            user = users.get(tweet.author_id)
            username = user.username if user else "unknown"
            
            # Detect location and threats
            location = extract_location_from_text(tweet.text)
            threat_score = calculate_threat_score(tweet.text)
            
            tweet_obj = Tweet(
                id=tweet.id,
                text=tweet.text,
                user=f"@{username}",
                created_at=tweet.created_at,
                location=location,
                threat_detected=threat_score > 0.6,
                threat_score=threat_score,
                url=f"https://twitter.com/{username}/status/{tweet.id}"
            )
            
            processed_tweets.append(tweet_obj)
        
        # Update global storage
        tweets.extend(processed_tweets)
        tweets = tweets[-200:]  # Keep only last 200 tweets
        
        logger.info(f"Fetched {len(processed_tweets)} real tweets")
        return processed_tweets
        
    except Exception as e:
        logger.error(f"Error fetching tweets: {e}")
        return []

def extract_location_from_text(text: str) -> Optional[str]:
    """Extract Nigerian location from tweet text"""
    text_lower = text.lower()
    for location in NIGERIAN_LOCATIONS:
        if location.lower() in text_lower:
            return location
    return "Nigeria"

def calculate_threat_score(text: str) -> float:
    """Calculate threat score based on keywords"""
    text_lower = text.lower()
    score = 0.0
    
    threat_weights = {
        'terrorism': 1.0, 'bomb': 1.0, 'explosion': 0.9,
        'kidnapping': 0.9, 'banditry': 0.8, 'attack': 0.7,
        'shooting': 0.7, 'robbery': 0.6, 'violence': 0.5,
        'emergency': 0.4, 'security': 0.3
    }
    
    for keyword, weight in threat_weights.items():
        if keyword in text_lower:
            score += weight
    
    return min(score, 1.0)

# ==================== NEWS INTEGRATION ====================

async def fetch_nigerian_news():
    """Fetch real news from Nigerian sources"""
    global news_articles
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for source_name, rss_url in NIGERIAN_NEWS_RSS.items():
            tasks.append(fetch_rss_feed(session, source_name, rss_url))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        new_articles = []
        for result in results:
            if isinstance(result, list):
                new_articles.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"RSS fetch error: {result}")
        
        # Update global storage
        news_articles.extend(new_articles)
        news_articles = news_articles[-500:]  # Keep only last 500 articles
        
        logger.info(f"Fetched {len(new_articles)} real news articles")
        return new_articles

async def fetch_rss_feed(session: aiohttp.ClientSession, source_name: str, rss_url: str):
    """Fetch and parse RSS feed"""
    try:
        timeout = aiohttp.ClientTimeout(total=30)
        async with session.get(rss_url, timeout=timeout) as response:
            if response.status == 200:
                content = await response.text()
                return parse_rss_content(content, source_name, rss_url)
            else:
                logger.warning(f"Failed to fetch {source_name}: HTTP {response.status}")
                return []
    except Exception as e:
        logger.error(f"Error fetching RSS from {source_name}: {e}")
        return []

def parse_rss_content(content: str, source_name: str, base_url: str) -> List[NewsArticle]:
    """Parse RSS content into NewsArticle objects"""
    try:
        feed = feedparser.parse(content)
        articles = []
        
        for entry in feed.entries[:20]:  # Limit to 20 articles per source
            # Extract basic info
            title = entry.get('title', 'No title')
            summary = entry.get('summary', entry.get('description', ''))
            url = entry.get('link', base_url)
            
            # Parse date
            published_date = datetime.now()
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published_date = datetime(*entry.published_parsed[:6])
            
            # Clean summary
            summary = clean_html(summary)
            
            # Analyze content for security relevance
            content_text = f"{title} {summary}".lower()
            location = extract_location_from_text(content_text)
            threat_level = classify_threat_level(content_text)
            security_classification = classify_security_content(content_text)
            confidence_score = calculate_threat_score(content_text)
            
            article = NewsArticle(
                title=title,
                summary=summary[:300] + "..." if len(summary) > 300 else summary,
                source=source_name,
                url=url,
                published_date=published_date,
                threat_level=threat_level,
                location=location,
                security_classification=security_classification,
                confidence_score=confidence_score
            )
            
            articles.append(article)
        
        return articles
        
    except Exception as e:
        logger.error(f"Error parsing RSS content from {source_name}: {e}")
        return []

def clean_html(text: str) -> str:
    """Remove HTML tags from text"""
    import re
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text).strip()

def classify_threat_level(text: str) -> str:
    """Classify threat level based on content"""
    high_threat_keywords = ['terrorism', 'bomb', 'explosion', 'massacre', 'attack']
    medium_threat_keywords = ['kidnapping', 'banditry', 'robbery', 'violence']
    
    text_lower = text.lower()
    
    if any(keyword in text_lower for keyword in high_threat_keywords):
        return "high"
    elif any(keyword in text_lower for keyword in medium_threat_keywords):
        return "medium"
    else:
        return "low"

def classify_security_content(text: str) -> Optional[str]:
    """Classify security content type"""
    classifications = {
        'terrorism': ['terrorism', 'terrorist', 'boko haram', 'iswap'],
        'banditry': ['bandit', 'banditry', 'cattle rustling'],
        'kidnapping': ['kidnap', 'abduct', 'ransom'],
        'cybercrime': ['cyber', 'fraud', 'scam', 'internet'],
        'robbery': ['robbery', 'steal', 'theft', 'burglary']
    }
    
    text_lower = text.lower()
    for category, keywords in classifications.items():
        if any(keyword in text_lower for keyword in keywords):
            return category
    
    return None

# ==================== BACKGROUND TASKS ====================

async def continuous_monitoring():
    """Background task for continuous monitoring"""
    while True:
        try:
            if monitoring_status.twitter_active:
                await fetch_nigeria_tweets(NIGERIAN_SECURITY_KEYWORDS)
            
            if monitoring_status.news_active:
                await fetch_nigerian_news()
            
            monitoring_status.last_update = datetime.now()
            
            # Wait 5 minutes before next fetch
            await asyncio.sleep(300)
            
        except Exception as e:
            logger.error(f"Error in continuous monitoring: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

# ==================== LIFESPAN EVENT HANDLER ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("Starting Proforce AI-OSINT Fusion Platform API v3.0")
    
    # Initialize Twitter
    if initialize_twitter():
        logger.info("Twitter integration ready")
    else:
        logger.warning("Twitter integration not available - check credentials")
    
    # Start background monitoring
    global monitoring_task
    monitoring_task = asyncio.create_task(continuous_monitoring())
    
    yield
    
    # Shutdown
    logger.info("Shutting down OSINT Platform")
    if monitoring_task:
        monitoring_task.cancel()
        try:
            await monitoring_task
        except asyncio.CancelledError:
            logger.info("Monitoring task cancelled")

# ==================== APP INITIALIZATION ====================

app = FastAPI(
    title="Proforce AI-OSINT Fusion Platform API", 
    version="3.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== API ENDPOINTS ====================

@app.get("/")
async def root():
    return {
        "message": "Proforce AI-OSINT Fusion Platform API v3.0",
        "status": "operational",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "twitter_configured": twitter_client is not None,
        "monitoring_active": monitoring_status.twitter_active or monitoring_status.news_active,
        "last_update": monitoring_status.last_update
    }

# ==================== TWITTER ENDPOINTS ====================

@app.get("/twitter/test-connection")
async def test_twitter_connection():
    """Test Twitter API connection"""
    if not twitter_client:
        raise HTTPException(status_code=503, detail="Twitter API not configured")
    
    try:
        # Test with a simple API call
        me = twitter_client.get_me()
        return {
            "status": "success",
            "message": "Twitter API connection successful",
            "user": me.data.username if me.data else "unknown"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Twitter API connection failed: {str(e)}")

@app.post("/twitter/start-monitoring")
async def start_twitter_monitoring(keywords: List[str] = None):
    """Start real-time Twitter monitoring"""
    if not twitter_client:
        raise HTTPException(status_code=503, detail="Twitter API not configured")
    
    monitoring_status.twitter_active = True
    
    # Immediate fetch
    if keywords is None:
        keywords = NIGERIAN_SECURITY_KEYWORDS
    
    tweets_fetched = await fetch_nigeria_tweets(keywords)
    
    return {
        "status": "started",
        "message": "Twitter monitoring started",
        "keywords": keywords,
        "tweets_fetched": len(tweets_fetched)
    }

@app.post("/twitter/stop-monitoring")
async def stop_twitter_monitoring():
    """Stop Twitter monitoring"""
    monitoring_status.twitter_active = False
    return {"status": "stopped", "message": "Twitter monitoring stopped"}

@app.get("/twitter/tweets")
async def get_twitter_feed():
    """Get current Twitter feed"""
    return {
        "tweets": [tweet.dict() for tweet in tweets[-50:]],  # Last 50 tweets
        "total_count": len(tweets),
        "monitoring_active": monitoring_status.twitter_active
    }

# ==================== NEWS ENDPOINTS ====================

@app.post("/news/start-monitoring")
async def start_news_monitoring():
    """Start real-time news monitoring"""
    monitoring_status.news_active = True
    
    # Immediate fetch
    articles_fetched = await fetch_nigerian_news()
    
    return {
        "status": "started",
        "message": "News monitoring started",
        "sources": list(NIGERIAN_NEWS_RSS.keys()),
        "articles_fetched": len(articles_fetched)
    }

@app.post("/news/stop-monitoring")
async def stop_news_monitoring():
    """Stop news monitoring"""
    monitoring_status.news_active = False
    return {"status": "stopped", "message": "News monitoring stopped"}

@app.get("/news/articles")
async def get_news_feed():
    """Get current news feed"""
    return {
        "articles": [article.dict() for article in news_articles[-100:]],  # Last 100 articles
        "total_count": len(news_articles),
        "monitoring_active": monitoring_status.news_active
    }

@app.get("/news/sources")
async def get_news_sources():
    """Get available news sources"""
    return {
        "sources": NIGERIAN_NEWS_RSS,
        "total_sources": len(NIGERIAN_NEWS_RSS)
    }

# ==================== MONITORING STATUS ====================

@app.get("/monitoring/status")
async def get_monitoring_status():
    """Get current monitoring status"""
    return {
        "twitter_active": monitoring_status.twitter_active,
        "news_active": monitoring_status.news_active,
        "telegram_active": monitoring_status.telegram_active,
        "last_update": monitoring_status.last_update,
        "data_counts": {
            "tweets": len(tweets),
            "news_articles": len(news_articles)
        }
    }

@app.post("/monitoring/refresh")
async def manual_refresh():
    """Manually trigger data refresh"""
    results = {}
    
    if monitoring_status.twitter_active:
        tweets_fetched = await fetch_nigeria_tweets(NIGERIAN_SECURITY_KEYWORDS)
        results["tweets_fetched"] = len(tweets_fetched)
    
    if monitoring_status.news_active:
        articles_fetched = await fetch_nigerian_news()
        results["articles_fetched"] = len(articles_fetched)
    
    monitoring_status.last_update = datetime.now()
    
    return {
        "status": "refreshed",
        "timestamp": monitoring_status.last_update,
        "results": results
    }

# ==================== ALERTS ENDPOINT ====================

@app.get("/alerts/")
async def get_alerts():
    """Get security alerts from real data"""
    alerts = []
    
    # Generate alerts from high-threat tweets
    for tweet in tweets[-20:]:
        if tweet.threat_detected and tweet.threat_score > 0.7:
            alerts.append({
                "id": f"twitter_{tweet.id}",
                "label": "Social Media Threat",
                "text": tweet.text[:100] + "...",
                "confidence": tweet.threat_score,
                "locations": [tweet.location] if tweet.location else [],
                "source": "Twitter",
                "created_at": tweet.created_at.isoformat(),
                "url": tweet.url
            })
    
    # Generate alerts from high-threat news
    for article in news_articles[-20:]:
        if article.threat_level == "high" and article.confidence_score > 0.6:
            alerts.append({
                "id": f"news_{hash(article.title)}",
                "label": article.security_classification or "Security Incident",
                "text": article.title,
                "confidence": article.confidence_score,
                "locations": [article.location] if article.location else [],
                "source": article.source,
                "created_at": article.published_date.isoformat(),
                "url": article.url
            })
    
    # Sort by confidence score
    alerts.sort(key=lambda x: x["confidence"], reverse=True)
    
    return {"alerts": alerts[:10]}  # Return top 10 alerts

# ==================== DEMO/SIMULATION ENDPOINTS ====================

@app.post("/criminal-intel/database/search")
async def search_criminal_database(request: dict):
    """Demo criminal database search (simulated data)"""
    await asyncio.sleep(1)  # Simulate processing time
    
    # Demo criminal profiles
    demo_profiles = [
        {
            "nin": "12345678901",
            "name": "Ahmed Musa",
            "risk_level": "HIGH",
            "confidence_score": 0.89,
            "banking_results": [
                {
                    "bank_name": "GTBank",
                    "alert_level": "HIGH",
                    "balance_range": "âŠ2M - âŠ5M",
                    "suspicious_activities": [
                        "Multiple large cash deposits",
                        "Unusual transaction patterns"
                    ]
                }
            ],
            "cross_references": [
                {"source": "Social Media", "match_type": "Username match", "confidence": 0.85},
                {"source": "Phone Records", "match_type": "Number linked", "confidence": 0.92}
            ]
        }
    ]
    
    # Check if search matches demo data
    nin = request.get("nin")
    if nin == "12345678901":
        return demo_profiles[0]
    
    return {
        "confidence_score": 0.65,
        "banking_results": [],
        "cross_references": [],
        "message": "Demo search completed"
    }

@app.post("/criminal-intel/social-media/search")
async def search_social_media(request: dict):
    """Demo social media search (simulated data)"""
    await asyncio.sleep(1)
    
    return {
        "profiles_found": 3,
        "posts_found": 47,
        "threat_summary": {
            "high_risk_profiles": 1,
            "threatening_posts": 5,
            "network_size": 23
        },
        "profiles": [
            {
                "username": "northern_boss",
                "risk_score": 0.85,
                "location": "Kaduna",
                "followers": 1240
            }
        ],
        "threatening_posts": [
            {
                "content": "Planning something big for Lagos next week...",
                "threat_score": 0.78
            }
        ]
    }

@app.post("/criminal-intel/image-analysis")
async def analyze_image(request: dict):
    """Demo image analysis (simulated results)"""
    await asyncio.sleep(2)
    
    return {
        "threat_assessment": {"overall_risk": "HIGH"},
        "detections": {
            "faces": [
                {
                    "gender": "Male",
                    "age_estimate": "25-30",
                    "confidence": 0.89,
                    "match_probability": 0.67
                }
            ],
            "weapons": [
                {
                    "type": "Assault Rifle",
                    "confidence": 0.92,
                    "threat_level": "CRITICAL"
                }
            ],
            "vehicles": [
                {
                    "type": "Motorcycle",
                    "license_plate": "ABC123XY"
                }
            ]
        },
        "location_analysis": {
            "estimated_coords": "9.0579Â°N, 7.4951Â°E",
            "region": "FCT Abuja"
        }
    }

@app.post("/people/search")
async def search_people(request: dict):
    """Demo people search (simulated data)"""
    await asyncio.sleep(1)
    
    demo_people = [
        {
            "full_name": "Ahmed Musa Ibrahim",
            "risk_score": 0.75,
            "nin": "12345678901",
            "phones": ["+2348012345678"],
            "email": "ahmed.ibrahim@email.com",
            "address": "Lagos, Nigeria",
            "last_seen": "2025-01-15"
        },
        {
            "full_name": "Fatima Ibrahim Mohammed",
            "risk_score": 0.25,
            "nin": "98765432109",
            "phones": ["+2347089876543"],
            "email": "fatima.ibrahim@email.com",
            "address": "Kano, Nigeria",
            "last_seen": "2025-01-20"
        }
    ]
    
    return demo_people

@app.get("/graph/")
async def get_graph_data(entity: str = None):
    """Demo network graph data (simulated)"""
    await asyncio.sleep(1)
    
    # Demo graph with criminal networks
    nodes = [
        {"id": "1", "label": "Threat", "type": "Terrorism", "text": "Boko Haram Cell", "risk_level": "HIGH"},
        {"id": "2", "label": "Entity", "type": "Person", "text": "Ahmed Musa"},
        {"id": "3", "label": "Location", "text": "Borno State", "state": "Nigeria"},
        {"id": "4", "label": "Threat", "type": "Banditry", "text": "Armed Group", "risk_level": "MEDIUM"},
        {"id": "5", "label": "Entity", "type": "Vehicle", "text": "Motorcycle Gang"},
        {"id": "6", "label": "Location", "text": "Kaduna State", "state": "Nigeria"}
    ]
    
    edges = [
        {"source": "1", "target": "2"},
        {"source": "2", "target": "3"},
        {"source": "4", "target": "5"},
        {"source": "5", "target": "6"},
        {"source": "2", "target": "4"}
    ]
    
    return {"nodes": nodes, "edges": edges}

@app.post("/classify/")
async def classify_threat(request: dict):
    """Demo threat classification (simulated AI)"""
    text = request.get("text", "")
    await asyncio.sleep(1)
    
    # Simple classification based on keywords
    if any(word in text.lower() for word in ["bomb", "explosion", "attack"]):
        category = "Terrorism"
        confidence = 0.89
        risk_level = "HIGH"
    elif any(word in text.lower() for word in ["kidnap", "ransom", "abduct"]):
        category = "Kidnapping"
        confidence = 0.82
        risk_level = "HIGH"
    elif any(word in text.lower() for word in ["bandit", "robbery", "steal"]):
        category = "Banditry"
        confidence = 0.75
        risk_level = "MEDIUM"
    else:
        category = "General Security"
        confidence = 0.45
        risk_level = "LOW"
    
    return {
        "category": category,
        "confidence": confidence,
        "risk_level": risk_level,
        "entities": [
            {"text": "Nigeria", "label": "LOCATION"},
            {"text": "Security", "label": "ORGANIZATION"}
        ],
        "recommended_actions": [
            "Monitor social media activity",
            "Alert relevant authorities",
            "Increase surveillance in mentioned areas"
        ]
    }

@app.post("/ask/")
async def ask_assistant(request: dict):
    """Demo AI assistant (simulated responses)"""
    prompt = request.get("prompt", "")
    await asyncio.sleep(1)
    
    # Generate demo responses based on prompt
    if "lagos" in prompt.lower():
        response = "Based on current intelligence, Lagos state shows medium threat levels with primary concerns around cybercrime and urban violence. Recent incidents include financial fraud activities in Victoria Island and robbery cases in mainland areas."
        places = ["Lagos", "Victoria Island"]
    elif "security" in prompt.lower():
        response = "Current security situation in Nigeria shows elevated threat levels in northern states due to banditry and terrorism activities. Southern states face primarily cybercrime and kidnapping threats."
        places = ["Nigeria", "Northern States", "Southern States"]
    else:
        response = "Intelligence analysis indicates varied threat patterns across Nigerian regions. Continued monitoring recommended for emerging security developments."
        places = ["Nigeria"]
    
    return {
        "response": response,
        "places": places,
        "threat_indicators": [
            "Increased criminal activity",
            "Social media chatter",
            "Economic instability"
        ],
        "breakdown": {
            "Terrorism": 12,
            "Banditry": 8,
            "Cybercrime": 15,
            "Kidnapping": 6
        },
        "confidence_score": 0.78
    }

@app.post("/criminal-intel/seed-criminal-demo")
async def seed_criminal_demo():
    """Load demo criminal data"""
    return {
        "message": "Demo criminal intelligence data loaded successfully",
        "profiles_loaded": 5,
        "test_credentials": {
            "nin": "12345678901",
            "bvn": "22123456789",
            "phone": "08012345678",
            "username": "@northern_boss"
        }
    }

@app.post("/people/seed-demo")
async def seed_people_demo():
    """Load demo people data"""
    return {
        "message": "Demo identity database loaded successfully",
        "profiles_loaded": 10,
        "test_searches": [
            "NIN: 12345678901",
            "Phone: 08012345678",
            "Email: fatima.ibrahim@email.com",
            "Name: Ibrahim Yakubu"
        ]
    }

@app.post("/alerts/test")
async def send_test_alert(alert_data: dict):
    """Generate demo test alert"""
    return {
        "status": "success",
        "message": "Test alert generated successfully",
        "alert_id": f"TEST_{int(time.time())}"
    }

@app.post("/admin/clear-seeds")
async def clear_seed_data():
    """Clear demo seed data"""
    global tweets, news_articles
    tweets = []
    news_articles = []
    return {
        "status": "success",
        "message": "Demo seed data cleared successfully"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)web: uvicorn osint_backend_server:app --host=0.0.0.0 --port=$PORT 
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn osint_backend_server:app --host=0.0.0.0 --port=$PORT"fastapi==0.104.1 
uvicorn[standard]==0.24.0 
tweepy==4.14.0 
aiohttp==3.9.1 
feedparser==6.0.10 
python-dotenv==1.0.0 
pydantic==2.5.0 
from fastapi import APIRouter
from backend.api.alerts import _ALERTS

router = APIRouter()

@router.post("/clear-seeds")
def clear_seeds():
    # Demo: clear in-memory alerts (you can expand to clear seeded graph items too)
    _ALERTS.clear()
    return {"status": "ok", "message": "Cleared in-memory alerts (demo)."}
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from backend.realtime.ws_manager import broadcast_alert_sync

router = APIRouter()

# In-memory store (demo)
_ALERTS: Dict[str, Dict[str, Any]] = {}

class AlertIn(BaseModel):
    label: str
    confidence: float = 0.0
    text: str
    locations: Optional[List[str]] = None
    url: Optional[str] = None

@router.get("/")
def list_alerts(state: Optional[str] = None, label: Optional[str] = None):
    out = []
    for a in _ALERTS.values():
        if label and a["label"] != label:
            continue
        if state and (state not in (a.get("locations") or [])):
            continue
        out.append(a)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"alerts": out}

@router.post("/test")
def send_test_alert(a: AlertIn):
    item = {
        "id": str(uuid.uuid4()),
        "label": a.label,
        "confidence": a.confidence,
        "text": a.text,
        "locations": a.locations or [],
        "url": a.url,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "status": "new",
    }
    _ALERTS[item["id"]] = item
    broadcast_alert_sync({"type": "alert", "data": item})
    return {"status": "ok", "alert": item}

class AckIn(BaseModel):
    status: str  # 'ack' or 'dismiss'

@router.post("/{alert_id}/ack")
def ack_alert(alert_id: str, body: AckIn):
    if alert_id not in _ALERTS:
        raise HTTPException(status_code=404, detail="Alert not found")
    _ALERTS[alert_id]["status"] = body.status
    return {"status": "ok"}
# backend/api/alerts_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.realtime.ws_manager import manager
import asyncio

router = APIRouter()

@router.websocket("/ws/alerts")
async def alerts_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keep the connection alive without requiring client messages.
        while True:
            # Sleep and let the manager broadcast asynchronously
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from neo4j import GraphDatabase
import uuid
import hashlib
import base64
import json
import re
import os
from PIL import Image
import io

# Configuration
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "intelligence")

router = APIRouter()
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# Enhanced Models for Criminal Intelligence
class SocialMediaProfile(BaseModel):
    platform: str = Field(..., description="Platform name (Twitter, Facebook, Instagram, TikTok, etc.)")
    username: str = Field(..., description="Username/handle")
    display_name: Optional[str] = None
    followers_count: Optional[int] = None
    following_count: Optional[int] = None
    posts_count: Optional[int] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    verified: bool = False
    created_date: Optional[datetime] = None
    last_active: Optional[datetime] = None
    profile_image_url: Optional[str] = None

class SocialMediaPost(BaseModel):
    platform: str
    post_id: str
    username: str
    content: str
    media_urls: List[str] = Field(default_factory=list)
    hashtags: List[str] = Field(default_factory=list)
    mentions: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    timestamp: datetime
    likes_count: Optional[int] = None
    shares_count: Optional[int] = None
    comments_count: Optional[int] = None
    engagement_score: float = 0.0

class DatabaseRecord(BaseModel):
    database_name: str = Field(..., description="Source database (NUMC, BVN, NIN, etc.)")
    record_type: str = Field(..., description="Record type (identity, financial, biometric)")
    primary_key: str = Field(..., description="Primary identifier")
    data: Dict[str, Any] = Field(..., description="Record data")
    confidence: float = Field(default=1.0, description="Data reliability score")
    last_updated: datetime
    source_verification: bool = Field(default=True)

class CriminalProfile(BaseModel):
    primary_nin: Optional[str] = None
    primary_bvn: Optional[str] = None
    primary_phone: Optional[str] = None
    full_name: str
    aliases: List[str] = Field(default_factory=list)
    known_associates: List[str] = Field(default_factory=list)
    criminal_activities: List[str] = Field(default_factory=list)
    threat_level: str = Field(default="UNKNOWN", description="LOW, MEDIUM, HIGH, CRITICAL")
    social_profiles: List[SocialMediaProfile] = Field(default_factory=list)
    recent_posts: List[SocialMediaPost] = Field(default_factory=list)
    database_records: List[DatabaseRecord] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    modus_operandi: Optional[str] = None
    gang_affiliations: List[str] = Field(default_factory=list)

class SocialMediaSearchQuery(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    full_name: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    hashtags: List[str] = Field(default_factory=list)
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    platforms: List[str] = Field(default_factory=list)
    location_radius_km: Optional[float] = None
    threat_keywords: bool = Field(default=True)

class DatabaseSearchQuery(BaseModel):
    nin: Optional[str] = None
    bvn: Optional[str] = None
    phone: Optional[str] = None
    account_number: Optional[str] = None
    full_name: Optional[str] = None
    databases: List[str] = Field(default_factory=list, description="Specific databases to search")
    cross_reference: bool = Field(default=True, description="Enable cross-database linking")

# Criminal Intelligence Functions
def extract_threat_indicators(text: str) -> Dict[str, Any]:
    """Extract threat indicators from social media content"""
    threat_keywords = {
        'weapons': ['gun', 'ak47', 'rifle', 'pistol', 'ammunition', 'bullets', 'armed'],
        'violence': ['kill', 'murder', 'attack', 'fight', 'revenge', 'blood'],
        'locations': ['bridge', 'highway', 'forest', 'mountain', 'border', 'checkpoint'],
        'criminal_slang': ['ops', 'connect', 'supply', 'business', 'package', 'delivery'],
        'gang_terms': ['boys', 'crew', 'family', 'brotherhood', 'set', 'block']
    }
    
    indicators = {}
    text_lower = text.lower()
    
    for category, keywords in threat_keywords.items():
        matches = [word for word in keywords if word in text_lower]
        if matches:
            indicators[category] = matches
    
    # Extract phone numbers
    phone_pattern = r'(\+234|0)[789][01]\d{8}'
    phones = re.findall(phone_pattern, text)
    if phones:
        indicators['phone_numbers'] = phones
    
    # Extract bank account patterns
    account_pattern = r'\b\d{10}\b'
    accounts = re.findall(account_pattern, text)
    if accounts:
        indicators['potential_accounts'] = accounts
    
    return indicators

def calculate_threat_score(profile_data: Dict[str, Any]) -> float:
    """Calculate threat score based on profile data"""
    score = 0.0
    
    # Social media threat indicators
    threat_posts = profile_data.get('threat_posts', 0)
    if isinstance(threat_posts, (list, tuple)):
        score += len(threat_posts) * 0.1
    else:
        score += threat_posts * 0.1
    
    # Criminal associations
    known_associates = profile_data.get('known_associates', [])
    if isinstance(known_associates, (list, tuple)):
        score += len(known_associates) * 0.15
    else:
        score += known_associates * 0.15
    
    # Gang affiliations
    gang_affiliations = profile_data.get('gang_affiliations', [])
    if isinstance(gang_affiliations, (list, tuple)):
        score += len(gang_affiliations) * 0.2
    else:
        score += gang_affiliations * 0.2
    
    # Database red flags
    database_alerts = profile_data.get('database_alerts', 0)
    if isinstance(database_alerts, (list, tuple)):
        score += len(database_alerts) * 0.25
    else:
        score += database_alerts * 0.25
    
    return min(score, 1.0)

def link_identities(nin: str = None, bvn: str = None, phone: str = None) -> Dict[str, Any]:
    """Simulate database linking (NIN-BVN-Phone correlation)"""
    # In real implementation, this would query actual databases
    linked_data = {
        'nin_records': [],
        'bvn_records': [],
        'phone_records': [],
        'cross_references': [],
        'confidence_score': 0.0
    }
    
    # Simulate NUMC/NIN database response
    if nin:
        linked_data['nin_records'].append({
            'nin': nin,
            'full_name': f'Linked Identity {nin[:3]}***',
            'date_of_birth': '1990-01-01',
            'state_of_origin': 'Kano',
            'lga': 'Kano Municipal',
            'phone_numbers': [phone] if phone else [],
            'status': 'active',
            'issued_date': '2015-03-15'
        })
    
    # Simulate BVN database response
    if bvn:
        linked_data['bvn_records'].append({
            'bvn': bvn,
            'account_holder': f'Bank Customer {bvn[:3]}***',
            'phone_number': phone,
            'email': f'user{bvn[:3]}@email.com',
            'bank_accounts': [
                {'bank': 'First Bank', 'account': f'30{bvn[:8]}'},
                {'bank': 'GTBank', 'account': f'04{bvn[:8]}'}
            ],
            'enrollment_date': '2014-10-20'
        })
    
    # Calculate confidence based on matching fields
    matches = 0
    if nin and bvn: matches += 1
    if nin and phone: matches += 1
    if bvn and phone: matches += 1
    
    linked_data['confidence_score'] = matches / 3.0 if matches > 0 else 0.0
    
    return linked_data

# API Endpoints
@router.post("/social-media/search")
async def search_social_media(query: SocialMediaSearchQuery):
    """Search social media profiles and posts for criminal intelligence"""
    try:
        # Simulate social media search across platforms
        profiles = []
        posts = []
        
        # Simulate Twitter/X search
        if query.username:
            profiles.append({
                'platform': 'Twitter',
                'username': query.username,
                'display_name': f'Real Name ({query.username})',
                'followers_count': 1250,
                'bio': 'Northern Nigeria â¢ Business inquiries DM',
                'location': 'Kaduna, Nigeria',
                'verified': False,
                'threat_indicators': ['weapons', 'locations'],
                'risk_score': 0.75
            })
            
            # Simulate recent threatening posts
            posts.extend([
                {
                    'platform': 'Twitter',
                    'username': query.username,
                    'content': 'Big operation coming soon. My boys are ready. Kaduna-Abuja highway business ðª',
                    'timestamp': datetime.utcnow() - timedelta(hours=6),
                    'threat_indicators': extract_threat_indicators('Big operation coming soon. My boys are ready. Kaduna-Abuja highway business'),
                    'location': 'Kaduna',
                    'risk_level': 'HIGH'
                },
                {
                    'platform': 'Twitter', 
                    'username': query.username,
                    'content': 'New connect from Kano. Business is booming ð 08012345678',
                    'timestamp': datetime.utcnow() - timedelta(days=2),
                    'threat_indicators': extract_threat_indicators('New connect from Kano. Business is booming 08012345678'),
                    'location': 'Kano',
                    'risk_level': 'MEDIUM'
                }
            ])
        
        # Simulate Instagram search
        if query.phone_number:
            profiles.append({
                'platform': 'Instagram',
                'username': f'user_{query.phone_number[-4:]}',
                'display_name': 'Private Account',
                'followers_count': 890,
                'posts_count': 234,
                'bio': 'ð¥ North Side ð¥',
                'location': 'Katsina',
                'threat_indicators': ['gang_terms'],
                'risk_score': 0.65
            })
        
        return {
            'profiles_found': len(profiles),
            'posts_found': len(posts),
            'profiles': profiles,
            'recent_posts': posts,
            'threat_summary': {
                'high_risk_profiles': len([p for p in profiles if p.get('risk_score', 0) > 0.7]),
                'medium_risk_profiles': len([p for p in profiles if 0.3 < p.get('risk_score', 0) <= 0.7]),
                'threatening_posts': len([p for p in posts if p.get('risk_level') in ['HIGH', 'CRITICAL']])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Social media search failed: {str(e)}")

@router.post("/database/search")
async def search_databases(query: DatabaseSearchQuery):
    """Search law enforcement databases (NUMC, BVN, banking, etc.)"""
    try:
        results = {
            'nin_results': [],
            'bvn_results': [],
            'phone_results': [],
            'banking_results': [],
            'cross_references': [],
            'confidence_score': 0.0
        }
        
        # Simulate database searches
        if query.nin or query.bvn or query.phone:
            linked_data = link_identities(query.nin, query.bvn, query.phone)
            results.update(linked_data)
            
            # Add banking records simulation
            if query.bvn:
                results['banking_results'] = [
                    {
                        'account_number': f'30{query.bvn[:8]}',
                        'bank_name': 'First Bank Nigeria',
                        'account_type': 'Savings',
                        'balance_range': 'âŠ500,000 - âŠ1,000,000',
                        'last_transaction': (datetime.utcnow() - timedelta(days=1)).isoformat(),
                        'suspicious_activities': [
                            'Large cash deposits from multiple sources',
                            'Frequent transfers to high-risk accounts'
                        ],
                        'alert_level': 'HIGH'
                    },
                    {
                        'account_number': f'04{query.bvn[:8]}',
                        'bank_name': 'Guaranty Trust Bank',
                        'account_type': 'Current',
                        'balance_range': 'âŠ50,000 - âŠ200,000',
                        'last_transaction': (datetime.utcnow() - timedelta(hours=3)).isoformat(),
                        'suspicious_activities': [],
                        'alert_level': 'LOW'
                    }
                ]
            
            # Generate cross-reference analysis
            if results['confidence_score'] > 0.5:
                results['cross_references'] = [
                    {
                        'type': 'IDENTITY_MATCH',
                        'confidence': 0.85,
                        'details': 'NIN and BVN records show consistent identity information',
                        'risk_factors': ['Multiple bank accounts', 'Recent large transactions']
                    }
                ]
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database search failed: {str(e)}")

@router.post("/criminal-profile/create")
async def create_criminal_profile(profile: CriminalProfile):
    """Create comprehensive criminal profile with all intelligence sources"""
    try:
        profile_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Calculate threat level based on all available data
        profile_data = {
            'threat_posts': len([p for p in profile.recent_posts if hasattr(p, 'content') and any(keyword in p.content.lower() for keyword in ['weapon', 'gun', 'attack', 'operation'])]),
            'known_associates': profile.known_associates or [],
            'gang_affiliations': profile.gang_affiliations or [],
            'database_alerts': len([r for r in profile.database_records if r.confidence < 0.7])
        }
        
        threat_score = calculate_threat_score(profile_data)
        
        # Store in Neo4j
        with driver.session() as session:
            # Create criminal node
            session.run("""
                CREATE (c:Criminal {
                    id: $id,
                    primary_nin: $nin,
                    primary_bvn: $bvn,
                    primary_phone: $phone,
                    full_name: $name,
                    threat_level: $threat_level,
                    threat_score: $threat_score,
                    created_at: $created_at,
                    last_updated: $last_updated
                })
            """, {
                'id': profile_id,
                'nin': profile.primary_nin,
                'bvn': profile.primary_bvn,
                'phone': profile.primary_phone,
                'name': profile.full_name,
                'threat_level': profile.threat_level,
                'threat_score': threat_score,
                'created_at': now,
                'last_updated': now
            })
            
            # Link to social media profiles
            for social_profile in profile.social_profiles:
                session.run("""
                    MATCH (c:Criminal {id: $criminal_id})
                    CREATE (s:SocialProfile {
                        platform: $platform,
                        username: $username,
                        display_name: $display_name,
                        followers: $followers,
                        bio: $bio,
                        location: $location
                    })
                    CREATE (c)-[:HAS_SOCIAL_PROFILE]->(s)
                """, {
                    'criminal_id': profile_id,
                    'platform': social_profile.platform,
                    'username': social_profile.username,
                    'display_name': social_profile.display_name,
                    'followers': social_profile.followers_count,
                    'bio': social_profile.bio,
                    'location': social_profile.location
                })
            
            # Link to locations
            for location in profile.locations:
                session.run("""
                    MATCH (c:Criminal {id: $criminal_id})
                    MERGE (l:Location {name: $location})
                    MERGE (c)-[:OPERATES_IN]->(l)
                """, criminal_id=profile_id, location=location)
            
            # Link to known associates
            for associate in profile.known_associates:
                session.run("""
                    MATCH (c:Criminal {id: $criminal_id})
                    MERGE (a:Person {name: $associate})
                    MERGE (c)-[:ASSOCIATED_WITH]->(a)
                """, criminal_id=profile_id, associate=associate)
        
        return {
            'status': 'success',
            'profile_id': profile_id,
            'threat_score': threat_score,
            'threat_level': profile.threat_level,
            'intelligence_sources': {
                'social_profiles': len(profile.social_profiles),
                'database_records': len(profile.database_records),
                'recent_posts': len(profile.recent_posts)
            },
            'recommendations': generate_investigation_recommendations(profile, threat_score)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile creation failed: {str(e)}")

@router.post("/image-analysis")
async def analyze_criminal_image(
    image: UploadFile = File(...),
    context: str = Form(..., description="Context (social media post, surveillance, etc.)")
):
    """Analyze images for criminal intelligence (faces, weapons, locations)"""
    try:
        # Read image
        image_content = await image.read()
        
        # Simulate image analysis results
        analysis_results = {
            'image_type': image.content_type,
            'file_size': len(image_content),
            'analysis_timestamp': datetime.utcnow().isoformat(),
            'context': context,
            'detections': {
                'faces': [
                    {
                        'confidence': 0.89,
                        'age_estimate': '25-30',
                        'gender': 'Male',
                        'facial_features': 'Distinctive scar on left cheek',
                        'potential_matches': ['Database_ID_12345']
                    }
                ],
                'weapons': [
                    {
                        'type': 'Rifle',
                        'confidence': 0.76,
                        'description': 'AK-47 pattern rifle visible in background'
                    }
                ],
                'locations': [
                    {
                        'type': 'Geographic',
                        'description': 'Rural/forest environment',
                        'potential_regions': ['Northern Nigeria', 'Kaduna State']
                    }
                ],
                'vehicles': [
                    {
                        'type': 'Motorcycle',
                        'color': 'Red',
                        'partial_plate': 'KD***7',
                        'confidence': 0.65
                    }
                ]
            },
            'threat_assessment': {
                'overall_risk': 'HIGH',
                'risk_factors': [
                    'Weapons presence',
                    'Rural/remote location', 
                    'Multiple individuals',
                    'Potential gang insignia'
                ]
            },
            'metadata': {
                'gps_coordinates': 'STRIPPED',
                'timestamp': 'ANALYZED',
                'device_info': 'EXTRACTED'
            }
        }
        
        return analysis_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")

@router.get("/criminal-profile/{profile_id}")
async def get_criminal_profile(profile_id: str):
    """Get complete criminal profile with all intelligence"""
    try:
        with driver.session() as session:
            # Get criminal profile
            result = session.run("""
                MATCH (c:Criminal {id: $profile_id})
                OPTIONAL MATCH (c)-[:HAS_SOCIAL_PROFILE]->(s:SocialProfile)
                OPTIONAL MATCH (c)-[:OPERATES_IN]->(l:Location)
                OPTIONAL MATCH (c)-[:ASSOCIATED_WITH]->(a:Person)
                RETURN c, collect(DISTINCT s) as social_profiles, 
                       collect(DISTINCT l.name) as locations,
                       collect(DISTINCT a.name) as associates
            """, profile_id=profile_id)
            
            record = result.single()
            if not record:
                raise HTTPException(status_code=404, detail="Criminal profile not found")
            
            criminal = record['c']
            
            return {
                'profile_id': profile_id,
                'basic_info': {
                    'full_name': criminal.get('full_name'),
                    'primary_nin': criminal.get('primary_nin'),
                    'primary_bvn': criminal.get('primary_bvn'),
                    'primary_phone': criminal.get('primary_phone'),
                    'threat_level': criminal.get('threat_level'),
                    'threat_score': criminal.get('threat_score')
                },
                'social_profiles': record['social_profiles'],
                'known_locations': record['locations'],
                'known_associates': record['associates'],
                'intelligence_summary': {
                    'last_updated': criminal.get('last_updated'),
                    'data_sources': ['NUMC', 'BVN', 'Social Media', 'Banking'],
                    'confidence_level': 'HIGH',
                    'investigation_status': 'ACTIVE'
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile retrieval failed: {str(e)}")

def generate_investigation_recommendations(profile: CriminalProfile, threat_score: float) -> List[str]:
    """Generate investigation recommendations based on profile data"""
    recommendations = []
    
    if threat_score > 0.7:
        recommendations.append("PRIORITY: Immediate surveillance recommended")
        recommendations.append("Coordinate with tactical units for potential arrest")
    
    if profile.social_profiles:
        recommendations.append("Monitor social media for real-time intelligence")
        recommendations.append("Track social network for associate identification")
    
    if profile.primary_phone:
        recommendations.append("Request telecom records and location tracking")
    
    if profile.gang_affiliations:
        recommendations.append("Cross-reference with known gang databases")
    
    recommendations.append("Share intelligence with relevant state commands")
    
    return recommendations

# Demo data seeding
@router.post("/seed-criminal-demo")
async def seed_criminal_demo():
    """Seed demo criminal profiles for testing"""
    try:
        demo_criminals = [
            {
                'primary_nin': '12345678901',
                'primary_bvn': '22123456789',
                'primary_phone': '08012345678',
                'full_name': 'Ibrahim Aliyu',
                'threat_level': 'HIGH',
                'social_profiles': [
                    {
                        'platform': 'Twitter',
                        'username': '@northern_boss',
                        'followers_count': 1250,
                        'bio': 'Business man â¢ Northern Nigeria'
                    }
                ],
                'locations': ['Kaduna', 'Kano', 'Katsina'],
                'gang_affiliations': ['Northern Brotherhood'],
                'criminal_activities': ['Armed Robbery', 'Kidnapping']
            }
        ]
        
        created_count = 0
        for criminal_data in demo_criminals:
            # Create profile (simplified for demo)
            profile_id = str(uuid.uuid4())
            
            with driver.session() as session:
                session.run("""
                    CREATE (c:Criminal {
                        id: $id,
                        primary_nin: $nin,
                        primary_bvn: $bvn,
                        primary_phone: $phone,
                        full_name: $name,
                        threat_level: $threat_level,
                        created_at: $now
                    })
                """, {
                    'id': profile_id,
                    'nin': criminal_data['primary_nin'],
                    'bvn': criminal_data['primary_bvn'],
                    'phone': criminal_data['primary_phone'],
                    'name': criminal_data['full_name'],
                    'threat_level': criminal_data['threat_level'],
                    'now': datetime.utcnow()
                })
            
            created_count += 1
        
        return {
            'status': 'success',
            'message': f'Seeded {created_count} criminal profiles',
            'demo_data': 'Use NIN: 12345678901 or Phone: 08012345678 to test searches'
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Demo seeding failed: {str(e)}")from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List
from neo4j import GraphDatabase
import re
from backend.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

router = APIRouter()
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# States + popular cities (subset for demo â expand as needed)
NIGERIA_PLACES = {
    "Abia": ["Umuahia", "Aba"],
    "Adamawa": ["Yola", "Mubi"],
    "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene"],
    "Anambra": ["Awka", "Onitsha", "Nnewi"],
    "Bauchi": ["Bauchi"],
    "Bayelsa": ["Yenagoa"],
    "Benue": ["Makurdi", "Gboko"],
    "Borno": ["Maiduguri", "Bama"],
    "Cross River": ["Calabar", "Ikom"],
    "Delta": ["Asaba", "Warri", "Sapele"],
    "Ebonyi": ["Abakaliki"],
    "Edo": ["Benin City"],
    "Ekiti": ["Ado-Ekiti"],
    "Enugu": ["Enugu", "Nsukka"],
    "Gombe": ["Gombe"],
    "Imo": ["Owerri"],
    "Jigawa": ["Dutse"],
    "Kaduna": ["Kaduna", "Zaria"],
    "Kano": ["Kano"],
    "Katsina": ["Katsina"],
    "Kebbi": ["Benin Kebbi"],
    "Kogi": ["Lokoja"],
    "Kwara": ["Ilorin"],
    "Lagos": ["Lagos", "Ikeja"],
    "Nasarawa": ["Lafia"],
    "Niger": ["Minna", "Bida"],
    "Ogun": ["Abeokuta", "Sapaade", "Isara", "Gaposa","Ode Remo"],
    "Ondo": ["Akure"],
    "Osun": ["Osogbo", "Ile-Ife", "Ilesa"],
    "Oyo": ["Ibadan", "Ogbomoso"],
    "Plateau": ["Jos"],
    "Rivers": ["Port Harcourt"],
    "Sokoto": ["Sokoto"],
    "Taraba": ["Jalingo"],
    "Yobe": ["Damaturu", "Potiskum"],
    "Zamfara": ["Gusau"],
    "FCT": ["Abuja"],
}

class AskInput(BaseModel):
    prompt: str

def detect_places(prompt: str) -> List[str]:
    p = (prompt or "").lower()
    found = set()
    for state, cities in NIGERIA_PLACES.items():
        if state.lower() in p:
            found.add(state)
        for c in cities:
            if c.lower() in p:
                found.add(state)
                found.add(c)
    return list(found)

@router.post("/")
def ask_assistant(inp: AskInput) -> Dict[str, Any]:
    prompt = (inp.prompt or "").strip()
    if not prompt:
        return {"response": "Please provide a prompt."}

    places = detect_places(prompt)
    if not places:
        return {
            "response": "Mention a Nigerian state or city (e.g., 'What is happening in Kano?').",
            "prompt": prompt
        }

    with driver.session() as session:
        cypher = """
        MATCH (t:Threat)-[:MENTIONS]->(e:Entity)
        WHERE any(term IN $terms WHERE
            toLower(e.name) CONTAINS toLower(term) OR
            toLower(t.text) CONTAINS toLower(term)
        )
        RETURN t.label AS label, t.text AS text, collect(distinct e.name) AS entities
        LIMIT 100
        """
        rows = session.run(cypher, terms=places).data()

    if not rows:
        return {"response": f"No recent items mentioning {', '.join(places)}.", "places": places, "items": []}

    by_label, examples = {}, []
    for r in rows:
        lbl = r.get("label") or "Unlabeled"
        by_label[lbl] = by_label.get(lbl, 0) + 1
        examples.append({"label": lbl, "text": r.get("text"), "entities": r.get("entities")})

    lines = [f"Summary for {', '.join(places)}:"]
    for lbl, cnt in sorted(by_label.items(), key=lambda x: x[1], reverse=True):
        lines.append(f"â¢ {lbl}: {cnt} report(s)")
    summary = "\n".join(lines)

    out_examples: List[Dict[str, Any]] = []
    for ex in examples[:3]:
        snip = re.sub(r"\s+", " ", (ex["text"] or "")).strip()
        if len(snip) > 180:
            snip = snip[:180] + "..."
        out_examples.append({
            "label": ex["label"],
            "text_snippet": snip,
            "entities": (ex["entities"] or [])[:5]
        })

    return {"response": summary, "places": places, "breakdown": by_label, "examples": out_examples}
# api/graph_router.py

from fastapi import APIRouter
from api.neo4j_connector import Neo4jConnector

router = APIRouter()
neo4j = Neo4jConnector(password="intelligence")  # Replace with actual password

@router.get("/graph")
async def get_threat_graph():
    try:
        query = """
        MATCH (t:Text)-[r:PREDICTED_AS]->(th:Threat)
        RETURN t.content AS text, th.label AS label, r.confidence AS confidence, r.timestamp AS timestamp
        ORDER BY r.timestamp DESC
        LIMIT 100
        """
        results = neo4j.run_query(query)
        return {"graph": results}
    except Exception as e:
        return {"error": str(e)}
# backend/api/ingestion.py
from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime, timezone
from neo4j import GraphDatabase
from backend.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
from backend.api.alerts import ALERT_RULES, Alert, persist_alert
from backend.realtime.alert_bus import alert_bus

router = APIRouter()
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def _now_iso(): return datetime.now(timezone.utc).isoformat()

def evaluate_rules(label: str, confidence: float, locations: List[str]) -> bool:
    if confidence < ALERT_RULES["min_confidence"]:
        return False
    if label not in ALERT_RULES["labels"]:
        return False
    if ALERT_RULES["watchlist_states"]:
        # If any location hits watchlist, trigger; if no locations, still allow
        if locations and not any(loc in ALERT_RULES["watchlist_states"] for loc in locations):
            return False
    return True

async def maybe_raise_alert(item: Dict[str, Any]):
    """
    item expects: label, confidence, text, locations (list[str]), url (opt)
    """
    if evaluate_rules(item["label"], float(item["confidence"]), item.get("locations", [])):
        a = Alert(
            id=f"al_{int(datetime.now().timestamp()*1000)}",
            label=item["label"],
            confidence=float(item["confidence"]),
            text=item["text"],
            locations=item.get("locations", []),
            url=item.get("url"),
            status="open",
            created_at=_now_iso(),
        )
        with driver.session() as s:
            s.execute_write(persist_alert, a)
        await alert_bus.broadcast(a.dict())

@router.post("/tick", summary="Demo ingestion tick (pretend we just processed one item)")
async def ingest_tick(sample: Dict[str, Any]):
    """
    Body example:
    {
      "text":"Bandits attacked farmers near Gusau",
      "label":"Banditry",
      "confidence":0.91,
      "locations":["Gusau","Zamfara"],
      "url":"https://source.example/item"
    }
    """
    await maybe_raise_alert(sample)
    return {"status": "ok", "evaluated": True}
 
# backend/api/locations.py
from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional

router = APIRouter()

NIGERIA_STATES: List[str] = [
    "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
    "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa",
    "Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger",
    "Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara","FCT"
]

POPULAR_CITIES: Dict[str, List[str]] = {
    "Kano": ["Kano","Wudil","Gaya"],
    "Borno": ["Maiduguri","Bama","Biu"],
    "Lagos": ["Lagos","Ikeja","Epe","Badagry"],
    "Kaduna": ["Kaduna","Zaria","Kafanchan"],
    "Rivers": ["Port Harcourt","Bonny","Okrika"],
    "FCT": ["Abuja","Gwagwalada","Kuje"],
    "Ogun": ["Ode Remo", 'Abeokuta', 'Isara', 'Sagamu'],
    # add/expand as needed...
}

@router.get("/states")
def get_states():
    return {"states": NIGERIA_STATES}

@router.get("/cities")
def get_cities(state: Optional[str] = Query(None)):
    if not state:
        # flatten all
        out = []
        for s, cities in POPULAR_CITIES.items():
            out.extend([{"state": s, "city": c} for c in cities])
        return {"cities": out}
    cities = POPULAR_CITIES.get(state, [])
    return {"state": state, "cities": cities}

@router.get("/all")
def get_all():
    return {"states": NIGERIA_STATES, "cities": POPULAR_CITIES}
# osint_pro/api/neo4j_connector.py

from neo4j import GraphDatabase
import logging

class Neo4jConnector:
    def __init__(self, uri="bolt://localhost:7687", user="neo4j", password="your_password"):
        self.logger = logging.getLogger("Neo4jConnector")
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def run_query(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

    def create_node(self, label, properties):
        props_str = ", ".join([f"{k}: ${k}" for k in properties])
        query = f"MERGE (n:{label} {{ {props_str} }}) RETURN n"
        return self.run_query(query, properties)

    def create_relationship(self, from_label, from_props, to_label, to_props, rel_type, rel_props=None):
        from_str = ", ".join([f"{k}: $from_{k}" for k in from_props])
        to_str = ", ".join([f"{k}: $to_{k}" for k in to_props])
        rel_str = ", ".join([f"{k}: $rel_{k}" for k in (rel_props or {})])

        query = f"""
        MERGE (a:{from_label} {{ {from_str} }})
        MERGE (b:{to_label} {{ {to_str} }})
        MERGE (a)-[r:{rel_type} {{ {rel_str} }}]->(b)
        RETURN a, r, b
        """
        params = {f"from_{k}": v for k, v in from_props.items()}
        params.update({f"to_{k}": v for k, v in to_props.items()})
        params.update({f"rel_{k}": v for k, v in (rel_props or {}).items()})
        return self.run_query(query, params)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    neo = Neo4jConnector(password="intelligence")

    # Quick test
    neo.create_node("Person", {"name": "Temi"})
    neo.create_node("Person", {"name": "Ayo"})
    neo.create_relationship(
        "Person", {"name": "Temi"},
        "Person", {"name": "Ayo"},
        "know",
        {"since": "2023"}
    )
    neo.close()
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from neo4j import GraphDatabase
import uuid
import os

# Configuration
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "intelligence")

router = APIRouter()
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# Models
class PersonSearchQuery(BaseModel):
    nin: Optional[str] = Field(None, description="National Identification Number")
    phone: Optional[str] = Field(None, description="Phone number")
    email: Optional[str] = Field(None, description="Email address")
    name: Optional[str] = Field(None, description="Full name")
    fuzzy: bool = Field(False, description="Enable fuzzy matching")

class PersonResponse(BaseModel):
    id: str
    nin: Optional[str] = None
    phones: List[str] = Field(default_factory=list)
    emails: List[str] = Field(default_factory=list)
    full_name: Optional[str] = None
    threat_count: int = 0
    entity_count: int = 0
    risk_score: float = 0.0
    created_at: datetime

# Utility functions
def calculate_risk_score(threat_count: int, entity_count: int) -> float:
    """Simple risk calculation"""
    base_score = min(threat_count * 0.3 + entity_count * 0.1, 1.0)
    return round(base_score, 2)

@router.post("/search", response_model=List[PersonResponse])
async def search_people(query: PersonSearchQuery):
    """Search for people by various identifiers"""
    try:
        # Build search conditions
        conditions = []
        params = {}
        
        if query.nin:
            conditions.append("p.nin = $nin")
            params["nin"] = query.nin.strip()
        
        if query.phone:
            conditions.append("$phone IN p.phones")
            params["phone"] = query.phone.strip()
        
        if query.email:
            conditions.append("$email IN p.emails")
            params["email"] = query.email.strip().lower()
        
        if query.name:
            if query.fuzzy:
                conditions.append("toLower(p.full_name) CONTAINS toLower($name)")
            else:
                conditions.append("p.full_name = $name")
            params["name"] = query.name.strip()
        
        if not conditions:
            raise HTTPException(status_code=400, detail="At least one search criterion required")
        
        # Build and execute query
        where_clause = " AND ".join(conditions)
        cypher_query = f"""
        MATCH (p:Person)
        WHERE {where_clause}
        OPTIONAL MATCH (p)-[:ASSOCIATED_WITH]->(t:Threat)
        OPTIONAL MATCH (p)-[:MENTIONS]->(e:Entity)
        WITH p, 
             count(DISTINCT t) as threat_count,
             count(DISTINCT e) as entity_count
        RETURN p, threat_count, entity_count
        LIMIT 10
        """
        
        with driver.session() as session:
            results = session.run(cypher_query, **params)
            people = []
            
            for record in results:
                person_node = record["p"]
                threat_count = record["threat_count"] or 0
                entity_count = record["entity_count"] or 0
                
                risk_score = calculate_risk_score(threat_count, entity_count)
                
                person = PersonResponse(
                    id=person_node.element_id,
                    nin=person_node.get("nin"),
                    phones=person_node.get("phones", []),
                    emails=person_node.get("emails", []),
                    full_name=person_node.get("full_name"),
                    threat_count=threat_count,
                    entity_count=entity_count,
                    risk_score=risk_score,
                    created_at=person_node.get("created_at", datetime.utcnow())
                )
                people.append(person)
        
        return people
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/seed-demo")
async def seed_demo_people():
    """Add some demo people for testing"""
    demo_people = [
        {
            "nin": "12345678901",
            "full_name": "Ahmed Musa",
            "phones": ["08012345678", "07098765432"],
            "emails": ["ahmed.musa@email.com"],
            "created_at": datetime.utcnow()
        },
        {
            "nin": "98765432109", 
            "full_name": "Fatima Ibrahim",
            "phones": ["08098765432"],
            "emails": ["fatima.ibrahim@email.com"],
            "created_at": datetime.utcnow()
        }
    ]
    
    try:
        created_count = 0
        with driver.session() as session:
            for person_data in demo_people:
                session.run("""
                    MERGE (p:Person {nin: $nin})
                    SET p.full_name = $full_name,
                        p.phones = $phones,
                        p.emails = $emails,
                        p.created_at = $created_at
                """, **person_data)
                created_count += 1
        
        return {
            "status": "success", 
            "message": f"Created {created_count} demo people"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Demo seeding failed: {str(e)}")from fastapi import APIRouter, Query
from typing import Optional
from neo4j import GraphDatabase
from backend.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

router = APIRouter()
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

@router.get("/")
def get_graph(label: Optional[str] = Query(None), entity: Optional[str] = Query(None)):
    with driver.session() as session:
        where, params = [], {}
        if label:
            where.append("t.label = $label")
            params["label"] = label
        if entity:
            where.append("toLower(e.name) CONTAINS toLower($entity)")
            params["entity"] = entity

        cypher = f"""
        MATCH (t:Threat)-[:MENTIONS]->(e:Entity)
        {'WHERE ' + ' AND '.join(where) if where else ''}
        RETURN t, e
        LIMIT 500
        """
        result = session.run(cypher, **params)

        nodes = {}
        edges = []
        for r in result:
            t, e = r["t"], r["e"]
            tid = f"t_{t.element_id}"
            eid = f"e_{e.element_id}"

            nodes[tid] = {"id": tid, "label": "Threat", "text": t.get("text"), "type": t.get("label")}
            nodes[eid] = {"id": eid, "label": "Entity", "text": e.get("name"), "type": e.get("type")}

            edges.append({"source": tid, "target": eid, "type": "MENTIONS"})

        return {"nodes": list(nodes.values()), "edges": edges}
from fastapi import APIRouter, Query, Response
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from io import BytesIO
from typing import Optional
from neo4j import GraphDatabase
from backend.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

router = APIRouter()
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

@router.get("/pdf")
def report_pdf(state: Optional[str] = Query(None)):
    state = (state or "").strip()
    buf = BytesIO()
    p = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    p.setFont("Helvetica-Bold", 16)
    p.drawString(2*cm, height-2*cm, "OSINT Threat Report")
    p.setFont("Helvetica", 11)
    p.drawString(2*cm, height-2.8*cm, f"Scope: {state if state else 'All Nigeria'}")

    with driver.session() as session:
        if state:
            cypher = """
            MATCH (t:Threat)-[:MENTIONS]->(e:Entity)
            WHERE toLower(e.name) CONTAINS toLower($state) OR toLower(t.text) CONTAINS toLower($state)
            RETURN t.label AS label, count(*) AS c
            ORDER BY c DESC
            """
            rows = session.run(cypher, state=state).data()
        else:
            cypher = """
            MATCH (t:Threat)
            RETURN t.label AS label, count(*) AS c
            ORDER BY c DESC
            """
            rows = session.run(cypher).data()

    y = height - 4*cm
    p.setFont("Helvetica-Bold", 12)
    p.drawString(2*cm, y, "Counts by label:")
    p.setFont("Helvetica", 11)
    y -= 0.7*cm
    if rows:
        for r in rows:
            p.drawString(2.4*cm, y, f"{r['label']}: {r['c']}")
            y -= 0.6*cm
    else:
        p.drawString(2.4*cm, y, "No data found")
        y -= 0.6*cm

    p.showPage()
    p.save()
    pdf = buf.getvalue()
    buf.close()
    return Response(content=pdf, media_type="application/pdf")
from fastapi import APIRouter
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from backend.config import MODEL_DIR

router = APIRouter()

LABELS = [
    "Banditry",
    "Cybercrime",
    "Financial Fraud",
    "Human Trafficking",
    "No Threat",
    "Sextortion",
    "Terrorism",
]

# Load once
_tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
_model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
_model.eval()

class TextInput(BaseModel):
    text: str

@router.post("/")
def classify_text(payload: TextInput):
    text = (payload.text or "").strip()
    if not text:
        return {"category": "undefined", "confidence": 0.0, "note": "empty text"}

    inputs = _tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = _model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1)[0]
        conf, idx = torch.max(probs, dim=0)
    idx_i = int(idx.item())
    label = LABELS[idx_i] if 0 <= idx_i < len(LABELS) else "undefined"

    return {"category": label, "confidence": round(float(conf.item()), 4)}
%PDF-1.4
% ReportLab Generated PDF document http://www.reportlab.com
1 0 obj
<<
/F1 2 0 R /F2 3 0 R /F3 4 0 R
>>
endobj
2 0 obj
<<
/BaseFont /Helvetica /Encoding /WinAnsiEncoding /Name /F1 /Subtype /Type1 /Type /Font
>>
endobj
3 0 obj
<<
/BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding /Name /F2 /Subtype /Type1 /Type /Font
>>
endobj
4 0 obj
<<
/BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding /Name /F3 /Subtype /Type1 /Type /Font
>>
endobj
5 0 obj
<<
/Contents 9 0 R /MediaBox [ 0 0 595.2756 841.8898 ] /Parent 8 0 R /Resources <<
/Font 1 0 R /ProcSet [ /PDF /Text /ImageB /ImageC /ImageI ]
>> /Rotate 0 /Trans <<

>> 
  /Type /Page
>>
endobj
6 0 obj
<<
/PageMode /UseNone /Pages 8 0 R /Type /Catalog
>>
endobj
7 0 obj
<<
/Author (\(anonymous\)) /CreationDate (D:20250808165234+01'00') /Creator (\(unspecified\)) /Keywords () /ModDate (D:20250808165234+01'00') /Producer (ReportLab PDF Library - www.reportlab.com) 
  /Subject (\(unspecified\)) /Title (\(anonymous\)) /Trapped /False
>>
endobj
8 0 obj
<<
/Count 1 /Kids [ 5 0 R ] /Type /Pages
>>
endobj
9 0 obj
<<
/Filter [ /ASCII85Decode /FlateDecode ] /Length 316
>>
stream
Gasc?9l#AH&-h()^Z%C'L"`)W<HBaf&1IM4UR+CsdA!dLD5%!DUIbQBQBkhM1-7/8$pi"/l-11*`o--J5T45>MS]Y]%N?(o"a'[1Udu[:dr_-QLD86;nG>IsknGM)NC7JW3_!gH#*GXAPU%ZE!XhqQ[KEu*^i`rM\]l#<gc7SAdlLgP]Y[q3Eo&.3-TQ71?CaLI-$B/6<ZeP$\!lHNYemGeaL15HRrdiZJj'#4\8r\p2\+ZUmp+1%>[)]4hr^PmnbQ<tSGX>:RNmmjP3&sX!uLa2/08-+pL[A8_JG;c*_Y6D2VIX@Lu8YL[!Ug~>endstream
endobj
xref
0 10
0000000000 65535 f 
0000000073 00000 n 
0000000124 00000 n 
0000000231 00000 n 
0000000343 00000 n 
0000000458 00000 n 
0000000661 00000 n 
0000000729 00000 n 
0000001012 00000 n 
0000001071 00000 n 
trailer
<<
/ID 
[<4ef6d6d35437efe6ce53c0846848e5b9><4ef6d6d35437efe6ce53c0846848e5b9>]
% ReportLab generated PDF document -- digest (http://www.reportlab.com)

/Info 7 0 R
/Root 6 0 R
/Size 10
>>
startxref
1477
%%EOF
# backend/realtime/alert_bus.py
import asyncio
from typing import Dict, Any, Set
from starlette.websockets import WebSocket

class AlertBus:
    def __init__(self) -> None:
        self.clients: Set[WebSocket] = set()
        self.lock = asyncio.Lock()

    async def register(self, ws: WebSocket):
        await ws.accept()
        async with self.lock:
            self.clients.add(ws)

    async def unregister(self, ws: WebSocket):
        async with self.lock:
            if ws in self.clients:
                self.clients.remove(ws)

    async def broadcast(self, payload: Dict[str, Any]):
        dead = []
        async with self.lock:
            for ws in list(self.clients):
                try:
                    await ws.send_json({"type": "alert", "data": payload})
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.clients.discard(ws)

alert_bus = AlertBus()
 
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set, Dict, Any

router = APIRouter()

class WSManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        dead = []
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = WSManager()

@router.websocket("/ws/alerts")
async def alerts_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # ignore inbound
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Synchronous helper (called from normal endpoints)
import asyncio
def broadcast_alert_sync(msg: Dict[str, Any]):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        asyncio.create_task(manager.broadcast(msg))
    else:
        asyncio.run(manager.broadcast(msg))
import os
import re
import json
import pandas as pd

# ========= CONFIG =========
DATASET_DIR = r"C:\Users\Robotics.LAPTOP-RN8ESOK3\Desktop\osint_pro\dataset_classsifier"
OUTPUT_DIR   = os.path.join(os.path.dirname(DATASET_DIR), "dataset_cleaned")

# Final taxonomy (9 classes)
REQUIRED_LABELS = [
    "Banditry", "Cybercrime", "Financial Fraud",
    "Human Trafficking", "No Threat", "Sextortion",
    "Terrorism", "Armed Conflict", "Religious Extremism"
]

# Column name aliases weâll accept
TEXT_ALIASES  = {"text", "content", "message", "body", "report", "post", "headline"}
LABEL_ALIASES = {"label", "category", "class", "threat", "tag"}

# Label normalization map (None = drop)
LABEL_NORMALIZATION = {
    # canonical
    "banditry": "Banditry",
    "cyber crime": "Cybercrime",
    "cybercrime": "Cybercrime",
    "fraud": "Financial Fraud",
    "financial fraud": "Financial Fraud",
    "human trafficking": "Human Trafficking",
    "no threat": "No Threat",
    "no_threat": "No Threat",
    "sextortion": "Sextortion",
    "terrorism": "Terrorism",
    "armed conflict": "Armed Conflict",
    "armed_conflict": "Armed Conflict",
    "religious extremism": "Religious Extremism",
    "religious_extremism": "Religious Extremism",

    # junk / to drop
    "unknown": None,
    "n/a": None,
    "not sure": None,
    "uncategorized": None,
}

def find_column(df, aliases):
    cols_lower = {c.lower(): c for c in df.columns}
    for a in aliases:
        if a in cols_lower:
            return cols_lower[a]
    return None

def clean_text(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    s = re.sub(r"\s+", " ", s)
    return s if s else None

def normalize_label(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    if s in REQUIRED_LABELS:
        return s
    s_norm = re.sub(r"\s+", " ", s).strip().lower()
    if s_norm in LABEL_NORMALIZATION:
        return LABEL_NORMALIZATION[s_norm]
    t = s.title()
    if t in REQUIRED_LABELS:
        return t
    return None

def check_and_clean_one(csv_path):
    issues, actions = [], []
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        return None, [f"Could not read file: {e}"], [], {}

    # detect columns
    text_col  = find_column(df, TEXT_ALIASES)
    label_col = find_column(df, LABEL_ALIASES)
    if text_col is None:
        issues.append("Missing column: 'text' (or alias).")
    if label_col is None:
        issues.append("Missing column: 'label' (or alias).")
    if text_col is None or label_col is None:
        return None, issues, actions, {}

    # keep only standard columns
    df = df[[text_col, label_col]].rename(columns={text_col: "text", label_col: "label"})
    before = len(df)

    # clean text
    df["text"] = df["text"].map(clean_text)
    null_text = df["text"].isna().sum()
    if null_text > 0:
        issues.append(f"Null/empty text rows: {null_text}")
        df = df.dropna(subset=["text"])
        actions.append(f"Dropped {null_text} rows with empty text")

    # normalize labels
    df["label_norm"] = df["label"].map(normalize_label)
    bad_mask = df["label_norm"].isna()
    bad_count = bad_mask.sum()
    if bad_count > 0:
        bad_values = sorted(set(df.loc[bad_mask, "label"].astype(str)))
        issues.append(f"Invalid labels ({bad_count} rows): {bad_values}")
        df = df.loc[~bad_mask].copy()
        actions.append(f"Dropped {bad_count} rows with invalid labels")

    df["label"] = df["label_norm"]
    df = df.drop(columns=["label_norm"])

    # drop duplicate texts
    dup = df["text"].duplicated().sum()
    if dup > 0:
        issues.append(f"Duplicate texts: {dup}")
        df = df.drop_duplicates(subset=["text"])
        actions.append(f"Removed {dup} duplicate texts")

    after = len(df)
    actions.append(f"Kept {after} rows (from {before})")

    # coverage + distribution
    present = sorted(df["label"].unique().tolist())
    missing = sorted(set(REQUIRED_LABELS) - set(present))
    if missing:
        issues.append(f"Missing classes here: {missing}")

    dist = df["label"].value_counts().to_dict()
    return df[["text", "label"]], issues, actions, dist

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    files = [f for f in os.listdir(DATASET_DIR) if f.lower().endswith(".csv")]
    if not files:
        print("â ïž No CSV files found in the dataset directory.")
        return

    report_rows, clean_dfs = [], []

    for fname in files:
        path = os.path.join(DATASET_DIR, fname)
        print(f"\nð Checking & cleaning: {fname}")
        df_clean, issues, actions, dist = check_and_clean_one(path)

        status = "ok"
        if df_clean is None:
            status = "fail"

        # Save cleaned file if we have rows
        rows_kept = len(df_clean) if df_clean is not None else 0
        if df_clean is not None and rows_kept > 0:
            out_path = os.path.join(OUTPUT_DIR, f"clean_{fname}")
            df_clean.to_csv(out_path, index=False, encoding="utf-8")
            clean_dfs.append(df_clean)
            print(f"   â Saved cleaned â {out_path}")
        else:
            print("   â No usable rows after cleaning.")

        if issues:
            print("   â  Issues:", "; ".join(issues))
            status = "ok_with_warnings" if status == "ok" else status
        if actions:
            print("   ð  Actions:", "; ".join(actions))
        if dist:
            print(f"   ð Class dist: {dist}")

        report_rows.append({
            "file": fname,
            "status": status,
            "rows_kept": rows_kept,
            "issues": "; ".join(issues),
            "actions": "; ".join(actions),
            "class_distribution": json.dumps(dist),
        })

    # combine all cleaned data
    if clean_dfs:
        combined = pd.concat(clean_dfs, ignore_index=True)
        before_all = len(combined)
        combined = combined.drop_duplicates(subset=["text"])
        overall_dist = combined["label"].value_counts().to_dict()

        final_path = os.path.join(OUTPUT_DIR, "combined_dataset.csv")
        combined.to_csv(final_path, index=False, encoding="utf-8")
        print(f"\nð¯ Combined dataset saved: {final_path} (kept {len(combined)} of {before_all})")
        print(f"ð Overall class distribution: {overall_dist}")
    else:
        print("\nâ ïž No clean data to combine. Fix issues above and rerun.")

    # save report
    report_df = pd.DataFrame(report_rows)
    report_path = os.path.join(OUTPUT_DIR, "dataset_report.csv")
    report_df.to_csv(report_path, index=False, encoding="utf-8")
    print(f"ð Report saved: {report_path}")

if __name__ == "__main__":
    main()
import requests
import csv

# Prediction endpoint
URL = "http://localhost:8000/predict"

# Test cases (you can expand this list with more examples per class)
test_cases = [
    # Banditry
    ("Armed men attacked a village and stole livestock.", "Banditry"),
    ("A group of bandits raided a community in Kaduna.", "Banditry"),

    # Cybercrime
    ("Hackers stole data from several online banking portals.", "Cybercrime"),
    ("A scam website was used to defraud people.", "Cybercrime"),

    # Financial Fraud
    ("The pension board uncovered large-scale embezzlement.", "Financial Fraud"),
    ("A fake investment scheme scammed retirees of their savings.", "Financial Fraud"),

    # Human Trafficking
    ("Police rescued minors from a trafficking ring.", "Human Trafficking"),
    ("Several girls were moved across borders illegally.", "Human Trafficking"),

    # No Threat
    ("A peaceful protest was held in Abuja.", "No Threat"),
    ("The city hosted a marathon without incident.", "No Threat"),

    # Sextortion
    ("The suspect threatened to leak private images unless paid.", "Sextortion"),
    ("Victim was blackmailed using intimate pictures.", "Sextortion"),

    # Terrorism
    ("ISIS claimed responsibility for a bombing in Maiduguri.", "Terrorism"),
    ("A coordinated attack targeted a military base.", "Terrorism")
]

# Run diagnostics
correct = 0
results = []

print("\nð Threat Classifier Diagnostic Results\n")
print(f"{'Expected':<20} | {'Predicted':<20} | {'Confidence':<10} | {'â/â'}")
print("-" * 65)

for text, expected in test_cases:
    response = requests.post(URL, json={"text": text})
    if response.status_code == 200:
        result = response.json()
        predicted = result.get("label")
        confidence = result.get("confidence")
        correct_flag = "â" if predicted == expected else "â"
        results.append((text, expected, predicted, confidence, correct_flag))
        if correct_flag == "â":
            correct += 1
        print(f"{expected:<20} | {predicted:<20} | {confidence:<10.2f} | {correct_flag}")
    else:
        print(f"â Error: {response.status_code} â {response.text}")

# Summary
total = len(test_cases)
accuracy = (correct / total) * 100
print(f"\nâ Accuracy: {correct}/{total} ({accuracy:.1f}%)")

# Optional: Save to CSV
with open("diagnostic_results.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Text", "Expected", "Predicted", "Confidence", "Correct"])
    writer.writerows(results)

print("\nð Results saved to 'diagnostic_results.csv'")
#!/usr/bin/env python3
import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# Add parent dir to sys path
sys.path.append(str(Path(__file__).parent.parent))
from services.classifier import ThreatClassifier

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model_dir', type=str, default='../models/classifier_model')
    parser.add_argument('--input', type=str)
    parser.add_argument('--input_file', type=str)
    parser.add_argument('--output_file', type=str)
    parser.add_argument('--confidence_threshold', type=float, default=0.5)
    parser.add_argument('--log_to_neo4j', action='store_true')
    args = parser.parse_args()

    classifier = ThreatClassifier(args.model_dir)
    print(f"â Loaded classifier with labels: {classifier.labels}")

    texts = []
    if args.input:
        texts = [args.input]
    elif args.input_file:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            texts = [line.strip() for line in f if line.strip()]
    else:
        print("Enter text (type 'quit' to exit):")
        while True:
            t = input("\n> ")
            if t.lower() in ['q', 'quit']:
                break
            if t.strip():
                process_predictions(classifier, [t], args)
        return 0

    return process_predictions(classifier, texts, args)

def process_predictions(classifier, texts, args):
    predictions = classifier.predict_with_confidence(texts, return_probabilities=True)
    high = [p for p in predictions if p['confidence'] >= args.confidence_threshold]
    low = [p for p in predictions if p['confidence'] < args.confidence_threshold]

    for i, pred in enumerate(high):
        print(f"\nâ {i+1}. {pred['text'][:100]}")
        print(f"   ð¯ {pred['predicted_label']} ({pred['confidence']:.2f})")

    for i, pred in enumerate(low):
        print(f"\nâ ïž  {i+1}. {pred['text'][:100]}")
        print(f"   ð§ª {pred['predicted_label']} ({pred['confidence']:.2f})")

    batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    classifier.log_predictions_to_disk(predictions, batch_id)

    if args.log_to_neo4j:
        classifier.log_predictions_to_neo4j(predictions, batch_id)

    if args.output_file:
        with open(args.output_file, 'w', encoding='utf-8') as f:
            json.dump(predictions, f, indent=2, ensure_ascii=False)
        print(f"ðŸ Saved predictions to {args.output_file}")

    return 0

if __name__ == '__main__':
    sys.exit(main())
# scripts/logs_api.py

from fastapi import APIRouter, Query
from typing import Optional, List
from api.neo4j_connector import Neo4jConnector
from datetime import datetime

router = APIRouter()
neo4j = Neo4jConnector(password="intelligence")  # replace with actual password

@router.get("/logs")
def get_prediction_logs(
    label: Optional[str] = Query(None, description="Filter by predicted label"),
    since: Optional[str] = Query(None, description="Filter logs after timestamp (ISO 8601 format)"),
    text_contains: Optional[str] = Query(None, description="Filter logs containing text keyword")
):
    try:
        query = """
        MATCH (t:Text)-[r:PREDICTED_AS]->(th:Threat)
        WHERE ($label IS NULL OR th.label = $label)
        AND ($since IS NULL OR datetime(r.timestamp) > datetime($since))
        AND ($text_contains IS NULL OR toLower(t.content) CONTAINS toLower($text_contains))
        RETURN t.content AS text, th.label AS label, r.confidence AS confidence, r.timestamp AS timestamp
        ORDER BY r.timestamp DESC
        LIMIT 100
        """

        params = {
            "label": label,
            "since": since,
            "text_contains": text_contains
        }

        results = neo4j.run_query(query, params)
        return {"count": len(results), "logs": results}

    except Exception as e:
        return {"error": str(e)}
import requests

URL = "http://127.0.0.1:8000/predict"

samples = [
    "Armed men raided the village last night and stole livestock.",
    "Hackers breached the university's database, leaking student info.",
    "Fake investment platform tricked people with high returns.",
    "Police rescue 12 minors trafficked through the border.",
    "Had a great time at the concert yesterday!",
    "Victim blackmailed with leaked intimate photos online.",
    "Explosive device found near government building.",
]

for text in samples:
    response = requests.post(URL, json={"text": text})
    result = response.json()
    print(f"TEXT: {text}\nLABEL: {result['predicted_label']} | Confidence: {result['confidence']}\n")
# backend/scripts/seed_locations.py
from neo4j import GraphDatabase

URI = "bolt://localhost:7687"
USER = "neo4j"
PASSWORD = "intelligence"  # adjust if different

# --- States -> Cities (popular) ---
STATES = {
    "Abia": ["Umuahia", "Aba", "Ohafia"],
    "Adamawa": ["Yola", "Mubi", "Jimeta", "Girei"],
    "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene", "Oron"],
    "Anambra": ["Awka", "Onitsha", "Nnewi", "Otuocha"],
    "Bauchi": ["Bauchi", "Azare", "Misau", "Jama'are"],
    "Bayelsa": ["Yenagoa", "Ogbia", "Brass"],
    "Benue": ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala"],
    "Borno": ["Maiduguri", "Bama", "Gwoza", "Monguno"],
    "Cross River": ["Calabar", "Ikom", "Ogoja", "Ugep"],
    "Delta": ["Asaba", "Warri", "Ughelli", "Sapele"],
    "Ebonyi": ["Abakaliki", "Afikpo", "Onueke"],
    "Edo": ["Benin City", "Auchi", "Ekpoma"],
    "Ekiti": ["Ado-Ekiti", "Ikere-Ekiti", "Ise"],
    "Enugu": ["Enugu", "Nsukka", "Awgu"],
    "Gombe": ["Gombe", "Kaltungo", "Dukku"],
    "Imo": ["Owerri", "Orlu", "Okigwe"],
    "Jigawa": ["Dutse", "Hadejia", "Gumel"],
    "Kaduna": ["Kaduna", "Zaria", "Kafanchan", "Sabon Tasha"],
    "Kano": ["Kano", "Wudil", "Dawakinkudu"],
    "Katsina": ["Katsina", "Funtua", "Daura", "Dutsin-Ma"],
    "Kebbi": ["Birnin Kebbi", "Argungu", "Yauri", "Zuru"],
    "Kogi": ["Lokoja", "Okene", "Kabba", "Idah"],
    "Kwara": ["Ilorin", "Offa", "Omu-Aran"],
    "Lagos": ["Ikeja", "Lagos Island", "Ikorodu", "Epe", "Badagry"],
    "Nasarawa": ["Lafia", "Keffi", "Akwanga"],
    "Niger": ["Minna", "Bida", "Suleja", "Kontagora"],
    "Ogun": ["Abeokuta", "Ijebu-Ode", "Sagamu", "Ota"],
    "Ondo": ["Akure", "Ondo", "Owo", "Ikare"],
    "Osun": ["Osogbo", "Ife", "Ilesa", "Ikirun"],
    "Oyo": ["Ibadan", "Ogbomoso", "Iseyin", "Saki"],
    "Plateau": ["Jos", "Barkin Ladi", "Pankshin", "Shendam"],
    "Rivers": ["Port Harcourt", "Bonny", "Ahoada", "Omoku"],
    "Sokoto": ["Sokoto", "Tambuwal", "Wurno"],
    "Taraba": ["Jalingo", "Wukari", "Bali"],
    "Yobe": ["Damaturu", "Potiskum", "Gashua", "Nguru"],
    "Zamfara": ["Gusau", "Kaura Namoda", "Talata Mafara"],
    # FCT block
    "FCT": ["Abuja", "Gwagwalada", "Kuje", "Kwali", "Bwari", "Abaji"],
}

# Aliases to improve matching (lowercase for lookup)
ALIASES = {
    "Port Harcourt": ["PH", "PHC", "Portharcourt", "Port-Harcourt"],
    "Benin City": ["Benin"],
    "Abuja": ["FCT", "Abj"],
}

# (Optional) seed a few coordinates for better future geo features (lat/lon)
COORDS = {
    "Abuja": (9.0765, 7.3986),
    "Lagos": (6.5244, 3.3792),
    "Kano": (12.0022, 8.5919),
    "Maiduguri": (11.8311, 13.1510),
    "Port Harcourt": (4.8156, 7.0498),
}

def run():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    with driver.session() as session:
        # Constraints + indexes
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (l:Location) REQUIRE l.name IS UNIQUE")
        # Neo4j 5 fulltext index:
        session.run("""
        CREATE FULLTEXT INDEX location_fulltext IF NOT EXISTS
        FOR (l:Location) ON EACH [l.name, l.aliases]
        """)

        # Upsert states
        for state, cities in STATES.items():
            session.run("""
                MERGE (s:Location {name: $name})
                ON CREATE SET s.type = 'State', s.state = $name
                SET s.type = 'State'
            """, name=state)

            # Upsert cities and link
            for city in cities:
                aliases = ALIASES.get(city, [])
                lat, lon = COORDS.get(city, (None, None))
                session.run("""
                    MERGE (c:Location {name: $city})
                    ON CREATE SET
                        c.type = 'City',
                        c.state = $state,
                        c.aliases = $aliases,
                        c.lat = $lat,
                        c.lon = $lon
                    SET c.type = 'City', c.state = $state
                    WITH c
                    MATCH (s:Location {name: $state})
                    MERGE (c)-[:IN_STATE]->(s)
                """, city=city, state=state, aliases=aliases, lat=lat, lon=lon)

        # Also add state-level aliases (optional)
        # session.run("MATCH (s:Location {name:'Rivers'}) SET s.aliases = ['RV']")

    driver.close()
    print("â Seeded Location graph (States, Cities, Aliases, Indexes).")

if __name__ == "__main__":
    run()
from neo4j import GraphDatabase

URI = "bolt://localhost:7687"
USER = "neo4j"
PASSWORD = "intelligence"

sample = [
    {
        "text": "The ISIS cell planned a bombing in Maiduguri. Nigerian troops neutralized the suspects.",
        "label": "Terrorism",
        "confidence": 0.93,
        "entities": [("ISIS","ORG"), ("Maiduguri","LOC"), ("Nigerian troops","ORG")]
    },
    {
        "text": "Several girls were rescued from a human trafficking ring in Kano.",
        "label": "Human Trafficking",
        "confidence": 0.91,
        "entities": [("Kano","LOC")]
    },
    {
        "text": "Armed men attacked a convoy near Sokoto.",
        "label": "Banditry",
        "confidence": 0.88,
        "entities": [("Sokoto","LOC")]
    },
    {
        "text": "A massive pension fraud scheme was uncovered in Lagos.",
        "label": "Financial Fraud",
        "confidence": 0.90,
        "entities": [("Lagos","LOC")]
    }
]

def run():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    with driver.session() as session:
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (t:Threat) REQUIRE t.hash IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE")
        for s in sample:
            h = abs(hash(s["text"]))  # quick hash for demo
            session.run("""
                MERGE (t:Threat {hash: $hash})
                SET t.text = $text, t.label = $label, t.confidence = $conf
            """, hash=h, text=s["text"], label=s["label"], conf=s["confidence"])

            for name, etype in s["entities"]:
                session.run("""
                    MERGE (e:Entity {name: $name})
                    ON CREATE SET e.type = $type
                    WITH e
                    MATCH (t:Threat {hash: $hash})
                    MERGE (t)-[:MENTIONS]->(e)
                """, name=name, type=etype, hash=h)
    driver.close()
    print("â Seeded sample Threat/Entity data.")

if __name__ == "__main__":
    run()
import hashlib
from neo4j import GraphDatabase
from backend.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

SAMPLES = [
    {
        "text": "The ISIS cell planned a bombing in Maiduguri. Nigerian troops neutralized the suspects.",
        "label": "Terrorism",
        "entities": [("ISIS","ORG"), ("Maiduguri","LOC"), ("Borno","LOC")],
        "url": "https://example.com/1"
    },
    {
        "text": "A human trafficking ring was uncovered in Kano. Several young women were rescued by police.",
        "label": "Human Trafficking",
        "entities": [("Kano","LOC")],
        "url": "https://example.com/2"
    },
]

with driver.session() as session:
    # Ensure indexes
    session.run("CREATE FULLTEXT INDEX entity_fulltext IF NOT EXISTS FOR (e:Entity) ON EACH [e.name]")
    session.run("CREATE INDEX threat_hash IF NOT EXISTS FOR (t:Threat) ON (t.hash)")

    created = 0
    for s in SAMPLES:
        h = hashlib.sha256((s["text"] + s["url"]).encode("utf-8")).hexdigest()
        session.run("""
        MERGE (t:Threat {hash:$hash})
        ON CREATE SET t.text=$text, t.label=$label, t.url=$url, t.createdAt=timestamp()
        WITH t
        UNWIND $entities AS ent
        MERGE (e:Entity {name: ent[0]})
        ON CREATE SET e.type = ent[1]
        MERGE (t)-[:MENTIONS]->(e)
        """, hash=h, text=s["text"], label=s["label"], url=s["url"], entities=s["entities"])
        created += 1
    print(f"â Seeded {created} sample threats.")
# backend/scripts/setup_alerts_indexes.py
from neo4j import GraphDatabase
from backend.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

CY = [
    "CREATE CONSTRAINT alert_id_uniq IF NOT EXISTS FOR (a:Alert) REQUIRE a.id IS UNIQUE",
    "CREATE INDEX alert_created_at IF NOT EXISTS FOR (a:Alert) ON (a.created_at)",
    "CREATE INDEX location_name IF NOT EXISTS FOR (l:Location) ON (l.name)"
]

with driver.session() as s:
    for q in CY:
        s.run(q)
        print("OK:", q)
print("â Alerts indexes/constraints ensured.")
import os
import sys
from neo4j import GraphDatabase

# Configuration (same as in backend/config.py)
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "intelligence")

def setup_identity_schema():
    print("ð Connecting to Neo4j...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        with driver.session() as session:
            print("ð Creating indexes for identity search...")
            
            # Create indexes for performance
            session.run("CREATE INDEX person_nin IF NOT EXISTS FOR (p:Person) ON (p.nin)")
            print("â NIN index created")
            
            session.run("CREATE INDEX person_phone IF NOT EXISTS FOR (p:Person) ON (p.phones)")
            print("â Phone index created")
            
            session.run("CREATE INDEX person_email IF NOT EXISTS FOR (p:Person) ON (p.emails)")
            print("â Email index created")
            
            session.run("CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.full_name)")
            print("â Name index created")
            
            print("ð¯ Identity schema setup complete!")
            
    except Exception as e:
        print(f"â Error: {e}")
        return False
    finally:
        driver.close()
    
    return True

if __name__ == "__main__":
    success = setup_identity_schema()
    if success:
        print("\nð Ready for Phase G implementation!")
    else:
        print("\nð¥ Setup failed - check your Neo4j connection")from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import pipeline

# Load pre-trained NER model and tokenizer
model_name = "dslim/bert-base-NER"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(model_name)

# Create a NER pipeline
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")

# Example text
text = "The ISIS-affiliated group attacked a convoy in Abuja. The leader Abu Bakr was captured by Nigerian forces."

# Run NER
entities = ner_pipeline(text)

# Print results
print("ð Named Entities Detected:")
for ent in entities:
    print(f" - {ent['word']} ({ent['entity_group']}): {ent['score']:.2f}")
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    pipeline
)
from neo4j import GraphDatabase
from typing import List

# -------- CONFIG --------
THREAT_MODEL_NAME = "models/classifier_model"
NER_MODEL_NAME = "dslim/bert-base-NER"
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "intelligence"

# -------- INIT --------
app = FastAPI()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load threat classification model
threat_tokenizer = AutoTokenizer.from_pretrained(THREAT_MODEL_NAME)
threat_model = AutoModelForSequenceClassification.from_pretrained(THREAT_MODEL_NAME).to(device)
threat_pipeline = pipeline(
    "text-classification",
    model=threat_model,
    tokenizer=threat_tokenizer,
    device=0 if torch.cuda.is_available() else -1
)

# Load NER model
ner_tokenizer = AutoTokenizer.from_pretrained(NER_MODEL_NAME)
ner_model = AutoModelForTokenClassification.from_pretrained(NER_MODEL_NAME)
ner_pipeline = pipeline(
    "ner",
    model=ner_model,
    tokenizer=ner_tokenizer,
    aggregation_strategy="simple",
    device=0 if torch.cuda.is_available() else -1
)

# Connect to Neo4j
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# -------- SCHEMAS --------
class TextInput(BaseModel):
    text: str

class BulkTextInput(BaseModel):
    texts: List[str]

# -------- HELPERS --------
def extract_named_entities(text):
    entities = ner_pipeline(text)
    extracted = []
    for ent in entities:
        if ent['entity_group'] in ['PER', 'ORG', 'LOC']:
            extracted.append({
                "text": ent['word'],
                "type": ent['entity_group'],
                "score": float(round(ent['score'], 3))
            })
    return extracted

def log_to_neo4j(text, label, confidence, entities):
    with driver.session() as session:
        session.run("""
            MERGE (t:Threat {text: $text})
            SET t.label = $label,
                t.confidence = $confidence,
                t.timestamp = datetime()
        """, text=text, label=label, confidence=confidence)

        for entity in entities:
            session.run("""
                MERGE (e:Entity {name: $name, type: $type})
                MERGE (t:Threat {text: $text})
                MERGE (t)-[:MENTIONS]->(e)
            """, name=entity["text"], type=entity["type"], text=text)

# -------- ROUTES --------
@app.get("/")
def root():
    return {"message": "OSINT API with NER and Neo4j logging is running."}

@app.post("/predict")
def predict_threat(input_data: TextInput):
    text = input_data.text
    try:
        result = threat_pipeline(text)[0]
        label = result['label']
        confidence = float(round(result['score'], 4))

        entities = extract_named_entities(text)
        log_to_neo4j(text, label, confidence, entities)

        return {
            "text": text,
            "label": label,
            "confidence": confidence,
            "named_entities": entities
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bulk-predict")
def bulk_predict_threats(input_data: BulkTextInput):
    results = []
    for text in input_data.texts:
        try:
            result = threat_pipeline(text)[0]
            label = result['label']
            confidence = float(round(result['score'], 4))
            entities = extract_named_entities(text)
            log_to_neo4j(text, label, confidence, entities)
            results.append({
                "text": text,
                "label": label,
                "confidence": confidence,
                "named_entities": entities
            })
        except Exception as e:
            results.append({
                "text": text,
                "error": str(e)
            })
    return {"results": results}

@app.get("/graph")
def get_graph():
    nodes = []
    edges = []
    seen_nodes = set()

    with driver.session() as session:
        results = session.run("""
            MATCH (t:Threat)-[r:MENTIONS]->(e:Entity)
            RETURN t.text AS threat_text, t.label AS threat_label,
                   e.name AS entity_name, e.type AS entity_type
            LIMIT 100
        """)

        for record in results:
            threat_id = f"t_{hash(record['threat_text']) % 100000}"
            entity_id = f"e_{hash(record['entity_name']) % 100000}"

            if threat_id not in seen_nodes:
                nodes.append({
                    "id": threat_id,
                    "label": "Threat",
                    "text": record["threat_text"],
                    "type": record["threat_label"]
                })
                seen_nodes.add(threat_id)

            if entity_id not in seen_nodes:
                nodes.append({
                    "id": entity_id,
                    "label": "Entity",
                    "text": record["entity_name"],
                    "type": record["entity_type"]
                })
                seen_nodes.add(entity_id)

            edges.append({
                "source": threat_id,
                "target": entity_id,
                "type": "MENTIONS"
            })

    return {"nodes": nodes, "edges": edges}
# backend/ws/alerts_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any

router = APIRouter()

class WSManager:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast_json(self, message: Dict[str, Any]):
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = WSManager()

def broadcast_alert(message: Dict[str, Any]):
    # fire-and-forget helper; caller doesnât await
    import anyio
    anyio.from_thread.run(manager.broadcast_json, message)

@router.websocket("/ws/alerts")
async def alerts_ws(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # We don't need to receive; keep alive
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)



(env) ┌─[venom@parrot]─[~/osint_backend]
└──╼ $ls
api                main.py                  railway.toml      scripts
config.py          osint_backend_server.py  realtime          ws
generated_reports  Procfile                 requirements.txt
(env) ┌─[venom@parrot]─[~/osint_backend]
└──╼ $ls */*
api/admin.py                          realtime/__init__.py
api/alerts.py                         realtime/ws_manager.py
api/alerts_ws.py                      scripts/clean_and_validate_datasets.py
api/criminal_intelligence.py          scripts/diagnose_classifier.py
api/generative_assistant.py           scripts/infer_classifier.py
api/graph_router.py                   scripts/logs_api.py
api/ingestion.py                      scripts/logs_testing.py
api/__init__.py                       scripts/seed_locations.py
api/locations.py                      scripts/seed_neo4j.py
api/neo4j_connector.py                scripts/seed_sample_threats.py
api/person_search.py                  scripts/setup_alerts_indexes.py
api/relationship_graph.py             scripts/setup_identity_schema.py
api/report_generator.py               scripts/test_ner_model.py
api/threat_classifier.py              scripts/threat_api.py
generated_reports/_threat_report.pdf  ws/alerts_ws.py
realtime/alert_bus.py
(env) ┌─[venom@parrot]─[~/osint_backend]
└──╼ $


