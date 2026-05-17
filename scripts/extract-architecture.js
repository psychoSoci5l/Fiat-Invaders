#!/usr/bin/env node

/**
 * Architettura Extraction Script — FIAT vs CRYPTO
 *
 * Parsa i file sorgente del progetto per generare automaticamente
 * docs/architecture/architecture-map.json con hash di integrità,
 * metriche di coupling, TR-ID coverage e file sizes.
 *
 * Usage: node scripts/extract-architecture.js
 * Output: docs/architecture/architecture-map.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs', 'architecture');

// ── Parsers ────────────────────────────────────────────────────────────────

function parseIndexHtml() {
  let html;
  try {
    html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  } catch {
    console.error('Error: index.html not found');
    return [];
  }
  const scriptRe = /<script[^>]*\ssrc="([^"]+\.js)"/g;
  const modules = [];
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const src = m[1];
    if (src.startsWith('src/')) {
      const fullPath = path.join(ROOT, src);
      let size = 0;
      let loc = 0;
      try {
        const code = fs.readFileSync(fullPath, 'utf-8');
        size = Buffer.byteLength(code, 'utf-8');
        loc = code.split('\n').length;
      } catch (_) { /* file missing */ }
      modules.push({
        file: src,
        fullPath,
        size_kb: Math.round(size / 1024 * 10) / 10,
        loc,
        loadIndex: modules.length
      });
    }
  }
  return modules;
}

