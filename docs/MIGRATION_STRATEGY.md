# Legal Documents System Migration Strategy

## Overview
This document outlines the migration strategy for upgrading the legal documents system from v1 to v2 with enhanced metadata fields and categorization.

## Migration Phases

### Phase 1: Database Schema Update (Day 1)
1. **Deploy new schema changes**
   - Add new ENUMs to database
   - Add new columns to `legal_documents` table
   - Create `legal_document_revisions` table
   - Create necessary indexes

2. **Run migration script**
   ```bash
   npx prisma migrate dev --name legal_documents_enhancement
   ```

### Phase 2: Data Migration (Day 1-2)
1. **Backup existing data**
   ```sql
   CREATE TABLE legal_documents_backup AS SELECT * FROM legal_documents;
   ```

2. **Execute data transformation**
   - Map old `category` to new `legal_hierarchy`
   - Infer `norm_type` from title patterns
   - Copy `title` to `norm_title`
   - Extract metadata fields to proper columns

3. **Verify data integrity**
   ```sql
   SELECT COUNT(*) FROM legal_documents WHERE norm_type IS NULL;
   SELECT COUNT(*) FROM legal_documents WHERE legal_hierarchy IS NULL;
   ```

### Phase 3: API Deployment (Day 2-3)
1. **Deploy v2 API endpoints alongside v1**
   - Keep `/api/legal-documents` (v1) operational
   - Deploy new `/api/v2/legal-documents` endpoints
   - Run both versions in parallel

2. **Update API documentation**
   - Document new endpoints
   - Mark v1 endpoints as deprecated

### Phase 4: Frontend Migration (Day 3-5)
1. **Update frontend components**
   - Modify forms to use new fields
   - Update API calls to v2 endpoints
   - Add backward compatibility layer

2. **Test all workflows**
   - Create new documents
   - Update existing documents
   - Search and filter documents
   - View document details

### Phase 5: Cleanup (Day 7+)
1. **Monitor for issues**
   - Check error logs
   - Verify data consistency
   - Monitor performance

2. **Remove v1 endpoints** (after 30 days)
   - Remove old API routes
   - Drop old columns from database
   - Clean up legacy code

## Rollback Strategy

### Database Rollback
```sql
-- Restore from backup
DROP TABLE legal_documents;
ALTER TABLE legal_documents_backup RENAME TO legal_documents;

-- Or use rollback script
-- Run the rollback section from migration SQL
```

### API Rollback
- Revert to previous API version using git
- Restore v1 endpoints
- Update nginx/load balancer configuration

## Data Mapping

### Category to Legal Hierarchy
| Old Category | New Legal Hierarchy |
|--------------|-------------------|
| constitution | CONSTITUCION |
| law | LEYES_ORDINARIAS |
| code | CODIGOS_ORDINARIOS |
| regulation | REGLAMENTOS |
| jurisprudence | RESOLUCIONES |

### Title to Norm Type Inference
- Contains "Constitución" → CONSTITUTIONAL_NORM
- Contains "Ley Orgánica" → ORGANIC_LAW
- Contains "Código Orgánico" → ORGANIC_CODE
- Contains "Reglamento Ejecutivo" → REGULATION_EXECUTIVE
- Contains "Ordenanza Municipal" → ORDINANCE_MUNICIPAL
- Contains "Resolución" → RESOLUTION_ADMINISTRATIVE
- Default → ORDINARY_LAW

## Performance Considerations

### Indexes
```sql
-- Critical indexes for performance
CREATE INDEX idx_norm_type ON legal_documents(norm_type);
CREATE INDEX idx_legal_hierarchy ON legal_documents(legal_hierarchy);
CREATE INDEX idx_publication_date ON legal_documents(publication_date);
CREATE INDEX idx_text_search ON legal_documents USING gin(to_tsvector('spanish', norm_title || ' ' || content));
```

### Query Optimization
- Use pagination for large result sets
- Implement caching for frequently accessed documents
- Use database views for complex queries

## Monitoring

### Key Metrics
- API response times
- Database query performance
- Error rates
- Document search accuracy
- User adoption of new features

### Alerts
- Set up alerts for:
  - Failed migrations
  - High error rates
  - Performance degradation
  - Data inconsistencies

## Testing Checklist

### Unit Tests
- [ ] Schema validation tests
- [ ] Data transformation logic
- [ ] API endpoint tests
- [ ] Service layer tests

### Integration Tests
- [ ] Database migrations
- [ ] API with database
- [ ] Frontend with API
- [ ] Search functionality

### End-to-End Tests
- [ ] Document creation workflow
- [ ] Document update workflow
- [ ] Document search workflow
- [ ] Document revision workflow

## Communication Plan

### Stakeholders
1. **Development Team**
   - Daily standup updates
   - Migration progress tracking

2. **Admin Users**
   - Email notification about new features
   - Training session on new interface
   - User guide documentation

3. **End Users**
   - In-app notification about updates
   - Help documentation updates

## Risk Mitigation

### Identified Risks
1. **Data Loss**
   - Mitigation: Complete backup before migration
   - Recovery: Restore from backup

2. **API Compatibility Issues**
   - Mitigation: Parallel API versions
   - Recovery: Quick rollback to v1

3. **Performance Degradation**
   - Mitigation: Load testing before deployment
   - Recovery: Query optimization, caching

4. **User Confusion**
   - Mitigation: Comprehensive documentation
   - Recovery: User support, training

## Success Criteria

### Technical
- All existing documents migrated successfully
- No data loss during migration
- API response times < 200ms for queries
- Zero downtime during migration

### Business
- Admin users can use new categorization
- Search accuracy improved by 20%
- Document management time reduced by 30%
- User satisfaction maintained or improved

## Timeline

| Phase | Duration | Start Date | End Date | Status |
|-------|----------|------------|----------|---------|
| Planning | 1 day | Day 0 | Day 1 | Complete |
| Database Migration | 2 days | Day 1 | Day 2 | Pending |
| API Development | 2 days | Day 2 | Day 3 | Pending |
| Frontend Updates | 3 days | Day 3 | Day 5 | Pending |
| Testing | 2 days | Day 5 | Day 7 | Pending |
| Deployment | 1 day | Day 7 | Day 7 | Pending |
| Monitoring | 30 days | Day 7 | Day 37 | Pending |

## Post-Migration Tasks

1. **Documentation Updates**
   - API documentation
   - User guides
   - Admin manual

2. **Training**
   - Admin user training session
   - Video tutorials
   - FAQ updates

3. **Performance Tuning**
   - Query optimization
   - Index optimization
   - Cache configuration

4. **Feedback Collection**
   - User surveys
   - Performance metrics
   - Bug reports