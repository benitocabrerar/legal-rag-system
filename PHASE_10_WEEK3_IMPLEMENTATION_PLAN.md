# Phase 10 - Week 3 Implementation Plan
## Advanced NLP Features & RAG Integration

**Document Version**: 1.0
**Date**: January 13, 2025
**Status**: READY FOR IMPLEMENTATION
**Dependencies**: Week 1 & 2 Completed ✅

---

## 📊 Executive Summary

Week 3 focuses on **advanced NLP capabilities** and **deep integration** with the existing Legal RAG System. This week bridges the gap between query transformation and intelligent search execution, introducing context-aware features, session management, and a conversational query refinement system.

**Key Objectives:**
1. Context-aware query refinement and multi-turn query support
2. Query history and session management with learning capabilities
3. Advanced filter combination strategies and conflict resolution
4. Relevance feedback loop for continuous improvement
5. Intelligent query suggestions and autocomplete
6. Full integration with Phase 9 Advanced Search

**Expected Outcomes:**
- 95% query transformation accuracy (up from 85%)
- <1.5s average response time (improved from 2s)
- Context-aware multi-turn conversations
- Smart query suggestions based on user patterns
- Production-ready NLP-powered search system

---

## 🏗️ Architecture Overview

### Current State (Week 2 Complete)

```
┌─────────────────────────────────────────────────────────────┐
│                  WEEK 2 ARCHITECTURE (CURRENT)               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Query (NL)                                             │
│       ↓                                                       │
│  ┌──────────────────────────┐                                │
│  │  Query Processor         │  GPT-4 Analysis                │
│  │  (query-processor.ts)    │  + Pattern Matching            │
│  └──────────────────────────┘                                │
│       ↓                                                       │
│  ┌──────────────────────────┐                                │
│  │  Entity Dictionary       │  Fuzzy Matching                │
│  │  (legal-entity-dict.ts)  │  + Legal Terms                 │
│  └──────────────────────────┘                                │
│       ↓                                                       │
│  ┌──────────────────────────┐                                │
│  │  Filter Builder          │  Build Search Filters          │
│  │  (filter-builder.ts)     │                                │
│  └──────────────────────────┘                                │
│       ↓                                                       │
│  ┌──────────────────────────┐                                │
│  │  Transformation Service  │  Orchestration                 │
│  │  (query-transform.ts)    │  + Validation                  │
│  └──────────────────────────┘                                │
│       ↓                                                       │
│  Structured Filters                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Week 3 Target Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│               WEEK 3 ADVANCED NLP ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User Query (NL) + Session Context                                  │
│       ↓                                                               │
│  ┌────────────────────────────────────────────────┐                 │
│  │  Session Manager (NEW)                          │                 │
│  │  - Track conversation history                   │                 │
│  │  - Maintain context across queries              │                 │
│  │  - Learn from user patterns                     │                 │
│  └────────────────────────────────────────────────┘                 │
│       ↓                                                               │
│  ┌────────────────────────────────────────────────┐                 │
│  │  Context Analyzer (NEW)                         │                 │
│  │  - Analyze previous queries in session          │                 │
│  │  - Extract evolving intent                      │                 │
│  │  - Build contextual understanding               │                 │
│  └────────────────────────────────────────────────┘                 │
│       ↓                                                               │
│  ┌────────────────────────────────────────────────┐                 │
│  │  Query Processor (ENHANCED)                     │                 │
│  │  + Context-aware analysis                       │                 │
│  │  + Multi-turn query understanding               │                 │
│  │  + Coreference resolution                       │                 │
│  └────────────────────────────────────────────────┘                 │
│       ↓                                                               │
│  ┌────────────────────────────────────────────────┐                 │
│  │  Filter Combinator (NEW)                        │                 │
│  │  - Advanced filter merging                      │                 │
│  │  - Conflict resolution                          │                 │
│  │  - Optimization strategies                      │                 │
│  └────────────────────────────────────────────────┘                 │
│       ↓                                                               │
│  ┌────────────────────────────────────────────────┐                 │
│  │  Query Suggestion Engine (NEW)                  │                 │
│  │  - Autocomplete based on patterns               │                 │
│  │  - Smart refinement suggestions                 │                 │
│  │  - Related queries                              │                 │
│  └────────────────────────────────────────────────┘                 │
│       ↓                                                               │
│  ┌────────────────────────────────────────────────┐                 │
│  │  Relevance Feedback Loop (NEW)                  │                 │
│  │  - Track user clicks and interactions           │                 │
│  │  - Adjust transformation based on feedback      │                 │
│  │  - Continuous learning                          │                 │
│  └────────────────────────────────────────────────┘                 │
│       ↓                                                               │
│  ┌────────────────────────────────────────────────┐                 │
│  │  Phase 9 Advanced Search (INTEGRATED)           │                 │
│  │  - Semantic search                              │                 │
│  │  - Spell checking                               │                 │
│  │  - Query expansion                              │                 │
│  │  - Re-ranking                                   │                 │
│  └────────────────────────────────────────────────┘                 │
│       ↓                                                               │
│  Intelligent Search Results + Context                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗓️ Week 3 Daily Breakdown

### Day 1-2: Session Management & Context Awareness
**Priority**: CRITICAL ⚠️
**Goal**: Enable multi-turn conversations with context retention

#### Database Schema

```prisma
// Add to prisma/schema.prisma

