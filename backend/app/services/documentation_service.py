
import os
import glob
import PyPDF2
from typing import List, Dict, Optional
import sys

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
            # Subir un nivel más para salir de backend si folder está en root
            root_dir = os.path.dirname(base_dir) 
            self.docs_path = os.getenv("DOCS_PATH", os.path.join(root_dir, "documentacion"))

        self.index: Dict[str, str] = {} # Filename -> extracted text
        self.is_loaded = False
        # Cache simple de contextos por módulo/tópico para evitar recomputar en cada request
        # Key: (kind, key, max_chars) -> context str
        self._context_cache: Dict[tuple, str] = {}
        print(f"📚 DocumentationService inicializado con ruta: {self.docs_path}")

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
        if not self.is_loaded:
            self.load_documentation()

        cache_key = ("topic", (topic or "").lower(), int(max_chars))
        cached = self._context_cache.get(cache_key)
        if cached:
            return cached

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
        # Mapeo de módulos a temas
        module_to_topic = {
            "modulo_1": "general",
            "modulo_2_fundamentos": "fundamentos",
            "modulo_2_personales": "personales",
            "modulo_2_sociales": "sociales",
            "modulo_2_transpersonales": "transpersonales",
            "modulo_2_nodos": "nodos",
            "modulo_2_aspectos": "aspectos",
            "modulo_2_ejes": "ejes",
            "modulo_2_sintesis": "general",
            "modulo_3_recomendaciones": "evolucion"
        }
        
        topic = module_to_topic.get(module_id, "general")
        cache_key = ("module", module_id, int(max_chars))
        cached = self._context_cache.get(cache_key)
        if cached:
            return cached
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
