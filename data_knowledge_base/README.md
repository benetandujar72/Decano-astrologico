# Knowledge Base (Motor Fraktal)

Esta carpeta contiene la **base documental** para RAG con **aislamiento de contexto**.

## Estructura (carpetas = topics)

- `00_core_astrologia/`: conceptos universales (sin interpretación psicológica).
- `01_individual_adulto/`: psicología profunda/humanista (Carutti, Sasportas, etc.).
- `02_infantil_neurodesarrollo/`: neurodesarrollo + infancia (Piaget, apego, mielinización…).
- `03_sistemico_relacional/`: vínculos (pareja, familia, equipos).
- `04_clinico_terapeutas/`: recursos clínicos para terapeutas/profesionales.
- `config/context_map.json`: mapea tipo de informe → carpetas (topics) + tono.

## Cómo ingerir PDFs a Atlas (vector search)

Ejemplo (PowerShell):

```bash
cd backend
$env:MONGODB_URI="mongodb+srv://..."
python -m app.scripts.build_docs_dataset --docs-path "..\\data_knowledge_base" --version "prod_v1" --copyright-safe
```

Notas:
- El script etiqueta cada chunk con `topic` = **ruta relativa** (ej. `03_sistemico_relacional/sinastria_pareja`).
- El router RAG puede pedir **multi-topic** (ej. core + infantil) sin mezclar contenidos de otras carpetas.


