
# Database Schema (Concept)

## event
- id (UUID)
- slug
- title
- summary
- description
- start_at
- end_at
- confidence_score
- status
- venue_id
- organizer_id
- created_at
- updated_at

## event_source
Maps one event to multiple origin sources.

## source
Stores crawler configuration and metadata.

## crawl_job
Scheduler execution metadata.

## ai_analysis
Stores prompts, extracted fields, model version and confidence.