/// Query Session Model
/// Tracks user search sessions for context-aware transformations
model QuerySession {
  id            String   @id @default(uuid())
  userId        String?
  sessionToken  String   @unique @default(uuid()) @map("session_token")

  // Session metadata
  startedAt     DateTime @default(now()) @map("started_at")
  lastActiveAt  DateTime @updatedAt @map("last_active_at")
  expiresAt     DateTime @map("expires_at")
  isActive      Boolean  @default(true) @map("is_active")

  // Session context
  initialIntent String?  @map("initial_intent") // First query intent
  primaryTopic  String?  @map("primary_topic")  // Main topic being researched

  // Analytics
  queryCount    Int      @default(0) @map("query_count")
  refinements   Int      @default(0) // Number of query refinements
  avgConfidence Float?   @map("avg_confidence")

  // Relationships
  queries       QueryHistory[]

  @@index([userId, isActive])
  @@index([sessionToken])
  @@index([lastActiveAt])
  @@map("query_sessions")
}

/// Query History Model
/// Stores individual queries within sessions for context building
model QueryHistory {
  id                String   @id @default(uuid())
  sessionId         String   @map("session_id")

  // Query data
  originalQuery     String   @db.Text @map("original_query")
  normalizedQuery   String   @db.Text @map("normalized_query")
  transformedFilters Json    @map("transformed_filters")

  // Results
  confidence        Float
  intent            String
  entities          Json     // Extracted entities

  // User interaction
  resultCount       Int?     @map("result_count")
  clickedResults    Json?    @map("clicked_results") // Array of clicked document IDs
  wasHelpful        Boolean? @map("was_helpful")
  refinementNeeded  Boolean  @default(false) @map("refinement_needed")

  // Timing
  processingTimeMs  Int      @map("processing_time_ms")
  createdAt         DateTime @default(now()) @map("created_at")

  // Context
  previousQueryId   String?  @map("previous_query_id")
  contextUsed       Boolean  @default(false) @map("context_used")

  // Relationships
  session           QuerySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, createdAt])
  @@index([intent])
  @@index([confidence])
  @@map("query_history")
}

/// Query Refinement Model
/// Tracks query refinements and their effectiveness
model QueryRefinement {
  id              String   @id @default(uuid())
  originalQueryId String   @map("original_query_id")
  refinedQueryId  String   @map("refined_query_id")

  // Refinement type
  refinementType  String   @map("refinement_type") // 'filter_added', 'query_expanded', 'context_applied'
  suggestion      String   @db.Text

  // Effectiveness
  confidenceGain  Float    @map("confidence_gain")
  resultImprovement Float? @map("result_improvement") // 0-1 score
  userAccepted    Boolean  @default(false) @map("user_accepted")

  createdAt       DateTime @default(now()) @map("created_at")

  @@index([originalQueryId])
  @@index([refinementType])
  @@map("query_refinements")
}
```

#### Implementation Files

**File 1: Session Manager**

```typescript
// src/services/nlp/session-manager.ts

import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';

interface SessionContext {
  initialIntent?: string;
  primaryTopic?: string;
  previousQueries: QueryHistoryItem[];
  entityAccumulator: Map<string, number>; // Entity → frequency
  filterTrends: FilterTrend[];
}

interface QueryHistoryItem {
  id: string;
  query: string;
  intent: string;
  entities: any[];
  filters: any;
  timestamp: Date;
  wasHelpful?: boolean;
}

