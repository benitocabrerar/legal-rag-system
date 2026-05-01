/**
 * Script to test AI metadata extraction with a real legal document
 * Phase 1: GPT-4 Metadata Extraction Enhancement
 */

import { PrismaClient } from '@prisma/client';
import { createOpenAIClient } from '../src/config/openai.config';
import { LegalDocumentService } from '../src/services/legal-document-service';

const prisma = new PrismaClient();
const openai = createOpenAIClient();

// Sample legal document content (Ley de Comercio Electrónico)
const SAMPLE_DOCUMENT = `LEY DE COMERCIO ELECTRÓNICO, FIRMAS ELECTRÓNICAS Y MENSAJES DE DATOS

Ley 67
Registro Oficial Suplemento 577 de 17-abr-2002
Ultima modificación: 21-dic-2021
Estado: Reformado

El Congreso Nacional

Considerando:

Que es necesario impulsar el acceso de la población a los servicios electrónicos que se brindan a través de las redes de información;

Que es indispensable contar con reglas jurídicas claras que den seguridad a las transacciones electrónicas y comerciales;

Que la firma electrónica es un medio de identificación de las personas en el ámbito de los mensajes de datos;

Que es necesario garantizar la libertad de las partes de escoger los medios técnicos y formatos en que presentan la información;

Que es fundamental la protección de los consumidores en las transacciones electrónicas;

En ejercicio de sus atribuciones constitucionales, expide la siguiente:

LEY DE COMERCIO ELECTRÓNICO, FIRMAS ELECTRÓNICAS Y MENSAJES DE DATOS

TÍTULO I
MENSAJES DE DATOS

Art. 1.- Objeto de la Ley.- Esta ley regula los mensajes de datos, la firma electrónica, los servicios de certificación, la contratación electrónica y telemática, la prestación de servicios electrónicos, a través de redes de información, incluido el comercio electrónico y la protección a los usuarios de estos sistemas.

Art. 2.- Definiciones.- Para efectos de esta ley se entenderá por:
a) Mensaje de datos.- Toda información creada, generada, procesada, enviada, recibida, comunicada o archivada por medios electrónicos, que puede ser intercambiada por cualquier medio;
b) Firma electrónica.- Son los datos en forma electrónica consignados en un mensaje de datos, adjuntados o lógicamente asociados al mismo, y que puedan ser utilizados para identificar al titular de la firma en relación con el mensaje de datos, e indicar que el titular de la firma aprueba y reconoce la información contenida en el mensaje de datos;
c) Certificado de firma electrónica.- El mensaje de datos u otro registro que confirma el vínculo entre el firmante y los datos de creación de la firma electrónica;
d) Entidad de certificación de información.- La persona natural o jurídica facultada para emitir certificados de firma electrónica;`;

