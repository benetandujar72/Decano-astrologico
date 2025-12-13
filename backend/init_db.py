"""
Script de inicialización de base de datos
Crea índices y el usuario admin si no existe
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_database():
    """Inicializa la base de datos con índices y datos básicos"""

    # Conectar a MongoDB
    MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
    print(f"Conectando a MongoDB: {MONGODB_URL[:50]}...")

    client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    db = client.fraktal

    try:
        # Probar conexión
        await client.admin.command("ping")
        print("✓ Conexión exitosa a MongoDB")
    except Exception as e:
        print(f"✗ Error conectando a MongoDB: {e}")
        return

    # Colecciones
    users_collection = db.users
    system_prompts_collection = db.system_prompts

    # 1. Crear índices para optimizar búsquedas
    print("\n1. Creando índices...")
    try:
        await users_collection.create_index("username", unique=True)
        print("  ✓ Índice único en 'username' creado")
    except Exception as e:
        print(f"  - Índice ya existe o error: {e}")

    try:
        await users_collection.create_index("email")
        print("  ✓ Índice en 'email' creado")
    except Exception as e:
        print(f"  - Índice ya existe o error: {e}")

    # 2. Crear usuario admin si no existe
    print("\n2. Verificando usuario admin...")
    admin_exists = await users_collection.find_one({"username": "admin@programafraktal.com"})

    if not admin_exists:
        print("  - Admin no existe, creando...")
        admin_password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "1234")
        hashed_password = pwd_context.hash(admin_password)

        admin_user = {
            "username": "admin@programafraktal.com",
            "email": "admin@programafraktal.com",
            "hashed_password": hashed_password,
            "role": "admin",
            "created_at": datetime.utcnow().isoformat(),
        }

        try:
            await users_collection.insert_one(admin_user)
            print(f"  ✓ Usuario admin creado: admin@programafraktal.com / {admin_password}")
        except Exception as e:
            print(f"  ✗ Error creando admin: {e}")
    else:
        print(f"  ✓ Usuario admin ya existe")

    # 3. Verificar system_prompts
    print("\n3. Verificando configuración del sistema...")
    prompt_exists = await system_prompts_collection.find_one({"key": "master_prompt"})
    if not prompt_exists:
        print("  - System prompt no existe, se creará en el primer uso")
    else:
        print("  ✓ System prompt configurado")

    # Cerrar conexión
    client.close()
    print("\n✓ Inicialización completada")

if __name__ == "__main__":
    asyncio.run(init_database())