interface FilterTrend {
  filterType: string;
  frequency: number;
  lastUsed: Date;
}

export class SessionManager {
  private prisma: PrismaClient;
  private logger = new Logger('SessionManager');
  private sessionDuration = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create or retrieve an active session
   */
  async getOrCreateSession(
    userId?: string,
    sessionToken?: string
  ): Promise<{ id: string; token: string; context: SessionContext }> {
    try {
      // Try to find existing active session
      if (sessionToken) {
        const existing = await this.prisma.querySession.findFirst({
          where: {
            sessionToken,
            isActive: true,
            expiresAt: { gt: new Date() }
          },
          include: {
            queries: {
              orderBy: { createdAt: 'desc' },
              take: 10 // Last 10 queries for context
            }
          }
        });

        if (existing) {
          // Update last active time
          await this.prisma.querySession.update({
            where: { id: existing.id },
            data: { lastActiveAt: new Date() }
          });

          const context = await this.buildSessionContext(existing);

          return {
            id: existing.id,
            token: existing.sessionToken,
            context
          };
        }
      }

      // Create new session
      const newSession = await this.prisma.querySession.create({
        data: {
          userId,
          sessionToken: sessionToken || this.generateSessionToken(),
          expiresAt: new Date(Date.now() + this.sessionDuration),
          isActive: true
        }
      });

      this.logger.info('Created new query session', {
        sessionId: newSession.id,
        userId
      });

      return {
        id: newSession.id,
        token: newSession.sessionToken,
        context: {
          previousQueries: [],
          entityAccumulator: new Map(),
          filterTrends: []
        }
      };

    } catch (error) {
      this.logger.error('Failed to get/create session', { error });
      throw error;
    }
  }

  /**
   * Add query to session history
   */
  async addQueryToSession(
    sessionId: string,
    query: {
      original: string;
      normalized: string;
      filters: any;
      confidence: number;
      intent: string;
      entities: any[];
      processingTimeMs: number;
      resultCount?: number;
    }
  ): Promise<string> {
    try {
      const queryRecord = await this.prisma.queryHistory.create({
        data: {
          sessionId,
          originalQuery: query.original,
          normalizedQuery: query.normalized,
          transformedFilters: query.filters,
          confidence: query.confidence,
          intent: query.intent,
          entities: query.entities,
          processingTimeMs: query.processingTimeMs,
          resultCount: query.resultCount
        }
      });

      // Update session stats
      await this.prisma.querySession.update({
        where: { id: sessionId },
        data: {
          queryCount: { increment: 1 },
          primaryTopic: query.entities[0]?.text || undefined
        }
      });

      this.logger.debug('Added query to session', {
        sessionId,
        queryId: queryRecord.id
      });

      return queryRecord.id;

    } catch (error) {
      this.logger.error('Failed to add query to session', { error });
      throw error;
    }
  }

  /**
   * Build context from session history
   */
  private async buildSessionContext(
    session: any
  ): Promise<SessionContext> {
    const queries: QueryHistoryItem[] = session.queries.map((q: any) => ({
      id: q.id,
      query: q.originalQuery,
      intent: q.intent,
      entities: q.entities,
      filters: q.transformedFilters,
      timestamp: q.createdAt,
      wasHelpful: q.wasHelpful
    }));

    // Build entity accumulator
    const entityAccumulator = new Map<string, number>();
    for (const query of queries) {
      for (const entity of query.entities) {
        const key = entity.normalizedText || entity.text;
        entityAccumulator.set(key, (entityAccumulator.get(key) || 0) + 1);
      }
    }

    // Analyze filter trends
    const filterTrends = this.analyzeFilterTrends(queries);

    return {
      initialIntent: session.initialIntent,
      primaryTopic: session.primaryTopic,
      previousQueries: queries,
      entityAccumulator,
      filterTrends
    };
  }

