import { z } from 'zod';

// ============================================================================
// ENUMS MATCHING PRISMA SCHEMA
// ============================================================================

export const NormTypeEnum = z.enum([
  'CONSTITUTIONAL_NORM',
  'ORGANIC_LAW',
  'ORDINARY_LAW',
  'ORGANIC_CODE',
  'ORDINARY_CODE',
  'REGULATION_GENERAL',
  'REGULATION_EXECUTIVE',
  'ORDINANCE_MUNICIPAL',
  'ORDINANCE_METROPOLITAN',
  'RESOLUTION_ADMINISTRATIVE',
  'RESOLUTION_JUDICIAL',
  'ADMINISTRATIVE_AGREEMENT',
  'INTERNATIONAL_TREATY',
  'JUDICIAL_PRECEDENT'
]);

export const LegalHierarchyEnum = z.enum([
  'CONSTITUCION',
  'TRATADOS_INTERNACIONALES_DDHH',
  'LEYES_ORGANICAS',
  'LEYES_ORDINARIAS',
  'CODIGOS_ORGANICOS',
  'CODIGOS_ORDINARIOS',
  'REGLAMENTOS',
  'ORDENANZAS',
  'RESOLUCIONES',
  'ACUERDOS_ADMINISTRATIVOS'
]);

export const PublicationTypeEnum = z.enum([
  'ORDINARIO',
  'SUPLEMENTO',
  'SEGUNDO_SUPLEMENTO',
  'SUPLEMENTO_ESPECIAL',
  'EDICION_CONSTITUCIONAL'
]);

export const DocumentStateEnum = z.enum([
  'ORIGINAL',
  'REFORMADO'
]);

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

// Schema for creating/uploading a new legal document
export const CreateLegalDocumentSchema = z.object({
  // Required fields
  normType: NormTypeEnum,
  normTitle: z.string().min(1).max(500),
  legalHierarchy: LegalHierarchyEnum,
  content: z.string().min(1),

  // Optional fields
  publicationType: PublicationTypeEnum.optional(),
  publicationNumber: z.string().max(100).optional(),
  publicationDate: z.string().datetime().optional(),

  documentState: DocumentStateEnum.default('ORIGINAL'),
  lastReformDate: z.string().datetime().optional(),
  reformHistory: z.array(z.object({
    date: z.string().datetime(),
    description: z.string(),
    publicationReference: z.string().optional()
  })).optional(),

  jurisdiction: z.string().max(200).optional(),
  effectiveFromDate: z.string().datetime().optional(),

  keywords: z.array(z.string()).optional(),
  relatedNorms: z.array(z.string().uuid()).optional(),

  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number()
  })).optional(),

  metadata: z.record(z.any()).optional()
});

// Schema for updating an existing legal document
export const UpdateLegalDocumentSchema = z.object({
  normType: NormTypeEnum.optional(),
  normTitle: z.string().min(1).max(500).optional(),
  legalHierarchy: LegalHierarchyEnum.optional(),
  content: z.string().min(1).optional(),

  publicationType: PublicationTypeEnum.nullable().optional(),
  publicationNumber: z.string().max(100).nullable().optional(),
  publicationDate: z.string().datetime().nullable().optional(),

  documentState: DocumentStateEnum.optional(),
  lastReformDate: z.string().datetime().nullable().optional(),
  reformHistory: z.array(z.object({
    date: z.string().datetime(),
    description: z.string(),
    publicationReference: z.string().optional()
  })).optional(),

  jurisdiction: z.string().max(200).nullable().optional(),
  effectiveFromDate: z.string().datetime().nullable().optional(),

  keywords: z.array(z.string()).optional(),
  relatedNorms: z.array(z.string().uuid()).optional(),

  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number()
  })).optional(),

  metadata: z.record(z.any()).optional(),

  isActive: z.boolean().optional()
});

// Schema for creating a document revision
export const CreateDocumentRevisionSchema = z.object({
  revisionType: z.enum(['reform', 'correction', 'annotation']),
  description: z.string().optional(),
  previousContent: z.string().optional(),
  newContent: z.string().optional(),
  effectiveDate: z.string().datetime(),
  approvedBy: z.string().uuid().optional()
});

