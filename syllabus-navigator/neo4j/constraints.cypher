// ─── Uniqueness Constraints ──────────────────────────────────────────────────
// Ensure each graph node has a unique identifier to prevent duplicates
// and enable efficient lookups by ID.

CONSTRAINT ON (c:Course) ASSERT c.id IS UNIQUE;
CONSTRAINT ON (m:Module) ASSERT m.id IS UNIQUE;
CONSTRAINT ON (t:Topic) ASSERT t.id IS UNIQUE;
CONSTRAINT ON (lo:LearningObjective) ASSERT lo.id IS UNIQUE;
CONSTRAINT ON (a:Assessment) ASSERT a.id IS UNIQUE;

// ─── Full-Text Search Indexes ────────────────────────────────────────────────
// Enable full-text search on name and description fields so users can
// find courses, modules, and topics by keyword.

CREATE FULLTEXT INDEX courseNameSearch FOR (c:Course) ON EACH [c.name];
CREATE FULLTEXT INDEX courseDescriptionSearch FOR (c:Course) ON EACH [c.description];
CREATE FULLTEXT INDEX moduleNameSearch FOR (m:Module) ON EACH [m.name];
CREATE FULLTEXT INDEX topicNameSearch FOR (t:Topic) ON EACH [t.name];
CREATE FULLTEXT INDEX topicDescriptionSearch FOR (t:Topic) ON EACH [t.description];
CREATE FULLTEXT INDEX learningObjectiveSearch FOR (lo:LearningObjective) ON EACH [lo.description];
CREATE FULLTEXT INDEX assessmentNameSearch FOR (a:Assessment) ON EACH [a.name];

// ─── Property Indexes ────────────────────────────────────────────────────────
// Speed up traversal and filtering on commonly queried properties.

CREATE INDEX courseCodeIndex FOR (c:Course) ON (c.code);
CREATE INDEX courseSemesterIndex FOR (c:Course) ON (c.semester);
CREATE INDEX moduleOrderIndex FOR (m:Module) ON (m.order);
CREATE INDEX topicOrderIndex FOR (t:Topic) ON (t.order);
CREATE INDEX assessmentTypeIndex FOR (a:Assessment) ON (a.type);
CREATE INDEX assessmentDueDateIndex FOR (a:Assessment) ON (a.dueDate);
CREATE INDEX learningObjectiveBloomIndex FOR (lo:LearningObjective) ON (lo.bloomLevel);
