// Read registry metadata without evaluating application code. All repository
// guards and the README generator share this parser so formatting cannot hide
// entries or make one component borrow fields from the next one.
import { readFileSync } from "node:fs";
import ts from "typescript";

export function readSource(path) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  if (source.parseDiagnostics.length) {
    throw new Error(`${path}: ${ts.flattenDiagnosticMessageText(source.parseDiagnostics[0].messageText, " ")}`);
  }
  return source;
}

function initializer(source, name) {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const declaration = statement.declarationList.declarations.find((d) => d.name.getText(source) === name);
    if (declaration) {
      let value = declaration.initializer;
      while (value && (ts.isSatisfiesExpression(value) || ts.isAsExpression(value) || ts.isParenthesizedExpression(value))) value = value.expression;
      return value;
    }
  }
  throw new Error(`missing ${name} declaration`);
}

function objectProperties(node, label) {
  if (!node || !ts.isObjectLiteralExpression(node)) throw new Error(`${label}: expected an object literal`);
  const properties = new Map();
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) throw new Error(`${label}: expected explicit properties`);
    const name = property.name.text;
    if (properties.has(name)) throw new Error(`${label}: duplicate property ${name}`);
    properties.set(name, property.initializer);
  }
  return properties;
}

function stringProperty(properties, key, label) {
  const node = properties.get(key);
  if (!node || !ts.isStringLiteralLike(node) || !node.text.trim()) throw new Error(`${label}: missing or nonliteral ${key}`);
  return node.text;
}

export function readRegistry(path = "src/lib/component-registry.ts") {
  const source = readSource(path);
  const registry = objectProperties(initializer(source, "componentRegistry"), "componentRegistry");
  if (!registry.size) throw new Error("componentRegistry is empty");
  const ids = new Set();
  const entries = [...registry.values()].map((value) => {
    if (!ts.isCallExpression(value) || value.expression.getText(source) !== "createComponentMeta" || value.arguments.length !== 1) throw new Error("expected createComponentMeta({ ... })");
    const properties = objectProperties(value.arguments[0], "component metadata");
    const entry = {};
    for (const key of ["id", "title", "description", "category", "codePath"]) entry[key] = stringProperty(properties, key, "component metadata");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) throw new Error(`invalid component id: ${entry.id}`);
    if (ids.has(entry.id)) throw new Error(`duplicate component id: ${entry.id}`);
    ids.add(entry.id);
    const assets = properties.get("requiredAssets");
    if (assets && !ts.isArrayLiteralExpression(assets)) throw new Error(`[${entry.id}]: requiredAssets must be an array literal`);
    entry.requiredAssets = assets ? assets.elements.map((asset, index) => {
      const label = `[${entry.id}] requiredAssets[${index}]`;
      const fields = objectProperties(asset, label);
      return Object.fromEntries(["path", "license", "credit"].map((key) => [key, stringProperty(fields, key, label)]));
    }) : [];
    return entry;
  });
  const videoSet = initializer(source, "COMPONENTS_WITH_PREVIEW_VIDEO");
  if (!videoSet || !ts.isNewExpression(videoSet) || videoSet.expression.getText(source) !== "Set" || videoSet.arguments?.length !== 1 || !ts.isArrayLiteralExpression(videoSet.arguments[0])) throw new Error("expected COMPONENTS_WITH_PREVIEW_VIDEO = new Set([...])");
  const videoIds = videoSet.arguments[0].elements.map((node) => {
    if (!ts.isStringLiteralLike(node) || !ids.has(node.text)) throw new Error("preview video references an unknown or nonliteral component id");
    return node.text;
  });
  return { entries, videoIds: new Set(videoIds) };
}

export function readComponentMapIds(path = "src/lib/component-map.tsx") {
  const source = readSource(path);
  return new Set(objectProperties(initializer(source, "componentMap"), "componentMap").keys());
}
