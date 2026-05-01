/* eslint-disable */
/**
 * Cálculo detallado: 1.000 usuarios Pro ($49/mes) — costos infra + IA + storage
 * Ejecutar: node scripts/cost-storage-1000-pro.cjs
 */

// ===== SUPUESTOS PARA TIER PRO =====
const PRO_LIMITS = {
  storage_gb_per_user: 8,        // límite del plan
  documents_limit: 250,
  monthly_queries: 600,
  api_calls_limit: 5000,
};

// Uso REAL promedio (no todo el mundo llena su cuota)
const PRO_AVG_USAGE = {
  storage_gb: 4,                 // 50% del límite (promedio típico SaaS)
  rag_queries: 480,              // 80% del límite
  rag_input_tokens_avg: 4200,
  rag_output_tokens_avg: 1100,
  doc_uploads: 50,               // 80% del límite
  doc_pages_avg: 14,
  doc_input_tokens_per_page: 1200,
  doc_output_tokens_avg: 2000,
  case_summaries: 16,
  summary_input_tokens: 20000,
  summary_output_tokens: 2500,
  vision_ocr_pages: 14,
  egress_gb: 3,                  // realista (la mayoría de assets se cachean en CDN)
  db_writes_per_day: 50,
  email_notifications: 30,       // por mes
};

const N_USERS = 1000;
const ARPU = 49;
const ARPU_YEAR_DISCOUNT = 0.84; // 16% pagan anual con descuento 2 meses gratis
const PROMO_USERS_PCT = 0.30;    // 30% pagan plan anual

// ===== PRECIOS PROVEEDORES (Q2 2026) =====
const P = {
  openai: {
    gpt4o_in: 2.50, gpt4o_out: 10.00,
    mini_in: 0.15, mini_out: 0.60,
    embedding: 0.02,
    vision_per_image: 0.013,
  },

  // Supabase: Pro $25/mes incluye 8GB DB, 100GB storage, 250GB egress, 100K MAU
  supabase: {
    pro_monthly: 25,
    db_extra_per_gb: 0.125,       // bytes-as-text + ix overhead
    storage_extra_per_gb: 0.021,
    egress_extra_per_gb: 0.09,
    extra_mau: 0.00325,           // por encima de 100K
    included_db_gb: 8,
    included_storage_gb: 100,
    included_egress_gb: 250,
    included_mau: 100_000,
  },

  // Vercel Pro: $20/mes/miembro
  vercel: {
    pro_monthly: 20,
    bandwidth_per_gb: 0.40,
    edge_requests_per_1m: 2.00,
    function_per_1m: 0.60,
    included_bandwidth_gb: 1000,  // 1TB incluido
    included_edge_req_m: 1,       // 1M
  },

  // Render: Standard $25/mes (2GB RAM, 1 CPU). Para 1000 users → Pro $85/mo (4GB, 2 CPU) o autoscale
  render: {
    standard_monthly: 25,
    pro_monthly: 85,
    pro_plus_monthly: 175,        // 8GB, 4 CPU
  },

  // Redis Cloud
  redis: {
    starter_30mb: 7,
    standard_250mb: 30,
    pro_1gb: 100,
  },

  // Email (Resend)
  resend: {
    free: { monthly: 0, included: 3000 },
    pro: { monthly: 20, included: 50_000 },
  },

  // Sentry / Cloudflare / etc.
  sentry_team: 26,
  cloudflare_pro: 25,
  domain_yearly: 25,

  // Stripe LATAM
  stripe: { pct: 0.029, fixed: 0.30 },

  // Backups extra (Supabase PITR si activado)
  supabase_pitr_per_gb_per_day: 0.02,
};

function round(n) { return Math.round(n * 100) / 100; }
function k(n) { return n.toLocaleString('es-EC', { maximumFractionDigits: 0 }); }

