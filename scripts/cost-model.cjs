/* eslint-disable */
/**
 * Poweria Legal — Modelo de costos y unit economics
 * ----------------------------------------------------------
 * Recalcula costos variables, fijos y márgenes para los tiers
 * propuestos. Ejecutar con:
 *   node scripts/cost-model.cjs
 *
 * Edita los objetos PRICES_USD y USAGE_PROFILE para hacer
 * análisis de sensibilidad. Todos los valores en USD.
 */

// =====================================================================
// 1) PRECIOS DE PROVEEDORES (verificados Q2 2026)
// =====================================================================
const PRICES_USD = {
  // OpenAI (https://openai.com/api/pricing/)
  openai: {
    gpt4o_input_per_1m: 2.50,
    gpt4o_output_per_1m: 10.00,
    gpt4o_mini_input_per_1m: 0.15,
    gpt4o_mini_output_per_1m: 0.60,
    embedding_small_per_1m: 0.02,    // text-embedding-3-small
    vision_per_image: 0.0130,         // ~1024x1024 high detail
  },
  // Anthropic (https://www.anthropic.com/pricing)
  anthropic: {
    sonnet46_input_per_1m: 3.00,
    sonnet46_output_per_1m: 15.00,
    haiku45_input_per_1m: 1.00,
    haiku45_output_per_1m: 5.00,
  },
  // Supabase Pro: $25/mo incluye 100K MAU, 8GB DB, 100GB storage, 250GB egress
  supabase: {
    pro_monthly: 25,
    extra_storage_per_gb: 0.021,
    extra_egress_per_gb: 0.09,
    extra_mau: 0.00325,
    extra_db_per_gb: 0.125,
  },
  // Vercel Pro: $20/mo por miembro, 1TB bandwidth, 1M edge requests
  vercel: {
    pro_monthly: 20,
    extra_bandwidth_per_gb: 0.40,
    extra_function_invocations_per_1m: 0.60,
  },
  // Render Standard ($25/mo, 2GB RAM, 1 CPU)
  render: {
    standard_monthly: 25,
    pro_monthly: 85, // 4GB RAM, 2 CPU
  },
  // Redis Cloud Fixed Plan
  redis: {
    starter_monthly: 7,    // 30MB, 30 conn
    standard_monthly: 30,  // 250MB, 100 conn
  },
  // Email: Resend
  resend: {
    pro_monthly: 20, // 50K emails
  },
  // Sentry Team
  sentry: {
    team_monthly: 26,
  },
  // Stripe (procesamiento de pagos LATAM)
  stripe: {
    pct_per_charge: 0.029,
    fixed_per_charge: 0.30,
  },
  // Dominio + Cloudflare + SSL
  domain_yearly: 25,   // .com + privacy
  cloudflare_pro: 25,  // opcional
};

// =====================================================================
// 2) PERFIL DE USO POR TIER (estimaciones conservadoras)
// =====================================================================
const USAGE_PROFILE = {
  free: {
    rag_queries: 30,             // queries / mes
    rag_input_tokens_avg: 2500,
    rag_output_tokens_avg: 600,
    doc_uploads: 3,              // docs procesados
    doc_pages_avg: 8,
    doc_input_tokens_per_page: 1200,  // texto extraído + prompt
    doc_output_tokens_avg: 1500,
    case_summaries: 1,
    summary_input_tokens: 12000,
    summary_output_tokens: 1800,
    vision_ocr_pages: 0,
    storage_gb: 0.5,
    egress_gb: 1,
    db_writes_per_day: 5,
  },
  starter: {
    rag_queries: 150,
    rag_input_tokens_avg: 3500,
    rag_output_tokens_avg: 800,
    doc_uploads: 20,
    doc_pages_avg: 12,
    doc_input_tokens_per_page: 1200,
    doc_output_tokens_avg: 1800,
    case_summaries: 6,
    summary_input_tokens: 18000,
    summary_output_tokens: 2000,
    vision_ocr_pages: 4,
    storage_gb: 2,
    egress_gb: 4,
    db_writes_per_day: 15,
  },
  pro: {
    rag_queries: 600,
    rag_input_tokens_avg: 4200,
    rag_output_tokens_avg: 1100,
    doc_uploads: 60,
    doc_pages_avg: 14,
    doc_input_tokens_per_page: 1200,
    doc_output_tokens_avg: 2000,
    case_summaries: 20,
    summary_input_tokens: 20000,
    summary_output_tokens: 2500,
    vision_ocr_pages: 18,
    storage_gb: 8,
    egress_gb: 12,
    db_writes_per_day: 60,
  },
  studio: {
    // CONSUMO TOTAL del equipo (5 usuarios compartiendo cuota)
    // No se multiplica por seats: el profile ya es agregado.
    rag_queries: 2000,
    rag_input_tokens_avg: 4500,
    rag_output_tokens_avg: 1200,
    doc_uploads: 200,
    doc_pages_avg: 16,
    doc_input_tokens_per_page: 1200,
    doc_output_tokens_avg: 2200,
    case_summaries: 70,
    summary_input_tokens: 22000,
    summary_output_tokens: 2800,
    vision_ocr_pages: 60,
    storage_gb: 25,
    egress_gb: 30,
    db_writes_per_day: 200,
  },
  enterprise: {
    // CONSUMO TOTAL (15 seats compartiendo)
    rag_queries: 5000,
    rag_input_tokens_avg: 5000,
    rag_output_tokens_avg: 1300,
    doc_uploads: 500,
    doc_pages_avg: 18,
    doc_input_tokens_per_page: 1200,
    doc_output_tokens_avg: 2400,
    case_summaries: 180,
    summary_input_tokens: 25000,
    summary_output_tokens: 3000,
    vision_ocr_pages: 150,
    storage_gb: 80,
    egress_gb: 90,
    db_writes_per_day: 600,
  },
};

