
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
        print(f"📚 DocumentationService inicializado con ruta: {self.docs_path}")

    def load_documentation(self, force_reload: bool = False):
        """
        Carga y extrae texto de todos los PDFs en el directorio.
        """
        if self.is_loaded and not force_reload:
            return

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
        Por ahora, implementa una búsqueda simple por palabras clave o retorna
        fragmentos de documentos clave.
        
        TODO: Implementar búsqueda semántica real (embeddings) si se requiere mayor precisión.
        Para esta versión, retornaremos una mezcla inteligente de documentos clave.
        """
        if not self.is_loaded:
            self.load_documentation()

        context = ""
        
        # Mapeo simple de temas a palabras clave en nombres de archivo
        keywords = {
            "planetas": ["planetas", "liz greene"],
            "casas": ["casas", "sasportas"],
            "transitos": ["transitos", "ciclos"],
            "aspectos": ["aspectos", "tierney"],
            "nodos": ["nodos", "luna"],
            "general": ["liz greene", "ideler"]
        }
        
        search_terms = keywords.get(topic.lower(), ["liz greene"])
        
        # Buscar en documentos que coincidan con los términos
        found_docs = []
        for filename, content in self.index.items():
            if any(term in filename.lower() for term in search_terms):
                found_docs.append(content)
        
        # Si no hay matches específicos, usar los más grandes/generales
        if not found_docs:
            found_docs = list(self.index.values())

        # Concatenar hasta llenar max_chars
        for doc_content in found_docs:
            if len(context) + len(doc_content) > max_chars:
                item_chars = max_chars - len(context)
                context += doc_content[:item_chars]
                break
            else:
                context += doc_content + "\n---\n"
                
        return context

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