  /**
   * Analyze filter usage patterns
   */
  private analyzeFilterTrends(queries: QueryHistoryItem[]): FilterTrend[] {
    const filterMap = new Map<string, { count: number; lastUsed: Date }>();

    for (const query of queries) {
      const filters = query.filters;

      // Track normType usage
      if (filters.normType) {
        for (const type of filters.normType) {
          const key = `normType:${type}`;
          const existing = filterMap.get(key);
          filterMap.set(key, {
            count: (existing?.count || 0) + 1,
            lastUsed: query.timestamp
          });
        }
      }

      // Track jurisdiction usage
      if (filters.jurisdiction) {
        for (const jurisdiction of filters.jurisdiction) {
          const key = `jurisdiction:${jurisdiction}`;
          const existing = filterMap.get(key);
          filterMap.set(key, {
            count: (existing?.count || 0) + 1,
            lastUsed: query.timestamp
          });
        }
      }

      // Track date range usage
      if (filters.dateRange) {
        const key = 'dateRange:used';
        const existing = filterMap.get(key);
        filterMap.set(key, {
          count: (existing?.count || 0) + 1,
          lastUsed: query.timestamp
        });
      }
    }

    return Array.from(filterMap.entries()).map(([key, value]) => ({
      filterType: key,
      frequency: value.count,
      lastUsed: value.lastUsed
    }));
  }

  /**
   * Record user feedback on query result
   */
  async recordFeedback(
    queryId: string,
    feedback: {
      wasHelpful: boolean;
      clickedResults?: string[];
      refinementNeeded?: boolean;
    }
  ): Promise<void> {
    try {
      await this.prisma.queryHistory.update({
        where: { id: queryId },
        data: {
          wasHelpful: feedback.wasHelpful,
          clickedResults: feedback.clickedResults || undefined,
          refinementNeeded: feedback.refinementNeeded || false
        }
      });

      this.logger.info('Recorded query feedback', { queryId, feedback });

    } catch (error) {
      this.logger.error('Failed to record feedback', { error });
      throw error;
    }
  }

  /**
   * Generate unique session token
   */
  private generateSessionToken(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.prisma.querySession.updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() }
        },
        data: {
          isActive: false
        }
      });

      this.logger.info('Cleaned up expired sessions', {
        count: result.count
      });

      return result.count;

    } catch (error) {
      this.logger.error('Failed to cleanup sessions', { error });
      return 0;
    }
  }
}

export const sessionManager = new SessionManager();
```

**File 2: Context Analyzer**

```typescript
// src/services/nlp/context-analyzer.ts

import { Logger } from '../../utils/logger';
import type { SessionContext } from './session-manager';
import type { Entity, Intent } from '../../types/query-transformation.types';

interface ContextualInsights {
  // Intent evolution
  intentShift: boolean;
  currentFocus: string;

  // Entity patterns
  persistentEntities: string[]; // Entities mentioned repeatedly
  emergingEntities: string[];   // New entities in recent queries

  // Filter preferences
  preferredFilters: Record<string, any>;

  // Query characteristics
  isRefinement: boolean;
  isFollowUp: boolean;
  isNewTopic: boolean;

  // Suggestions
  contextualSuggestions: string[];
}

export class ContextAnalyzer {
  private logger = new Logger('ContextAnalyzer');

  /**
   * Analyze session context to extract insights
   */
  analyzeContext(
    currentQuery: string,
    context: SessionContext
  ): ContextualInsights {
    const { previousQueries, entityAccumulator, filterTrends } = context;

    // Check if this is a follow-up query
    const isFollowUp = this.detectFollowUp(currentQuery, previousQueries);

    // Check if topic has changed
    const isNewTopic = this.detectTopicShift(currentQuery, context);

    // Check if it's a refinement
    const isRefinement = this.detectRefinement(currentQuery, previousQueries);

    // Identify persistent entities
    const persistentEntities = this.identifyPersistentEntities(
      entityAccumulator
    );

    // Identify emerging entities
    const emergingEntities = this.identifyEmergingEntities(
      currentQuery,
      previousQueries
    );

    // Build preferred filters from trends
    const preferredFilters = this.buildPreferredFilters(filterTrends);

    // Determine current focus
    const currentFocus = this.determineCurrentFocus(
      currentQuery,
      persistentEntities,
      context
    );

    // Detect intent shift
    const intentShift = this.detectIntentShift(previousQueries);

    // Generate contextual suggestions
    const contextualSuggestions = this.generateSuggestions(
      currentQuery,
      context,
      {
        isFollowUp,
        isNewTopic,
        persistentEntities,
        currentFocus
      }
    );

    return {
      intentShift,
      currentFocus,
      persistentEntities,
      emergingEntities,
      preferredFilters,
      isRefinement,
      isFollowUp,
      isNewTopic,
      contextualSuggestions
    };
  }

