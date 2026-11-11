// Native Metal translation of the React Gradient Event Card's aura shader.
#include <metal_stdlib>
using namespace metal;

struct AuraUniforms {
  float4 ramp[7];
  float4 accent[4];
  float time;
  float seed;
  float pattern;
  float padding;
};

vertex float4 gradientVertex(uint index [[vertex_id]]) {
  const float2 points[] = {float2(-1, -1), float2(3, -1), float2(-1, 3)};
  return float4(points[index], 0, 1);
}

constant float PI = 3.14159265f;

float hash(float2 p) { float3 q = fract(p.xyx * 0.1031f); q += dot(q, q.yzx + 33.33f); return fract((q.x + q.y) * q.z); }

// Heat: a disc is a soft blob; a ring is heat gathered along an ellipse's
// outline; a segment is heat along a line. `soft` is how far each one blurs.
float disc(float2 p, float2 c, float r) { float2 q = p - c; return exp(-dot(q, q) / (r * r)); }

float2 rot(float2 q, float a) { float c = cos(a), s = sin(a); return float2(c * q.x + s * q.y, -s * q.x + c * q.y); }

float ring(float2 p, float2 c, float2 r, float tilt, float soft, float beads, float off, float a0, float a1) {
  float2 q = rot(p - c, tilt);
  float2 n = q / r;
  float d = (length(n) - 1.0f) * min(r.x, r.y);
  float heat = exp(-(d * d) / (soft * soft));
  float ang = atan2(n.y, n.x);
  if (beads > 0.5f) heat *= 0.62f + 0.38f * (0.5f + 0.5f * cos((ang / (2.0f * PI) * beads + off) * 2.0f * PI));
  float arc = smoothstep(a0 - 0.5f, a0 + 0.3f, ang) * (1.0f - smoothstep(a1 - 0.3f, a1 + 0.5f, ang));
  return heat * arc;
}
float segment(float2 p, float2 a, float2 b, float soft) {
  float2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0f, 1.0f);
  float d = length(pa - ba * h);
  return exp(-(d * d) / (soft * soft));
}

// The field's ramp.
float3 ramp(constant AuraUniforms &u, float h) {
  h = clamp(h, 0.0f, 1.0f);
  h = pow(h, 0.78f) * 6.0f;
  float3 c = u.ramp[0].xyz;
  c = mix(c, u.ramp[1].xyz, clamp(h, 0.0f, 1.0f));
  c = mix(c, u.ramp[2].xyz, clamp(h - 1.0f, 0.0f, 1.0f));
  c = mix(c, u.ramp[3].xyz, clamp(h - 2.0f, 0.0f, 1.0f));
  c = mix(c, u.ramp[4].xyz, clamp(h - 3.0f, 0.0f, 1.0f));
  c = mix(c, u.ramp[5].xyz, clamp(h - 4.0f, 0.0f, 1.0f));
  c = mix(c, u.ramp[6].xyz, clamp(h - 5.0f, 0.0f, 1.0f));
  return c;
}

