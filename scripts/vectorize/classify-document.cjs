/**
 * Clasificador heurístico por nombre de archivo.
 * Devuelve metadata para legal_documents:
 *   { norm_type, legal_hierarchy, jurisdiction, category, title }
 */

function classify(filename) {
  const f = filename
    .replace(/\.pdf$/i, '')
    .replace(/\.docx$/i, '')
    .replace(/[_]/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase();

  const m = (s) => f.includes(s.toLowerCase());

  // CONSTITUCIÓN
  if (m('constitución') || m('constitucion') || /\bcre\s+const/i.test(filename)) {
    return {
      norm_type: 'CONSTITUTIONAL_NORM',
      legal_hierarchy: 'CONSTITUCION',
      jurisdiction: 'NACIONAL',
      category: 'Constitucional',
      title: 'Constitución de la República del Ecuador',
    };
  }

  // CÓDIGOS ORGÁNICOS (incluye COIP, COFJ, COGEP, COOTAD, COA, COESCOP, COPCI, etc.)
  if (m('codigo organico') || m('código orgánico') || m('coip') || m('cogep') || m('cofj') || m('cootad') || m('copci')) {
    let category = 'Penal';
    if (m('aeronautico')) category = 'Aeronáutico';
    else if (m('ambiente')) category = 'Ambiental';
    else if (m('administrativo')) category = 'Administrativo';
    else if (m('monetario') || m('financiero')) category = 'Monetario y Financiero';
    else if (m('produccion') || m('comercio') || m('inversiones') || m('copci')) category = 'Económico';
    else if (m('planificacion') || m('finazas')) category = 'Fiscal';
    else if (m('procesos') || m('cogep')) category = 'Procesal';
    else if (m('penal') || m('coip') || m('integral')) category = 'Penal';
    else if (m('funcion judicial') || m('cofj')) category = 'Judicial';
    else if (m('seguridad ciudadana') || m('orden publico')) category = 'Seguridad';
    else if (m('organizacion territorial') || m('cootad')) category = 'Territorial';
    else if (m('economia social') || m('conocimientos')) category = 'Conocimientos';
    return {
      norm_type: 'ORGANIC_CODE',
      legal_hierarchy: 'CODIGOS_ORGANICOS',
      jurisdiction: 'NACIONAL',
      category,
    };
  }

  // CÓDIGOS ORDINARIOS (Civil, Trabajo, Tributario, Niñez, Aeronáutico, Democracia)
  if (m('codigo civil') || m('codigo tributario') || m('codigo del trabajo') || m('codigo de la ninez') || m('codigo de la democracia') || m('codigo aeronautico') || m('codigo de derecho internacional')) {
    let category = 'Otros';
    if (m('civil')) category = 'Civil';
    else if (m('tributario')) category = 'Tributario';
    else if (m('trabajo')) category = 'Laboral';
    else if (m('ninez') || m('niñez')) category = 'Niñez';
    else if (m('democracia')) category = 'Electoral';
    else if (m('aeronautico')) category = 'Aeronáutico';
    else if (m('internacional')) category = 'Internacional Privado';
    return {
      norm_type: 'ORDINARY_CODE',
      legal_hierarchy: 'CODIGOS_ORDINARIOS',
      jurisdiction: 'NACIONAL',
      category,
    };
  }

  // LEYES ORGÁNICAS
  if (m('ley organica') || m('ley orgánica') || m('losep') || m('loeps') || m('lotaip') || m('locge') || m('loei') || m('losncp') || m('losncpactualizada')) {
    let category = 'Otros';
    if (m('servicio publico') || m('losep')) category = 'Servicio Público';
    else if (m('economia popular') || m('loeps')) category = 'Economía';
    else if (m('transparencia') || m('lotaip')) category = 'Transparencia';
    else if (m('contraloria') || m('locge')) category = 'Control';
    else if (m('educacion') || m('loei')) category = 'Educación';
    else if (m('contratacion publica') || m('losncp')) category = 'Contratación';
    else if (m('comunicacion')) category = 'Comunicaciones';
    else if (m('discapacidades')) category = 'Derechos';
    else if (m('proteccion de datos') || m('datos personales')) category = 'Datos';
    else if (m('garantias jurisdiccionales') || m('control constitucional')) category = 'Constitucional';
    else if (m('defensoria publica') || m('defensoría pública')) category = 'Defensa Pública';
    else if (m('defensoria del pueblo')) category = 'Derechos';
    else if (m('procuraduria')) category = 'Estado';
    else if (m('soberania alimentaria')) category = 'Alimentaria';
    else if (m('regulacion poder mercado') || m('poder de mercado')) category = 'Competencia';
    else if (m('telecomunicaciones')) category = 'Telecomunicaciones';
    else if (m('salud')) category = 'Salud';
    else if (m('vivienda')) category = 'Vivienda';
    else if (m('transporte') || m('transito')) category = 'Tránsito';
    else if (m('drogas')) category = 'Drogas';
    else if (m('violencia') && m('mujer')) category = 'Violencia';
    else if (m('trata') || m('trafico')) category = 'Trata';
    else if (m('lavado')) category = 'Lavado';
    else if (m('uso legitimo de la fuerza')) category = 'Seguridad';
    else if (m('empresas publicas')) category = 'Empresas';
    else if (m('intelig')) category = 'Inteligencia';
    else if (m('participacion ciudadana')) category = 'Participación';
    else if (m('regulacion poder')) category = 'Competencia';
    else if (m('emprendimiento')) category = 'Emprendimiento';
    else if (m('acuicultura') || m('pesca')) category = 'Pesca';
    else if (m('hidricos') || m('agua')) category = 'Agua';
    else if (m('tabaco')) category = 'Salud';
    else if (m('galapagos')) category = 'Territorial';
    else if (m('fortalecimiento') && m('seguridad')) category = 'Seguridad';
    else if (m('acoso laboral')) category = 'Laboral';
    else if (m('regimen tributario interno')) category = 'Tributario';
    return {
      norm_type: 'ORGANIC_LAW',
      legal_hierarchy: 'LEYES_ORGANICAS',
      jurisdiction: 'NACIONAL',
      category,
    };
  }

  // REGLAMENTOS
  if (m('reglamento') || m('rglosncp') || m('reglamento_loei') || m('ro lotaip')) {
    let category = 'Reglamentario';
    if (m('lotaip')) category = 'Transparencia';
    else if (m('losncp') || m('contratacion publica')) category = 'Contratación';
    else if (m('losep')) category = 'Servicio Público';
    else if (m('ley organica de salud')) category = 'Salud';
    else if (m('comunicacion')) category = 'Comunicaciones';
    else if (m('hidrocarbur')) category = 'Hidrocarburos';
    else if (m('tributario interno') || m('lrti')) category = 'Tributario';
    else if (m('uso legitimo de la fuerza')) category = 'Seguridad';
    else if (m('transporte') || m('transito')) category = 'Tránsito';
    else if (m('loei')) category = 'Educación';
    else if (m('economia popular') || m('loeps')) category = 'Economía';
    else if (m('disciplinaria')) category = 'Disciplina';
    else if (m('locge') || m('contraloria')) category = 'Control';
    else if (m('lorcpm') || m('poder de mercado')) category = 'Competencia';
    else if (m('incubacion') || m('aceleracion')) category = 'Emprendimiento';
    else if (m('acuicultura') || m('pesca')) category = 'Pesca';
    else if (m('operaciones hidrocarbur')) category = 'Hidrocarburos';
    return {
      norm_type: 'REGULATION_EXECUTIVE',
      legal_hierarchy: 'REGLAMENTOS',
      jurisdiction: 'NACIONAL',
      category,
    };
  }

  // DECRETO EJECUTIVO → REGULATION_EXECUTIVE en jerarquía REGLAMENTOS
  if (m('decreto ejecutivo') || m('erjafe')) {
    return {
      norm_type: 'REGULATION_EXECUTIVE',
      legal_hierarchy: 'REGLAMENTOS',
      jurisdiction: 'NACIONAL',
      category: 'Administrativo',
    };
  }

  // NORMAS COMPLEMENTARIAS / NCI
  if (m('nci') || m('norma complementaria') || m('normativa')) {
    let category = 'Normas Técnicas';
    if (m('contraloria')) category = 'Control';
    else if (m('paciente')) category = 'Salud';
    else if (m('diabetes')) category = 'Salud';
    else if (m('acuicultura') || m('pesca')) category = 'Pesca';
    return {
      norm_type: 'RESOLUTION_ADMINISTRATIVE',
      legal_hierarchy: 'RESOLUCIONES',
      jurisdiction: 'NACIONAL',
      category,
    };
  }

  // DEFAULT: LEY ORDINARIA
  let category = 'Otros';
  if (m('compañia') || m('compania')) category = 'Societario';
  else if (m('inquilinato')) category = 'Civil';
  else if (m('seguridad social')) category = 'Seguridad Social';
  else if (m('servicio militar') || m('fuerzas armadas') || m('defensa nacional')) category = 'Militar';
  else if (m('empresas privadas de salud') || m('salud') || m('medicament') || m('lactancia') || m('donacion') || m('trasplante') || m('maternidad') || m('vademecum')) category = 'Salud';
  else if (m('seguridad publica') || m('arma') || m('defensa contraincendio')) category = 'Seguridad';
  else if (m('mineria') || m('hidrocarburos') || m('electricidad')) category = 'Energía';
  else if (m('comercio electronico') || m('firmas') || m('mensajes')) category = 'Digital';
  else if (m('arbitraje') || m('mediacion')) category = 'Procesal';
  else if (m('universidades') || m('escuelas politecnicas') || m('juventud')) category = 'Educación';
  else if (m('turismo')) category = 'Turismo';
  else if (m('notarial')) category = 'Notarial';
  else if (m('aduanas')) category = 'Aduanero';
  else if (m('inmunidades')) category = 'Diplomático';
  else if (m('amparo laboral') || m('mujer')) category = 'Laboral';
  else if (m('optimizacion') || m('tramites')) category = 'Administrativo';
  else if (m('inteligencia') || m('seguridad fuerzas armadas')) category = 'Militar';
  else if (m('triple reiteracion') || m('procurador fiscal')) category = 'Jurisprudencia';
  else if (m('violeta')) category = 'Violencia';
  else if (m('garantias jurisdiccionales')) category = 'Constitucional';
  else if (m('soberania alimentaria') || m('alimentaria')) category = 'Alimentaria';
  else if (m('dpj') || m('declaracion patrimonial')) category = 'Control';

  return {
    norm_type: 'ORDINARY_LAW',
    legal_hierarchy: 'LEYES_ORDINARIAS',
    jurisdiction: 'NACIONAL',
    category,
  };
}

module.exports = { classify };
