from __future__ import annotations

from pathlib import Path


def main() -> None:
    p = Path("styles/material-theme.css")
    css = p.read_text(encoding="utf-8")
    css = css.replace("\r\n", "\n")

    marker = "/* Scrollbar (subtle) */"
    if marker not in css:
        raise SystemExit("marker not found")

    insert = """

/* Layout */
.md-page {
  min-height: 100vh;
  padding: 2rem 1rem;
  background: var(--md-sys-color-background);
  color: var(--md-sys-color-on-background);
}

.md-container {
  max-width: 80rem;
  margin: 0 auto;
}

/* Tabs (Material-ish) */
.md-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem;
  border-radius: var(--md-radius-lg);
  background: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline);
  box-shadow: var(--md-elevation-1);
}

.md-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.95rem;
  border-radius: 999px;
  color: var(--md-sys-color-on-surface-variant);
  background: transparent;
  border: 1px solid transparent;
  font-weight: 650;
  white-space: nowrap;
}

.md-tab:hover {
  background: rgba(15, 23, 42, 0.05);
}

.md-tab--active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-primary);
  border-color: rgba(29, 78, 216, 0.20);
}

/* Tables */
.md-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.875rem;
}

.md-table thead th {
  text-align: left;
  font-weight: 700;
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-variant);
  border-bottom: 1px solid var(--md-sys-color-outline);
  padding: 0.75rem;
}

.md-table tbody td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: var(--md-sys-color-on-surface);
}

/* Alerts */
.md-alert {
  border-radius: var(--md-radius-lg);
  border: 1px solid var(--md-sys-color-outline);
  background: var(--md-sys-color-surface);
  padding: 0.85rem 1rem;
  font-size: 0.875rem;
}

.md-alert--success {
  border-color: rgba(22, 163, 74, 0.25);
  background: rgba(22, 163, 74, 0.08);
  color: #166534;
}

.md-alert--error {
  border-color: rgba(220, 38, 38, 0.25);
  background: rgba(220, 38, 38, 0.08);
  color: #7f1d1d;
}

.md-alert--warning {
  border-color: rgba(217, 119, 6, 0.28);
  background: rgba(217, 119, 6, 0.10);
  color: #7c2d12;
}
"""

    parts = css.split(marker)
    if len(parts) != 2:
        raise SystemExit("unexpected marker occurrences")

    # Prevent double-insert if script is run twice
    if ".md-tabs" in parts[0]:
        print("already updated")
        return

    css = parts[0].rstrip("\n") + insert + "\n\n" + marker + parts[1]

    # Fix scrollbar selectors (triple colon -> double)
    css = css.replace(":::-webkit-scrollbar", "::-webkit-scrollbar")
    css = css.replace(":::-webkit-scrollbar-track", "::-webkit-scrollbar-track")
    css = css.replace(":::-webkit-scrollbar-thumb:hover", "::-webkit-scrollbar-thumb:hover")
    css = css.replace(":::-webkit-scrollbar-thumb", "::-webkit-scrollbar-thumb")

    if not css.endswith("\n"):
        css += "\n"

    p.write_text(css, encoding="utf-8", newline="\n")
    print("ok")


if __name__ == "__main__":
    main()