// Painting: every shape is its own little gradient — a wide, faint halo in
// one colour under a tighter body that runs from the halo colour into the
// core colour. So one circle can carry two hues, and neighbours can differ.
float3 accent(constant AuraUniforms &u, float i) {
  if (i < 0.5f) return u.accent[0].xyz;
  if (i < 1.5f) return u.accent[1].xyz;
  if (i < 2.5f) return u.accent[2].xyz;
  return u.accent[3].xyz;
}
void paint(thread float3 &col, float body, float halo, float3 haloColor, float3 coreColor, float strength) {
  col = mix(col, haloColor, smoothstep(0.02f, 0.7f, halo) * 0.55f * strength);
  float3 c = mix(haloColor, coreColor, smoothstep(0.15f, 0.95f, body));
  col = mix(col, c, smoothstep(0.03f, 0.6f, body) * 0.95f * strength);
}
void paintRing(constant AuraUniforms &u, thread float3 &col, float2 p, float2 c, float2 r, float tilt, float soft, float beads, float off, float a0, float a1, float haloI, float coreI, float strength) {
  float body = ring(p, c, r, tilt, soft, beads, off, a0, a1);
  float halo = ring(p, c, r, tilt, soft * 3.2f, beads, off, a0, a1);
  paint(col, body, halo, accent(u, haloI), accent(u, coreI), strength);
}
void paintDisc(constant AuraUniforms &u, thread float3 &col, float2 p, float2 c, float r, float haloI, float coreI, float strength) {
  paint(col, disc(p, c, r), disc(p, c, r * 2.2f), accent(u, haloI), accent(u, coreI), strength);
}
void paintSegment(constant AuraUniforms &u, thread float3 &col, float2 p, float2 a, float2 b, float soft, float haloI, float coreI, float strength) {
  paint(col, segment(p, a, b, soft), segment(p, a, b, soft * 3.0f), accent(u, haloI), accent(u, coreI), strength);
}