// Schema for querying/filtering legal documents
export const QueryLegalDocumentsSchema = z.object({
  // Filter options
  normType: NormTypeEnum.optional(),
  legalHierarchy: LegalHierarchyEnum.optional(),
  publicationType: PublicationTypeEnum.optional(),
  documentState: DocumentStateEnum.optional(),

  // Date range filters
  publicationDateFrom: z.string().datetime().optional(),
  publicationDateTo: z.string().datetime().optional(),
  lastReformDateFrom: z.string().datetime().optional(),
  lastReformDateTo: z.string().datetime().optional(),

  // Text search
  search: z.string().optional(),
  keywords: z.array(z.string()).optional(),

  // Pagination
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum([
    'normTitle',
    'publicationDate',
    'lastReformDate',
    'createdAt',
    'updatedAt',
    'viewCount'
  ]).default('publicationDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Additional filters
  isActive: z.boolean().optional(),
  jurisdiction: z.string().optional()
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

// Schema for legal document response
export const LegalDocumentResponseSchema = z.object({
  id: z.string().uuid(),
  normType: NormTypeEnum,
  normTitle: z.string(),
  legalHierarchy: LegalHierarchyEnum,

  publicationType: PublicationTypeEnum.nullable(),
  publicationNumber: z.string().nullable(),
  publicationDate: z.string().datetime().nullable(),

  documentState: DocumentStateEnum,
  lastReformDate: z.string().datetime().nullable(),
  reformHistory: z.any().nullable(),

  content: z.string(),

  jurisdiction: z.string().nullable(),
  effectiveFromDate: z.string().datetime().nullable(),

  keywords: z.array(z.string()),
  relatedNorms: z.array(z.string()),
  attachments: z.any().nullable(),

  metadata: z.any().nullable(),

  isActive: z.boolean(),
  viewCount: z.number(),
  downloadCount: z.number(),

  uploadedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Optional relations
  uploader: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().email()
  }).optional(),

  chunksCount: z.number().optional(),
  revisionsCount: z.number().optional()
});

// Schema for paginated response
export const PaginatedLegalDocumentsResponseSchema = z.object({
  documents: z.array(LegalDocumentResponseSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean()
  })
});

// ============================================================================
// MIGRATION HELPER SCHEMAS
// ============================================================================

// Schema for migrating old documents to new structure
export const MigrationMappingSchema = z.object({
  // Map old category to new legalHierarchy
  categoryMapping: z.record(LegalHierarchyEnum),

  // Default norm type based on category
  defaultNormType: z.record(NormTypeEnum),

  // Parse metadata to extract new fields
  extractPublicationInfo: z.boolean().default(true),

  // Preserve original data
  preserveOriginalMetadata: z.boolean().default(true)
});

// ============================================================================
// BACKWARD COMPATIBILITY SCHEMAS
// ============================================================================

// Old schema wrapper for backward compatibility
export const LegacyLegalDocumentSchema = z.object({
  title: z.string(), // Maps to normTitle
  category: z.string(), // Maps to legalHierarchy
  content: z.string(),
  metadata: z.object({
    year: z.number().optional(),
    number: z.string().optional(), // Maps to publicationNumber
    jurisdiction: z.string().optional(),
    effectiveDate: z.string().optional() // Maps to lastReformDate
  }).optional()
});

// Transformation function type
export type LegacyToNewTransform = {
  mapLegacyCategory: (category: string) => LegalHierarchyEnum['_type'];
  inferNormType: (title: string, category: string) => NormTypeEnum['_type'];
  extractPublicationInfo: (metadata: any) => {
    publicationType?: PublicationTypeEnum['_type'];
    publicationNumber?: string;
    publicationDate?: Date;
  };
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type NormType = z.infer<typeof NormTypeEnum>;
export type LegalHierarchy = z.infer<typeof LegalHierarchyEnum>;
export type PublicationType = z.infer<typeof PublicationTypeEnum>;
export type DocumentState = z.infer<typeof DocumentStateEnum>;

export type CreateLegalDocument = z.infer<typeof CreateLegalDocumentSchema>;
export type UpdateLegalDocument = z.infer<typeof UpdateLegalDocumentSchema>;
export type QueryLegalDocuments = z.infer<typeof QueryLegalDocumentsSchema>;
export type LegalDocumentResponse = z.infer<typeof LegalDocumentResponseSchema>;
export type PaginatedLegalDocumentsResponse = z.infer<typeof PaginatedLegalDocumentsResponseSchema>;

export type LegacyLegalDocument = z.infer<typeof LegacyLegalDocumentSchema>;