// =====================================================================
// 3) MOTOR DE CÁLCULO
// =====================================================================
function computeAiCost(profile) {
  const p = PRICES_USD.openai;

  // RAG queries con gpt-4o (modelo principal)
  const ragInTokens = profile.rag_queries * profile.rag_input_tokens_avg;
  const ragOutTokens = profile.rag_queries * profile.rag_output_tokens_avg;
  const ragCost =
    (ragInTokens / 1_000_000) * p.gpt4o_input_per_1m +
    (ragOutTokens / 1_000_000) * p.gpt4o_output_per_1m;

  // Análisis de documentos (gpt-4o-mini para costos)
  const docInTokens =
    profile.doc_uploads * profile.doc_pages_avg * profile.doc_input_tokens_per_page;
  const docOutTokens = profile.doc_uploads * profile.doc_output_tokens_avg;
  const docCost =
    (docInTokens / 1_000_000) * p.gpt4o_mini_input_per_1m +
    (docOutTokens / 1_000_000) * p.gpt4o_mini_output_per_1m;

  // Resúmenes ejecutivos / coherence check con gpt-4o
  const sumIn = profile.case_summaries * profile.summary_input_tokens;
  const sumOut = profile.case_summaries * profile.summary_output_tokens;
  const summaryCost =
    (sumIn / 1_000_000) * p.gpt4o_input_per_1m +
    (sumOut / 1_000_000) * p.gpt4o_output_per_1m;

  // Vision OCR (gpt-4o vision por imagen)
  const visionCost = profile.vision_ocr_pages * p.vision_per_image;

  // Embeddings (asumir reindexación 5% mensual + nuevos docs)
  const embedTokens =
    profile.doc_uploads * profile.doc_pages_avg * 800 + // 800 tk/page de embedding chunks
    profile.storage_gb * 50_000;                         // historial reindex
  const embeddingCost = (embedTokens / 1_000_000) * p.embedding_small_per_1m;

  return {
    rag: round(ragCost),
    docAnalysis: round(docCost),
    summaries: round(summaryCost),
    vision: round(visionCost),
    embeddings: round(embeddingCost),
    total: round(ragCost + docCost + summaryCost + visionCost + embeddingCost),
  };
}

function computeInfraCost(profile, scaleUsers) {
  // Costos fijos diluidos al número de usuarios activos en la plataforma
  const fixedTotal =
    PRICES_USD.supabase.pro_monthly +
    PRICES_USD.vercel.pro_monthly +
    PRICES_USD.render.standard_monthly +
    PRICES_USD.redis.starter_monthly +
    PRICES_USD.resend.pro_monthly +
    PRICES_USD.sentry.team_monthly +
    PRICES_USD.domain_yearly / 12 +
    PRICES_USD.cloudflare_pro;

  const fixedPerUser = fixedTotal / scaleUsers;

  // Variable: storage extra y egress
  const storageVar = profile.storage_gb * PRICES_USD.supabase.extra_storage_per_gb;
  const egressVar = profile.egress_gb * PRICES_USD.supabase.extra_egress_per_gb;

  return {
    fixedAllocated: round(fixedPerUser),
    storage: round(storageVar),
    egress: round(egressVar),
    total: round(fixedPerUser + storageVar + egressVar),
  };
}

function computeStripeCost(monthlyPrice) {
  if (monthlyPrice === 0) return 0;
  return round(monthlyPrice * PRICES_USD.stripe.pct_per_charge + PRICES_USD.stripe.fixed_per_charge);
}

function round(n) {
  return Math.round(n * 100) / 100;
}

