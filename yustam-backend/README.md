# ⚡ Yustam Backend (FastAPI + Supabase)

> **High-performance REST API with real-time capabilities**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.121.2-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://python.org)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?logo=supabase)](https://supabase.com)
[![Paystack](https://img.shields.io/badge/Paystack-Live-00C3F7)](https://paystack.com)

---

## 🎯 Overview

The **Yustam Backend** is a modern, high-performance REST API built with FastAPI 0.121.2 and Supabase. It replaces the legacy PHP backend with a scalable, type-safe, and fully documented API.

### Key Features
- ⚡ **FastAPI**: Async, type-safe, auto-documented
- 🗄️ **Supabase**: Postgres + Auth + Storage + Realtime
- 🔐 **JWT Authentication**: Secure, stateless sessions
- 💳 **Paystack Integration**: Real payment processing
- 🤖 **Gemini AI**: Google's latest AI model
- 📊 **Plan-Based Gating**: Server-side feature validation
- 🔔 **Webhooks**: Paystack payment notifications
- 📝 **Auto-Generated Docs**: Swagger UI + ReDoc

---

## 🛠️ Tech Stack

- **Framework**: FastAPI 0.121.2
- **ORM**: SQLAlchemy 2.0
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth + JWT
- **Storage**: Supabase Storage
- **Payments**: Paystack API
- **AI**: Google Vertex AI (Gemini 2.5 Pro)
- **Validation**: Pydantic v2
- **HTTP Client**: httpx
- **Task Queue**: Celery (optional)
- **Caching**: Redis (optional)

---

## 📁 Project Structure

```
yustam-backend/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment configuration
│   ├── database.py             # Supabase connection
│   ├── dependencies.py         # Dependency injection
│   ├── middleware.py           # Custom middleware
│   ├── api/
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py        # Authentication endpoints
│   │   │   ├── listings.py    # Listings CRUD
│   │   │   ├── vendors.py     # Vendor management
│   │   │   ├── buyers.py      # Buyer management
│   │   │   ├── plans.py       # Subscriptions
│   │   │   ├── chats.py       # Messaging
│   │   │   ├── notifications.py
│   │   │   ├── support.py     # Support tickets
│   │   │   ├── verification.py
│   │   │   ├── admin.py       # Admin endpoints
│   │   │   └── webhooks.py    # Paystack webhooks
│   ├── models/
│   │   ├── user.py
│   │   ├── listing.py
│   │   ├── subscription.py
│   │   ├── chat.py
│   │   └── ...
│   ├── schemas/
│   │   ├── user.py            # Pydantic models
│   │   ├── listing.py
│   │   └── ...
│   ├── services/
│   │   ├── auth.py
│   │   ├── paystack.py
│   │   ├── gemini.py
│   │   ├── storage.py
│   │   └── email.py
│   └── utils/
│       ├── security.py
│       ├── validators.py
│       └── formatters.py
├── tests/
│   ├── test_auth.py
│   ├── test_listings.py
│   └── ...
├── alembic/                    # Database migrations (optional)
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11 or higher
- Supabase account
- Paystack account
- Google Cloud account (for Gemini AI)

### Installation

1. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
Copy `.env.example` to `.env` and fill in:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_21106eb17dafe8fbdca6708b57cef484d8a125ef
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_DAYS=7

# App
APP_NAME=Yustam API
APP_VERSION=1.0.0
DEBUG=False
ALLOWED_ORIGINS=https://yustam.com.ng,https://admin.yustam.com.ng
```

4. **Run migrations** (if using Alembic)
```bash
alembic upgrade head
```

5. **Start development server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

6. **Access API docs**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 📦 Dependencies

```txt
# Core
fastapi==0.121.2
uvicorn[standard]==0.32.0
python-dotenv==1.0.0

# Database
supabase==2.11.0
sqlalchemy==2.0.36
asyncpg==0.30.0

# Validation
pydantic==2.10.4
pydantic-settings==2.7.0
email-validator==2.2.0

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.20

# HTTP
httpx==0.28.1
requests==2.32.3

# AI
google-generativeai==0.8.3

# Utils
python-dateutil==2.9.0
pytz==2024.2
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # Login with email/password
POST   /api/v1/auth/session           # Create session from Supabase token
GET    /api/v1/auth/me                # Get current user
PATCH  /api/v1/auth/me                # Update profile
POST   /api/v1/auth/refresh           # Refresh JWT token
```

### Listings
```
GET    /api/v1/listings               # List all listings (with filters)
POST   /api/v1/listings               # Create listing (vendor only)
GET    /api/v1/listings/{id}          # Get listing details
PATCH  /api/v1/listings/{id}          # Update listing (owner only)
DELETE /api/v1/listings/{id}          # Delete listing (owner only)
```

### Vendors
```
POST   /api/v1/vendors/activate       # Activate vendor account
GET    /api/v1/vendors/me             # Get vendor profile
PATCH  /api/v1/vendors/me             # Update vendor profile
GET    /api/v1/vendors/me/dashboard   # Get dashboard stats
GET    /api/v1/vendors/me/analytics   # Get analytics
GET    /api/v1/vendors/{id}/storefront # Get public storefront
```

### Plans & Subscriptions
```
GET    /api/v1/plans                  # List all plans
GET    /api/v1/plans/me               # Get my subscription
POST   /api/v1/plans/{slug}/checkout  # Initiate Paystack checkout
POST   /api/v1/plans/auto-renew       # Toggle auto-renewal
POST   /api/v1/plans/cancel           # Cancel subscription
POST   /api/v1/webhooks/paystack      # Paystack webhook handler
```

### Chats
```
GET    /api/v1/chats                  # List chat threads
POST   /api/v1/chats                  # Open new chat
GET    /api/v1/chats/{id}/messages    # Get messages
POST   /api/v1/chats/{id}/messages    # Send message
POST   /api/v1/chats/{id}/read        # Mark as read
```

### Admin
```
GET    /api/v1/admin/dashboard        # Dashboard stats
GET    /api/v1/admin/listings         # Manage listings
PATCH  /api/v1/admin/listings/{id}    # Approve/reject listing
GET    /api/v1/admin/vendors          # Manage vendors
PATCH  /api/v1/admin/vendors/{id}     # Suspend/unsuspend vendor
GET    /api/v1/admin/verifications    # Verification requests
PATCH  /api/v1/admin/verifications/{id} # Approve/reject verification
```

---

## 🔐 Authentication Flow

### 1. Supabase Auth → JWT
```python
@router.post("/session")
async def create_session(token: str):
    # Verify Supabase token
    user = await supabase.auth.get_user(token)
    
    # Sync to database
    db_user = await sync_user(user)
    
    # Issue JWT
    jwt_token = create_jwt_token(db_user)
    
    return {"token": jwt_token, "user": db_user}
```

### 2. JWT Validation
```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await get_user_by_id(user_id)
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## 💳 Paystack Integration

### Initiate Checkout
```python
@router.post("/plans/{slug}/checkout")
async def checkout(slug: str, duration: int, user: User = Depends(get_current_user)):
    # Get plan details
    plan = get_plan(slug, duration)
    
    # Create Paystack transaction
    response = paystack.initialize_transaction(
        email=user.email,
        amount=plan.amount * 100,  # Convert to kobo
        plan=plan.plan_code,
        metadata={
            "vendor_id": user.id,
            "plan_slug": slug,
            "duration_months": duration
        }
    )
    
    return {"authorization_url": response["authorization_url"]}
```

### Webhook Handler
```python
@router.post("/webhooks/paystack")
async def paystack_webhook(request: Request):
    # Verify signature
    signature = request.headers.get("x-paystack-signature")
    body = await request.body()
    
    if not verify_paystack_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Process event
    event = await request.json()
    
    if event["event"] == "charge.success":
        await process_successful_payment(event["data"])
    
    return {"status": "success"}
```

---

## 🤖 Gemini AI Integration

### Generate Listing Description
```python
@router.post("/ai/generate-description")
async def generate_description(
    title: str,
    category: str,
    user: User = Depends(get_current_user)
):
    # Check AI usage limit
    if not await check_ai_limit(user):
        raise HTTPException(status_code=429, detail="AI usage limit exceeded")
    
    # Generate with Gemini
    prompt = f"Generate a compelling product description for: {title} in category: {category}"
    response = await gemini_service.generate_text(prompt)
    
    # Track usage
    await track_ai_usage(user)
    
    return {"description": response}
```

---

## 📊 Plan-Based Feature Gating

### Middleware
```python
async def check_plan_permission(user: User, feature: str):
    plan_features = {
        "free": ["basic_listing"],
        "starter": ["basic_listing", "verified_badge", "basic_analytics"],
        "pro": ["basic_listing", "verified_badge", "detailed_analytics", "custom_storefront"],
        # ...
    }
    
    user_features = plan_features.get(user.plan, [])
    
    if feature not in user_features:
        raise HTTPException(status_code=403, detail="Upgrade plan to access this feature")
```

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

---

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Build & Run
```bash
docker build -t yustam-backend .
docker run -p 8000:8000 --env-file .env yustam-backend
```

---

## 📄 License

Copyright © 2025 Yustam Marketplace. All rights reserved.

---

**Fast, scalable, and type-safe 🚀**