// ===== CÁLCULO DE COSTOS VARIABLES IA POR USUARIO =====
function aiCostPerUser(u) {
  const rag = (u.rag_queries * u.rag_input_tokens_avg / 1e6) * P.openai.gpt4o_in
            + (u.rag_queries * u.rag_output_tokens_avg / 1e6) * P.openai.gpt4o_out;
  const docs = (u.doc_uploads * u.doc_pages_avg * u.doc_input_tokens_per_page / 1e6) * P.openai.mini_in
             + (u.doc_uploads * u.doc_output_tokens_avg / 1e6) * P.openai.mini_out;
  const summ = (u.case_summaries * u.summary_input_tokens / 1e6) * P.openai.gpt4o_in
             + (u.case_summaries * u.summary_output_tokens / 1e6) * P.openai.gpt4o_out;
  const vision = u.vision_ocr_pages * P.openai.vision_per_image;
  // Embeddings (chunks de docs nuevos + reindex 5% storage)
  const embed_tokens = u.doc_uploads * u.doc_pages_avg * 800 + u.storage_gb * 50000;
  const embed = (embed_tokens / 1e6) * P.openai.embedding;
  return { rag, docs, summ, vision, embed, total: rag + docs + summ + vision + embed };
}

// ===== PROYECCIÓN A 1.000 USUARIOS =====
function project() {
  const u = PRO_AVG_USAGE;
  const ai = aiCostPerUser(u);

  // ===== Storage Supabase =====
  const total_storage_gb = N_USERS * u.storage_gb;
  const total_egress_gb = N_USERS * u.egress_gb;
  const total_mau = N_USERS;
  // DB: cada user genera ~ 50 writes/día × 30 = 1500 rows/mes; con 12 meses ~18K rows + casos + finance
  // Estimación: 50 MB de DB/usuario/año = 4 MB/mes para tier Pro promedio
  const db_size_per_user_gb = 0.05;
  const total_db_gb = N_USERS * db_size_per_user_gb;

  const supabase_storage_extra = Math.max(0, total_storage_gb - P.supabase.included_storage_gb);
  const supabase_egress_extra = Math.max(0, total_egress_gb - P.supabase.included_egress_gb);
  const supabase_db_extra = Math.max(0, total_db_gb - P.supabase.included_db_gb);
  const supabase_mau_extra = Math.max(0, total_mau - P.supabase.included_mau);

  const supabase_cost =
    P.supabase.pro_monthly +
    supabase_storage_extra * P.supabase.storage_extra_per_gb +
    supabase_egress_extra * P.supabase.egress_extra_per_gb +
    supabase_db_extra * P.supabase.db_extra_per_gb +
    supabase_mau_extra * P.supabase.extra_mau;

  // ===== Vercel =====
  // Bandwidth: ~150 MB por user/mes en assets servidos por Vercel CDN
  const vercel_bandwidth_gb = N_USERS * 0.15;
  // Edge requests en MILLONES: ~2K requests/user/mes ⇒ 2M total = 2 (en unidades de millón)
  const vercel_edge_req_m = (N_USERS * 2000) / 1_000_000;
  const vercel_extra_bandwidth = Math.max(0, vercel_bandwidth_gb - P.vercel.included_bandwidth_gb);
  const vercel_extra_edge_m = Math.max(0, vercel_edge_req_m - P.vercel.included_edge_req_m);
  const vercel_cost =
    P.vercel.pro_monthly +
    vercel_extra_bandwidth * P.vercel.bandwidth_per_gb +
    vercel_extra_edge_m * P.vercel.edge_requests_per_1m;

  // ===== Render =====
  // 1000 users activos → necesitamos al menos 4GB RAM, 2 CPU = Pro Plan $85
  // Si 30% concurrencia simultánea → 300 users hitting backend → upgrade a Pro Plus $175
  const render_cost = P.render.pro_plus_monthly;

  // ===== Redis =====
  // 1000 users con cache + rate-limit + sessions → 250MB-1GB
  const redis_cost = P.redis.standard_250mb;

  // ===== Email Resend =====
  // 30 emails/user × 1000 = 30.000 emails/mes → cabe en Pro $20
  const total_emails = N_USERS * u.email_notifications;
  const resend_cost = total_emails > P.resend.free.included ? P.resend.pro.monthly : 0;

  // ===== Otros fijos =====
  const fixed_others =
    P.sentry_team + P.cloudflare_pro + (P.domain_yearly / 12);

  // ===== Stripe (procesamiento pagos) =====
  const monthly_payers_pct = 1 - PROMO_USERS_PCT;
  const yearly_payers_pct = PROMO_USERS_PCT;
  const arr_per_yearly_user = ARPU * 12 * ARPU_YEAR_DISCOUNT; // descuento 2 meses
  const monthly_charges = N_USERS * monthly_payers_pct;
  const yearly_charges = (N_USERS * yearly_payers_pct) / 12; // se cobra una vez al año
  const stripe_revenue_processed_monthly =
    monthly_charges * ARPU + yearly_charges * arr_per_yearly_user;
  const stripe_cost =
    monthly_charges * (ARPU * P.stripe.pct + P.stripe.fixed) +
    yearly_charges * (arr_per_yearly_user * P.stripe.pct + P.stripe.fixed);

  // ===== AI total =====
  const ai_total_cost = ai.total * N_USERS;

  // ===== TOTAL COGS =====
  const cogs = ai_total_cost + supabase_cost + vercel_cost + render_cost + redis_cost
             + resend_cost + fixed_others + stripe_cost;

  // ===== INGRESOS =====
  const monthly_revenue =
    monthly_charges * ARPU +
    (N_USERS * yearly_payers_pct * arr_per_yearly_user) / 12;

  const gross_profit = monthly_revenue - cogs;
  const gross_margin = (gross_profit / monthly_revenue) * 100;

  // ===== OVERHEAD =====
  const overhead_monthly = 854; // $854/mo del análisis previo (con coworking)
  const ebitda_monthly = gross_profit - overhead_monthly;

  return {
    ai, total_storage_gb, total_egress_gb, total_db_gb, total_mau, total_emails,
    supabase_cost, vercel_cost, render_cost, redis_cost, resend_cost, fixed_others,
    stripe_cost, ai_total_cost, cogs, monthly_revenue, gross_profit, gross_margin,
    overhead_monthly, ebitda_monthly,
    supabase_breakdown: {
      base: P.supabase.pro_monthly,
      storage: round(supabase_storage_extra * P.supabase.storage_extra_per_gb),
      egress: round(supabase_egress_extra * P.supabase.egress_extra_per_gb),
      db: round(supabase_db_extra * P.supabase.db_extra_per_gb),
      mau: round(supabase_mau_extra * P.supabase.extra_mau),
      storage_extra_gb: round(supabase_storage_extra),
      egress_extra_gb: round(supabase_egress_extra),
    },
  };
}

