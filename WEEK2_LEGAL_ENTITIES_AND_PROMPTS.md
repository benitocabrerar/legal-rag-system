# Week 2: Legal Entity Dictionary & Context Prompts for Ecuadorian Law

## Executive Summary

This document presents a comprehensive design for Phase 10, Week 2 of the Legal RAG System, focusing on creating a robust legal entity dictionary and context-aware prompts specifically tailored for the Ecuadorian legal system. The solution includes a complete taxonomy of Ecuadorian legal entities, TypeScript interfaces, and specialized LLM prompts that understand the unique characteristics of Ecuador's legal framework.

## Table of Contents

1. [Legal Entity Dictionary Design](#legal-entity-dictionary-design)
2. [TypeScript Interfaces](#typescript-interfaces)
3. [Context Prompt Templates](#context-prompt-templates)
4. [Sample Query Transformations](#sample-query-transformations)
5. [Performance Optimizations](#performance-optimizations)
6. [Implementation Plan](#implementation-plan)

---

## Legal Entity Dictionary Design

### 1. Constitutional Provisions

```typescript
const constitutionalProvisions = {
  entityType: "constitutional_article",
  displayName: "Artículo Constitucional",
  patterns: [
    // Direct article references
    /Art(?:ículo)?\.?\s*(\d+)(?:\s*numeral\s*(\d+))?(?:\s*literal\s*([a-z]))?/gi,
    // With constitutional context
    /Constitución(?:\s+de\s+la\s+República)?(?:\s+del\s+Ecuador)?(?:\s+de\s+)?(?:2008)?[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
    // Abbreviated forms
    /CRE[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
    // With section references
    /Título\s+([IVXLCDM]+)[,\s]*Capítulo\s+(\w+)[,\s]*(?:Sección\s+(\w+)[,\s]*)?Art(?:ículo)?\.?\s*(\d+)/gi
  ],
  normalize: (match) => {
    const [, article, numeral, literal] = match;
    let normalized = `Constitución 2008, Art. ${article}`;
    if (numeral) normalized += `, numeral ${numeral}`;
    if (literal) normalized += `, literal ${literal}`;
    return normalized;
  },
  metadata: {
    documentType: "constitution",
    hierarchy: "national",
    year: 2008,
    source: "Registro Oficial 449",
    datePublished: "2008-10-20"
  },
  synonyms: [
    "Carta Magna",
    "Norma Suprema",
    "CRE",
    "Constitución de Montecristi"
  ],
  contextKeywords: [
    "derechos fundamentales",
    "garantías constitucionales",
    "principios constitucionales",
    "buen vivir",
    "derechos de la naturaleza"
  ]
};
```

### 2. Legal Codes

```typescript
const legalCodes = {
  civil: {
    entityType: "civil_code_article",
    displayName: "Código Civil",
    patterns: [
      /Código\s+Civil[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /CC[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /Art(?:ículo)?\.?\s*(\d+)\s+(?:del\s+)?Código\s+Civil/gi
    ],
    normalize: (match) => `Código Civil, Art. ${match[1]}`,
    metadata: {
      documentType: "code",
      codeType: "civil",
      hierarchy: "national",
      lastReform: "2022"
    }
  },

  penal: {
    entityType: "criminal_code_article",
    displayName: "Código Orgánico Integral Penal",
    patterns: [
      /COIP[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /Código\s+(?:Orgánico\s+)?(?:Integral\s+)?Penal[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /Art(?:ículo)?\.?\s*(\d+)\s+(?:del\s+)?COIP/gi
    ],
    normalize: (match) => `COIP, Art. ${match[1]}`,
    metadata: {
      documentType: "code",
      codeType: "criminal",
      hierarchy: "national",
      year: 2014,
      source: "Registro Oficial Suplemento 180"
    }
  },

  labor: {
    entityType: "labor_code_article",
    displayName: "Código del Trabajo",
    patterns: [
      /Código\s+del?\s+Trabajo[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /CT[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /Art(?:ículo)?\.?\s*(\d+)\s+(?:del\s+)?Código\s+del?\s+Trabajo/gi
    ],
    normalize: (match) => `Código del Trabajo, Art. ${match[1]}`,
    metadata: {
      documentType: "code",
      codeType: "labor",
      hierarchy: "national"
    }
  },

  commerce: {
    entityType: "commerce_code_article",
    displayName: "Código de Comercio",
    patterns: [
      /Código\s+de\s+Comercio[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /Art(?:ículo)?\.?\s*(\d+)\s+(?:del\s+)?Código\s+de\s+Comercio/gi
    ],
    normalize: (match) => `Código de Comercio, Art. ${match[1]}`,
    metadata: {
      documentType: "code",
      codeType: "commerce",
      hierarchy: "national"
    }
  },

  procedural: {
    entityType: "procedural_code_article",
    displayName: "Código Orgánico General de Procesos",
    patterns: [
      /COGEP[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /Código\s+(?:Orgánico\s+)?General\s+de\s+Procesos[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi
    ],
    normalize: (match) => `COGEP, Art. ${match[1]}`,
    metadata: {
      documentType: "code",
      codeType: "procedural",
      hierarchy: "national",
      year: 2015
    }
  },

  administrative: {
    entityType: "administrative_code_article",
    displayName: "Código Orgánico Administrativo",
    patterns: [
      /COA[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      /Código\s+(?:Orgánico\s+)?Administrativo[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi
    ],
    normalize: (match) => `COA, Art. ${match[1]}`,
    metadata: {
      documentType: "code",
      codeType: "administrative",
      hierarchy: "national",
      year: 2017
    }
  }
};
```

### 3. Laws (Organic and Ordinary)

```typescript
const laws = {
  organic: {
    entityType: "organic_law",
    displayName: "Ley Orgánica",
    patterns: [
      /Ley\s+Orgánica\s+(?:de\s+|del\s+|para\s+|sobre\s+)?([\w\s,áéíóúñÁÉÍÓÚÑ]+?)(?:[,\s]*Art(?:ículo)?\.?\s*(\d+))?/gi,
      /LO[\w]+[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,
      // Specific common organic laws
      /LOGJCC[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi, // Ley Orgánica de Garantías Jurisdiccionales
      /LOES[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,    // Ley Orgánica de Educación Superior
      /LOAH[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi,    // Ley Orgánica de Apoyo Humanitario
      /LOIPEVCM[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi // Ley Orgánica Integral para Prevenir Violencia
    ],
    normalize: (match) => {
      const [full, lawName, article] = match;
      let normalized = `Ley Orgánica ${lawName.trim()}`;
      if (article) normalized += `, Art. ${article}`;
      return normalized;
    },
    metadata: {
      documentType: "law",
      lawType: "organic",
      hierarchy: "national",
      requiredVotes: "mayoría absoluta" // Constitutional requirement
    },
    commonLaws: [
      { abbreviation: "LOGJCC", fullName: "Ley Orgánica de Garantías Jurisdiccionales y Control Constitucional" },
      { abbreviation: "LOES", fullName: "Ley Orgánica de Educación Superior" },
      { abbreviation: "LOAH", fullName: "Ley Orgánica de Apoyo Humanitario" },
      { abbreviation: "LOIPEVCM", fullName: "Ley Orgánica Integral para Prevenir y Erradicar Violencia contra las Mujeres" },
      { abbreviation: "COFJ", fullName: "Código Orgánico de la Función Judicial" },
      { abbreviation: "COOTAD", fullName: "Código Orgánico de Organización Territorial, Autonomía y Descentralización" }
    ]
  },

  ordinary: {
    entityType: "ordinary_law",
    displayName: "Ley Ordinaria",
    patterns: [
      /Ley\s+(?!Orgánica)([\w\s,áéíóúñÁÉÍÓÚÑ]+?)(?:[,\s]*Art(?:ículo)?\.?\s*(\d+))?/gi,
      /Ley\s+No?\.?\s*(\d+(?:-\d+)?)[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi
    ],
    normalize: (match) => {
      const [full, lawName, article] = match;
      let normalized = `Ley ${lawName.trim()}`;
      if (article) normalized += `, Art. ${article}`;
      return normalized;
    },
    metadata: {
      documentType: "law",
      lawType: "ordinary",
      hierarchy: "national",
      requiredVotes: "mayoría simple"
    }
  }
};
```

### 4. Regulations and Decrees

```typescript
const regulations = {
  executiveDecree: {
    entityType: "executive_decree",
    displayName: "Decreto Ejecutivo",
    patterns: [
      /Decreto\s+Ejecutivo\s+(?:No?\.?\s*)?(\d+)(?:[,\s]*Art(?:ículo)?\.?\s*(\d+))?/gi,
      /DE\s+(?:No?\.?\s*)?(\d+)(?:[,\s]*Art(?:ículo)?\.?\s*(\d+))?/gi
    ],
    normalize: (match) => {
      const [, decreeNum, article] = match;
      let normalized = `Decreto Ejecutivo ${decreeNum}`;
      if (article) normalized += `, Art. ${article}`;
      return normalized;
    },
    metadata: {
      documentType: "decree",
      decreeType: "executive",
      hierarchy: "national",
      issuingAuthority: "Presidente de la República"
    }
  },

  ministryAgreement: {
    entityType: "ministerial_agreement",
    displayName: "Acuerdo Ministerial",
    patterns: [
      /Acuerdo\s+Ministerial\s+(?:No?\.?\s*)?(\d+(?:-\d{4})?)/gi,
      /AM\s+(?:No?\.?\s*)?(\d+)/gi
    ],
    normalize: (match) => `Acuerdo Ministerial ${match[1]}`,
    metadata: {
      documentType: "agreement",
      agreementType: "ministerial",
      hierarchy: "national",
      issuingAuthority: "ministry"
    }
  },

  resolution: {
    entityType: "resolution",
    displayName: "Resolución",
    patterns: [
      /Resolución\s+(?:No?\.?\s*)?([\w-]+\d+(?:-\d{4})?)/gi,
      // Specific institution resolutions
      /Resolución\s+(?:de\s+la\s+|del\s+)?([\w\s]+?)\s+(?:No?\.?\s*)?([\w-]+\d+)/gi
    ],
    normalize: (match) => {
      const [, institution, resolutionNum] = match;
      if (institution) {
        return `Resolución ${institution.trim()} ${resolutionNum}`;
      }
      return `Resolución ${match[1]}`;
    },
    metadata: {
      documentType: "resolution",
      hierarchy: "varies"
    }
  },

  regulation: {
    entityType: "regulation",
    displayName: "Reglamento",
    patterns: [
      /Reglamento\s+(?:a\s+la\s+|de\s+la\s+|del\s+|para\s+)?([\w\s,áéíóúñÁÉÍÓÚÑ]+?)(?:[,\s]*Art(?:ículo)?\.?\s*(\d+))?/gi,
      /RGLO[\w]+[,\s]*Art(?:ículo)?\.?\s*(\d+)/gi
    ],
    normalize: (match) => {
      const [, regName, article] = match;
      let normalized = `Reglamento ${regName.trim()}`;
      if (article) normalized += `, Art. ${article}`;
      return normalized;
    },
    metadata: {
      documentType: "regulation",
      hierarchy: "varies"
    }
  },

  ordinance: {
    entityType: "ordinance",
    displayName: "Ordenanza",
    patterns: [
      /Ordenanza\s+(?:Municipal\s+|Metropolitana\s+)?(?:No?\.?\s*)?([\w-]+\d+)/gi,
      /Ordenanza\s+(?:que\s+|para\s+|sobre\s+)?([\w\s,áéíóúñÁÉÍÓÚÑ]+?)(?:[,\s]*Art(?:ículo)?\.?\s*(\d+))?/gi
    ],
    normalize: (match) => {
      const [, ordinanceId, article] = match;
      let normalized = `Ordenanza ${ordinanceId}`;
      if (article) normalized += `, Art. ${article}`;
      return normalized;
    },
    metadata: {
      documentType: "ordinance",
      hierarchy: "local",
      issuingAuthority: "GAD"
    }
  }
};
```

### 5. Government Institutions

```typescript
const governmentInstitutions = {
  judicial: {
    entityType: "judicial_institution",
    entities: [
      {
        name: "Corte Constitucional",
        abbreviations: ["CC"],
        patterns: [
          /Corte\s+Constitucional(?:\s+del\s+Ecuador)?/gi,
          /CC(?:\s+del\s+Ecuador)?/gi,
          /Sentencia\s+(?:No?\.?\s*)?([\d-]+(?:-\w+)?-CC)/gi
        ],
        metadata: {
          type: "judicial",
          level: "constitutional",
          hierarchy: "national"
        }
      },
      {
        name: "Corte Nacional de Justicia",
        abbreviations: ["CNJ"],
        patterns: [
          /Corte\s+Nacional\s+de\s+Justicia/gi,
          /CNJ/gi,
          /Resolución\s+CNJ\s+(?:No?\.?\s*)?([\d-]+)/gi
        ],
        metadata: {
          type: "judicial",
          level: "supreme",
          hierarchy: "national"
        }
      },
      {
        name: "Tribunal Contencioso Electoral",
        abbreviations: ["TCE"],
        patterns: [
          /Tribunal\s+Contencioso\s+Electoral/gi,
          /TCE/gi
        ],
        metadata: {
          type: "judicial",
          level: "electoral",
          hierarchy: "national"
        }
      }
    ]
  },

  legislative: {
    entityType: "legislative_institution",
    entities: [
      {
        name: "Asamblea Nacional",
        abbreviations: ["AN"],
        patterns: [
          /Asamblea\s+Nacional(?:\s+del\s+Ecuador)?/gi,
          /AN(?:\s+del\s+Ecuador)?/gi
        ],
        metadata: {
          type: "legislative",
          hierarchy: "national",
          members: 137
        }
      }
    ]
  },

  executive: {
    entityType: "executive_institution",
    entities: [
      {
        name: "Presidencia de la República",
        patterns: [
          /Presidencia\s+de\s+la\s+República/gi,
          /Presidente\s+(?:de\s+la\s+República\s+)?del\s+Ecuador/gi
        ],
        metadata: {
          type: "executive",
          hierarchy: "national"
        }
      },
      {
        name: "Ministerio",
        patterns: [
          /Ministerio\s+de\s+([\w\s,áéíóúñÁÉÍÓÚÑ]+)/gi,
          // Specific ministries
          /MINEDUC/gi, // Ministerio de Educación
          /MSP/gi,     // Ministerio de Salud Pública
          /MDT/gi,     // Ministerio del Trabajo
          /MIES/gi     // Ministerio de Inclusión Económica y Social
        ],
        metadata: {
          type: "executive",
          hierarchy: "national"
        }
      }
    ]
  },

  control: {
    entityType: "control_institution",
    entities: [
      {
        name: "Contraloría General del Estado",
        abbreviations: ["CGE"],
        patterns: [
          /Contraloría\s+General\s+del\s+Estado/gi,
          /CGE/gi
        ],
        metadata: {
          type: "control",
          hierarchy: "national"
        }
      },
      {
        name: "Procuraduría General del Estado",
        abbreviations: ["PGE"],
        patterns: [
          /Procuraduría\s+General\s+del\s+Estado/gi,
          /PGE/gi
        ],
        metadata: {
          type: "control",
          hierarchy: "national"
        }
      },
      {
        name: "Fiscalía General del Estado",
        abbreviations: ["FGE"],
        patterns: [
          /Fiscalía\s+General\s+del\s+Estado/gi,
          /FGE/gi
        ],
        metadata: {
          type: "control",
          hierarchy: "national"
        }
      },
      {
        name: "Defensoría del Pueblo",
        abbreviations: ["DPE"],
        patterns: [
          /Defensoría\s+del\s+Pueblo/gi,
          /DPE/gi
        ],
        metadata: {
          type: "control",
          hierarchy: "national",
          role: "human_rights"
        }
      }
    ]
  },

  autonomous: {
    entityType: "autonomous_institution",
    entities: [
      {
        name: "Consejo Nacional Electoral",
        abbreviations: ["CNE"],
        patterns: [
          /Consejo\s+Nacional\s+Electoral/gi,
          /CNE/gi
        ],
        metadata: {
          type: "autonomous",
          function: "electoral",
          hierarchy: "national"
        }
      },
      {
        name: "Consejo de Participación Ciudadana y Control Social",
        abbreviations: ["CPCCS"],
        patterns: [
          /Consejo\s+de\s+Participación\s+Ciudadana\s+y\s+Control\s+Social/gi,
          /CPCCS/gi
        ],
        metadata: {
          type: "autonomous",
          function: "transparency",
          hierarchy: "national"
        }
      }
    ]
  }
};
```

### 6. Legal Concepts

```typescript
const legalConcepts = {
  constitutionalRights: {
    entityType: "constitutional_right",
    concepts: [
      {
        name: "Derechos del Buen Vivir",
        patterns: [
          /derechos?\s+del\s+buen\s+vivir/gi,
          /sumak\s+kawsay/gi
        ],
        relatedArticles: ["12-34"],
        metadata: {
          category: "fundamental_rights",
          uniqueToEcuador: true
        }
      },
      {
        name: "Derechos de la Naturaleza",
        patterns: [
          /derechos?\s+de\s+la\s+naturaleza/gi,
          /Pacha\s*mama/gi
        ],
        relatedArticles: ["71-74"],
        metadata: {
          category: "environmental_rights",
          uniqueToEcuador: true
        }
      },
      {
        name: "Derechos de Libertad",
        patterns: [
          /derechos?\s+de\s+libertad/gi
        ],
        relatedArticles: ["66"],
        metadata: {
          category: "civil_rights"
        }
      },
      {
        name: "Derechos de Participación",
        patterns: [
          /derechos?\s+de\s+participación/gi,
          /participación\s+ciudadana/gi
        ],
        relatedArticles: ["61-65"],
        metadata: {
          category: "political_rights"
        }
      }
    ]
  },

  jurisdictionalGuarantees: {
    entityType: "jurisdictional_guarantee",
    concepts: [
      {
        name: "Acción de Protección",
        patterns: [
          /acción\s+de\s+protección/gi
        ],
        relatedArticles: ["88"],
        metadata: {
          type: "constitutional_action",
          purpose: "protect_rights"
        }
      },
      {
        name: "Hábeas Corpus",
        patterns: [
          /h[aá]beas\s+corpus/gi
        ],
        relatedArticles: ["89"],
        metadata: {
          type: "constitutional_action",
          purpose: "personal_freedom"
        }
      },
      {
        name: "Acción de Acceso a la Información Pública",
        patterns: [
          /acción\s+de\s+acceso\s+a\s+la\s+información/gi
        ],
        relatedArticles: ["91"],
        metadata: {
          type: "constitutional_action",
          purpose: "information_access"
        }
      },
      {
        name: "Hábeas Data",
        patterns: [
          /h[aá]beas\s+data/gi
        ],
        relatedArticles: ["92"],
        metadata: {
          type: "constitutional_action",
          purpose: "data_protection"
        }
      },
      {
        name: "Acción por Incumplimiento",
        patterns: [
          /acción\s+por\s+incumplimiento/gi
        ],
        relatedArticles: ["93"],
        metadata: {
          type: "constitutional_action",
          purpose: "enforce_compliance"
        }
      },
      {
        name: "Acción Extraordinaria de Protección",
        patterns: [
          /acción\s+extraordinaria\s+de\s+protección/gi,
          /AEP/g
        ],
        relatedArticles: ["94"],
        metadata: {
          type: "constitutional_action",
          purpose: "judicial_review"
        }
      }
    ]
  },

  legalPrinciples: {
    entityType: "legal_principle",
    concepts: [
      {
        name: "Principio de Proporcionalidad",
        patterns: [
          /principio\s+de\s+proporcionalidad/gi
        ],
        metadata: {
          category: "constitutional_principle"
        }
      },
      {
        name: "Principio Pro Homine",
        patterns: [
          /principio\s+pro\s+homine/gi,
          /pro\s+persona/gi
        ],
        metadata: {
          category: "human_rights_principle"
        }
      },
      {
        name: "Principio de Aplicación Directa",
        patterns: [
          /aplicación\s+directa\s+(?:e\s+)?inmediata/gi
        ],
        relatedArticles: ["426"],
        metadata: {
          category: "constitutional_principle"
        }
      },
      {
        name: "Principio de Interculturalidad",
        patterns: [
          /principio\s+de\s+interculturalidad/gi,
          /plurinacional/gi
        ],
        metadata: {
          category: "constitutional_principle",
          uniqueToEcuador: true
        }
      }
    ]
  },

  proceduralTerms: {
    entityType: "procedural_term",
    concepts: [
      {
        name: "Casación",
        patterns: [
          /recurso\s+de\s+casación/gi,
          /casación/gi
        ],
        metadata: {
          type: "legal_remedy",
          court: "CNJ"
        }
      },
      {
        name: "Apelación",
        patterns: [
          /recurso\s+de\s+apelación/gi,
          /apelación/gi
        ],
        metadata: {
          type: "legal_remedy"
        }
      },
      {
        name: "Nulidad",
        patterns: [
          /nulidad\s+(?:absoluta|relativa)?/gi
        ],
        metadata: {
          type: "legal_concept"
        }
      }
    ]
  }
};
```

---

## TypeScript Interfaces

```typescript
// src/types/legal-entities.types.ts

export interface LegalEntity {
  entityType: LegalEntityType;
  displayName: string;
  patterns: RegExp[];
  normalize: (match: RegExpMatchArray) => string;
  metadata: EntityMetadata;
  synonyms?: string[];
  abbreviations?: string[];
  contextKeywords?: string[];
  relatedEntities?: string[];
}

export interface EntityMetadata {
  documentType: DocumentType;
  hierarchy: HierarchyLevel;
  year?: number;
  source?: string;
  datePublished?: string;
  lastReform?: string;
  issuingAuthority?: string;
  requiredVotes?: string;
  uniqueToEcuador?: boolean;
}

export type LegalEntityType =
  | 'constitutional_article'
  | 'civil_code_article'
  | 'criminal_code_article'
  | 'labor_code_article'
  | 'commerce_code_article'
  | 'procedural_code_article'
  | 'administrative_code_article'
  | 'organic_law'
  | 'ordinary_law'
  | 'executive_decree'
  | 'ministerial_agreement'
  | 'resolution'
  | 'regulation'
  | 'ordinance'
  | 'judicial_institution'
  | 'legislative_institution'
  | 'executive_institution'
  | 'control_institution'
  | 'autonomous_institution'
  | 'constitutional_right'
  | 'jurisdictional_guarantee'
  | 'legal_principle'
  | 'procedural_term';

export type DocumentType =
  | 'constitution'
  | 'code'
  | 'law'
  | 'decree'
  | 'agreement'
  | 'resolution'
  | 'regulation'
  | 'ordinance'
  | 'judicial_decision'
  | 'administrative_act';

export type HierarchyLevel =
  | 'national'
  | 'provincial'
  | 'cantonal'
  | 'parroquial'
  | 'local'
  | 'institutional';

export interface EntityExtractionResult {
  text: string;
  entityType: LegalEntityType;
  normalizedForm: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  metadata: EntityMetadata;
}

export interface EntityDictionary {
  entities: Map<LegalEntityType, LegalEntity>;
  extract(text: string): EntityExtractionResult[];
  normalize(entity: string, type?: LegalEntityType): string;
  getMetadata(entity: string): EntityMetadata | null;
  getSynonyms(entity: string): string[];
  searchByKeyword(keyword: string): LegalEntity[];
  getHierarchicalEntities(level: HierarchyLevel): LegalEntity[];
}

export interface EntityCache {
  set(key: string, value: EntityExtractionResult[]): void;
  get(key: string): EntityExtractionResult[] | null;
  clear(): void;
  size(): number;
}

export interface EntityValidator {
  validateArticleNumber(code: string, article: number): boolean;
  validateLawReference(lawName: string, article?: number): boolean;
  validateInstitution(name: string): boolean;
  validateDateReference(entity: string, date: string): boolean;
}
```

---

## Context Prompt Templates

### 1. Query Transformation Prompt

```typescript
export const QUERY_TRANSFORMATION_PROMPT = `
You are a specialized legal assistant for the Ecuadorian legal system.

ECUADORIAN LEGAL CONTEXT:
- Constitutional Framework: Constitution of 2008 (Constitución de Montecristi)
- Key Principles: Buen Vivir (Sumak Kawsay), Derechos de la Naturaleza, Estado Plurinacional e Intercultural
- Legal Hierarchy: Constitución > Leyes Orgánicas > Leyes Ordinarias > Decretos > Reglamentos > Ordenanzas
- Major Codes: COIP (Penal), COGEP (Procesal), COA (Administrativo), Código Civil, Código del Trabajo
- Jurisdictional Guarantees: Acción de Protección, Hábeas Corpus, Hábeas Data, Acción de Acceso a la Información, Acción por Incumplimiento, Acción Extraordinaria de Protección

USER QUERY: {query}

ANALYSIS REQUIREMENTS:
1. Identify legal entities (laws, articles, institutions)
2. Detect temporal references (reforms, validity periods)
3. Recognize jurisdictional scope
4. Extract legal concepts and principles
5. Determine query intent and urgency

OUTPUT FORMAT:
{
  "filters": {
    "normType": ["constitution", "organic_law", "code", etc.],
    "jurisdiction": ["national", "provincial", "cantonal"],
    "dateRange": {
      "from": "YYYY-MM-DD",
      "to": "YYYY-MM-DD"
    },
    "institutions": [],
    "legalAreas": ["constitutional", "civil", "criminal", "labor", etc.]
  },
  "entities": [
    {
      "type": "entity_type",
      "value": "normalized_form",
      "confidence": 0.95
    }
  ],
  "keywords": ["extracted", "relevant", "terms"],
  "intent": "research|compliance|litigation|consultation",
  "urgency": "high|medium|low",
  "requiresUpdate": boolean,
  "confidence": 0.0-1.0
}

EXAMPLES:
Query: "necesito información sobre el habeas corpus en la constitución"
Output: {
  "filters": {
    "normType": ["constitution"],
    "jurisdiction": ["national"],
    "legalAreas": ["constitutional"]
  },
  "entities": [
    {
      "type": "jurisdictional_guarantee",
      "value": "Hábeas Corpus",
      "confidence": 1.0
    },
    {
      "type": "constitutional_article",
      "value": "Constitución 2008, Art. 89",
      "confidence": 0.9
    }
  ],
  "keywords": ["habeas", "corpus", "libertad", "personal"],
  "intent": "research",
  "urgency": "medium",
  "requiresUpdate": false,
  "confidence": 0.95
}`;
```

### 2. Entity Recognition Prompt

```typescript
export const ENTITY_RECOGNITION_PROMPT = `
You are an expert in Ecuadorian legal entity recognition.

ENTITY TYPES TO IDENTIFY:
1. Constitutional Articles (Art. 1-444 of Constitution 2008)
2. Legal Codes (COIP, COGEP, COA, Civil, Trabajo, Comercio)
3. Laws (Organic/Ordinary) with full names and abbreviations
4. Decrees and Regulations
5. Institutions (Corte Constitucional, CNJ, Asamblea Nacional, etc.)
6. Legal Concepts (derechos, garantías, principios)
7. Procedural Terms
8. Dates and Time Periods

TEXT TO ANALYZE: {text}

RECOGNITION RULES:
- Normalize all references to standard format
- Identify both explicit and implicit references
- Detect abbreviations and acronyms
- Recognize colloquial references
- Handle Spanish variations and typos

OUTPUT FORMAT:
{
  "entities": [
    {
      "original": "text as found",
      "normalized": "standardized form",
      "type": "entity_type",
      "startPos": 0,
      "endPos": 10,
      "context": "surrounding text",
      "confidence": 0.95,
      "metadata": {
        "hierarchy": "national",
        "year": 2008,
        "source": "official_source"
      }
    }
  ],
  "relationships": [
    {
      "entity1": "normalized_form",
      "entity2": "normalized_form",
      "relationship": "references|amends|implements|contradicts"
    }
  ],
  "summary": {
    "totalEntities": 0,
    "byType": {},
    "dominantArea": "constitutional|civil|criminal|etc"
  }
}`;
```

### 3. Intent Classification Prompt

```typescript
export const INTENT_CLASSIFICATION_PROMPT = `
You are analyzing legal queries in the Ecuadorian context.

QUERY: {query}

CLASSIFY THE USER'S INTENT:

PRIMARY INTENTS:
1. RESEARCH - Academic or general legal research
2. COMPLIANCE - Regulatory compliance verification
3. LITIGATION - Case preparation or dispute resolution
4. CONSULTATION - Professional legal advice seeking
5. PROCEDURE - How to perform legal procedures
6. RIGHTS_VERIFICATION - Checking rights and obligations
7. DOCUMENT_REQUEST - Specific document or form needed
8. PRECEDENT_SEARCH - Looking for judicial decisions
9. REFORM_TRACKING - Recent changes in legislation
10. TRANSLATION - Legal term clarification

SECONDARY ASPECTS:
- Urgency Level (immediate/short-term/long-term)
- Complexity (simple/moderate/complex)
- Jurisdiction (national/local/international)
- Subject Matter (area of law)
- User Type (citizen/lawyer/student/business)

CULTURAL CONTEXT:
Consider Ecuadorian-specific aspects:
- Indigenous rights and plurinational state
- Buen Vivir philosophy
- Rights of Nature
- Citizen participation mechanisms

OUTPUT:
{
  "primaryIntent": "INTENT_TYPE",
  "secondaryIntents": [],
  "urgency": "immediate|short_term|long_term",
  "complexity": "simple|moderate|complex",
  "jurisdiction": "national|provincial|cantonal",
  "legalArea": "specific_area",
  "userType": "citizen|professional|academic|business",
  "culturalFactors": [],
  "suggestedActions": [],
  "confidence": 0.95
}`;
```

### 4. Response Generation Prompt

```typescript
export const RESPONSE_GENERATION_PROMPT = `
You are a legal expert assistant specialized in Ecuadorian law.

QUERY: {query}
RETRIEVED CONTEXT: {context}
ENTITIES FOUND: {entities}

RESPONSE GUIDELINES:
1. Always cite specific articles and laws
2. Use proper Ecuadorian legal terminology
3. Acknowledge constitutional principles when relevant
4. Consider hierarchical norm application
5. Mention recent reforms if applicable
6. Include practical implications
7. Suggest related norms when helpful

RESPONSE STRUCTURE:
1. Direct Answer - Address the query directly
2. Legal Foundation - Cite relevant norms
3. Interpretation - Explain application
4. Practical Implications - Real-world effects
5. Related Information - Additional relevant norms
6. Caveats - Limitations or exceptions
7. Next Steps - Recommended actions

TONE AND STYLE:
- Professional but accessible
- Use Spanish legal terms with explanations
- Avoid ambiguity
- Be precise with citations
- Acknowledge uncertainty when present

SPECIAL CONSIDERATIONS:
- If constitutional rights are involved, prioritize them
- Consider indigenous justice systems if relevant
- Mention administrative procedures when applicable
- Note if professional legal advice is recommended

FORMAT YOUR RESPONSE:
{
  "summary": "Brief answer in 2-3 sentences",
  "legalBasis": [
    {
      "norm": "Specific law/article",
      "text": "Relevant excerpt",
      "interpretation": "How it applies"
    }
  ],
  "analysis": "Detailed explanation",
  "practicalImplications": "Real-world application",
  "relatedNorms": ["Additional relevant laws"],
  "recommendations": ["Suggested actions"],
  "disclaimer": "Any limitations or need for professional advice",
  "confidence": 0.0-1.0
}`;
```

### 5. Multi-Document Synthesis Prompt

```typescript
export const MULTI_DOCUMENT_SYNTHESIS_PROMPT = `
You are synthesizing information from multiple Ecuadorian legal sources.

DOCUMENTS:
{documents}

QUERY: {query}

SYNTHESIS REQUIREMENTS:
1. Identify consistency/conflicts between sources
2. Respect hierarchical superiority (Constitution > Laws > Regulations)
3. Consider temporal validity (newer reforms prevail)
4. Integrate different legal areas coherently
5. Highlight jurisdictional boundaries

HIERARCHY RULES:
- Constitution 2008 prevails over all
- Organic Laws > Ordinary Laws
- National > Provincial > Cantonal
- Lex posterior derogat legi priori
- Lex specialis derogat legi generali

OUTPUT:
{
  "synthesis": "Comprehensive answer integrating all sources",
  "sources": [
    {
      "document": "source_id",
      "relevance": 0.95,
      "contribution": "what this source adds",
      "hierarchy": "constitutional|legal|regulatory"
    }
  ],
  "conflicts": [
    {
      "source1": "norm1",
      "source2": "norm2",
      "nature": "type of conflict",
      "resolution": "which prevails and why"
    }
  ],
  "gaps": ["Information not found in sources"],
  "confidence": 0.0-1.0
}`;
```

### 6. Legal Update Detection Prompt

```typescript
export const LEGAL_UPDATE_DETECTION_PROMPT = `
You are monitoring legal changes in Ecuador.

CURRENT DOCUMENT: {document}
QUERY CONTEXT: {query}

CHECK FOR:
1. Recent reforms or amendments
2. Constitutional Court decisions affecting interpretation
3. New implementing regulations
4. Derogations or replacements
5. Transitional provisions in effect

SPECIFIC ATTENTION TO:
- Post-2008 Constitution changes
- COVID-19 related temporary measures
- Electoral law updates
- Labor reforms
- Tax law changes
- Environmental regulations

OUTPUT:
{
  "currentStatus": "valid|reformed|derogated|suspended",
  "lastUpdate": "YYYY-MM-DD",
  "changes": [
    {
      "date": "YYYY-MM-DD",
      "type": "reform|amendment|interpretation",
      "description": "nature of change",
      "source": "reforming norm or decision"
    }
  ],
  "futureChanges": [
    {
      "effectiveDate": "YYYY-MM-DD",
      "description": "upcoming change"
    }
  ],
  "relatedUpdates": ["other affected norms"],
  "requiresVerification": boolean,
  "confidence": 0.0-1.0
}`;
```

### 7. Procedural Guidance Prompt

```typescript
export const PROCEDURAL_GUIDANCE_PROMPT = `
You are providing procedural guidance under Ecuadorian law.

USER NEED: {need}
LEGAL CONTEXT: {context}

PROVIDE STEP-BY-STEP GUIDANCE:
1. Identify applicable procedure
2. List requirements and documents
3. Specify competent authority
4. Outline timeline and deadlines
5. Note fees or costs
6. Highlight common pitfalls

CONSIDER:
- Administrative procedures (COA)
- Judicial procedures (COGEP)
- Constitutional procedures (LOGJCC)
- Special procedures by subject matter
- Alternative dispute resolution

OUTPUT:
{
  "procedure": "Official procedure name",
  "legalBasis": ["Applicable norms"],
  "steps": [
    {
      "number": 1,
      "action": "What to do",
      "requirements": ["needed documents"],
      "authority": "where to go",
      "timeline": "time limit",
      "cost": "fees if any"
    }
  ],
  "totalTime": "estimated duration",
  "alternatives": ["other options"],
  "warnings": ["common mistakes"],
  "resources": ["helpful links or contacts"],
  "professionalHelpNeeded": boolean
}`;
```

### 8. Constitutional Rights Verification Prompt

```typescript
export const RIGHTS_VERIFICATION_PROMPT = `
You are analyzing constitutional rights under Ecuador's 2008 Constitution.

SITUATION: {situation}
QUERY: {query}

CONSTITUTIONAL FRAMEWORK:
- Derechos del Buen Vivir (Arts. 12-34)
- Derechos de las Personas y Grupos de Atención Prioritaria (Arts. 35-55)
- Derechos de las Comunidades, Pueblos y Nacionalidades (Arts. 56-60)
- Derechos de Participación (Arts. 61-65)
- Derechos de Libertad (Arts. 66-70)
- Derechos de la Naturaleza (Arts. 71-74)
- Derechos de Protección (Arts. 75-82)

ANALYSIS REQUIREMENTS:
1. Identify potentially affected rights
2. Determine if violation exists
3. Suggest applicable guarantees
4. Consider collective vs individual rights
5. Apply pro homine principle

OUTPUT:
{
  "affectedRights": [
    {
      "right": "Specific right",
      "article": "Constitutional article",
      "category": "Right category",
      "description": "How it applies"
    }
  ],
  "violations": [
    {
      "right": "Violated right",
      "severity": "high|medium|low",
      "evidence": "Supporting facts"
    }
  ],
  "availableGuarantees": [
    {
      "action": "Type of constitutional action",
      "article": "Legal basis",
      "requirements": "Prerequisites",
      "timeline": "Time limits"
    }
  ],
  "recommendations": ["Suggested course of action"],
  "urgency": "immediate|short_term|standard"
}`;
```

### 9. Comparative Law Analysis Prompt

```typescript
export const COMPARATIVE_ANALYSIS_PROMPT = `
You are comparing different legal provisions in Ecuadorian law.

NORMS TO COMPARE: {norms}
ANALYSIS FOCUS: {focus}

COMPARISON FRAMEWORK:
1. Hierarchical relationship
2. Temporal relationship (which is newer)
3. Subject matter overlap
4. Jurisdictional scope
5. Procedural differences
6. Sanctions or consequences

SPECIAL RULES:
- Constitutional supremacy always applies
- Organic laws modify other organic laws only
- Special law prevails over general law
- Favorable interpretation in human rights
- Progressive rights interpretation

OUTPUT:
{
  "comparison": [
    {
      "norm": "Norm identifier",
      "hierarchy": "Level in hierarchy",
      "scope": "Application scope",
      "keyProvisions": ["Main points"],
      "strengths": ["Advantages"],
      "limitations": ["Disadvantages"]
    }
  ],
  "relationships": {
    "complementary": ["Norms that work together"],
    "conflicting": ["Norms in tension"],
    "superseding": ["Which replaces which"]
  },
  "recommendation": "Which to apply and why",
  "practicalGuidance": "How to navigate differences",
  "confidence": 0.0-1.0
}`;
```

### 10. Judicial Precedent Analysis Prompt

```typescript
export const PRECEDENT_ANALYSIS_PROMPT = `
You are analyzing Ecuadorian judicial precedents.

CASE/TOPIC: {topic}
RELEVANT COURTS: Corte Constitucional, Corte Nacional de Justicia

PRECEDENT HIERARCHY:
1. Sentencias de la Corte Constitucional (binding)
2. Jurisprudencia vinculante CNJ (triple reiteration)
3. Resoluciones obligatorias
4. Precedentes persuasivos

ANALYSIS FOCUS:
- Ratio decidendi vs obiter dicta
- Binding effects (erga omnes, inter partes)
- Evolution of interpretation
- Dissenting opinions if relevant

OUTPUT:
{
  "precedents": [
    {
      "case": "Case number and name",
      "court": "Issuing court",
      "date": "Decision date",
      "binding": boolean,
      "principle": "Legal principle established",
      "facts": "Key facts",
      "holding": "Court's decision",
      "rationale": "Reasoning",
      "scope": "Who it affects"
    }
  ],
  "evolution": "How interpretation has changed",
  "currentState": "Present interpretation",
  "applicability": "How it applies to query",
  "conflictingViews": ["Different interpretations"],
  "recommendation": "Suggested application"
}`;
```

---

## Sample Query Transformations

### Example 1: Constitutional Rights Query
**Input:** "¿Cuáles son mis derechos si me detienen?"

**Transformation:**
```json
{
  "filters": {
    "normType": ["constitution", "criminal_code", "procedural_code"],
    "jurisdiction": ["national"],
    "legalAreas": ["constitutional", "criminal", "procedural"]
  },
  "entities": [
    {
      "type": "constitutional_right",
      "value": "Derechos de Protección",
      "confidence": 0.9
    },
    {
      "type": "constitutional_article",
      "value": "Constitución 2008, Art. 77",
      "confidence": 0.95
    },
    {
      "type": "criminal_code_article",
      "value": "COIP, Arts. 530-532",
      "confidence": 0.85
    }
  ],
  "keywords": ["detención", "derechos", "arresto", "garantías", "debido proceso"],
  "intent": "rights_verification",
  "urgency": "high",
  "requiresUpdate": false,
  "confidence": 0.92
}
```

### Example 2: Labor Law Query
**Input:** "Necesito saber sobre el despido intempestivo y la indemnización"

**Transformation:**
```json
{
  "filters": {
    "normType": ["labor_code", "ordinary_law"],
    "jurisdiction": ["national"],
    "legalAreas": ["labor"]
  },
  "entities": [
    {
      "type": "labor_code_article",
      "value": "Código del Trabajo, Art. 188",
      "confidence": 0.95
    },
    {
      "type": "legal_concept",
      "value": "Despido Intempestivo",
      "confidence": 1.0
    }
  ],
  "keywords": ["despido", "intempestivo", "indemnización", "laboral", "compensación"],
  "intent": "compliance",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.94
}
```

### Example 3: Environmental Rights Query
**Input:** "¿Puede la naturaleza demandar en Ecuador?"

**Transformation:**
```json
{
  "filters": {
    "normType": ["constitution", "organic_law"],
    "jurisdiction": ["national"],
    "legalAreas": ["constitutional", "environmental"]
  },
  "entities": [
    {
      "type": "constitutional_right",
      "value": "Derechos de la Naturaleza",
      "confidence": 1.0
    },
    {
      "type": "constitutional_article",
      "value": "Constitución 2008, Arts. 71-74",
      "confidence": 0.95
    }
  ],
  "keywords": ["naturaleza", "derechos", "Pachamama", "legitimación", "activa"],
  "intent": "research",
  "urgency": "low",
  "requiresUpdate": false,
  "confidence": 0.96
}
```

### Example 4: Business Registration Query
**Input:** "Pasos para constituir una compañía limitada en Quito"

**Transformation:**
```json
{
  "filters": {
    "normType": ["ordinary_law", "regulation", "ordinance"],
    "jurisdiction": ["national", "cantonal"],
    "legalAreas": ["commercial", "administrative"],
    "dateRange": {
      "from": "2020-01-01",
      "to": "2024-12-31"
    }
  },
  "entities": [
    {
      "type": "ordinary_law",
      "value": "Ley de Compañías",
      "confidence": 0.95
    },
    {
      "type": "executive_institution",
      "value": "Superintendencia de Compañías",
      "confidence": 0.9
    }
  ],
  "keywords": ["compañía", "limitada", "constitución", "societaria", "Quito"],
  "intent": "procedure",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.91
}
```

### Example 5: Criminal Procedure Query
**Input:** "¿Cuánto tiempo tengo para apelar una sentencia penal?"

**Transformation:**
```json
{
  "filters": {
    "normType": ["criminal_code", "procedural_code"],
    "jurisdiction": ["national"],
    "legalAreas": ["criminal", "procedural"]
  },
  "entities": [
    {
      "type": "procedural_term",
      "value": "Apelación",
      "confidence": 1.0
    },
    {
      "type": "criminal_code_article",
      "value": "COIP, Art. 653",
      "confidence": 0.9
    },
    {
      "type": "procedural_code_article",
      "value": "COGEP, Arts. 256-257",
      "confidence": 0.85
    }
  ],
  "keywords": ["apelación", "plazo", "sentencia", "penal", "recurso"],
  "intent": "procedure",
  "urgency": "high",
  "requiresUpdate": false,
  "confidence": 0.93
}
```

### Example 6: Indigenous Rights Query
**Input:** "Justicia indígena y su reconocimiento constitucional"

**Transformation:**
```json
{
  "filters": {
    "normType": ["constitution", "organic_law"],
    "jurisdiction": ["national"],
    "legalAreas": ["constitutional", "indigenous"]
  },
  "entities": [
    {
      "type": "constitutional_article",
      "value": "Constitución 2008, Art. 171",
      "confidence": 0.95
    },
    {
      "type": "legal_principle",
      "value": "Pluralismo Jurídico",
      "confidence": 0.9
    },
    {
      "type": "constitutional_right",
      "value": "Derechos Colectivos",
      "confidence": 0.9
    }
  ],
  "keywords": ["justicia", "indígena", "ancestral", "plurinacional", "interculturalidad"],
  "intent": "research",
  "urgency": "low",
  "requiresUpdate": false,
  "confidence": 0.94
}
```

### Example 7: Tax Query
**Input:** "IVA para servicios digitales desde el exterior"

**Transformation:**
```json
{
  "filters": {
    "normType": ["ordinary_law", "regulation", "resolution"],
    "jurisdiction": ["national"],
    "legalAreas": ["tax", "commercial"],
    "dateRange": {
      "from": "2020-01-01",
      "to": "2024-12-31"
    }
  },
  "entities": [
    {
      "type": "ordinary_law",
      "value": "Ley de Régimen Tributario Interno",
      "confidence": 0.9
    },
    {
      "type": "executive_institution",
      "value": "Servicio de Rentas Internas",
      "confidence": 0.95
    }
  ],
  "keywords": ["IVA", "servicios", "digitales", "exterior", "impuesto", "valor agregado"],
  "intent": "compliance",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.88
}
```

### Example 8: Family Law Query
**Input:** "Pensión alimenticia mínima para dos hijos"

**Transformation:**
```json
{
  "filters": {
    "normType": ["civil_code", "ordinary_law", "resolution"],
    "jurisdiction": ["national"],
    "legalAreas": ["family", "civil"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  },
  "entities": [
    {
      "type": "legal_concept",
      "value": "Pensión Alimenticia",
      "confidence": 1.0
    },
    {
      "type": "civil_code_article",
      "value": "Código de la Niñez y Adolescencia",
      "confidence": 0.9
    },
    {
      "type": "executive_institution",
      "value": "Consejo de la Judicatura",
      "confidence": 0.85
    }
  ],
  "keywords": ["pensión", "alimenticia", "hijos", "tabla", "mínima", "manutención"],
  "intent": "consultation",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.92
}
```

### Example 9: Property Law Query
**Input:** "Requisitos prescripción extraordinaria adquisitiva de dominio"

**Transformation:**
```json
{
  "filters": {
    "normType": ["civil_code", "procedural_code"],
    "jurisdiction": ["national"],
    "legalAreas": ["civil", "property"]
  },
  "entities": [
    {
      "type": "civil_code_article",
      "value": "Código Civil, Arts. 2410-2413",
      "confidence": 0.9
    },
    {
      "type": "legal_concept",
      "value": "Prescripción Adquisitiva Extraordinaria",
      "confidence": 1.0
    },
    {
      "type": "procedural_code_article",
      "value": "COGEP, Arts. 326-328",
      "confidence": 0.85
    }
  ],
  "keywords": ["prescripción", "extraordinaria", "adquisitiva", "dominio", "usucapión", "posesión"],
  "intent": "procedure",
  "urgency": "low",
  "requiresUpdate": false,
  "confidence": 0.91
}
```

### Example 10: Constitutional Action Query
**Input:** "Cómo presentar una acción de protección"

**Transformation:**
```json
{
  "filters": {
    "normType": ["constitution", "organic_law"],
    "jurisdiction": ["national"],
    "legalAreas": ["constitutional", "procedural"]
  },
  "entities": [
    {
      "type": "jurisdictional_guarantee",
      "value": "Acción de Protección",
      "confidence": 1.0
    },
    {
      "type": "constitutional_article",
      "value": "Constitución 2008, Art. 88",
      "confidence": 0.95
    },
    {
      "type": "organic_law",
      "value": "LOGJCC, Arts. 39-42",
      "confidence": 0.9
    }
  ],
  "keywords": ["acción", "protección", "garantía", "jurisdiccional", "amparo"],
  "intent": "procedure",
  "urgency": "high",
  "requiresUpdate": false,
  "confidence": 0.94
}
```

### Example 11: Administrative Query
**Input:** "Plazo para recurso administrativo en el sector público"

**Transformation:**
```json
{
  "filters": {
    "normType": ["administrative_code", "organic_law"],
    "jurisdiction": ["national"],
    "legalAreas": ["administrative"]
  },
  "entities": [
    {
      "type": "administrative_code_article",
      "value": "COA, Arts. 219-224",
      "confidence": 0.9
    },
    {
      "type": "procedural_term",
      "value": "Recurso Administrativo",
      "confidence": 1.0
    }
  ],
  "keywords": ["recurso", "administrativo", "plazo", "impugnación", "sector público"],
  "intent": "procedure",
  "urgency": "high",
  "requiresUpdate": false,
  "confidence": 0.92
}
```

### Example 12: Consumer Rights Query
**Input:** "Derechos del consumidor en compras online"

**Transformation:**
```json
{
  "filters": {
    "normType": ["organic_law", "regulation"],
    "jurisdiction": ["national"],
    "legalAreas": ["consumer", "commercial"],
    "dateRange": {
      "from": "2020-01-01",
      "to": "2024-12-31"
    }
  },
  "entities": [
    {
      "type": "organic_law",
      "value": "Ley Orgánica de Defensa del Consumidor",
      "confidence": 0.95
    },
    {
      "type": "legal_concept",
      "value": "Comercio Electrónico",
      "confidence": 0.9
    }
  ],
  "keywords": ["consumidor", "compras", "online", "comercio electrónico", "derechos"],
  "intent": "rights_verification",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.91
}
```

### Example 13: Healthcare Rights Query
**Input:** "Acceso gratuito a medicinas en el IESS"

**Transformation:**
```json
{
  "filters": {
    "normType": ["constitution", "organic_law", "regulation"],
    "jurisdiction": ["national"],
    "legalAreas": ["social_security", "health"]
  },
  "entities": [
    {
      "type": "constitutional_right",
      "value": "Derecho a la Salud",
      "confidence": 0.9
    },
    {
      "type": "executive_institution",
      "value": "Instituto Ecuatoriano de Seguridad Social",
      "confidence": 1.0
    },
    {
      "type": "constitutional_article",
      "value": "Constitución 2008, Art. 32",
      "confidence": 0.85
    }
  ],
  "keywords": ["IESS", "medicinas", "gratuito", "salud", "seguridad social"],
  "intent": "rights_verification",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.93
}
```

### Example 14: Electoral Law Query
**Input:** "Requisitos para ser candidato a alcalde"

**Transformation:**
```json
{
  "filters": {
    "normType": ["constitution", "organic_law"],
    "jurisdiction": ["national", "cantonal"],
    "legalAreas": ["electoral", "constitutional"]
  },
  "entities": [
    {
      "type": "organic_law",
      "value": "Código de la Democracia",
      "confidence": 0.95
    },
    {
      "type": "autonomous_institution",
      "value": "Consejo Nacional Electoral",
      "confidence": 0.9
    }
  ],
  "keywords": ["candidato", "alcalde", "requisitos", "elección", "cantonal"],
  "intent": "procedure",
  "urgency": "low",
  "requiresUpdate": true,
  "confidence": 0.92
}
```

### Example 15: Data Protection Query
**Input:** "Habeas data para corrección de información crediticia"

**Transformation:**
```json
{
  "filters": {
    "normType": ["constitution", "organic_law"],
    "jurisdiction": ["national"],
    "legalAreas": ["constitutional", "data_protection"]
  },
  "entities": [
    {
      "type": "jurisdictional_guarantee",
      "value": "Hábeas Data",
      "confidence": 1.0
    },
    {
      "type": "constitutional_article",
      "value": "Constitución 2008, Art. 92",
      "confidence": 0.95
    },
    {
      "type": "organic_law",
      "value": "Ley Orgánica de Protección de Datos Personales",
      "confidence": 0.9
    }
  ],
  "keywords": ["habeas data", "información", "crediticia", "corrección", "datos personales"],
  "intent": "procedure",
  "urgency": "medium",
  "requiresUpdate": false,
  "confidence": 0.94
}
```

### Example 16: Public Procurement Query
**Input:** "Montos contratación pública para ínfima cuantía 2024"

**Transformation:**
```json
{
  "filters": {
    "normType": ["organic_law", "regulation", "resolution"],
    "jurisdiction": ["national"],
    "legalAreas": ["administrative", "public_procurement"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  },
  "entities": [
    {
      "type": "organic_law",
      "value": "Ley Orgánica del Sistema Nacional de Contratación Pública",
      "confidence": 0.95
    },
    {
      "type": "executive_institution",
      "value": "SERCOP",
      "confidence": 0.9
    }
  ],
  "keywords": ["contratación pública", "ínfima cuantía", "montos", "2024", "SERCOP"],
  "intent": "compliance",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.93
}
```

### Example 17: Education Rights Query
**Input:** "Gratuidad universitaria tercer nivel constitución"

**Transformation:**
```json
{
  "filters": {
    "normType": ["constitution", "organic_law"],
    "jurisdiction": ["national"],
    "legalAreas": ["constitutional", "education"]
  },
  "entities": [
    {
      "type": "constitutional_article",
      "value": "Constitución 2008, Art. 356",
      "confidence": 0.9
    },
    {
      "type": "organic_law",
      "value": "LOES",
      "confidence": 0.95
    },
    {
      "type": "constitutional_right",
      "value": "Derecho a la Educación",
      "confidence": 0.9
    }
  ],
  "keywords": ["gratuidad", "universitaria", "tercer nivel", "educación superior"],
  "intent": "rights_verification",
  "urgency": "low",
  "requiresUpdate": false,
  "confidence": 0.92
}
```

### Example 18: Traffic Law Query
**Input:** "Multa por exceso de velocidad en zona urbana"

**Transformation:**
```json
{
  "filters": {
    "normType": ["organic_law", "regulation"],
    "jurisdiction": ["national"],
    "legalAreas": ["traffic", "administrative"],
    "dateRange": {
      "from": "2023-01-01",
      "to": "2024-12-31"
    }
  },
  "entities": [
    {
      "type": "organic_law",
      "value": "Ley Orgánica de Transporte Terrestre",
      "confidence": 0.95
    },
    {
      "type": "executive_institution",
      "value": "Agencia Nacional de Tránsito",
      "confidence": 0.9
    }
  ],
  "keywords": ["multa", "velocidad", "zona urbana", "tránsito", "infracción"],
  "intent": "compliance",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.91
}
```

### Example 19: Intellectual Property Query
**Input:** "Registro de marca SENADI requisitos"

**Transformation:**
```json
{
  "filters": {
    "normType": ["organic_law", "regulation"],
    "jurisdiction": ["national"],
    "legalAreas": ["intellectual_property", "commercial"]
  },
  "entities": [
    {
      "type": "organic_law",
      "value": "Código Orgánico de la Economía Social de los Conocimientos",
      "confidence": 0.9
    },
    {
      "type": "executive_institution",
      "value": "SENADI",
      "confidence": 1.0
    }
  ],
  "keywords": ["registro", "marca", "SENADI", "propiedad intelectual", "requisitos"],
  "intent": "procedure",
  "urgency": "low",
  "requiresUpdate": true,
  "confidence": 0.93
}
```

### Example 20: Social Security Query
**Input:** "Jubilación por vejez requisitos IESS 2024"

**Transformation:**
```json
{
  "filters": {
    "normType": ["organic_law", "resolution"],
    "jurisdiction": ["national"],
    "legalAreas": ["social_security", "labor"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  },
  "entities": [
    {
      "type": "ordinary_law",
      "value": "Ley de Seguridad Social",
      "confidence": 0.95
    },
    {
      "type": "executive_institution",
      "value": "Instituto Ecuatoriano de Seguridad Social",
      "confidence": 1.0
    }
  ],
  "keywords": ["jubilación", "vejez", "IESS", "requisitos", "pensión", "2024"],
  "intent": "procedure",
  "urgency": "medium",
  "requiresUpdate": true,
  "confidence": 0.94
}
```

---

## Performance Optimizations

### 1. Caching Strategy

```typescript
// src/services/legal-entities/cache.service.ts

import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

export class EntityCacheService {
  private entityCache: LRUCache<string, EntityExtractionResult[]>;
  private normalizationCache: LRUCache<string, string>;
  private patternCache: Map<string, RegExp>;

  constructor() {
    // Entity extraction cache - 10MB max
    this.entityCache = new LRUCache({
      max: 10000,
      maxSize: 10 * 1024 * 1024,
      sizeCalculation: (value) => JSON.stringify(value).length,
      ttl: 1000 * 60 * 60 * 24, // 24 hours
    });

    // Normalization cache - 5MB max
    this.normalizationCache = new LRUCache({
      max: 50000,
      maxSize: 5 * 1024 * 1024,
      sizeCalculation: (value) => value.length,
      ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    // Compiled regex pattern cache
    this.patternCache = new Map();
  }

  getCachedExtraction(text: string): EntityExtractionResult[] | null {
    const key = this.generateKey(text);
    return this.entityCache.get(key) || null;
  }

  cacheExtraction(text: string, results: EntityExtractionResult[]): void {
    const key = this.generateKey(text);
    this.entityCache.set(key, results);
  }

  getCachedNormalization(entity: string, type: string): string | null {
    const key = `${type}:${entity}`;
    return this.normalizationCache.get(key) || null;
  }

  cacheNormalization(entity: string, type: string, normalized: string): void {
    const key = `${type}:${entity}`;
    this.normalizationCache.set(key, normalized);
  }

  getCompiledPattern(pattern: string): RegExp {
    if (!this.patternCache.has(pattern)) {
      this.patternCache.set(pattern, new RegExp(pattern, 'gi'));
    }
    return this.patternCache.get(pattern)!;
  }

  private generateKey(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }

  clearCache(): void {
    this.entityCache.clear();
    this.normalizationCache.clear();
  }

  getStats() {
    return {
      entityCache: {
        size: this.entityCache.size,
        calculatedSize: this.entityCache.calculatedSize,
        hitRate: this.calculateHitRate(this.entityCache),
      },
      normalizationCache: {
        size: this.normalizationCache.size,
        calculatedSize: this.normalizationCache.calculatedSize,
      },
      patternCache: {
        size: this.patternCache.size,
      },
    };
  }

  private calculateHitRate(cache: LRUCache<any, any>): number {
    // Implementation depends on tracking hits/misses
    return 0; // Placeholder
  }
}
```

### 2. Batch Processing

```typescript
// src/services/legal-entities/batch-processor.ts

export class BatchEntityProcessor {
  private batchSize = 100;
  private concurrency = 4;

  async processBatch(
    texts: string[],
    processor: (text: string) => Promise<EntityExtractionResult[]>
  ): Promise<Map<string, EntityExtractionResult[]>> {
    const results = new Map<string, EntityExtractionResult[]>();

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      // Process batch with controlled concurrency
      const batchResults = await this.processWithConcurrency(
        batch,
        processor,
        this.concurrency
      );

      // Store results
      batch.forEach((text, index) => {
        results.set(text, batchResults[index]);
      });
    }

    return results;
  }

  private async processWithConcurrency<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    concurrency: number
  ): Promise<any[]> {
    const results: any[] = new Array(items.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const promise = processor(items[i]).then(result => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }
}
```

### 3. Index Optimization

```typescript
// src/services/legal-entities/index.service.ts

export class EntityIndexService {
  private invertedIndex: Map<string, Set<string>> = new Map();
  private trigramIndex: Map<string, Set<string>> = new Map();
  private prefixTree: PrefixTree = new PrefixTree();

  buildIndex(entities: Map<string, LegalEntity>): void {
    entities.forEach((entity, id) => {
      // Build inverted index
      this.indexEntity(id, entity);

      // Build trigram index for fuzzy search
      this.buildTrigramIndex(id, entity);

      // Build prefix tree for autocomplete
      this.buildPrefixTree(id, entity);
    });
  }

  private indexEntity(id: string, entity: LegalEntity): void {
    // Index display name
    this.addToInvertedIndex(entity.displayName.toLowerCase(), id);

    // Index synonyms
    entity.synonyms?.forEach(synonym => {
      this.addToInvertedIndex(synonym.toLowerCase(), id);
    });

    // Index abbreviations
    entity.abbreviations?.forEach(abbr => {
      this.addToInvertedIndex(abbr.toLowerCase(), id);
    });

    // Index context keywords
    entity.contextKeywords?.forEach(keyword => {
      this.addToInvertedIndex(keyword.toLowerCase(), id);
    });
  }

  private addToInvertedIndex(term: string, entityId: string): void {
    if (!this.invertedIndex.has(term)) {
      this.invertedIndex.set(term, new Set());
    }
    this.invertedIndex.get(term)!.add(entityId);
  }

  private buildTrigramIndex(id: string, entity: LegalEntity): void {
    const text = entity.displayName.toLowerCase();
    const trigrams = this.generateTrigrams(text);

    trigrams.forEach(trigram => {
      if (!this.trigramIndex.has(trigram)) {
        this.trigramIndex.set(trigram, new Set());
      }
      this.trigramIndex.get(trigram)!.add(id);
    });
  }

  private generateTrigrams(text: string): Set<string> {
    const trigrams = new Set<string>();
    const padded = `  ${text}  `;

    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }

    return trigrams;
  }

  private buildPrefixTree(id: string, entity: LegalEntity): void {
    this.prefixTree.insert(entity.displayName.toLowerCase(), id);
    entity.synonyms?.forEach(synonym => {
      this.prefixTree.insert(synonym.toLowerCase(), id);
    });
  }

  search(query: string): Set<string> {
    const normalizedQuery = query.toLowerCase();
    const results = new Set<string>();

    // Exact match
    const exactMatches = this.invertedIndex.get(normalizedQuery);
    if (exactMatches) {
      exactMatches.forEach(id => results.add(id));
    }

    // Prefix match
    const prefixMatches = this.prefixTree.search(normalizedQuery);
    prefixMatches.forEach(id => results.add(id));

    // Fuzzy match using trigrams
    if (results.size === 0) {
      const queryTrigrams = this.generateTrigrams(normalizedQuery);
      const candidates = new Map<string, number>();

      queryTrigrams.forEach(trigram => {
        const matches = this.trigramIndex.get(trigram);
        if (matches) {
          matches.forEach(id => {
            candidates.set(id, (candidates.get(id) || 0) + 1);
          });
        }
      });

      // Get top candidates with similarity > 0.6
      const threshold = queryTrigrams.size * 0.6;
      candidates.forEach((score, id) => {
        if (score >= threshold) {
          results.add(id);
        }
      });
    }

    return results;
  }
}

class PrefixTree {
  private root: TrieNode = new TrieNode();

  insert(word: string, entityId: string): void {
    let node = this.root;

    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }

    node.isEndOfWord = true;
    node.entityIds.add(entityId);
  }

  search(prefix: string): Set<string> {
    let node = this.root;

    for (const char of prefix) {
      if (!node.children.has(char)) {
        return new Set();
      }
      node = node.children.get(char)!;
    }

    return this.collectAllEntityIds(node);
  }

  private collectAllEntityIds(node: TrieNode): Set<string> {
    const results = new Set<string>(node.entityIds);

    node.children.forEach(child => {
      this.collectAllEntityIds(child).forEach(id => results.add(id));
    });

    return results;
  }
}

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  entityIds: Set<string> = new Set();
}
```

### 4. Parallel Processing

```typescript
// src/services/legal-entities/parallel-processor.ts

import { Worker } from 'worker_threads';
import { cpus } from 'os';

export class ParallelEntityProcessor {
  private workers: Worker[] = [];
  private workerPool: WorkerPool;

  constructor() {
    const numWorkers = Math.max(1, cpus().length - 1);
    this.workerPool = new WorkerPool(numWorkers);
  }

  async processParallel(
    texts: string[],
    entityDictionary: any
  ): Promise<EntityExtractionResult[][]> {
    // Split texts into chunks for parallel processing
    const chunks = this.splitIntoChunks(texts, this.workerPool.size);

    // Process chunks in parallel
    const promises = chunks.map(chunk =>
      this.workerPool.execute({
        texts: chunk,
        dictionary: entityDictionary
      })
    );

    const results = await Promise.all(promises);

    // Flatten results
    return results.flat();
  }

  private splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    const itemsPerChunk = Math.ceil(array.length / chunkSize);

    for (let i = 0; i < array.length; i += itemsPerChunk) {
      chunks.push(array.slice(i, i + itemsPerChunk));
    }

    return chunks;
  }

  async shutdown(): Promise<void> {
    await this.workerPool.shutdown();
  }
}

class WorkerPool {
  private workers: Worker[] = [];
  private freeWorkers: Worker[] = [];
  private queue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    data: any;
  }> = [];

  constructor(public readonly size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker('./entity-worker.js');
      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  execute(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = this.freeWorkers.pop();

      if (worker) {
        this.runWorker(worker, data, resolve, reject);
      } else {
        this.queue.push({ resolve, reject, data });
      }
    });
  }

  private runWorker(
    worker: Worker,
    data: any,
    resolve: (value: any) => void,
    reject: (error: any) => void
  ): void {
    worker.once('message', (result) => {
      resolve(result);
      this.releaseWorker(worker);
    });

    worker.once('error', (error) => {
      reject(error);
      this.releaseWorker(worker);
    });

    worker.postMessage(data);
  }

  private releaseWorker(worker: Worker): void {
    const queued = this.queue.shift();

    if (queued) {
      this.runWorker(worker, queued.data, queued.resolve, queued.reject);
    } else {
      this.freeWorkers.push(worker);
    }
  }

  async shutdown(): Promise<void> {
    await Promise.all(
      this.workers.map(worker => worker.terminate())
    );
  }
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
1. Set up TypeScript interfaces and types
2. Implement basic entity dictionary structure
3. Create pattern matching engine
4. Build normalization system

### Phase 2: Entity Extraction (Week 2-3)
1. Implement all entity patterns
2. Create extraction pipeline
3. Add confidence scoring
4. Build validation system

### Phase 3: Prompt Engineering (Week 3-4)
1. Implement all prompt templates
2. Create prompt selection logic
3. Add context injection system
4. Build response formatting

### Phase 4: Performance Optimization (Week 4-5)
1. Implement caching layers
2. Add batch processing
3. Create indexing system
4. Enable parallel processing

### Phase 5: Testing & Refinement (Week 5-6)
1. Unit tests for entity extraction
2. Integration tests for prompts
3. Performance benchmarking
4. Edge case handling

### Phase 6: Documentation & Deployment (Week 6)
1. API documentation
2. Usage examples
3. Performance metrics
4. Deployment scripts

## Success Metrics

1. **Entity Recognition Accuracy**: >95% for common entities
2. **Processing Speed**: <100ms for typical queries
3. **Cache Hit Rate**: >80% for repeated queries
4. **Memory Usage**: <500MB for full dictionary
5. **Prompt Effectiveness**: >90% correct intent classification

## Conclusion

This comprehensive legal entity dictionary and context prompt system provides a robust foundation for understanding and processing Ecuadorian legal queries. The system combines deep knowledge of Ecuador's legal framework with advanced NLP techniques to deliver accurate, contextual responses.

The implementation focuses on performance, accuracy, and maintainability, ensuring the system can scale to handle production workloads while remaining flexible enough to adapt to changes in the legal landscape.