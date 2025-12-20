"""
Endpoints de autenticación
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

# Configuración de seguridad
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Usar bcrypt_sha256 para evitar el límite de 72 bytes de bcrypt.
# Mantener bcrypt en la lista para verificar hashes antiguos.
pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

# Cliente MongoDB con opciones SSL configuradas
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"

# Opciones para MongoDB Atlas con SSL/TLS
mongodb_options = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 10000,
    "socketTimeoutMS": 10000,
    "maxPoolSize": 10,
    "minPoolSize": 1,
}

# Si es MongoDB Atlas (contiene mongodb+srv o mongodb.net), agregar opciones SSL
if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({
        "tls": True,
        "tlsAllowInvalidCertificates": True,  # Necesario para algunos entornos
    })

client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client.fraktal
users_collection = db.users


class RegisterRequest(BaseModel):
    username: str
    password: str

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Evita 500 por errores del backend de hash; tratar como credenciales inválidas.
        return False

def get_password_hash(password: str) -> str:
    """Genera hash de contraseña"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crea un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Obtiene el usuario actual desde el token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await users_collection.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return user


async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme_optional)):
    """Obtiene el usuario actual si hay token válido; si no, retorna None."""
    if not token:
        return None

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await users_collection.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return user

async def require_admin(current_user: dict = Depends(get_current_user)):
    """Verifica que el usuario actual sea administrador"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Endpoint de login - Optimizado con logging"""
    import time
    start_time = time.time()

    print(f"[AUTH] Login attempt for user: {form_data.username}")

    # Buscar usuario en la base de datos
    user = await users_collection.find_one({"username": form_data.username})
    db_query_time = time.time() - start_time
    print(f"[AUTH] DB query time: {db_query_time:.3f}s")

    # Bootstrap admin (demo): si no existe aún, lo creamos automáticamente.
    if not user and form_data.username == "admin@programafraktal.com":
        print(f"[AUTH] Admin user not found, creating bootstrap admin...")
        bootstrap_start = time.time()

        admin_password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "1234")
        hashed_password = get_password_hash(admin_password)
        admin_user = {
            "username": "admin@programafraktal.com",
            "email": "admin@programafraktal.com",
            "hashed_password": hashed_password,
            "role": "admin",
            "created_at": datetime.utcnow().isoformat(),
        }

        try:
            result = await users_collection.insert_one(admin_user)
            # No hacer segunda query, usar el admin_user que acabamos de crear
            user = admin_user
            user["_id"] = result.inserted_id
            bootstrap_time = time.time() - bootstrap_start
            print(f"[AUTH] Admin bootstrap completed in {bootstrap_time:.3f}s")
        except Exception as e:
            print(f"[AUTH] Error creating admin: {e}")
            # Tal vez ya existe (race condition), intentar buscar de nuevo
            user = await users_collection.find_one({"username": form_data.username})

    # Bootstrap opcional de un segundo admin (sin credenciales hardcodeadas)
    second_admin_username = os.getenv("SECOND_ADMIN_BOOTSTRAP_USERNAME") or os.getenv("SECOND_ADMIN_BOOTSTRAP_EMAIL")
    second_admin_password = os.getenv("SECOND_ADMIN_BOOTSTRAP_PASSWORD")
    if (
        not user
        and second_admin_username
        and second_admin_password
        and form_data.username == second_admin_username
    ):
        print(f"[AUTH] Second admin not found, creating bootstrap admin: {second_admin_username}")
        bootstrap_start = time.time()

        hashed_password = get_password_hash(second_admin_password)
        admin_user = {
            "username": second_admin_username,
            "email": second_admin_username,
            "hashed_password": hashed_password,
            "role": "admin",
            "created_at": datetime.utcnow().isoformat(),
        }

        try:
            result = await users_collection.insert_one(admin_user)
            user = admin_user
            user["_id"] = result.inserted_id
            bootstrap_time = time.time() - bootstrap_start
            print(f"[AUTH] Second admin bootstrap completed in {bootstrap_time:.3f}s")
        except Exception as e:
            print(f"[AUTH] Error creating second admin: {e}")
            user = await users_collection.find_one({"username": form_data.username})

    if not user:
        print(f"[AUTH] User not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar contraseña
    verify_start = time.time()
    password_valid = verify_password(form_data.password, user.get("hashed_password", ""))
    verify_time = time.time() - verify_start
    print(f"[AUTH] Password verification time: {verify_time:.3f}s")

    if not password_valid:
        print(f"[AUTH] Invalid password for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generar token
    token_start = time.time()
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    token_time = time.time() - token_start

    total_time = time.time() - start_time
    print(f"[AUTH] Token generation time: {token_time:.3f}s")
    print(f"[AUTH] Total login time: {total_time:.3f}s - SUCCESS for {form_data.username}")

    # Obtener suscripción
    subscription = await db.user_subscriptions.find_one({"user_id": str(user["_id"])})
    subscription_tier = "free"
    if subscription:
        subscription_tier = subscription.get("tier", "free")
    elif user.get("role") == "admin":
        subscription_tier = "enterprise"

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user.get("email", user["username"]),
            "role": user.get("role", "user"),
            "subscription_tier": subscription_tier
        }
    }

@router.post("/register")
async def register(payload: RegisterRequest):
    """Endpoint de registro"""
    # Verificar si el usuario ya existe
    existing_user = await users_collection.find_one({"username": payload.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Crear nuevo usuario
    hashed_password = get_password_hash(payload.password)
    user = {
        "username": payload.username,
        "email": payload.username,  # Usar username como email si no se proporciona
        "hashed_password": hashed_password,
        "role": "admin" if payload.username == "admin@programafraktal.com" else "user",
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await users_collection.insert_one(user)
    
    return {
        "username": user["username"],
        "email": user["email"],
        "role": user["role"]
    }

