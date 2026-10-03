// Inspect public component contracts without evaluating their browser code.
import ts from "typescript";
import { readSource } from "./registry.mjs";

const exported = (node) => node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
export function importSpecifiers(source) {
  const specifiers = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === "require") && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) specifiers.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return specifiers;
}

export function componentContract(path) {
  const source = readSource(path);
  const functions = source.statements.filter((node) => exported(node) && ts.isFunctionDeclaration(node) && node.name);
  const component = functions.find((node) => /^[A-Z]/.test(node.name.text));
  if (!component) throw new Error(`${path}: missing named component export`);
  const values = source.statements.filter(exported).flatMap((node) => {
    if (ts.isFunctionDeclaration(node)) return node.name ? [node.name.text] : [];
    if (ts.isVariableStatement(node)) return node.declarationList.declarations.map((declaration) => declaration.name.getText(source));
    return [];
  });
  const types = source.statements.filter((node) => exported(node) && (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))).map((node) => node.name.text);
  const parameter = component.parameters[0];
  const typeName = parameter?.type?.getText(source);
  const type = source.statements.find((node) => (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name.text === typeName);
  const members = type && (ts.isInterfaceDeclaration(type) ? type.members : ts.isTypeLiteralNode(type.type) ? type.type.members : []);
  const defaults = new Map(parameter && ts.isObjectBindingPattern(parameter.name) ? parameter.name.elements.map((element) => [element.propertyName?.getText(source) ?? element.name.getText(source), element.initializer?.getText(source)]) : []);
  const props = [...(members ?? [])].filter(ts.isPropertySignature).map((member) => ({
    name: member.name.getText(source),
    type: member.type?.getText(source).replace(/\s+/g, " ") ?? "unknown",
    required: !member.questionToken,
    default: defaults.get(member.name.getText(source)),
    description: (member.jsDoc ?? []).map((doc) => typeof doc.comment === "string" ? doc.comment : "").filter(Boolean).join(" ").replace(/\s+/g, " "),
  }));
  return { component: component.name.text, values, types, props, imports: importSpecifiers(source) };
}

export function renderIndex(contract, id) {
  return `export { ${contract.values.join(", ")} } from "./${id}";\n${contract.types.length ? `export type { ${contract.types.join(", ")} } from "./${id}";\n` : ""}`;
}