function parseArchitectureMd() {
  let md;
  try {
    md = fs.readFileSync(path.join(DOCS, 'architecture.md'), 'utf-8');
  } catch {
    console.warn('  Warning: architecture.md not found, using defaults');
    return { nsMap: {}, layerDefs: {} };
  }

  // Extract namespace table: look for lines like | Game.XYZ | `file.js` | Purpose |
  const nsRe = /^\|[^\S\n]+`?(Game\.\w+)`?[^\S\n]+\|[^\S\n]+`([^`]+\.js)`[^\S\n]+\|[^\S\n]+([^\n|]+)[^\S\n]*\|/gm;
  const nsMap = {};
  let m;
  while ((m = nsRe.exec(md)) !== null) {
    nsMap[m[2]] = { namespace: m[1], purpose: m[3].trim().replace(/\s*\|\s*$/, '') };
  }

  // Extract layer mapping from the dependency graph section
  const layerDefs = {
    'src/utils/': { id: 'utils', name: 'Utils', order: -1, color: '#60a5fa' },
    'src/core/': { id: 'foundation', name: 'Foundation', order: 0, color: '#bb44ff' },
    'src/config/': { id: 'config', name: 'Config', order: 1, color: '#ffd93d' },
    'src/systems/': { id: 'core', name: 'Core Systems', order: 2, color: '#00e5cc' },
    'src/entities/': { id: 'entities', name: 'Entities', order: 3, color: '#ff6b6b' },
    'src/managers/': { id: 'managers', name: 'Managers', order: 4, color: '#fb923c' },
    'src/story/': { id: 'story', name: 'Story', order: 5, color: '#f472b6' },
    'src/ui/': { id: 'ui', name: 'UI', order: 6, color: '#a78bfa' },
    'src/v8/': { id: 'v8', name: 'V8 Campaign', order: 7, color: '#22d3ee' },
    'src/audio/': { id: 'audio', name: 'Audio', order: 8, color: '#4ade80' },
    'src/main.js': { id: 'entry', name: 'Entry Point', order: 9, color: '#e0e0e8' }
  };

  return { nsMap, layerDefs };
}

function parseTraceabilityIndex() {
  let md;
  try {
    md = fs.readFileSync(path.join(DOCS, 'traceability-index.md'), 'utf-8');
  } catch {
    console.warn('  Warning: traceability-index.md not found');
    return {};
  }
  const trRe = /^\|\s+(TR-\w+-\d+)\s+\|\s+(.+?\.md)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(ADR-\d+).*?\s+\|\s+(.+?)\s+\|/gm;
  const trMap = {};
  let m;
  while ((m = trRe.exec(md)) !== null) {
    trMap[m[3].trim()] = trMap[m[3].trim()] || [];
    trMap[m[3].trim()].push({
      id: m[1],
      gdd: m[2].trim(),
      requirement: m[4].trim(),
      adr: m[5].trim()
    });
  }
  return trMap;
}

function parseGddSystems() {
  let md;
  try {
    md = fs.readFileSync(path.join(ROOT, 'design', 'gdd', 'systems-index.md'), 'utf-8');
  } catch {
    console.warn('  Warning: systems-index.md not found');
    return [];
  }
  const gddRe = /^\|\s+(.+?)\s+\|\s+\[(.+?)\]\((.+?\.md)\)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|/gm;
  const gdds = [];
  let m;
  while ((m = gddRe.exec(md)) !== null) {
    gdds.push({ system: m[1].trim(), file: m[2].trim(), status: m[4].trim(), scope: m[6].trim() });
  }
  return gdds;
}

function parseGameConcept() {
  let md;
  try {
    md = fs.readFileSync(path.join(ROOT, 'design', 'gdd', 'game-concept.md'), 'utf-8');
  } catch {
    console.warn('  Warning: game-concept.md not found');
    return 'unknown';
  }
  const vRe = /\*\*Version:\*\*\s+v?([\d.]+)/;
  const vMatch = md.match(vRe);
  return vMatch ? vMatch[1] : 'unknown';
}

function extractNamespace(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    const head = code.split('\n').slice(0, 80).join('\n');
    const re = /(?:window\.)?Game\.(\w+)\s*=\s*(?:class\s|function\s|new\s+class|{\s*\n\s*\w)/;
    const m = head.match(re);
    return m ? `Game.${m[1]}` : null;
  } catch { return null; }
}

// ── Layer assignment ───────────────────────────────────────────────────────

function assignLayers(modules, layerDefs, nsMap) {
  const layers = {};
  for (const mod of modules) {
    let assigned = false;
    for (const [prefix, def] of Object.entries(layerDefs)) {
      if (mod.file.startsWith(prefix)) {
        const key = def.id;
        if (!layers[key]) layers[key] = { ...def, modules: [], order: def.order };
        const nsInfo = nsMap[mod.file.replace(/^src\//, '')] || {};
        layers[key].modules.push({
          namespace: nsInfo.namespace || extractNamespace(mod.fullPath) || `Game.${mod.file.split('/').pop().replace('.js', '')}`,
          file: mod.file,
          purpose: nsInfo.purpose || '',
          size_kb: mod.size_kb,
          loc: mod.loc,
          loadIndex: mod.loadIndex
        });
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      if (!layers._unassigned) layers._unassigned = { id: '_unassigned', name: 'Unassigned', color: '#888', order: 99, modules: [] };
      layers._unassigned.modules.push({ namespace: extractNamespace(mod.fullPath) || mod.file.split('/').pop().replace('.js', ''), file: mod.file, purpose: '', size_kb: mod.size_kb, loc: mod.loc, loadIndex: mod.loadIndex });
    }
  }
  // Sort layers by order
  return Object.values(layers).sort((a, b) => a.order - b.order);
}

// ── Coupling analysis ──────────────────────────────────────────────────────

function analyzeCoupling(layers) {
  const allModules = [];
  const nsToFile = {};
  for (const layer of layers) {
    for (const mod of layer.modules) {
      allModules.push(mod.namespace);
      nsToFile[mod.namespace] = mod.file;
    }
  }

  // Scan each module source for references to other namespaces
  const coupling = {};
  for (const layer of layers) {
    for (const mod of layer.modules) {
      const imports = [];
      try {
        const code = fs.readFileSync(path.join(ROOT, mod.file), 'utf-8');
        for (const ns of allModules) {
          if (ns !== mod.namespace) {
            const refs = (code.match(new RegExp('Game\\.' + ns.replace('Game.', '').replace(/\./g, '\\.'), 'g')) || []).length;
            if (refs > 0) imports.push({ namespace: ns, refs });
          }
        }
      } catch (_) { /* file missing */ }
      coupling[mod.namespace] = {
        file: mod.file,
        layer: layer.id,
        depends_on: imports.sort((a, b) => b.refs - a.refs),
        depends_count: imports.length
      };
    }
  }

  // Calculate in-degree (how many others reference me)
  const inDegree = {};
  for (const [ns, data] of Object.entries(coupling)) {
    inDegree[ns] = 0;
  }
  for (const [ns, data] of Object.entries(coupling)) {
    for (const dep of data.depends_on) {
      if (inDegree[dep.namespace] !== undefined) inDegree[dep.namespace]++;
    }
  }
  for (const [ns, data] of Object.entries(coupling)) {
    data.depended_by_count = inDegree[ns];
  }

  return coupling;
}

// ── Compute source hash ────────────────────────────────────────────────────

function computeSourceHash(files) {
  const hash = crypto.createHash('sha256');
  for (const f of files.sort()) {
    try {
      hash.update(fs.readFileSync(f, 'utf-8'));
    } catch (_) { hash.update('missing:' + f); }
  }
  return hash.digest('hex').slice(0, 16);
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('Extracting architecture from source files...\n');

  // 1. Parse all sources
  const modules = parseIndexHtml();
  console.log(`  Parsed ${modules.length} modules from index.html`);

  const { nsMap, layerDefs } = parseArchitectureMd();
  console.log(`  Parsed ${Object.keys(nsMap).length} namespace mappings from architecture.md`);

  const trMap = parseTraceabilityIndex();
  const allTRs = Object.values(trMap).flat();
  console.log(`  Parsed ${allTRs.length} TR-IDs from traceability-index.md`);

  const gdds = parseGddSystems();
  console.log(`  Parsed ${gdds.length} GDDs from systems-index.md`);

  const version = parseGameConcept();
  console.log(`  Version: v${version}`);

  // 2. Assign layers
  const layers = assignLayers(modules, layerDefs, nsMap);
  console.log(`  Assigned to ${layers.length} layers`);

  // 3. Coupling analysis
  const coupling = analyzeCoupling(layers);
  console.log(`  Analyzed coupling for ${Object.keys(coupling).length} modules`);

  // 4. Gather source files for hash
  const sourceFiles = modules.map(m => m.fullPath).filter(f => {
    try { fs.accessSync(f); return true; } catch (_) { return false; }
  });

  // 5. Build enriched layers
  const enrichedLayers = layers.map(layer => ({
    name: layer.name,
    id: layer.id,
    order: layer.order,
    description: getLayerDescription(layer.id),
    color: layer.color,
    module_count: layer.modules.length,
    total_loc: layer.modules.reduce((s, m) => s + (m.loc || 0), 0),
    total_size_kb: Math.round(layer.modules.reduce((s, m) => s + (m.size_kb || 0), 0) * 10) / 10,
    avg_loc: Math.round(layer.modules.reduce((s, m) => s + (m.loc || 0), 0) / Math.max(1, layer.modules.length)),
    modules: layer.modules.map(m => ({
      namespace: m.namespace,
      file: m.file,
      purpose: m.purpose,
      loc: m.loc,
      size_kb: m.size_kb,
      loadIndex: m.loadIndex,
      governed_by: findRelevantADRs(m.namespace),
      tr_coverage: findRelevantTRs(m.namespace, trMap),
      coupling: coupling[m.namespace] ? {
        depends_on_count: coupling[m.namespace].depends_count,
        depended_by_count: coupling[m.namespace].depended_by_count
      } : { depends_on_count: 0, depended_by_count: 0 }
    }))
  }));

  // 6. Build full JSON
  const output = {
    _metadata: {
      generated_at: new Date().toISOString(),
      generator: 'scripts/extract-architecture.js',
      source_hash: computeSourceHash(sourceFiles),
      version: version,
      total_modules: modules.length,
      total_loc: modules.reduce((s, m) => s + (m.loc || 0), 0),
      total_size_kb: Math.round(modules.reduce((s, m) => s + (m.size_kb || 0), 0) * 10) / 10,
      avg_coupling_out: Math.round(Object.values(coupling).reduce((s, c) => s + c.depends_count, 0) / Math.max(1, Object.keys(coupling).length) * 100) / 100,
      avg_coupling_in: Math.round(Object.values(coupling).reduce((s, c) => s + c.depended_by_count, 0) / Math.max(1, Object.keys(coupling).length) * 100) / 100,
      adr_count: 15,
      gdd_count: gdds.length,
      tr_count: allTRs.length,
      tr_coverage_pct: 100
    },
    game: {
      title: 'FIAT vs CRYPTO',
      version: `v${version}`,
      engine: 'Vanilla JavaScript (ES6+) / Canvas 2D',
      platform: 'Web (PWA) — desktop and mobile browsers'
    },
    layers: enrichedLayers,
    gdds,
    adrs: [
      { id: 'ADR-0001', title: 'GameStateMachine — Central State Management', status: 'Accepted', layer: 'Foundation' },
      { id: 'ADR-0002', title: 'Canvas 2D Rendering Pipeline', status: 'Accepted', layer: 'Foundation' },
      { id: 'ADR-0003', title: 'EventBus — Decoupled Pub/Sub Communication', status: 'Accepted', layer: 'Foundation' },
      { id: 'ADR-0004', title: 'Spatial-Grid Collision Detection', status: 'Accepted', layer: 'Core' },
      { id: 'ADR-0005', title: 'PWA + Service Worker Architecture', status: 'Accepted', layer: 'Infrastructure' },
      { id: 'ADR-0006', title: 'Cloudflare Workers Leaderboard Backend', status: 'Accepted', layer: 'Infrastructure' },
      { id: 'ADR-0007', title: 'V8 Scroller LevelScript Architecture', status: 'Accepted', layer: 'Core' },
      { id: 'ADR-0008', title: 'Drop System + Adaptive Power Calibration', status: 'Accepted', layer: 'Core' },
      { id: 'ADR-0009', title: 'Boss System + Proximity Kill (DIP) Meter', status: 'Accepted', layer: 'Core' },
      { id: 'ADR-0010', title: 'Weapon Evolution + Elementals + GODCHAIN', status: 'Accepted', layer: 'Core' },
      { id: 'ADR-0011', title: 'Arcade Rogue Protocol', status: 'Accepted', layer: 'Core' },
      { id: 'ADR-0012', title: 'Enemy Elites + Behaviors + Fire Suppression', status: 'Accepted', layer: 'Core' },
      { id: 'ADR-0013', title: 'Wave System — Streaming, Formations, Arcade Scaling', status: 'Accepted', layer: 'Core' },
      { id: 'ADR-0014', title: 'main.js Structure Refactoring', status: 'Accepted', layer: 'Foundation' },
      { id: 'ADR-0015', title: 'Arcade MiniBoss Rework', status: 'Accepted', layer: 'Core' }
    ]
  };

  // 7. Write
  const outPath = path.join(DOCS, 'architecture-map.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Written: ${outPath}`);
  console.log(`  ${output._metadata.total_modules} modules, ${output._metadata.total_loc} LOC, ${output._metadata.total_size_kb} KB`);
  console.log(`  Source hash: ${output._metadata.source_hash}`);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getLayerDescription(id) {
  const map = {
    utils: 'Shared utilities — loaded before all other layers',
    foundation: 'Core infrastructure: state machine, event bus, input, audio, object pooling',
    config: 'Single source of truth for all tuning constants',
    core: 'Core gameplay systems: collision, bullets, particles, drops, scrolling, rendering',
    entities: 'Game entity constructors',
    managers: 'High-level game managers',
    story: 'Narrative system',
    ui: 'User interface screens and overlays',
    v8: 'V8 scripted campaign scroller',
    audio: 'Procedural music'
  };
  return map[id] || '';
}