const r = project();

console.log('\n' + '='.repeat(70));
console.log(' POWERIA LEGAL — PROYECCIÓN 1.000 USUARIOS PLAN PRO ($49/mes)');
console.log('='.repeat(70));

console.log('\n📊 USO TOTAL DE LA PLATAFORMA');
console.log(`   Storage Supabase    : ${k(r.total_storage_gb)} GB (4 GB/user × 1000)`);
console.log(`   Egress Supabase     : ${k(r.total_egress_gb)} GB (10 GB/user × 1000)`);
console.log(`   DB Postgres        : ${k(r.total_db_gb)} GB (50 MB/user × 1000)`);
console.log(`   MAU                 : ${k(r.total_mau)} usuarios`);
console.log(`   Emails transacc.    : ${k(r.total_emails)}/mes`);

console.log('\n💰 COSTOS DE INFRAESTRUCTURA (mensual)');
console.log('   ┌─ Supabase Pro ─────────────────────────────');
console.log(`   │  Plan base                  : $${r.supabase_breakdown.base.toFixed(2)}`);
console.log(`   │  Storage extra (${r.supabase_breakdown.storage_extra_gb} GB sobre 100 GB) : $${r.supabase_breakdown.storage.toFixed(2)}`);
console.log(`   │  Egress extra  (${r.supabase_breakdown.egress_extra_gb} GB sobre 250 GB) : $${r.supabase_breakdown.egress.toFixed(2)}`);
console.log(`   │  DB extra      (${(r.total_db_gb).toFixed(1)} GB sobre 8 GB)   : $${r.supabase_breakdown.db.toFixed(2)}`);
console.log(`   │  MAU extra                  : $${r.supabase_breakdown.mau.toFixed(2)}`);
console.log(`   └─ TOTAL Supabase             : $${r.supabase_cost.toFixed(2)}`);
console.log(`   Vercel Pro (hosting + CDN)    : $${r.vercel_cost.toFixed(2)}`);
console.log(`   Render Pro Plus (backend 8GB) : $${r.render_cost.toFixed(2)}`);
console.log(`   Redis Cloud Standard 250 MB   : $${r.redis_cost.toFixed(2)}`);
console.log(`   Resend Pro (50K emails)       : $${r.resend_cost.toFixed(2)}`);
console.log(`   Sentry + Cloudflare + dominio : $${r.fixed_others.toFixed(2)}`);
console.log(`   ────────────────────────────────────────────────`);
console.log(`   SUBTOTAL INFRA                : $${(r.supabase_cost + r.vercel_cost + r.render_cost + r.redis_cost + r.resend_cost + r.fixed_others).toFixed(2)}`);