  /**
   * Detect if current query is a follow-up to previous
   */
  private detectFollowUp(
    currentQuery: string,
    previousQueries: any[]
  ): boolean {
    if (previousQueries.length === 0) return false;

    const lastQuery = previousQueries[0];
    const timeDiff = Date.now() - new Date(lastQuery.timestamp).getTime();

    // Follow-up if within 5 minutes and query is short
    if (timeDiff < 5 * 60 * 1000 && currentQuery.split(' ').length < 10) {
      // Check for pronouns or relational words
      const followUpIndicators = [
        'y', 'también', 'además', 'pero', 'sin embargo',
        'más', 'otro', 'otra', 'otros', 'otras',
        'ese', 'esa', 'esos', 'esas', 'esto', 'esta'
      ];

      return followUpIndicators.some(indicator =>
        currentQuery.toLowerCase().includes(indicator)
      );
    }

    return false;
  }

  /**
   * Detect topic shift in conversation
   */
  private detectTopicShift(
    currentQuery: string,
    context: SessionContext
  ): boolean {
    if (context.previousQueries.length === 0) return true;

    // Extract main topic words from current query
    const currentWords = new Set(
      currentQuery.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    );

    // Check overlap with primary topic
    if (context.primaryTopic) {
      const topicWords = new Set(
        context.primaryTopic.toLowerCase().split(/\s+/)
      );

      const overlap = Array.from(currentWords).filter(w =>
        topicWords.has(w)
      );

      // Less than 30% overlap indicates topic shift
      return overlap.length / currentWords.size < 0.3;
    }

    return false;
  }

  /**
   * Detect if query is refining previous search
   */
  private detectRefinement(
    currentQuery: string,
    previousQueries: any[]
  ): boolean {
    if (previousQueries.length === 0) return false;

    const lastQuery = previousQueries[0];

    // Refinement indicators
    const refinementWords = [
      'específicamente', 'solo', 'únicamente', 'exactamente',
      'más reciente', 'anterior a', 'posterior a', 'desde', 'hasta',
      'excluir', 'sin', 'excepto'
    ];

    return refinementWords.some(word =>
      currentQuery.toLowerCase().includes(word)
    );
  }

  /**
   * Identify entities mentioned frequently
   */
  private identifyPersistentEntities(
    entityAccumulator: Map<string, number>
  ): string[] {
    const threshold = 2; // Mentioned at least 2 times

    return Array.from(entityAccumulator.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([entity, _]) => entity);
  }

  /**
   * Identify new entities in current query
   */
  private identifyEmergingEntities(
    currentQuery: string,
    previousQueries: any[]
  ): string[] {
    // This would use entity extraction
    // For now, return empty array
    return [];
  }

  /**
   * Build preferred filters from usage patterns
   */
  private buildPreferredFilters(
    filterTrends: any[]
  ): Record<string, any> {
    const preferred: Record<string, any> = {};

    // Group by filter type
    const grouped = new Map<string, any[]>();
    for (const trend of filterTrends) {
      const [type, value] = trend.filterType.split(':');
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push({ value, frequency: trend.frequency });
    }

    // Extract most frequent values per type
    for (const [type, values] of grouped.entries()) {
      const sorted = values.sort((a, b) => b.frequency - a.frequency);
      if (sorted.length > 0 && sorted[0].frequency >= 2) {
        preferred[type] = sorted.map(v => v.value);
      }
    }

    return preferred;
  }

  /**
   * Determine current research focus
   */
  private determineCurrentFocus(
    currentQuery: string,
    persistentEntities: string[],
    context: SessionContext
  ): string {
    if (persistentEntities.length > 0) {
      return persistentEntities[0];
    }

    if (context.primaryTopic) {
      return context.primaryTopic;
    }

    // Extract from current query
    const words = currentQuery.split(/\s+/).filter(w => w.length > 4);
    return words[0] || 'general';
  }

  /**
   * Detect if user intent has shifted
   */
  private detectIntentShift(previousQueries: any[]): boolean {
    if (previousQueries.length < 2) return false;

    const recent = previousQueries.slice(0, 3);
    const intents = new Set(recent.map(q => q.intent));

    return intents.size > 1;
  }

