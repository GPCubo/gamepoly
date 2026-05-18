#!/usr/bin/env node
/**
 * Spec Generator - Crea specs en ./spec/ siguiendo el formato estándar
 * Uso: node scripts/gen-spec.mjs "Título de la área"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPEC_DIR = path.join(__dirname, '..', 'spec');

// Paso 1: Determinar próximo ID
function getNextId() {
  if (!fs.existsSync(SPEC_DIR)) {
    fs.mkdirSync(SPEC_DIR, { recursive: true });
    return '001';
  }

  const files = fs.readdirSync(SPEC_DIR);
  const specFiles = files.filter(f => /^SPEC-\d{3}-.*\.md$/.test(f));

  if (specFiles.length === 0) return '001';

  const maxId = specFiles.reduce((max, f) => {
    const match = f.match(/^SPEC-(\d{3})-/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);

  return String(maxId + 1).padStart(3, '0');
}

// Paso 2: Convertir título a kebab-case
function toKebabCase(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios, guiones
    .trim()
    .replace(/\s+/g, '-'); // Espacios → guiones
}

// Paso 3: Obtener timestamp ISO 8601
function getTimestamp() {
  return new Date().toISOString().split('.')[0];
}

// Paso 4: Construir el contenido del spec
function buildSpecContent(id, title, kebabTitle) {
  const timestamp = getTimestamp();
  return `---
id: SPEC-${id}
title: ${title}
created_at: ${timestamp}
status: draft
---

# SPEC-${id}: ${title}

## Descripción



## Contexto y Motivación



## Análisis Técnico



## Plan de Implementación

### Archivos a crear



### Archivos a modificar



### Pasos ordenados

1. 
2. 

## Criterios de Aceptación

- [ ] 
- [ ] 

## Notas



`;
}

// Función principal
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: node gen-spec.mjs "Título del spec"');
    process.exit(1);
  }

  const title = args.join(' ');
  const id = getNextId();
  const kebabTitle = toKebabCase(title);
  const filename = `SPEC-${id}-${kebabTitle}.md`;
  const filepath = path.join(SPEC_DIR, filename);

  // Verificar si ya existe
  if (fs.existsSync(filepath)) {
    console.error(`Error: El archivo ${filename} ya existe.`);
    process.exit(1);
  }

  const content = buildSpecContent(id, title, kebabTitle);

  try {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✔ Spec creado: ./spec/${filename}`);
  } catch (err) {
    console.error(`Error al crear el spec: ${err.message}`);
    process.exit(1);
  }
}

main();