console.log('\n🤖 COSTOS DE IA (mensual, total 1000 users)');
console.log(`   RAG (gpt-4o)         : $${k(r.ai.rag * N_USERS)}`);
console.log(`   Análisis docs (mini) : $${k(r.ai.docs * N_USERS)}`);
console.log(`   Resúmenes (gpt-4o)   : $${k(r.ai.summ * N_USERS)}`);
console.log(`   Vision OCR           : $${k(r.ai.vision * N_USERS)}`);
console.log(`   Embeddings           : $${k(r.ai.embed * N_USERS)}`);
console.log(`   ────────────────────────────────────────────────`);
console.log(`   TOTAL IA             : $${k(r.ai_total_cost)}`);
console.log(`   IA por usuario       : $${r.ai.total.toFixed(2)}`);

console.log('\n💳 PROCESAMIENTO DE PAGOS');
console.log(`   Stripe (mix mensual+anual) : $${r.stripe_cost.toFixed(2)}`);

console.log('\n📈 INGRESOS Y RENTABILIDAD');
console.log(`   Revenue mensual (mix)    : $${k(r.monthly_revenue)}`);
console.log(`   Revenue anualizado (ARR) : $${k(r.monthly_revenue * 12)}`);
console.log(`   COGS total mensual       : $${k(r.cogs)}`);
console.log(`   Gross Profit mensual     : $${k(r.gross_profit)}`);
console.log(`   Gross Margin             : ${r.gross_margin.toFixed(1)}%`);
console.log(`   ─────────────────────────────────────────────`);
console.log(`   Overhead operativo       : $${r.overhead_monthly}`);
console.log(`   EBITDA mensual           : $${k(r.ebitda_monthly)}`);
console.log(`   EBITDA anual             : $${k(r.ebitda_monthly * 12)}`);

console.log('\n✅ VEREDICTO');
if (r.gross_margin > 60) {
  console.log(`   🟢 Margen ${r.gross_margin.toFixed(0)}% es saludable para SaaS B2B (target ≥ 60%)`);
}
if (r.ebitda_monthly > 0) {
  console.log(`   🟢 Negocio rentable: EBITDA $${k(r.ebitda_monthly)}/mes ($${k(r.ebitda_monthly*12)}/año)`);
}
console.log(`   ROI por usuario Pro: $${(r.gross_profit / N_USERS).toFixed(2)}/mes de margen`);

console.log('\n📋 COSTO POR USUARIO PRO (descomposición)');
console.log(`   IA por user       : $${r.ai.total.toFixed(2)}`);
console.log(`   Infra por user    : $${((r.supabase_cost + r.vercel_cost + r.render_cost + r.redis_cost + r.resend_cost + r.fixed_others) / N_USERS).toFixed(2)}`);
console.log(`   Stripe por user   : $${(r.stripe_cost / N_USERS).toFixed(2)}`);
console.log(`   ────────────────────────────────`);
console.log(`   COGS por user     : $${(r.cogs / N_USERS).toFixed(2)}`);
console.log(`   Precio Pro        : $${ARPU}.00`);
console.log(`   Margen por user   : $${((r.monthly_revenue / N_USERS) - (r.cogs / N_USERS)).toFixed(2)}`);

console.log('\n' + '='.repeat(70) + '\n');
