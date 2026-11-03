import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';

const source = readFileSync('components/play/bead-club/bead-club.tsx', 'utf8');
const ast = ts.createSourceFile('bead-club.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = ast.statements.filter(node =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'fusedShapes' ||
  ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(ast) === 'cakePatterns')
).map(node => node.getText(ast)).join('\n');
const code = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const { cakePatterns, fusedShapes } = new Function('THREE', `${code}; return { cakePatterns, fusedShapes };`)(THREE);

for (const [id, pattern] of Object.entries(cakePatterns)) {
  test(`${id}: 500 beads, valid colors and no stretched outline`, () => {
    const beads = pattern.rows.flatMap((row, y) => [...row].flatMap((c, x) => c === '.' ? [] : [{ x, y, color: pattern.palette[parseInt(c, 24)] }]));
    assert.equal(beads.length, 500);
    assert.ok(beads.every(b => /^#[0-9a-f]{6}$/i.test(b.color)));
    assert.ok(beads.every(b => b.x >= 0 && b.x < 40 && b.y >= 0 && b.y < 42));
    const geometry = new THREE.ExtrudeGeometry(fusedShapes(beads), { depth: .34, bevelEnabled: true, bevelThickness: .13, bevelSize: .14, bevelSegments: 4, curveSegments: 3 });
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    const left = Math.min(...beads.map(b => b.x)) - 20;
    const right = Math.max(...beads.map(b => b.x)) + 1 - 20;
    const bottom = 21 - Math.max(...beads.map(b => b.y)) - 1;
    const top = 21 - Math.min(...beads.map(b => b.y));
    assert.ok(min.x >= left - .2 && max.x <= right + .2, `x outline exceeds bead bounds: ${min.x}, ${max.x}`);
    assert.ok(min.y >= bottom - .2 && max.y <= top + .2, `y outline exceeds bead bounds: ${min.y}, ${max.y}`);
    assert.ok(max.z - min.z < .7, 'thickness must stay subtle');
    assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
    geometry.dispose();
  });
}
