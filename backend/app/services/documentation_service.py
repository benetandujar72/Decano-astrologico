
import os
import glob
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Any
import sys

import PyPDF2

# MongoDB (sync) para cachear documentación procesada
try:
    from pymongo import MongoClient
except Exception:
    MongoClient = None  # type: ignore

from app.services.docs_schema import MODULE_TO_TOPIC
from app.services.docs_retrieval_service import DocsRetrievalService

class DocumentationService:
    """
    Servicio para gestionar la documentación astrológica en formato PDF.
    Carga, indexa y proporciona contexto para la generación de informes.
    """
    
    def __init__(self, docs_path: str = None):
        """
        Inicializa el servicio de documentación.
        
        Args:
            docs_path: Ruta al directorio de documentación. Si es None, busca en el entorno o default.
        """
        if docs_path:
            self.docs_path = docs_path
        else:
            # Intentar obtener de variable de entorno o usar path relativo default
            # Asumiendo que estamos en app/services, subir dos niveles a backend, luego uno a Decano...
            # Ajustar según estructura real: backend/app/services -> backend/ -> Decano.../documentacion
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            # En contenedor normalmente base_dir=/app; en dev, a veces hay que subir un nivel.
            env_docs = os.getenv("DOCS_PATH")
            if env_docs:
                self.docs_path = env_docs
            else:
                candidate_1 = os.path.join(base_dir, "documentacion")  # /app/documentacion (container)
                candidate_2 = os.path.join(os.path.dirname(base_dir), "documentacion")  # repo root/documentacion (dev)
                self.docs_path = candidate_1 if os.path.exists(candidate_1) else candidate_2

        self.index: Dict[str, str] = {} # Filename -> extracted text
        self.is_loaded = False
        # Cache simple de contextos por módulo/tópico para evitar recomputar en cada request
        # Key: (kind, key, max_chars) -> context str
        self._context_cache: Dict[tuple, str] = {}

        # Versionado de documentación (se recomienda fijarlo desde la ingesta)
        self.docs_version = os.getenv("DOCS_VERSION", "default")

        # Mongo (cache persistente)
        self.mongo_enabled = False
        self._mongo_db = None
        self._col_sources = None
        self._col_chunks = None
        self._col_module_contexts = None
        self._col_query_vectors = None
        self._retrieval: Optional[DocsRetrievalService] = None
        self._init_mongo()

        print(f"📚 DocumentationService inicializado con ruta: {self.docs_path}")

    def _init_mongo(self) -> None:
        """Inicializa conexión a MongoDB si hay dependencia y URL disponible."""
        if MongoClient is None:
            return

        mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
        if not mongo_url:
            return

        mongodb_options: Dict[str, Any] = {
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 10000,
        }
        if "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url:
            mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})

        try:
            client = MongoClient(mongo_url, **mongodb_options)
            self._mongo_db = client.fraktal
            self._col_sources = self._mongo_db.documentation_sources
            self._col_chunks = self._mongo_db.documentation_chunks
            self._col_module_contexts = self._mongo_db.documentation_module_contexts
            self._col_query_vectors = self._mongo_db.documentation_query_vectors
            self.mongo_enabled = True

            # Retrieval service (Atlas Vector Search) is optional and controlled by env var.
            if os.getenv("DOCS_RETRIEVAL_MODE", "").lower() in {"atlas_vector", "vector", "atlas"}:
                if self._col_chunks is not None:
                    self._retrieval = DocsRetrievalService(
                        chunks_collection=self._col_chunks,
                        query_vectors_collection=self._col_query_vectors,
                    )
        except Exception as e:
            # No romper la app si no hay BD; caerá a modo PDFs
            print(f"⚠️ MongoDB no disponible para DocumentationService: {e}", file=sys.stderr)
            self.mongo_enabled = False

    @staticmethod
    def _sha256_bytes(data: bytes) -> str:
        h = hashlib.sha256()
        h.update(data)
        return h.hexdigest()

    def has_cached_context_for_module(self, module_id: str, max_chars: int) -> bool:
        """Devuelve True si hay contexto precomputado en BD (según docs_version)."""
        # IMPORTANT: PyMongo Collection does not implement truthiness (`bool(collection)` raises).
        if (not self.mongo_enabled) or (self._col_module_contexts is None):
            return False
        try:
            q = {"module_id": module_id, "max_chars": int(max_chars), "version": self.docs_version}
            doc = self._col_module_contexts.find_one(q, projection={"_id": 1})
            if doc:
                return True
            # Fallback: permitir contextos sin version (compatibilidad)
            doc2 = self._col_module_contexts.find_one({"module_id": module_id, "max_chars": int(max_chars)}, projection={"_id": 1})
            return bool(doc2)
        except Exception:
            return False

    def _get_cached_module_context(self, module_id: str, max_chars: int) -> Optional[str]:
        """Obtiene contexto del módulo desde Mongo (si existe)."""
        # IMPORTANT: PyMongo Collection does not implement truthiness (`bool(collection)` raises).
        if (not self.mongo_enabled) or (self._col_module_contexts is None):
            return None
        try:
            q = {"module_id": module_id, "max_chars": int(max_chars), "version": self.docs_version}
            doc = self._col_module_contexts.find_one(q, projection={"context_text": 1})
            if not doc:
                # Compat: sin version
                doc = self._col_module_contexts.find_one({"module_id": module_id, "max_chars": int(max_chars)}, projection={"context_text": 1})
            if not doc:
                return None
            return str(doc.get("context_text") or "")
        except Exception as e:
            print(f"⚠️ Error leyendo contexto desde Mongo (module {module_id}): {e}", file=sys.stderr)
            return None

    def load_documentation(self, force_reload: bool = False):
        """
        Carga y extrae texto de todos los PDFs en el directorio.
        """
        if self.is_loaded and not force_reload:
            return
        # Si recargamos, invalidar caches
        self._context_cache = {}

        if not os.path.exists(self.docs_path):
            print(f"⚠️ Aviso: Directorio de documentación no encontrado en {self.docs_path}")
            return

        pdf_files = glob.glob(os.path.join(self.docs_path, "*.pdf"))
        print(f"📚 Encontrados {len(pdf_files)} documentos PDF.")

        for pdf_file in pdf_files:
            filename = os.path.basename(pdf_file)
            try:
                text = self._extract_text_from_pdf(pdf_file)
                if text:
                    self.index[filename] = text
                    print(f"✅ Documento cargado: {filename} ({len(text)} caracteres)")
                else:
                    print(f"⚠️ Documento vacío o ilegible: {filename}")
            except Exception as e:
                print(f"❌ Error cargando {filename}: {e}")

        self.is_loaded = True
        print("📚 Carga de documentación completada.")

    def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extrae texto de un archivo PDF."""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                # Limitar páginas para evitar memoria excesiva si son enormes, 
                # pero queremos todo el contenido posible. 
                # PyPDF2 es lazy, así que iterar es seguro.
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"Error reading PDF {file_path}: {e}")
            raise e
        return text

    def get_context_for_topic(self, topic: str, max_chars: int = 10000) -> str:
        """
        Obtiene contexto relevante para un tema específico.
        Utiliza mapeo expandido de keywords para búsqueda más precisa.
        """
        # Si existe cache persistente por tópico/módulo, en runtime preferimos BD.
        # (Este método es usado principalmente como helper; mantenemos fallback a PDFs.)
        if not self.is_loaded and not self.mongo_enabled:
            self.load_documentation()

        cache_key = ("topic", (topic or "").lower(), int(max_chars))
        cached = self._context_cache.get(cache_key)
        if cached:
            return cached

        # Intento 1: leer contexto de BD si existe por topic (compatibilidad: algunos despliegues guardan topic)
        if self.mongo_enabled and (self._col_module_contexts is not None):
            try:
                q = {"topic": (topic or "").lower(), "max_chars": int(max_chars), "version": self.docs_version}
                doc = self._col_module_contexts.find_one(q, projection={"context_text": 1})
                if not doc:
                    doc = self._col_module_contexts.find_one({"topic": (topic or "").lower(), "max_chars": int(max_chars)}, projection={"context_text": 1})
                if doc and doc.get("context_text"):
                    ctx = str(doc.get("context_text"))
                    self._context_cache[cache_key] = ctx
                    return ctx
            except Exception:
                pass

        context = ""
        
        # Mapeo expandido de temas a palabras clave y documentos prioritarios
        keywords_map = {
            "general": {
                "keywords": ["mandala", "signos", "general", "carutti"],
                "priority_docs": ["El Mandala.pdf", "Signos.pdf"]
            },
            "fundamentos": {
                "keywords": ["planetas", "lunas", "ascendentes", "sol", "luna", "ascendente"],
                "priority_docs": ["Planetas.pdf", "Las Lunas.pdf", "Ascendentes.pdf"]
            },
            "personales": {
                "keywords": ["mercurio", "venus", "marte", "planetas personales"],
                "priority_docs": ["Planetas.pdf"]
            },
            "sociales": {
                "keywords": ["jupiter", "saturno", "planetas sociales"],
                "priority_docs": ["Planetas.pdf"]
            },
            "transpersonales": {
                "keywords": ["urano", "neptuno", "pluton", "planetas transpersonales"],
                "priority_docs": ["Planetas.pdf"]
            },
            "nodos": {
                "keywords": ["nodos", "nodo", "lunar", "karma", "dharma"],
                "priority_docs": ["Planetas.pdf"]
            },
            "aspectos": {
                "keywords": ["aspectos", "aspecto", "tierney"],
                "priority_docs": ["Aspectos.pdf"]
            },
            "ejes": {
                "keywords": ["ejes", "eje", "casas", "mandala", "sasportas"],
                "priority_docs": ["El Mandala.pdf", "Casas.pdf"]
            },
            "evolucion": {
                "keywords": ["evolucion", "dharma", "nodos", "saturno", "mito"],
                "priority_docs": ["Planetas.pdf"]
            },
            "planetas": {
                "keywords": ["planetas", "liz greene"],
                "priority_docs": ["Planetas.pdf"]
            },
            "casas": {
                "keywords": ["casas", "sasportas"],
                "priority_docs": ["Casas.pdf", "El Mandala.pdf"]
            },
            "transitos": {
                "keywords": ["transitos", "ciclos", "ephemerides"],
                "priority_docs": []
            }
        }
        
        topic_config = keywords_map.get(topic.lower(), keywords_map["general"])
        search_terms = topic_config["keywords"]
        priority_docs = topic_config.get("priority_docs", [])
        
        # Buscar documentos prioritarios primero
        found_docs = []
        priority_found = []
        
        for filename, content in self.index.items():
            filename_lower = filename.lower()
            # Verificar si es documento prioritario
            is_priority = any(priority in filename_lower for priority in priority_docs)
            # Verificar si coincide con keywords
            matches_keywords = any(term in filename_lower for term in search_terms)
            
            if is_priority:
                priority_found.append((filename, content))
            elif matches_keywords:
                found_docs.append((filename, content))
        
        # Combinar: primero prioritarios, luego otros
        all_docs = priority_found + found_docs
        
        # Si no hay matches específicos, usar los más grandes/generales
        if not all_docs:
            all_docs = [(fname, content) for fname, content in self.index.items()]

        # Concatenar hasta llenar max_chars, priorizando párrafos conceptuales
        for filename, doc_content in all_docs:
            if len(context) >= max_chars:
                break
                
            remaining_chars = max_chars - len(context)
            if remaining_chars <= 0:
                break
            
            # Priorizar párrafos largos (más conceptuales) sobre tablas cortas
            paragraphs = doc_content.split('\n\n')
            relevant_text = ""
            
            for para in paragraphs:
                # Filtrar tablas resumen (líneas muy cortas o con muchos números)
                if len(para) > 100 and not para.strip().startswith('|'):
                    relevant_text += para + "\n\n"
                    if len(relevant_text) >= remaining_chars:
                        break
            
            if not relevant_text:
                # Si no hay párrafos largos, usar el contenido tal cual
                relevant_text = doc_content[:remaining_chars]
            
            context += f"--- DOCUMENTO: {filename} ---\n{relevant_text[:remaining_chars]}\n\n"
        
        # Guardar en cache
        self._context_cache[cache_key] = context
        return context

    def get_context_for_module(self, module_id: str, max_chars: int = 10000) -> str:
        """
        Obtiene contexto específico para un módulo del informe.
        Mapea módulos a temas específicos para búsqueda más precisa.
        """
        topic = MODULE_TO_TOPIC.get(module_id, "general")
        cache_key = ("module", module_id, int(max_chars))
        cached = self._context_cache.get(cache_key)
        if cached:
            return cached

        retrieval_mode = (os.getenv("DOCS_RETRIEVAL_MODE", "") or "").lower().strip()
        force_no_pdfs = retrieval_mode in {"atlas_vector", "vector", "atlas"}

        # Intento 0: Atlas Vector Search (si está activado y hay dataset de chunks en Atlas).
        if self.mongo_enabled and self._retrieval and self.docs_version:
            try:
                ctx, meta = self._retrieval.retrieve_context_for_module(
                    module_id,
                    version=self.docs_version,
                    max_chars=int(max_chars),
                )
                if ctx:
                    self._context_cache[cache_key] = ctx
                    return ctx
            except Exception as e:
                print(f"⚠️ Error retrieval Atlas (module {module_id}): {e}", file=sys.stderr)
                if force_no_pdfs:
                    raise RuntimeError(f"Fallo en Atlas Vector Search y PDFs deshabilitados (module {module_id}). Error: {type(e).__name__}: {e}")
        elif force_no_pdfs:
            # Si el despliegue exige Atlas pero no está inicializado, fallar rápido con mensaje útil.
            raise RuntimeError(
                "DOCS_RETRIEVAL_MODE=atlas_vector pero el servicio de retrieval no está inicializado. "
                "Verifica en Render: MONGODB_URI, DOCS_VERSION, ATLAS_VECTOR_INDEX, ATLAS_VECTOR_PATH."
            )

        # Intento 1: contexto precomputado en BD (rápido, sin leer PDFs)
        cached_ctx = self._get_cached_module_context(module_id, max_chars)
        if cached_ctx:
            self._context_cache[cache_key] = cached_ctx
            return cached_ctx

        # Fallback: construir desde PDFs (modo legacy)
        if force_no_pdfs:
            raise RuntimeError(
                f"PDFs deshabilitados por DOCS_RETRIEVAL_MODE={retrieval_mode}. "
                f"No hay contexto en BD para module {module_id} (version={self.docs_version})."
            )
        if not self.is_loaded:
            self.load_documentation()

        ctx = self.get_context_for_topic(topic, max_chars)
        self._context_cache[cache_key] = ctx
        return ctx

    def get_all_context_summary(self, max_per_doc: int = 2000) -> str:
        """Retorna un resumen de todos los documentos disponibles."""
        if not self.is_loaded:
            self.load_documentation()
            
        summary = ""
        for filename, content in self.index.items():
            summary += f"DOCUMENTO: {filename}\n"
            summary += content[:max_per_doc] + "...\n\n"
            
        return summary

# Instancia global
documentation_service = DocumentationService()