fragment float4 gradientAura(float4 position [[position]], constant AuraUniforms &u [[buffer(0)]]) {
  float2 pixel = float2(position.x, 512.0f - position.y);
  float2 uv = pixel / 512.0f;
  float t = u.time;
  float2 p = uv;
  float2 C = float2(0.5f, 0.56f);
  float breathe = 1.0f + 0.18f * sin(t * 0.7f + u.seed);
  float2 drift = 0.06f * float2(sin(t * 0.43f + u.seed), cos(t * 0.31f + u.seed * 1.3f));

  // The field: a wide, soft disc read through the ramp. The shapes are painted onto it.
  float3 col = ramp(u, disc(p, C + drift, 0.36f * breathe) * 0.55f);

  if (u.pattern < 0.5f) {
    // WAVES: arcs ripple out to the right, each in the next accent, dissolving as they go.
    paintDisc(u, col, p, C + float2(-0.12f, 0.0f) + drift, 0.11f + 0.05f * sin(t * 1.1f), 3.0f, 1.0f, 0.9f);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float ph = fract(t * 0.22f + fi * 0.25f);
      float2 c = C + float2(-0.2f + ph * 0.6f, 0.06f * sin(t * 0.8f + fi));
      float fade = smoothstep(0.0f, 0.15f, ph) * (1.0f - smoothstep(0.6f, 1.0f, ph));
      paintRing(u, col, p, c, float2(0.08f, 0.14f) * (0.5f + 1.3f * ph), 0.0f, 0.016f + 0.035f * ph, 0.0f, 0.0f, -1.3f, 1.3f, fmod(fi + 2.0f, 4.0f), fmod(fi, 4.0f), fade);
    }
  } else if (u.pattern < 1.5f) {
    // OVALS: two ovals in opposite colours breathe in turn, lean, and drift apart and together.
    float b1 = 1.0f + 0.32f * sin(t * 1.1f);
    float b2 = 1.0f + 0.32f * sin(t * 1.1f + PI);
    float lean = 0.45f * sin(t * 0.6f);
    float gap = 0.10f + 0.06f * sin(t * 0.8f);
    paintRing(u, col, p, C + float2(-gap, 0.0f), float2(0.085f, 0.17f) * b1, lean, 0.03f, 0.0f, 0.0f, -PI, PI, 3.0f, 0.0f, 1.0f);
    paintRing(u, col, p, C + float2(gap, 0.0f), float2(0.085f, 0.17f) * b2, -lean, 0.03f, 0.0f, 0.0f, -PI, PI, 1.0f, 2.0f, 1.0f);
    paintRing(u, col, p, C + float2(-gap, 0.0f), float2(0.05f, 0.12f) * b2, lean, 0.055f, 0.0f, 0.0f, -PI, PI, 0.0f, 1.0f, 0.7f);
    paintRing(u, col, p, C + float2(gap, 0.0f), float2(0.05f, 0.12f) * b1, -lean, 0.055f, 0.0f, 0.0f, -PI, PI, 2.0f, 3.0f, 0.7f);
  } else if (u.pattern < 2.5f) {
    // STACK: three ellipses shrinking upward, each its own colour, bouncing and swelling in turn.
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float bob = 0.05f * sin(t * 1.1f + fi * 1.4f);
      float2 c = C + float2(0.05f * sin(t * 0.7f + fi), -0.13f + fi * 0.115f + bob);
      float2 r = float2(0.21f, 0.09f) * (1.0f - fi * 0.3f) * (1.0f + 0.25f * sin(t * 1.1f + fi * 2.1f));
      float beads = i == 2 ? 10.0f : 0.0f;
      paintRing(u, col, p, c, r, 0.0f, 0.03f + 0.012f * fi, beads, t * 0.05f, -PI, PI, fmod(fi + 1.0f, 4.0f), fmod(fi * 2.0f, 4.0f), 1.0f);
    }
  } else if (u.pattern < 3.5f) {
    // ORBIT: a ring that flips over, a bead racing round it in a hot colour, a cool inner ring, a moon above.
    float tilt = 1.1f * sin(t * 0.35f);
    float2 R = float2(0.25f, 0.09f + 0.12f * (0.5f + 0.5f * sin(t * 0.5f)));
    paintRing(u, col, p, C + float2(0.0f, 0.04f), R, tilt, 0.032f, 0.0f, 0.0f, -PI, PI, 3.0f, 1.0f, 0.95f);
    paintRing(u, col, p, C + float2(0.0f, 0.04f), R * 0.55f, tilt, 0.06f, 0.0f, 0.0f, -PI, PI, 1.0f, 0.0f, 0.7f);
    float ph = t * 1.3f;
    float2 bead = C + float2(0.0f, 0.04f) + rot(float2(R.x * cos(ph), R.y * sin(ph)), -tilt);
    paintDisc(u, col, p, bead, 0.05f + 0.02f * sin(t * 2.0f), 0.0f, 2.0f, 1.0f);
    paintDisc(u, col, p, C + float2(0.0f, 0.2f), 0.04f, 2.0f, 3.0f, 0.8f);
  } else if (u.pattern < 4.5f) {
    // HOURGLASS: four beams in alternating colours pinch into a knot that pulses; the whole thing turns.
    float a = 0.7f * sin(t * 0.4f);
    float2 q = rot(p - C, a) + C;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float2 corner = C + float2(fi < 2.0f ? -0.36f : 0.36f, fmod(fi, 2.0f) < 0.5f ? -0.36f : 0.36f);
      paintSegment(u, col, q, corner, C + (corner - C) * 0.1f, 0.035f, fmod(fi, 2.0f) * 2.0f + 1.0f, fmod(fi, 2.0f) * 2.0f, 0.8f);
    }
    float pulse = 1.0f + 0.55f * sin(t * 1.1f);
    paintRing(u, col, q, C, float2(0.07f, 0.07f) * pulse, 0.0f, 0.03f, 0.0f, 0.0f, -PI, PI, 3.0f, 1.0f, 1.0f);
    paintDisc(u, col, q, C, 0.06f / pulse, 1.0f, 0.0f, 0.9f);
  } else if (u.pattern < 5.5f) {
    // SPHERE: a ball in one colour bounces up off a plate in another; the plate squashes on landing.
    float bob = abs(sin(t * 1.0f));
    float y = -0.02f + 0.17f * bob;
    paintRing(u, col, p, C + float2(0.0f, y), float2(0.19f, 0.19f), 0.0f, 0.035f, 0.0f, 0.0f, -PI, PI, 3.0f, 0.0f, 0.95f);
    paintDisc(u, col, p, C + float2(0.0f, y), 0.11f, 0.0f, 1.0f, 0.8f);
    float squash = 1.0f + 0.6f * (1.0f - bob);
    paintRing(u, col, p, C + float2(0.0f, -0.2f), float2(0.27f * squash, 0.04f), 0.0f, 0.03f, 0.0f, 0.0f, -PI, PI, 0.0f, 2.0f, 0.95f);
  } else if (u.pattern < 6.5f) {
    // COIL: five rings like a spring, colours cycling up the coil, swaying and stretching.
    float stretch = 1.0f + 0.4f * sin(t * 0.8f);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float sway = 0.10f * sin(t * 1.3f - fi * 0.8f);
      float2 c = C + float2(sway, (-0.17f + fi * 0.085f) * stretch);
      paintRing(u, col, p, c, float2(0.21f + 0.04f * sin(t * 1.3f - fi * 0.8f + 1.5f), 0.06f), 0.0f, 0.022f + 0.008f * fi, 0.0f, 0.0f, -PI, PI, fmod(fi + 3.0f, 4.0f), fmod(fi, 4.0f), 0.9f);
    }
  } else {
    // STREAKS: a disc rolling over, streaks in two colours rushing past it.
    float tilt = 0.9f * sin(t * 0.5f);
    paintRing(u, col, p, C, float2(0.18f + 0.05f * sin(t * 0.9f), 0.06f + 0.08f * (0.5f + 0.5f * sin(t * 0.7f))), tilt, 0.03f, 12.0f, t * 0.2f, -PI, PI, 3.0f, 2.0f, 1.0f);
    paintDisc(u, col, p, C, 0.09f + 0.04f * sin(t * 1.2f), 2.0f, 1.0f, 0.85f);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float slide = fract(t * 0.3f + fi * 0.25f);
      float x0 = -0.44f + slide * 0.88f;
      float yy = -0.15f + fi * 0.095f;
      float len = 0.10f + 0.06f * hash(float2(fi, u.seed));
      float fade = smoothstep(0.0f, 0.2f, slide) * (1.0f - smoothstep(0.8f, 1.0f, slide));
      paintSegment(u, col, p, C + float2(x0, yy), C + float2(x0 + len, yy), 0.028f, fmod(fi, 2.0f) * 3.0f, fmod(fi + 1.0f, 2.0f), fade * 0.85f);
    }
  }

  // Printed grain: fixed to the pixel, never swims.
  col += (hash(pixel * 0.71f + u.seed) - 0.5f) * 0.07f;

  return float4(col, 1.0f);
}

