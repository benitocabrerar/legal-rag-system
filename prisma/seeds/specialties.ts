import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ecuador's Legal System Hierarchy
const legalSpecialties = [
  // 1. DERECHO PÚBLICO
  {
    code: 'DP',
    name: 'Derecho Público',
    nameEnglish: 'Public Law',
    description: 'Regula las relaciones entre el Estado y los particulares, y la organización y funcionamiento del Estado.',
    level: 1,
    displayOrder: 1,
    icon: 'scale',
    color: '#3B82F6',
    children: [
      {
        code: 'DP-CONST',
        name: 'Derecho Constitucional',
        nameEnglish: 'Constitutional Law',
        description: 'Estudia la Constitución y los derechos fundamentales.',
        level: 2,
        displayOrder: 1,
        icon: 'book-law',
        color: '#2563EB',
      },
      {
        code: 'DP-ADM',
        name: 'Derecho Administrativo',
        nameEnglish: 'Administrative Law',
        description: 'Regula la organización y funcionamiento de la administración pública.',
        level: 2,
        displayOrder: 2,
        icon: 'building',
        color: '#1D4ED8',
      },
      {
        code: 'DP-PENAL',
        name: 'Derecho Penal',
        nameEnglish: 'Criminal Law',
        description: 'Regula los delitos, penas y medidas de seguridad.',
        level: 2,
        displayOrder: 3,
        icon: 'gavel',
        color: '#DC2626',
        children: [
          {
            code: 'DP-PENAL-GEN',
            name: 'Derecho Penal General',
            description: 'Teoría del delito, penas y medidas de seguridad.',
            level: 3,
            displayOrder: 1,
          },
          {
            code: 'DP-PENAL-ESP',
            name: 'Derecho Penal Especial',
            description: 'Delitos específicos y sus sanciones.',
            level: 3,
            displayOrder: 2,
          },
          {
            code: 'DP-PENAL-PROC',
            name: 'Derecho Procesal Penal',
            description: 'Procedimientos penales y garantías procesales.',
            level: 3,
            displayOrder: 3,
          },
        ],
      },
      {
        code: 'DP-TRIB',
        name: 'Derecho Tributario',
        nameEnglish: 'Tax Law',
        description: 'Regula la relación jurídica entre el Estado y los contribuyentes.',
        level: 2,
        displayOrder: 4,
        icon: 'receipt',
        color: '#16A34A',
        children: [
          {
            code: 'DP-TRIB-MAT',
            name: 'Derecho Tributario Material',
            description: 'Obligaciones tributarias y sus elementos.',
            level: 3,
            displayOrder: 1,
          },
          {
            code: 'DP-TRIB-PROC',
            name: 'Derecho Tributario Procesal',
            description: 'Procedimientos tributarios y contencioso tributario.',
            level: 3,
            displayOrder: 2,
          },
        ],
      },
      {
        code: 'DP-INT',
        name: 'Derecho Internacional Público',
        nameEnglish: 'Public International Law',
        description: 'Regula las relaciones entre Estados y organizaciones internacionales.',
        level: 2,
        displayOrder: 5,
        icon: 'globe',
        color: '#0891B2',
      },
      {
        code: 'DP-ELEC',
        name: 'Derecho Electoral',
        nameEnglish: 'Electoral Law',
        description: 'Regula los procesos electorales y participación ciudadana.',
        level: 2,
        displayOrder: 6,
        icon: 'vote',
        color: '#7C3AED',
      },
    ],
  },

  // 2. DERECHO PRIVADO
  {
    code: 'DPRIV',
    name: 'Derecho Privado',
    nameEnglish: 'Private Law',
    description: 'Regula las relaciones entre particulares.',
    level: 1,
    displayOrder: 2,
    icon: 'users',
    color: '#8B5CF6',
    children: [
      {
        code: 'DPRIV-CIVIL',
        name: 'Derecho Civil',
        nameEnglish: 'Civil Law',
        description: 'Regula las relaciones privadas entre personas.',
        level: 2,
        displayOrder: 1,
        icon: 'user-check',
        color: '#7C3AED',
        children: [
          {
            code: 'DPRIV-CIVIL-PERS',
            name: 'Derecho de las Personas',
            description: 'Personalidad jurídica, capacidad, estado civil.',
            level: 3,
            displayOrder: 1,
          },
          {
            code: 'DPRIV-CIVIL-FAM',
            name: 'Derecho de Familia',
            description: 'Matrimonio, divorcio, filiación, patria potestad.',
            level: 3,
            displayOrder: 2,
          },
          {
            code: 'DPRIV-CIVIL-BIENES',
            name: 'Derecho de Bienes',
            description: 'Propiedad, posesión, derechos reales.',
            level: 3,
            displayOrder: 3,
          },
          {
            code: 'DPRIV-CIVIL-OBLIG',
            name: 'Derecho de Obligaciones',
            description: 'Contratos, fuentes de obligaciones.',
            level: 3,
            displayOrder: 4,
          },
          {
            code: 'DPRIV-CIVIL-SUC',
            name: 'Derecho de Sucesiones',
            description: 'Herencia, testamentos, legados.',
            level: 3,
            displayOrder: 5,
          },
        ],
      },
      {
        code: 'DPRIV-COM',
        name: 'Derecho Comercial',
        nameEnglish: 'Commercial Law',
        description: 'Regula las actividades comerciales y empresariales.',
        level: 2,
        displayOrder: 2,
        icon: 'briefcase',
        color: '#6366F1',
        children: [
          {
            code: 'DPRIV-COM-SOC',
            name: 'Derecho Societario',
            description: 'Sociedades mercantiles y su funcionamiento.',
            level: 3,
            displayOrder: 1,
          },
          {
            code: 'DPRIV-COM-CAMB',
            name: 'Derecho Cambiario',
            description: 'Títulos valores, letras de cambio, pagarés.',
            level: 3,
            displayOrder: 2,
          },
          {
            code: 'DPRIV-COM-CONC',
            name: 'Derecho Concursal',
            description: 'Insolvencia, quiebras, reorganización empresarial.',
            level: 3,
            displayOrder: 3,
          },
        ],
      },
      {
        code: 'DPRIV-LAB',
        name: 'Derecho Laboral',
        nameEnglish: 'Labor Law',
        description: 'Regula las relaciones entre empleadores y trabajadores.',
        level: 2,
        displayOrder: 3,
        icon: 'hard-hat',
        color: '#EF4444',
        children: [
          {
            code: 'DPRIV-LAB-IND',
            name: 'Derecho Laboral Individual',
            description: 'Contrato de trabajo, derechos y obligaciones.',
            level: 3,
            displayOrder: 1,
          },
          {
            code: 'DPRIV-LAB-COL',
            name: 'Derecho Laboral Colectivo',
            description: 'Sindicatos, negociación colectiva, huelga.',
            level: 3,
            displayOrder: 2,
          },
          {
            code: 'DPRIV-LAB-SEG',
            name: 'Seguridad Social',
            description: 'IESS, prestaciones sociales, riesgos del trabajo.',
            level: 3,
            displayOrder: 3,
          },
        ],
      },
      {
        code: 'DPRIV-INTPRIV',
        name: 'Derecho Internacional Privado',
        nameEnglish: 'Private International Law',
        description: 'Regula las relaciones privadas con elemento extranjero.',
        level: 2,
        displayOrder: 4,
        icon: 'globe-2',
        color: '#14B8A6',
      },
    ],
  },

  // 3. DERECHO SOCIAL
  {
    code: 'DSOC',
    name: 'Derecho Social',
    nameEnglish: 'Social Law',
    description: 'Derechos colectivos y protección de grupos vulnerables.',
    level: 1,
    displayOrder: 3,
    icon: 'heart-handshake',
    color: '#F59E0B',
    children: [
      {
        code: 'DSOC-AMB',
        name: 'Derecho Ambiental',
        nameEnglish: 'Environmental Law',
        description: 'Protección del medio ambiente y recursos naturales.',
        level: 2,
        displayOrder: 1,
        icon: 'leaf',
        color: '#10B981',
      },
      {
        code: 'DSOC-CONS',
        name: 'Derecho del Consumidor',
        nameEnglish: 'Consumer Law',
        description: 'Protección de los derechos de consumidores y usuarios.',
        level: 2,
        displayOrder: 2,
        icon: 'shopping-cart',
        color: '#F97316',
      },
      {
        code: 'DSOC-NINEZ',
        name: 'Derecho de la Niñez y Adolescencia',
        nameEnglish: 'Children and Adolescent Law',
        description: 'Protección de derechos de niños, niñas y adolescentes.',
        level: 2,
        displayOrder: 3,
        icon: 'baby',
        color: '#EC4899',
      },
      {
        code: 'DSOC-GEN',
        name: 'Derecho de Género',
        nameEnglish: 'Gender Law',
        description: 'Igualdad de género y no discriminación.',
        level: 2,
        displayOrder: 4,
        icon: 'user-equal',
        color: '#A855F7',
      },
    ],
  },

  // 4. DERECHO PROCESAL
  {
    code: 'DPROC',
    name: 'Derecho Procesal',
    nameEnglish: 'Procedural Law',
    description: 'Normas que regulan los procesos judiciales.',
    level: 1,
    displayOrder: 4,
    icon: 'file-text',
    color: '#64748B',
    children: [
      {
        code: 'DPROC-CIV',
        name: 'Derecho Procesal Civil',
        nameEnglish: 'Civil Procedure',
        description: 'Procesos civiles y ejecución de sentencias.',
        level: 2,
        displayOrder: 1,
        icon: 'file-check',
        color: '#475569',
      },
      {
        code: 'DPROC-LAB',
        name: 'Derecho Procesal Laboral',
        nameEnglish: 'Labor Procedure',
        description: 'Procesos laborales y resolución de conflictos.',
        level: 2,
        displayOrder: 2,
        icon: 'briefcase-2',
        color: '#64748B',
      },
      {
        code: 'DPROC-ADM',
        name: 'Derecho Procesal Administrativo',
        nameEnglish: 'Administrative Procedure',
        description: 'Procesos contencioso administrativos.',
        level: 2,
        displayOrder: 3,
        icon: 'building-2',
        color: '#94A3B8',
      },
      {
        code: 'DPROC-CONST',
        name: 'Derecho Procesal Constitucional',
        nameEnglish: 'Constitutional Procedure',
        description: 'Garantías jurisdiccionales y control constitucional.',
        level: 2,
        displayOrder: 4,
        icon: 'shield-check',
        color: '#CBD5E1',
      },
    ],
  },

  // 5. OTRAS ESPECIALIDADES
  {
    code: 'OTROS',
    name: 'Otras Especialidades',
    nameEnglish: 'Other Specialties',
    description: 'Áreas emergentes y especializadas del derecho.',
    level: 1,
    displayOrder: 5,
    icon: 'sparkles',
    color: '#6366F1',
    children: [
      {
        code: 'OTROS-TEC',
        name: 'Derecho Tecnológico',
        nameEnglish: 'Technology Law',
        description: 'Protección de datos, ciberseguridad, comercio electrónico.',
        level: 2,
        displayOrder: 1,
        icon: 'cpu',
        color: '#8B5CF6',
      },
      {
        code: 'OTROS-PROP',
        name: 'Propiedad Intelectual',
        nameEnglish: 'Intellectual Property',
        description: 'Derechos de autor, patentes, marcas.',
        level: 2,
        displayOrder: 2,
        icon: 'lightbulb',
        color: '#A855F7',
      },
      {
        code: 'OTROS-COMP',
        name: 'Derecho de la Competencia',
        nameEnglish: 'Competition Law',
        description: 'Libre competencia y prácticas antimonopolio.',
        level: 2,
        displayOrder: 3,
        icon: 'trophy',
        color: '#C084FC',
      },
      {
        code: 'OTROS-ARB',
        name: 'Arbitraje y Mediación',
        nameEnglish: 'Arbitration and Mediation',
        description: 'Métodos alternativos de resolución de conflictos.',
        level: 2,
        displayOrder: 4,
        icon: 'handshake',
        color: '#D946EF',
      },
      {
        code: 'OTROS-NOTARIAL',
        name: 'Derecho Notarial y Registral',
        nameEnglish: 'Notarial and Registry Law',
        description: 'Actos notariales y registro de la propiedad.',
        level: 2,
        displayOrder: 5,
        icon: 'stamp',
        color: '#E879F9',
      },
    ],
  },
];

async function seedSpecialties() {
  console.log('🌱 Starting legal specialties seed...');

  // Function to create specialty and its children recursively
  async function createSpecialty(specialty: any, parentId: string | null = null) {
    const { children, ...specialtyData } = specialty;

    const created = await prisma.legalSpecialty.create({
      data: {
        ...specialtyData,
        parentId,
      },
    });

    console.log(`✅ Created: ${created.name} (${created.code})`);

    // Create children if they exist
    if (children && children.length > 0) {
      for (const child of children) {
        await createSpecialty(child, created.id);
      }
    }

    return created;
  }

  // Create all top-level specialties and their children
  for (const specialty of legalSpecialties) {
    await createSpecialty(specialty);
  }

  console.log('✅ Legal specialties seed completed!');
}

// Run seed
seedSpecialties()
  .catch((e) => {
    console.error('❌ Error seeding specialties:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