// =====================================================================
// 4) DEFINICIÓN DE TIERS Y CÁLCULO
// =====================================================================
const TIERS = [
  { code: 'free',       name: 'Gratis',     priceMonth: 0,   priceYear: 0,    seats: 1,  scaleUsers: 200 },
  { code: 'starter',    name: 'Starter',    priceMonth: 19,  priceYear: 190,  seats: 1,  scaleUsers: 200 },
  { code: 'pro',        name: 'Pro',        priceMonth: 49,  priceYear: 490,  seats: 1,  scaleUsers: 200 },
  { code: 'studio',     name: 'Studio',     priceMonth: 199, priceYear: 1990, seats: 5,  scaleUsers: 200 },
  { code: 'enterprise', name: 'Enterprise', priceMonth: 599, priceYear: 5990, seats: 15, scaleUsers: 200 },
];

function buildReport(scaleUsers = 200) {
  const rows = TIERS.map((tier) => {
    const profile = USAGE_PROFILE[tier.code] || USAGE_PROFILE.pro;
    const ai = computeAiCost(profile);
    const infra = computeInfraCost(profile, scaleUsers);

    // Profile ya es el consumo TOTAL del tier (no por seat).
    const stripeFee = computeStripeCost(tier.priceMonth);
    const cogs = round(ai.total + infra.total + stripeFee);
    const revenue = tier.priceMonth;
    const grossProfit = round(revenue - cogs);
    const grossMarginPct = revenue > 0 ? round((grossProfit / revenue) * 100) : 0;

    return {
      ...tier,
      profile: tier.code,
      ai,
      infra,
      stripeFee,
      cogs,
      revenue,
      grossProfit,
      grossMarginPct,
    };
  });
  return rows;
}

function projectRevenue(rows, mix) {
  // mix = { free: %, starter: %, pro: %, studio: %, enterprise: % } sumando 100
  let totalUsers = 0;
  let totalRevenue = 0;
  let totalCogs = 0;
  for (const r of rows) {
    const pct = mix[r.code] || 0;
    const users = (mix.totalUsers * pct) / 100;
    totalUsers += users;
    totalRevenue += users * r.revenue;
    totalCogs += users * r.cogs;
  }
  const grossProfit = totalRevenue - totalCogs;
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  return {
    users: totalUsers,
    monthlyRevenue: round(totalRevenue),
    monthlyCogs: round(totalCogs),
    monthlyGross: round(grossProfit),
    annualRevenue: round(totalRevenue * 12),
    annualGross: round(grossProfit * 12),
    grossMarginPct: round(grossMarginPct),
  };
}

// =====================================================================
// 5) HARDWARE / TEAM / OVERHEAD (CAPEX + OPEX no SaaS)
// =====================================================================
const HARDWARE_TEAM = {
  founder_workstation: { cost: 2000, life_months: 36 },
  spare_laptop: { cost: 900, life_months: 36 },
  monitor_4k: { cost: 450, life_months: 48 },
  ergonomic_setup: { cost: 600, life_months: 60 },
  router_ups: { cost: 250, life_months: 48 },
  internet_fibra_monthly: 60,
  contingencia_4g_monthly: 25,
  electricity_monthly: 35,
  coworking_optional_monthly: 180,
  github_team_monthly: 4,
  linear_or_notion_monthly: 16,
  figma_monthly: 15,
  google_workspace_monthly: 6,
  legal_accounting_monthly: 80,
  marketing_ads_monthly: 250,
  contingency_pct: 0.10,
};

function monthlyOverhead(includeCoworking = false) {
  const ht = HARDWARE_TEAM;
  const amort =
    ht.founder_workstation.cost / ht.founder_workstation.life_months +
    ht.spare_laptop.cost / ht.spare_laptop.life_months +
    ht.monitor_4k.cost / ht.monitor_4k.life_months +
    ht.ergonomic_setup.cost / ht.ergonomic_setup.life_months +
    ht.router_ups.cost / ht.router_ups.life_months;
  const opex =
    ht.internet_fibra_monthly +
    ht.contingencia_4g_monthly +
    ht.electricity_monthly +
    (includeCoworking ? ht.coworking_optional_monthly : 0) +
    ht.github_team_monthly +
    ht.linear_or_notion_monthly +
    ht.figma_monthly +
    ht.google_workspace_monthly +
    ht.legal_accounting_monthly +
    ht.marketing_ads_monthly;
  const subtotal = amort + opex;
  const total = subtotal * (1 + ht.contingency_pct);
  return {
    amort: round(amort),
    opex: round(opex),
    subtotal: round(subtotal),
    contingency: round(subtotal * ht.contingency_pct),
    total: round(total),
  };
}

// =====================================================================
// 6) IMPRESIÓN
// =====================================================================
function pad(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}
function rpad(n, w) { return String(n).padStart(w); }

