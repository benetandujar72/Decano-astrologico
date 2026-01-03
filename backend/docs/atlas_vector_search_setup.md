## Atlas Vector Search (sin Vectorize) setup for `documentation_chunks`

This project expects documentation chunks to be stored in MongoDB Atlas in a collection:
- DB: `fraktal`
- Collection: `documentation_chunks`

Each document contains:
- `version` (string, e.g. `atlas_v1`)
- `topic` (string, e.g. `fundamentos`)
- `text` (string)
- `embedding` (array[float])  ← generado offline
- metadata fields (source_file, page_start, page_end, etc.)

### 1) Create an Atlas Vector Search index (sin Vectorize)

In Atlas UI:
- Go to **Search** (Atlas Search / Vector Search)
- Create index for collection `documentation_chunks`
- Choose **Vector Search** (NO Vectorize)

Recommended settings:
- **Index name**: `docs_chunks_vector`
- **Vector field/path**: `embedding`
- **Similarity**: `cosine`
- **Dimensions**: `768` (si usas `all-mpnet-base-v2`)
- **Filter fields**: `version`, `topic`

### 2) Environment variables (backend)

Set in Render:
- `DOCS_VERSION=atlas_v1`
- `DOCS_RETRIEVAL_MODE=atlas_vector`
- `ATLAS_VECTOR_INDEX=docs_chunks_vector`
- `ATLAS_VECTOR_PATH=embedding`

### 3) Populate data (local)

Run locally (recommended) to avoid PDF extraction issues in production:

```powershell
cd backend
$env:MONGODB_URI="mongodb+srv://..."
python -m app.scripts.build_docs_dataset --docs-path ".\\documentacion" --version "atlas_v1" --embed-model "sentence-transformers/all-mpnet-base-v2" --embed-device "cuda"
```

### Notes
- If you update PDFs, use a new version (e.g. `atlas_v2`) and update `DOCS_VERSION`.
- The backend supports fallback to keyword search if vector search fails.