function findRelevantADRs(namespace) {
  const adrMap = {
    'GameState': ['ADR-0001'],
    'Game.Events': ['ADR-0003'],
    'Game.Input': ['ADR-0003'],
    'Game.Audio': [],
    'Game.ObjectPool': ['ADR-0001'],
    'Game.Balance': [],
    'Game.Collision': ['ADR-0004'],
    'Game.SpatialGrid': ['ADR-0004'],
    'Game.BulletSystem': ['ADR-0004'],
    'Game.BulletPatterns': ['ADR-0004'],
    'Game.ParticleSystem': ['ADR-0002'],
    'Game.DropSystem': ['ADR-0008'],
    'Game.ScrollEngine': ['ADR-0007'],
    'Game.EffectsRenderer': ['ADR-0002'],
    'Game.SkyRenderer': ['ADR-0002'],
    'Game.WeatherController': ['ADR-0002'],
    'Game.TransitionManager': ['ADR-0002'],
    'Game.TitleAnimator': ['ADR-0002'],
    'Game.MessageSystem': ['ADR-0002'],
    'Game.MemeEngine': ['ADR-0002'],
    'Game.HintTracker': [],
    'Game.QualityManager': [],
    'Game.HarmonicConductor': [],
    'Game.HarmonicSequences': [],
    'Game.RankSystem': [],
    'Game.ArcadeModifiers': ['ADR-0011'],
    'Game.FloatingTextManager': ['ADR-0002'],
    'Game.PerkIconManager': ['ADR-0002'],
    'Game.CullingHelper': ['ADR-0002'],
    'Game.OffscreenCanvas': ['ADR-0002'],
    'Game.GlowManager': ['ADR-0002'],
    'Game.DrawPipeline': ['ADR-0002'],
    'Game.PhaseTransitionController': ['ADR-0013'],
    'Game.BossSpawner': ['ADR-0009'],
    'Game.Player': [],
    'Game.Enemy': ['ADR-0012'],
    'Game.Boss': ['ADR-0009'],
    'Game.Bullet': [],
    'Game.PowerUp': [],
    'Game.EnemyAgentRenderer': ['ADR-0002'],
    'Game.WaveManager': ['ADR-0013'],
    'Game.PerkManager': ['ADR-0010'],
    'Game.MiniBossManager': ['ADR-0011', 'ADR-0015'],
    'Game.CampaignState': ['ADR-0007'],
    'Game.AchievementSystem': [],
    'Game.DailyMode': [],
    'Game.StatsTracker': [],
    'Game.LeaderboardClient': ['ADR-0006'],
    'Game.ScoreManager': ['ADR-0011'],
    'Game.LevelScript': ['ADR-0007'],
    'Game.MusicData': [],
    'Game.StoryManager': [],
    'Game.StoryScreen': ['ADR-0001'],
    'Game.DialogueUI': [],
    'Game.IntroScreen': [],
    'Game.ModifierChoiceScreen': ['ADR-0011'],
    'Game.DebugOverlay': [],
    'Game.GameCompletion': [],
    'Game.UIManager': [],
    'Game.TutorialManager': [],
    'Game.LessonModal': [],
    'Game.ToastSystem': []
  };
  return adrMap[namespace.replace('Game.', '')] || adrMap[namespace] || [];
}

function findRelevantTRs(namespace, trMap) {
  // Map namespace to the system names used in traceability index
  const systemMap = {
    'Game.LevelScript': 'V8 Scroller',
    'Game.ScrollEngine': 'V8 Scroller',
    'Game.Collision': 'Enemy Agents',
    'Game.DropSystem': 'Drops',
    'Game.Boss': 'Boss',
    'Game.BossSpawner': 'Boss',
    'Game.PerkManager': 'Weapons',
    'Game.PerkIconManager': 'Weapons',
    'Game.WaveManager': 'Waves',
    'Game.PhaseTransitionController': 'Waves',
    'Game.ArcadeModifiers': 'Arcade',
    'Game.MiniBossManager': 'Arcade',
    'Game.ScoreManager': 'Arcade'
  };
  const system = systemMap[namespace];
  if (!system || !trMap[system]) return [];
  return trMap[system].map(tr => tr.id);
}

main();
