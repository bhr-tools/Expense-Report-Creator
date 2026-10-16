# Expense Report Creator (`expense-report-creator`)

Automated expense report compiler generating formalized, audit-ready PDF documents from spreadsheet ledger data, receipt images, and LaTeX templates.

> **Status:** Archived. Core CLI engine is functional (`v1.0.0`–`v1.2.0`). Exploration of a self-hosted web service was deprecated in favor of a zero-maintenance Google Workspace (Apps Script) workflow.

## 1. Problem & Context

Managing student club treasuries (e.g., student associations and clubs like Net7, Photo7 at ENSEEIHT) involves recurring operational overhead:

- Aggregating receipts and expense proofs across multiple contributors.
    
- Manual data re-entry into administrative PDF/paper forms.
    
- TeX environment dependency issues across contributors' machines.
    

This repository provides an automated, reproducible compilation pipeline that converts a standardized Excel expense template into a formalized PDF statement with embedded signatures and itemized receipts.

## 2. Technical Architecture (CLI Engine — ~430 LoC)

The system operates as a zero-dependency CLI pipeline managed by Nix:

```
TEMPLATE/
 ├── data.xlsx          (Expense entries & metadata)
 ├── justificatifs/     (Receipt images / proofs)
 ├── logo.png           (Club logo)
 └── signature.png      (Treasurer / member signature)
          │
          ▼
   [ src/expense-report-creator/main.py ]  <── Parses Excel data (openpyxl)
          │
          ▼
   [ assets/export-report-template.tex ]   <── Injects data & formats multi-page tables
          │
          ▼ (pdflatex / xelatex via Nix)
     output.pdf         (Audit-compliant expense report)
```

### Components

- **Pipeline Orchestrator (`main.py` — ~180 LoC):** Ingests structured ledger data from `data.xlsx`, sanitizes strings for LaTeX compatibility, dynamically pairs transactions with their corresponding receipt files, and renders the LaTeX source.
    
- **Document Template (`export-report-template.tex` — ~115 LoC):** Parametric LaTeX template featuring dynamic layout adaptation for multi-page tables, club branding header, and receipt image appending.
    
- **Hermetic Toolchain (`flake.nix` — ~50 LoC):** Bundles Python 3, required parsing libraries, and a complete TeX Live environment with necessary CTAN packages. Guarantees deterministic PDF compilation on any Linux/macOS machine with zero manual installation.
    

## 3. Project Evolution & History

- **Phase 1: CLI Pipeline (`v1.0.0` – `v1.2.0` / commit `864aa7f`):**
    
    - Fully functional, deterministic local pipeline.
        
    - Used for generating formatted expense reports directly from terminal workflows.
        
- **Phase 2: Full-Stack Web Exploration (commit `876cadb` onward):**
    
    - Attempted centralization to support multi-club access via a web interface (`expense_report_creator/routers/`, SQLite databases per club in `databases/`, and Docker deployment).
        
    - Objective: Allow non-technical club officers to upload receipts through a web form without touching a CLI.
        

## 4. Post-Mortem & Strategic Pivot

During the Phase 2 expansion, an engineering trade-off analysis led to deprecating this codebase:

1. **Disproportionate Operational Overhead:** Running and securing a self-hosted full-stack web service (FastAPI backend, SQLite databases, authentication, Docker host) required ongoing maintenance for a batch process that runs only a few times per semester.
    
2. **The Cloud-Native Alternative:** The entire ingestion, validation, and PDF export logic was subsequently re-implemented in **Google Apps Script** bound directly to Google Sheets and Google Drive.
    
3. **Outcome:** The Google Workspace script fulfilled 100% of the non-technical user requirements, leveraged native club Google Drive permissions, and removed the need for any hosting infrastructure.
    

## 5. Quickstart (CLI Engine)

### Requirements

- [Nix package manager](https://nixos.org/ "null") with Flakes enabled.
    

### Compilation

```
# 1. Enter the isolated environment (Python + LaTeX included)
nix develop

# 2. Populate TEMPLATE/ with your data.xlsx and receipt images
# 3. Generate the report
python src/expense-report-creator/main.py
```