  /**
   * Generate contextual suggestions
   */
  private generateSuggestions(
    currentQuery: string,
    context: SessionContext,
    insights: any
  ): string[] {
    const suggestions: string[] = [];

    if (insights.isFollowUp && insights.persistentEntities.length > 0) {
      suggestions.push(
        `Continuar enfocado en: ${insights.persistentEntities.join(', ')}`
      );
    }

    if (insights.isNewTopic) {
      suggestions.push(
        'Nuevo tema detectado. Limpiando contexto anterior.'
      );
    }

    if (context.previousQueries.length > 0) {
      const lastQuery = context.previousQueries[0];
      if (lastQuery.wasHelpful === false) {
        suggestions.push(
          'Intenta reformular tu consulta o agregar más detalles'
        );
      }
    }

    return suggestions;
  }
}

export const contextAnalyzer = new ContextAnalyzer();
```

---

### Day 3-4: Advanced Filter Combination
**Priority**: HIGH
**Goal**: Intelligent filter merging with conflict resolution

#### Implementation Files

**File 3: Filter Combinator**

```typescript
// src/services/nlp/filter-combinator.ts

import { Logger } from '../../utils/logger';
import type { SearchFilters } from '../../types/query-transformation.types';

interface FilterConflict {
  filterType: string;
  values: any[];
  resolution: 'merge' | 'prioritize' | 'latest' | 'manual';
  suggestedValue: any;
}

interface CombinationStrategy {
  normType: 'union' | 'intersection' | 'latest';
  jurisdiction: 'union' | 'intersection' | 'latest';
  dateRange: 'intersection' | 'union' | 'latest';
  keywords: 'union' | 'intersection' | 'weighted';
  topics: 'union' | 'ranked';
}

export class FilterCombinator {
  private logger = new Logger('FilterCombinator');

  /**
   * Combine filters from current and context queries
   */
  combineFilters(
    currentFilters: SearchFilters,
    contextFilters: SearchFilters[],
    strategy?: Partial<CombinationStrategy>
  ): {
    combined: SearchFilters;
    conflicts: FilterConflict[];
    explanation: string;
  } {
    const defaultStrategy: CombinationStrategy = {
      normType: 'union',
      jurisdiction: 'latest',
      dateRange: 'intersection',
      keywords: 'weighted',
      topics: 'ranked'
    };

    const activeStrategy = { ...defaultStrategy, ...strategy };
    const conflicts: FilterConflict[] = [];

    // Start with current filters
    const combined: SearchFilters = { ...currentFilters };

    // Combine normType
    if (contextFilters.some(f => f.normType)) {
      const { result, conflict } = this.combineNormType(
        currentFilters.normType,
        contextFilters.map(f => f.normType).filter(Boolean),
        activeStrategy.normType
      );
      combined.normType = result;
      if (conflict) conflicts.push(conflict);
    }

    // Combine jurisdiction
    if (contextFilters.some(f => f.jurisdiction)) {
      const { result, conflict } = this.combineJurisdiction(
        currentFilters.jurisdiction,
        contextFilters.map(f => f.jurisdiction).filter(Boolean),
        activeStrategy.jurisdiction
      );
      combined.jurisdiction = result;
      if (conflict) conflicts.push(conflict);
    }

    // Combine dateRange
    if (contextFilters.some(f => f.dateRange)) {
      const { result, conflict } = this.combineDateRange(
        currentFilters.dateRange,
        contextFilters.map(f => f.dateRange).filter(Boolean),
        activeStrategy.dateRange
      );
      combined.dateRange = result;
      if (conflict) conflicts.push(conflict);
    }

    // Combine keywords
    if (contextFilters.some(f => f.keywords)) {
      const { result, conflict } = this.combineKeywords(
        currentFilters.keywords,
        contextFilters.map(f => f.keywords).filter(Boolean),
        activeStrategy.keywords
      );
      combined.keywords = result;
      if (conflict) conflicts.push(conflict);
    }

    // Combine topics
    if (contextFilters.some(f => f.topics)) {
      const { result, conflict } = this.combineTopics(
        currentFilters.topics,
        contextFilters.map(f => f.topics).filter(Boolean),
        activeStrategy.topics
      );
      combined.topics = result;
      if (conflict) conflicts.push(conflict);
    }

    // Generate explanation
    const explanation = this.explainCombination(
      currentFilters,
      contextFilters,
      combined,
      conflicts
    );

    return { combined, conflicts, explanation };
  }

