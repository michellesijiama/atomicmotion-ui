import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  component: read("src/components/gradient-aura/gradient-aura.tsx"),
  registry: read("src/lib/component-registry.ts"),
  packageJson: read("package.json"),
  layout: read("src/app/layout.tsx"),
  model: existsSync("public/models/gummy-bear.glb"),
  poster: existsSync("public/gummy-bear-poster.png"),
};

const materialStart = files.component.indexOf("new THREE.MeshPhysicalMaterial");
const materialBlock =
  materialStart === -1
    ? ""
    : files.component.slice(materialStart, files.component.indexOf("});", materialStart) + 3);
const renderStart = files.component.indexOf("const render = () =>");
const renderBlock =
  renderStart === -1
    ? ""
    : files.component.slice(renderStart, files.component.indexOf("renderer.render(scene, camera);", renderStart));

const checks = [
  ["component file exists", files.component.length > 0],
  ["local gummy bear model exists", files.model],
  ["local gummy poster exists", files.poster],
  ["component still exports GradientAura", files.component.includes("export function GradientAura")],
  ["component keeps detail-only WebGL", files.component.includes("if (loop) return")],
  ["layout exposes Manrope for the text texture", files.layout.includes("Manrope") && files.layout.includes("--font-manrope")],
  ["component generates a Manrope text backdrop texture", files.component.includes("makeManropeTextTexture") && files.component.includes("getManropeFontFamily")],
  ["component uses a pure white blank canvas", files.component.includes('ctx.fillStyle = "#ffffff"') && !files.component.includes('ctx.fillStyle = "#f7f6ef"') && !files.component.includes('ctx.fillStyle = "#ece7db"')],
  ["component draws a normal paragraph that projects visually near 20px", files.component.includes("TEXT_PARAGRAPH") && files.component.includes("ctx.font = `500 40px ${fontFamily}`") && files.component.includes("wrapText(ctx, `${TEXT_PARAGRAPH} ${TEXT_PARAGRAPH}`")],
  ["component uses lowercase paragraph copy only", !files.component.includes("GUMMY BEAR LENS") && !files.component.includes("MAGNIFY") && !files.component.includes("THROUGH GLASS")],
  ["component does not draw grid or outline stripes on the text texture", !files.component.includes("ctx.stroke(") && !files.component.includes("ctx.lineTo(") && !files.component.includes("ctx.moveTo(")],
  ["component does not fake magnification with an overlay texture", !files.component.includes("makeMagnifiedTextTexture") && !files.component.includes("magnifiedTextMaterial") && !files.component.includes("alphaMap:") && !files.component.includes("updateMagnifiedTextWindow")],
  ["component no longer loads the botanical image backdrop", !files.component.includes('"/gummy-bear-backdrop.png"') && !files.component.includes("TextureLoader")],
  ["component renders backdrop as a square plane", files.component.includes("new THREE.PlaneGeometry(3.35, 3.35)")],
  ["component uses a square canvas texture without stretching", files.component.includes("canvas.width = TEXTURE_SIZE") && files.component.includes("canvas.height = TEXTURE_SIZE")],
  ["component places backdrop behind the gummy", files.component.includes("backdrop.position.set(0, 0, -1.65)")],
  ["component keeps backdrop solid for transmission sampling", !files.component.includes("opacity: 0.92") && !files.component.includes("transparent: true,\n      toneMapped: false")],
  ["component removes default color swatches", !files.component.includes("GUMMY_COLOR_PRESETS") && !files.component.includes("Set gummy color")],
  ["component does not use the native color input", !files.component.includes('type="color"')],
  ["component removes the circular color wheel", !files.component.includes("GUMMY_WHEEL_SIZE") && !files.component.includes("Gummy color wheel") && !files.component.includes("conic-gradient")],
  ["component removes color picker controls", !files.component.includes("Selected gummy color") && !files.component.includes("handleWheelPointer") && !files.component.includes("hsvToHex")],
  ["pointer interaction does not move the camera", !renderBlock.includes("camera.position.x +=") && !renderBlock.includes("camera.position.y +=")],
  ["pointer interaction turns gummy into a movable magnifier", renderBlock.includes("group.rotation.set(0, 0, 0)") && renderBlock.includes("group.position.x = cx * lensTravel.x") && renderBlock.includes("group.position.y = -cy * lensTravel.y")],
  ["pointer maps movement to the square backdrop area", files.component.includes("BACKDROP_SCREEN_RATIO") && files.component.includes("const backdropSize = Math.min(rect.width, rect.height * BACKDROP_SCREEN_RATIO)")],
  ["lens sits closer to the camera for stronger magnifying refraction", files.component.includes("group.position.z = -0.2")],
  ["lens travel is clamped by projected gummy bounds so it cannot crop", files.component.includes("const lensDepthScale = (camera.position.z - group.position.z) / (camera.position.z - backdrop.position.z)") && files.component.includes("backdropHalfAtLensDepth - fittedSize.x / 2 - LENS_EDGE_PADDING") && files.component.includes("backdropHalfAtLensDepth - fittedSize.y / 2 - LENS_EDGE_PADDING")],
  ["component stops idle rotation", !renderBlock.includes("Math.sin(t * 0.4)") && !renderBlock.includes("group.rotation.y") && !files.component.includes("new THREE.Clock()")],
  ["component uses MeshPhysicalMaterial", materialBlock.includes("new THREE.MeshPhysicalMaterial")],
  ["material uses full glassy transmission", materialBlock.includes("transmission: 1")],
  ["material uses transmission instead of alpha fading", materialBlock.includes("opacity: 1") && materialBlock.includes("transparent: false")],
  ["material keeps depth writing for refractive glass sorting", materialBlock.includes("depthWrite: true")],
  ["material uses stronger real volume for optical refraction", materialBlock.includes("thickness: 4.6")],
  ["material uses a thickness map", materialBlock.includes("thicknessMap: thicknessTex")],
  ["material uses a richer red-pink glass base so transmitted light is still readable", files.component.includes('const GUMMY_COLOR = "#ff789a"') && materialBlock.includes("color: new THREE.Color(GUMMY_COLOR)")],
  ["material attenuation uses soft red-pink glass color", materialBlock.includes('attenuationColor: new THREE.Color("#ff4674")')],
  ["material uses balanced attenuation distance for pink transmissive glass", materialBlock.includes("attenuationDistance: 7")],
  ["material uses glossy candy clearcoat", materialBlock.includes("clearcoat: 0.95")],
  ["material uses low roughness for glassy highlights", materialBlock.includes("roughness: 0.025")],
  ["material uses subtle dispersion", materialBlock.includes("dispersion: 0.05")],
  ["component removes the frosted shell", !files.component.includes("FROSTED_SHELL_OPACITY") && !files.component.includes("frostedShellMaterial")],
  ["component builds a gummy thickness texture", files.component.includes("makeGummyThicknessTexture")],
  ["component builds a fine pectin bump texture", files.component.includes("makePectinBumpTexture")],
  ["component disposes the backdrop texture", files.component.includes("backdropTexture.dispose()")],
  ["component disposes the new thickness texture", files.component.includes("thicknessTex.dispose()")],
  ["registry still names Gradient Gummy Bear", files.registry.includes('title: "Gradient Gummy Bear"')],
  ["package exposes verification script", files.packageJson.includes('"test:gradient-gummy"')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("gradient gummy material checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`gradient gummy material checks passed (${checks.length}/${checks.length}).`);