async function testExtraction() {
  console.log('\n========================================');
  console.log('TEST DE EXTRACCIÓN DE METADATOS - FASE 1');
  console.log('========================================\n');

  try {
    const service = new LegalDocumentService(prisma, openai);

    console.log('📄 Documento de prueba: Ley de Comercio Electrónico');
    console.log(`📊 Tamaño del contenido: ${SAMPLE_DOCUMENT.length} caracteres\n`);

    const startTime = Date.now();

    // Execute metadata extraction
    const result = await service.extractMetadataWithAI(SAMPLE_DOCUMENT);

    const duration = Date.now() - startTime;

    // Display results
    console.log('\n========================================');
    console.log('RESULTADOS DE LA EXTRACCIÓN');
    console.log('========================================\n');

    console.log('📋 METADATOS EXTRAÍDOS:');
    console.log(`   Tipo de Norma: ${result.suggestions.normType}`);
    console.log(`   Título: ${result.suggestions.normTitle}`);
    console.log(`   Jerarquía Legal: ${result.suggestions.legalHierarchy}`);
    console.log(`   Tipo de Publicación: ${result.suggestions.publicationType || 'N/A'}`);
    console.log(`   Número de Publicación: ${result.suggestions.publicationNumber || 'N/A'}`);
    console.log(`   Fecha de Publicación: ${result.suggestions.publicationDate || 'N/A'}`);
    console.log(`   Estado del Documento: ${result.suggestions.documentState}`);
    console.log(`   Jurisdicción: ${result.suggestions.jurisdiction || 'N/A'}`);
    console.log(`   Última Reforma: ${result.suggestions.lastReformDate || 'N/A'}`);
    console.log(`   Palabras Clave: ${result.suggestions.keywords.join(', ') || 'N/A'}`);

    console.log('\n📊 MÉTRICAS DE CALIDAD:');
    console.log(`   Nivel de Confianza: ${result.confidence.toUpperCase()}`);
    console.log(`   Razonamiento: ${result.reasoning}`);

    if (result.validationErrors && result.validationErrors.length > 0) {
      console.log('\n⚠️  ADVERTENCIAS DE VALIDACIÓN:');
      result.validationErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ Sin errores de validación');
    }

    console.log('\n⏱️  RENDIMIENTO:');
    console.log(`   Tiempo de extracción: ${duration}ms`);
    console.log(`   Objetivo: < 5000ms`);
    console.log(`   Estado: ${duration < 5000 ? '✅ EXITOSO' : '⚠️  EXCEDE OBJETIVO'}`);

    // Accuracy evaluation
    console.log('\n🎯 EVALUACIÓN DE PRECISIÓN:');

    const expectedValues = {
      normType: 'ORDINARY_LAW',
      normTitle: 'LEY DE COMERCIO ELECTRÓNICO',
      legalHierarchy: 'LEYES_ORDINARIAS',
      publicationNumber: '577',
      documentState: 'REFORMADO',
    };

    const accuracyChecks = [
      { field: 'normType', expected: expectedValues.normType, actual: result.suggestions.normType },
      { field: 'normTitle', expected: expectedValues.normTitle, actual: result.suggestions.normTitle.toUpperCase().includes(expectedValues.normTitle) },
      { field: 'legalHierarchy', expected: expectedValues.legalHierarchy, actual: result.suggestions.legalHierarchy },
      { field: 'publicationNumber', expected: expectedValues.publicationNumber, actual: result.suggestions.publicationNumber },
      { field: 'documentState', expected: expectedValues.documentState, actual: result.suggestions.documentState },
    ];

    let correctCount = 0;
    accuracyChecks.forEach(check => {
      const isCorrect = typeof check.actual === 'boolean' ? check.actual : check.actual === check.expected;
      console.log(`   ${isCorrect ? '✅' : '❌'} ${check.field}: ${isCorrect ? 'CORRECTO' : 'INCORRECTO'}`);
      if (isCorrect) correctCount++;
    });

    const accuracy = (correctCount / accuracyChecks.length) * 100;
    console.log(`\n   Precisión Total: ${accuracy.toFixed(1)}%`);
    console.log(`   Objetivo: >= 95%`);
    console.log(`   Estado: ${accuracy >= 95 ? '✅ OBJETIVO CUMPLIDO' : '⚠️  POR DEBAJO DEL OBJETIVO'}`);

    // Overall success
    const isSuccess = accuracy >= 95 && duration < 5000 && result.confidence !== 'low';

    console.log('\n========================================');
    console.log('RESULTADO FINAL');
    console.log('========================================\n');
    console.log(isSuccess
      ? '✅ PRUEBA EXITOSA - Fase 1 implementada correctamente'
      : '⚠️  PRUEBA PARCIAL - Algunos objetivos no cumplidos');
    console.log('\n');

    return {
      success: isSuccess,
      accuracy,
      duration,
      confidence: result.confidence,
      result
    };

  } catch (error: any) {
    console.error('\n❌ ERROR EN LA PRUEBA:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testExtraction()
  .then((results) => {
    process.exit(results.success ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