  /**
   * Combine normType filters
   */
  private combineNormType(
    current: string[] | undefined,
    context: (string[] | undefined)[],
    strategy: 'union' | 'intersection' | 'latest'
  ): { result: string[] | undefined; conflict?: FilterConflict } {
    if (!current && context.length === 0) {
      return { result: undefined };
    }

    if (!current) {
      // Use most recent context
      const latest = context[0];
      return { result: latest };
    }

    if (context.length === 0) {
      return { result: current };
    }

    const allValues = [current, ...context].filter(Boolean) as string[][];

    switch (strategy) {
      case 'union': {
        const union = Array.from(new Set(allValues.flat()));
        return { result: union };
      }

      case 'intersection': {
        const sets = allValues.map(arr => new Set(arr));
        const intersection = Array.from(sets[0]).filter(item =>
          sets.every(set => set.has(item))
        );

        if (intersection.length === 0) {
          // Conflict: no common values
          return {
            result: current,
            conflict: {
              filterType: 'normType',
              values: allValues,
              resolution: 'latest',
              suggestedValue: current
            }
          };
        }

        return { result: intersection };
      }

      case 'latest':
      default:
        return { result: current };
    }
  }

  /**
   * Combine jurisdiction filters
   */
  private combineJurisdiction(
    current: string[] | undefined,
    context: (string[] | undefined)[],
    strategy: 'union' | 'intersection' | 'latest'
  ): { result: string[] | undefined; conflict?: FilterConflict } {
    // Similar to normType
    return this.combineNormType(current, context, strategy);
  }

  /**
   * Combine date range filters
   */
  private combineDateRange(
    current: any,
    context: any[],
    strategy: 'intersection' | 'union' | 'latest'
  ): { result: any; conflict?: FilterConflict } {
    if (!current && context.length === 0) {
      return { result: undefined };
    }

    if (!current) {
      return { result: context[0] };
    }

    if (context.length === 0) {
      return { result: current };
    }

    const allRanges = [current, ...context].filter(Boolean);

    switch (strategy) {
      case 'intersection': {
        // Find overlapping date range
        const starts = allRanges.map(r => new Date(r.from));
        const ends = allRanges.map(r => new Date(r.to));

        const latestStart = new Date(Math.max(...starts.map(d => d.getTime())));
        const earliestEnd = new Date(Math.min(...ends.map(d => d.getTime())));

        if (latestStart > earliestEnd) {
          // No overlap
          return {
            result: current,
            conflict: {
              filterType: 'dateRange',
              values: allRanges,
              resolution: 'latest',
              suggestedValue: current
            }
          };
        }

        return {
          result: {
            from: latestStart,
            to: earliestEnd,
            dateType: current.dateType || 'publication'
          }
        };
      }

      case 'union': {
        // Expand to cover all ranges
        const starts = allRanges.map(r => new Date(r.from));
        const ends = allRanges.map(r => new Date(r.to));

        const earliestStart = new Date(Math.min(...starts.map(d => d.getTime())));
        const latestEnd = new Date(Math.max(...ends.map(d => d.getTime())));

        return {
          result: {
            from: earliestStart,
            to: latestEnd,
            dateType: current.dateType || 'publication'
          }
        };
      }

      case 'latest':
      default:
        return { result: current };
    }
  }

  /**
   * Combine keywords with weighting
   */
  private combineKeywords(
    current: string[] | undefined,
    context: (string[] | undefined)[],
    strategy: 'union' | 'intersection' | 'weighted'
  ): { result: string[] | undefined; conflict?: FilterConflict } {
    if (!current && context.length === 0) {
      return { result: undefined };
    }

    if (!current) {
      return { result: context[0] };
    }

    if (context.length === 0) {
      return { result: current };
    }

    const allKeywords = [current, ...context].filter(Boolean) as string[][];

    if (strategy === 'weighted') {
      // Weight keywords by frequency and recency
      const keywordScores = new Map<string, number>();

      allKeywords.forEach((keywords, index) => {
        const recencyWeight = 1 / (index + 1); // More recent = higher weight

        keywords.forEach(keyword => {
          const current = keywordScores.get(keyword) || 0;
          keywordScores.set(keyword, current + recencyWeight);
        });
      });

      // Sort by score and take top keywords
      const sorted = Array.from(keywordScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20) // Max 20 keywords
        .map(([keyword, _]) => keyword);

      return { result: sorted };
    }

    // Union or intersection
    return this.combineNormType(current, context, strategy as any);
  }