function printReport() {
  const scale = 200;
  const rows = buildReport(scale);
  const overhead = monthlyOverhead(false);
  const overheadCo = monthlyOverhead(true);

  console.log('\n========================================================');
  console.log(' POWERIA LEGAL — ANÁLISIS DE COSTOS Y UNIT ECONOMICS');
  console.log(`  (escala asumida: ${scale} usuarios activos en la plataforma)`);
  console.log('========================================================\n');

  console.log('1) COSTO MENSUAL DE IA POR TIER (USD)');
  console.log(pad('Tier', 12) + pad('RAG', 9) + pad('Docs', 9) + pad('Resúm.', 9) + pad('Vision', 9) + pad('Embed', 9) + pad('Total', 9));
  for (const r of rows) {
    console.log(pad(r.code, 12) + pad('$' + r.ai.rag, 9) + pad('$' + r.ai.docAnalysis, 9) + pad('$' + r.ai.summaries, 9) + pad('$' + r.ai.vision, 9) + pad('$' + r.ai.embeddings, 9) + pad('$' + r.ai.total, 9));
  }

  console.log('\n2) COSTO INFRA POR TIER (USD)');
  console.log(pad('Tier', 12) + pad('Fijo aloc.', 12) + pad('Storage', 10) + pad('Egress', 10) + pad('Total', 10));
  for (const r of rows) {
    console.log(pad(r.code, 12) + pad('$' + r.infra.fixedAllocated, 12) + pad('$' + r.infra.storage, 10) + pad('$' + r.infra.egress, 10) + pad('$' + r.infra.total, 10));
  }

  console.log('\n3) UNIT ECONOMICS POR TIER');
  console.log(pad('Tier', 12) + pad('Precio', 9) + pad('Seats', 7) + pad('COGS', 9) + pad('GP', 9) + pad('GM%', 7));
  for (const r of rows) {
    console.log(pad(r.name, 12) + pad('$' + r.revenue, 9) + pad(String(r.seats), 7) + pad('$' + r.cogs, 9) + pad('$' + r.grossProfit, 9) + pad(r.grossMarginPct + '%', 7));
  }

  console.log('\n4) OVERHEAD MENSUAL (Hardware + Team)');
  console.log(`   Amortización CAPEX       : $${overhead.amort}`);
  console.log(`   OPEX recurrente          : $${overhead.opex}`);
  console.log(`   Contingencia 10%         : $${overhead.contingency}`);
  console.log(`   ───────────────────────────────────`);
  console.log(`   Total sin coworking      : $${overhead.total}`);
  console.log(`   Total con coworking      : $${overheadCo.total}`);

  console.log('\n5) PROYECCIÓN A 12 MESES');
  const mixes = [
    { label: '100 users (early)', mix: { totalUsers: 100, free: 60, starter: 25, pro: 12, studio: 3, enterprise: 0 }},
    { label: '500 users (growth)', mix: { totalUsers: 500, free: 50, starter: 28, pro: 17, studio: 4, enterprise: 1 }},
    { label: '1500 users (scale)', mix: { totalUsers: 1500, free: 45, starter: 30, pro: 18, studio: 5, enterprise: 2 }},
    { label: '5000 users (mature)', mix: { totalUsers: 5000, free: 40, starter: 30, pro: 20, studio: 7, enterprise: 3 }},
  ];
  console.log(pad('Etapa', 22) + pad('MRR', 11) + pad('ARR', 12) + pad('GM mensual', 13) + pad('GM%', 7));
  for (const m of mixes) {
    const proj = projectRevenue(rows, m.mix);
    console.log(pad(m.label, 22) + pad('$' + proj.monthlyRevenue.toLocaleString(), 11) + pad('$' + proj.annualRevenue.toLocaleString(), 12) + pad('$' + proj.monthlyGross.toLocaleString(), 13) + pad(proj.grossMarginPct + '%', 7));
  }

  console.log('\n6) PUNTO DE EQUILIBRIO');
  // Asumir overhead = $1500/mo (con coworking + marketing).
  // Cuántos usuarios "Pro equivalentes" (gross profit ≈ $43) necesito?
  const proRow = rows.find(r => r.code === 'pro');
  if (proRow && proRow.grossProfit > 0) {
    const breakeven = Math.ceil(overheadCo.total / proRow.grossProfit);
    console.log(`   Con overhead $${overheadCo.total}/mo y GM Pro $${proRow.grossProfit}/mo:`);
    console.log(`   Break-even ≈ ${breakeven} suscriptores Pro (o equivalente).`);
  }

  console.log('\n========================================================\n');
}

if (require.main === module) {
  printReport();
}

module.exports = { PRICES_USD, USAGE_PROFILE, TIERS, buildReport, monthlyOverhead, projectRevenue };
