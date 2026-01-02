## Atlas Vector Search (Vectorize) setup for `documentation_chunks`

This project expects documentation chunks to be stored in MongoDB Atlas in a collection:
- DB: `fraktal`
- Collection: `documentation_chunks`

Each document contains:
- `version` (string, e.g. `atlas_v1`)
- `topic` (string, e.g. `fundamentos`)
- `text` (string)
- metadata fields (source_file, page_start, page_end, etc.)

### 1) Create an Atlas Vector Search index (Vectorize)

In Atlas UI:
- Go to **Search** (Atlas Search / Vector Search)
- Create index for collection `documentation_chunks`
- Choose **Vector Search** with **Vectorize**

Recommended settings:
- **Index name**: `docs_chunks_vector`
- **Vectorize field**: `text`
- **Filter fields**: `version`, `topic`

### 2) Environment variables (backend)

Set in Render:
- `DOCS_VERSION=atlas_v1`
- `DOCS_RETRIEVAL_MODE=atlas_vector`
- `ATLAS_VECTOR_INDEX=docs_chunks_vector`

### 3) Populate data (local)

Run locally (recommended) to avoid PDF extraction issues in production:

```powershell
cd backend
$env:MONGODB_URI="mongodb+srv://..."
python -m app.scripts.build_docs_dataset --docs-path ".\\documentacion" --version "atlas_v1"
```

### Notes
- If you update PDFs, use a new version (e.g. `atlas_v2`) and update `DOCS_VERSION`.
- The backend supports fallback to keyword search if vector search fails.