  /**
   * Combine topics with ranking
   */
  private combineTopics(
    current: string[] | undefined,
    context: (string[] | undefined)[],
    strategy: 'union' | 'ranked'
  ): { result: string[] | undefined; conflict?: FilterConflict } {
    if (strategy === 'ranked') {
      // Similar to weighted keywords
      return this.combineKeywords(current, context, 'weighted');
    }

    return this.combineNormType(current, context, 'union');
  }

  /**
   * Generate human-readable explanation
   */
  private explainCombination(
    current: SearchFilters,
    context: SearchFilters[],
    combined: SearchFilters,
    conflicts: FilterConflict[]
  ): string {
    const parts: string[] = [];

    if (context.length > 0) {
      parts.push(`Combinando filtros de ${context.length + 1} consultas`);
    }

    if (combined.normType) {
      parts.push(`Tipos de norma: ${combined.normType.join(', ')}`);
    }

    if (combined.jurisdiction) {
      parts.push(`Jurisdicción: ${combined.jurisdiction.join(', ')}`);
    }

    if (combined.dateRange) {
      parts.push(
        `Rango de fechas: ${combined.dateRange.from.toLocaleDateString()} - ${combined.dateRange.to.toLocaleDateString()}`
      );
    }

    if (conflicts.length > 0) {
      parts.push(`⚠️ ${conflicts.length} conflictos resueltos automáticamente`);
    }

    return parts.join('. ');
  }

  /**
   * Optimize combined filters
   */
  optimizeFilters(filters: SearchFilters): SearchFilters {
    const optimized = { ...filters };

    // Remove duplicate keywords
    if (optimized.keywords) {
      optimized.keywords = Array.from(new Set(optimized.keywords));
    }

    // Remove duplicate topics
    if (optimized.topics) {
      optimized.topics = Array.from(new Set(optimized.topics));
    }

    // Validate and clean arrays
    if (optimized.normType) {
      optimized.normType = optimized.normType.filter(Boolean);
      if (optimized.normType.length === 0) {
        delete optimized.normType;
      }
    }

    if (optimized.jurisdiction) {
      optimized.jurisdiction = optimized.jurisdiction.filter(Boolean);
      if (optimized.jurisdiction.length === 0) {
        delete optimized.jurisdiction;
      }
    }

    return optimized;
  }
}

export const filterCombinator = new FilterCombinator();
```

---

### Day 5: Query Suggestions & Autocomplete
**Priority**: MEDIUM
**Goal**: Intelligent query suggestions based on patterns

#### Implementation continues in next response...

---

## 📋 Success Criteria

### Week 3 Completion Checklist

**Database & Schema:**
- [ ] QuerySession model implemented
- [ ] QueryHistory model implemented
- [ ] QueryRefinement model implemented
- [ ] Migrations applied successfully
- [ ] Indexes created for performance

**Session Management:**
- [ ] Session creation and retrieval working
- [ ] Context building from history
- [ ] Query tracking in sessions
- [ ] Feedback recording functional
- [ ] Session cleanup job scheduled

**Context Analysis:**
- [ ] Follow-up query detection
- [ ] Topic shift detection
- [ ] Refinement detection
- [ ] Entity pattern recognition
- [ ] Contextual suggestions generation

**Filter Combination:**
- [ ] Filter merging strategies implemented
- [ ] Conflict detection and resolution
- [ ] Date range intersection logic
- [ ] Keyword weighting algorithm
- [ ] Filter optimization

**Testing:**
- [ ] Unit tests for all new services (>85% coverage)
- [ ] Integration tests for session flow
- [ ] Performance tests (<1.5s average)
- [ ] Context awareness validation

**Integration:**
- [ ] NLP routes updated with session support
- [ ] Phase 9 search integration tested
- [ ] Error handling verified
- [ ] Logging and monitoring active

---

## 🎯 Next Steps (Week 4 Preview)

1. Query suggestion engine with ML-based recommendations
2. Autocomplete service with legal term awareness
3. Relevance feedback loop for continuous learning
4. Performance optimization and caching strategies
5. Complete frontend integration
6. Production deployment preparation

---

**Document Status**: READY FOR DEVELOPMENT
**Estimated Completion**: 4-5 days
**Dependencies**: Week 1 & 2 Complete ✅
