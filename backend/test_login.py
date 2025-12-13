"""
Script de prueba manual del endpoint de login
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_login():
    """Prueba manual del flujo de login"""

    # Conectar a MongoDB
    MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
    print(f"🔌 Conectando a MongoDB: {MONGODB_URL[:50]}...")

    client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    db = client.fraktal
    users_collection = db.users

    try:
        # Probar conexión
        await client.admin.command("ping")
        print("✓ Conexión exitosa a MongoDB\n")
    except Exception as e:
        print(f"✗ Error conectando a MongoDB: {e}\n")
        return

    # 1. Verificar si el usuario admin existe
    print("1️⃣ Buscando usuario admin...")
    user = await users_collection.find_one({"username": "admin@programafraktal.com"})

    if not user:
        print("  ⚠️  Usuario admin no encontrado, creando...")
        admin_password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "1234")

        # Crear hash
        print(f"  🔐 Generando hash para password: {admin_password}")
        hashed_password = pwd_context.hash(admin_password)

        admin_user = {
            "username": "admin@programafraktal.com",
            "email": "admin@programafraktal.com",
            "hashed_password": hashed_password,
            "role": "admin",
            "created_at": datetime.utcnow().isoformat(),
        }

        result = await users_collection.insert_one(admin_user)
        print(f"  ✓ Usuario admin creado con ID: {result.inserted_id}")
        user = admin_user
    else:
        print("  ✓ Usuario admin encontrado")

    # 2. Probar verificación de contraseña
    print("\n2️⃣ Probando verificación de contraseña...")
    test_password = "1234"

    import time
    start = time.time()
    is_valid = pwd_context.verify(test_password, user.get("hashed_password", ""))
    verify_time = time.time() - start

    print(f"  Password: {test_password}")
    print(f"  Válida: {is_valid}")
    print(f"  Tiempo de verificación: {verify_time:.3f}s")

    if not is_valid:
        print("\n  ⚠️  PROBLEMA: La contraseña no es válida!")
        print("  Intentando con contraseña incorrecta...")
        is_valid_wrong = pwd_context.verify("wrong_password", user.get("hashed_password", ""))
        print(f"  Password incorrecta válida: {is_valid_wrong} (debería ser False)")

    # 3. Simular creación de token
    print("\n3️⃣ Simulando creación de token JWT...")
    from jose import jwt
    from datetime import timedelta

    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user["username"]}
    expire = datetime.utcnow() + access_token_expires
    to_encode.update({"exp": expire})

    start = time.time()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    token_time = time.time() - start

    print(f"  Token generado (primeros 50 chars): {encoded_jwt[:50]}...")
    print(f"  Tiempo de generación: {token_time:.3f}s")

    # 4. Resumen
    print("\n" + "="*60)
    print("📊 RESUMEN DEL TEST")
    print("="*60)
    print(f"✓ MongoDB: Conectado")
    print(f"✓ Usuario admin: {'Existe' if user else 'No encontrado'}")
    print(f"✓ Verificación de contraseña: {'OK' if is_valid else 'FALLA'}")
    print(f"✓ Token JWT: Generado")
    print(f"\n⏱️  Tiempos:")
    print(f"  - Verificación bcrypt: {verify_time:.3f}s")
    print(f"  - Generación JWT: {token_time:.3f}s")
    print(f"  - Total estimado: {verify_time + token_time:.3f}s")
    print("="*60)

    # Cerrar conexión
    client.close()

if __name__ == "__main__":
    asyncio.run(test_login())