// The share control samples the same light through a 14-point blurred,
// saturated backdrop. Restrict the blur to its rounded rectangle.
fragment float4 gradientComposite(float4 position [[position]], texture2d<float> aura [[texture(0)]]) {
  constexpr sampler source(coord::normalized, address::clamp_to_edge, filter::linear);
  float2 uv = position.xy / 512.0f;
  float2 corner = abs(uv * 252.0f - float2(216.0f, 36.0f)) - 8.0f;
  float edge = length(max(corner, 0.0f)) + min(max(corner.x, corner.y), 0.0f) - 14.0f;
  float4 original = aura.sample(source, uv);
  if (edge >= 0.25f) return original;

  const float weights[] = {0.0545f, 0.2442f, 0.4026f, 0.2442f, 0.0545f};
  float3 blurred = 0.0f;
  for (int y = 0; y < 5; ++y) {
    for (int x = 0; x < 5; ++x) {
      float2 offset = float2(x - 2, y - 2) * (14.0f / 252.0f);
      blurred += aura.sample(source, uv + offset).rgb * weights[x] * weights[y];
    }
  }
  float gray = dot(blurred, float3(0.213f, 0.715f, 0.072f));
  float3 saturated = saturate(gray + (blurred - gray) * 1.4f);
  return float4(mix(original.rgb, saturated, 1.0f - smoothstep(-0.25f, 0.25f, edge)), 1.0f);
}
