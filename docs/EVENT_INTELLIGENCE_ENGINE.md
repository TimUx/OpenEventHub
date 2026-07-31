# Event Intelligence Engine (EIE)

## Purpose

The Event Intelligence Engine is the core component of OpenEventHub.

Responsibilities:
- Detect events
- Extract structured information
- Merge information from multiple sources
- Calculate confidence score
- Detect duplicates
- Assign categories
- Detect regions
- Detect organizers
- Detect venues
- Generate searchable metadata

## Processing Pipeline

```mermaid
flowchart LR
    A[Source] --> B[Parser]
    B --> C[OCR if required]
    C --> D[LLM Extraction]
    D --> E[Normalization]
    E --> F[Duplicate Detection]
    F --> G[Classification]
    G --> H[Geocoding]
    H --> I[Confidence Score]
    I --> J[Database]
```
