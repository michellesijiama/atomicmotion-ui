// Native implementation of the React scene. The GGX, environment and volume
// terms follow Three.js MeshPhysicalMaterial (see Three-LICENSE.txt).
#include <metal_stdlib>
using namespace metal;

constant float cameraZ = 4.9f;
constant float focalLength = 2.605089f; // cot(42° / 2)
constant float paperSide = 3.35f;
constant float paperDepth = 6.55f;
constant float pi = 3.14159265f;
constexpr sampler linearClamp(coord::normalized, address::clamp_to_edge, filter::linear, mip_filter::linear);
constexpr sampler linearRepeat(coord::normalized, address::repeat, filter::linear, mip_filter::linear);

struct Uniforms {
    float4 viewport; // width, height, aspect, original mesh scale
    float4 offset;
};

struct Vertex {
    packed_half4 positionU;
    packed_half4 normalV;
};

struct Surface {
    float4 position [[position]];
    float3 world;
    float3 normal;
    float2 uv;
};

vertex float4 paperVertex(uint id [[vertex_id]]) {
    const float2 points[] = {float2(-1, -1), float2(3, -1), float2(-1, 3)};
    return float4(points[id], 0.998f, 1);
}

float2 paperUV(float2 world) {
    return float2(world.x, -world.y) / paperSide + 0.5f;
}

fragment float4 paperFragment(float4 position [[position]], constant Uniforms &u [[buffer(0)]],
                             texture2d<float> paper [[texture(0)]]) {
    float2 ndc = position.xy / u.viewport.xy * 2.0f - 1.0f;
    float2 uv = paperUV(ndc * float2(u.viewport.z, -1) * (paperDepth / focalLength));
    float opacity = smoothstep(0.42f, 0.58f, paper.sample(linearClamp, uv).a);
    return float4(float3(18, 20, 19) / 255.0f * opacity, opacity);
}

vertex Surface gummyVertex(const device Vertex *mesh [[buffer(0)]], constant Uniforms &u [[buffer(1)]],
                           uint id [[vertex_id]]) {
    float4 position = float4(mesh[id].positionU);
    float4 normal = float4(mesh[id].normalV);
    float3 world = position.xyz + u.offset.xyz;
    float depth = cameraZ - world.z;
    float4 projected = float4(world.x * focalLength / u.viewport.z, world.y * focalLength,
                              (depth * 100.0f - 10.0f) / 99.9f, depth);
    return {projected, world, normal.xyz, float2(position.w, normal.w)};
}

float3 srgbDecode(float3 color) {
    return select(color / 12.92f, pow((color + 0.055f) / 1.055f, float3(2.4f)), color > 0.04045f);
}

float3 toneMap(float3 color) {
    const float3x3 input = float3x3(float3(0.59719f, 0.07600f, 0.02840f),
                                  float3(0.35458f, 0.90834f, 0.13383f),
                                  float3(0.04823f, 0.01566f, 0.83777f));
    const float3x3 output = float3x3(float3(1.60475f, -0.10208f, -0.00327f),
                                   float3(-0.53108f, 1.10813f, -0.07276f),
                                   float3(-0.07367f, -0.00605f, 1.07602f));
    float3 v = input * (color * (1.18f / 0.6f));
    float3 mapped = saturate(output * ((v * (v + 0.0245786f) - 0.000090537f) /
        (v * (0.983729f * v + 0.432951f) + 0.238081f)));
    return select(mapped * 12.92f, 1.055f * pow(mapped, float3(1.0f / 2.4f)) - 0.055f, mapped > 0.0031308f);
}

float3 sampleRoom(texture2d<float> room, float3 d, float mip) {
    float3 a = abs(d);
    float face;
    float2 uv;
    if (a.x > a.z && a.x > a.y) {
        face = d.x > 0 ? 0 : 3;
        uv = float2(d.x > 0 ? d.z : -d.z, d.y) / a.x;
    } else if (a.z >= a.x && a.z > a.y) {
        face = d.z > 0 ? 2 : 5;
        uv = float2(d.z > 0 ? -d.x : d.x, d.y) / a.z;
    } else {
        face = d.y > 0 ? 1 : 4;
        uv = float2(-d.x, d.y > 0 ? -d.z : d.z) / a.y;
    }

    float filter = max(4.0f - mip, 0.0f);
    float side = exp2(max(mip, 4.0f));
    uv = (uv * 0.5f + 0.5f) * (side - 2.0f) + 1.0f;
    uv.x += fmod(face, 3.0f) * side + filter * 48.0f;
    uv.y += (face >= 3 ? side : 0) + 4.0f * (256.0f - side);
    // The atlas is stored in WebGL readback order, with row zero at texture v=0.
    return room.sample(linearClamp, uv / float2(room.get_width(), room.get_height())).rgb;
}

float3 environment(texture2d<float> room, float3 direction, float roughness) {
    float mip;
    if (roughness >= 0.8f) mip = (1.0f - roughness) / 0.2f - 2.0f;
    else if (roughness >= 0.4f) mip = (0.8f - roughness) * 7.5f - 1.0f;
    else if (roughness >= 0.21f) mip = (0.4f - roughness) / 0.095f + 2.0f;
    else mip = -2.0f * log2(1.16f * roughness);
    mip = clamp(mip, -2.0f, 8.0f);
    return mix(sampleRoom(room, direction, floor(mip)), sampleRoom(room, direction, ceil(mip)), fract(mip)) * 1.05f;
}

float2 dfg(float3 n, float3 view, float roughness) {
    float4 r = roughness * float4(-1, -0.0275f, -0.572f, 0.022f) + float4(1, 0.0425f, 1.04f, -0.04f);
    float a = min(r.x * r.x, exp2(-9.28f * saturate(dot(n, view)))) * r.x + r.y;
    return float2(-1.04f, 1.04f) * a + r.zw;
}

float3 schlick(float3 f0, float dotVH) {
    return mix(f0, float3(1), exp2((-5.55473f * dotVH - 6.98316f) * dotVH));
}

float3 ggx(float3 n, float3 v, float3 l, float roughness, float3 f0) {
    float3 halfway = normalize(l + v);
    float nv = saturate(dot(n, v));
    float nl = saturate(dot(n, l));
    float nh = saturate(dot(n, halfway));
    float a2 = pow(roughness, 4.0f);
    float visibility = 0.5f / max(nl * sqrt(a2 + (1 - a2) * nv * nv) + nv * sqrt(a2 + (1 - a2) * nl * nl), 1e-6f);
    float denominator = nh * nh * (a2 - 1) + 1;
    return schlick(f0, saturate(dot(v, halfway))) * (nl * visibility * a2 / (pi * denominator * denominator));
}

void light(float3 direction, float3 color, float3 n, float3 nc, float3 v,
           float roughness, float coatRoughness, float3 f0, thread float3 &specular, thread float3 &coat) {
    specular += color * ggx(n, v, direction, roughness, f0);
    coat += color * ggx(nc, v, direction, coatRoughness, float3(0.04f));
}

void pointLight(float3 location, float3 color, float range, float3 world, float3 n, float3 nc, float3 v,
                float roughness, float coatRoughness, float3 f0, thread float3 &specular, thread float3 &coat) {
    float3 offset = location - world;
    float distance = length(offset);
    float cutoff = saturate(1.0f - pow(distance / range, 4.0f));
    light(offset / distance, color * cutoff * cutoff / max(distance * distance, 0.01f),
          n, nc, v, roughness, coatRoughness, f0, specular, coat);
}

float3 bumpNormal(Surface s, float3 n, texture2d<float> material) {
    float2 uv = s.uv * 4.0f;
    float height = material.sample(linearRepeat, uv).g;
    float dx = 0.012f * (material.sample(linearRepeat, uv + dfdx(uv)).g - height);
    float dy = 0.012f * (material.sample(linearRepeat, uv + dfdy(uv)).g - height);
    float3 tangentX = normalize(dfdx(s.world));
    float3 tangentY = normalize(dfdy(s.world));
    float3 r1 = cross(tangentY, n);
    float3 r2 = cross(n, tangentX);
    float determinant = dot(tangentX, r1);
    return normalize(abs(determinant) * n - sign(determinant) * (dx * r1 + dy * r2));
}

float inkSample(texture2d<float> paper, float3 position, float roughness, constant Uniforms &u) {
    float2 uv = paperUV(position.xy * paperDepth / (cameraZ - position.z));
    float projectedPixels = u.viewport.y * focalLength * paperSide / (2.0f * paperDepth);
    float mip = max(0.0f, log2(1024.0f / projectedPixels)) + log2(u.viewport.x) * roughness;
    float footprint = exp2(mip) / 1024.0f;
    // Four taps model the WebGL opaque glyph pass before the transmission filter.
    float ink = 0.0f;
    for (int y = -1; y <= 1; y += 2) {
        for (int x = -1; x <= 1; x += 2) {
            float2 delta = float2(x, y) * footprint * 0.55f;
            ink += smoothstep(0.35f, 0.68f, paper.sample(linearClamp, uv + delta, level(max(0.0f, mip - 1.0f))).a);
        }
    }
    return ink * 0.25f;
}

fragment float4 gummyFragment(Surface s [[stage_in]], constant Uniforms &u [[buffer(0)]],
                             texture2d<float> paper [[texture(0)]], texture2d<float> room [[texture(1)]],
                             texture2d<float> material [[texture(2)]]) {
    float3 nc = normalize(s.normal);
    float3 n = bumpNormal(s, nc, material);
    float3 v = normalize(float3(0, 0, cameraZ) - s.world);
    float3 derivative = max(abs(dfdx(nc)), abs(dfdy(nc)));
    float geometryRoughness = max(derivative.x, max(derivative.y, derivative.z));
    float roughness = min(0.0525f + geometryRoughness, 1.0f);
    float coatRoughness = min(0.08f + geometryRoughness, 1.0f);
    float thickness = material.sample(linearRepeat, s.uv).r * 4.6f * u.viewport.w;
    const float3 gummy = srgbDecode(float3(255, 120, 154) / 255.0f);
    const float3 attenuation = srgbDecode(float3(255, 70, 116) / 255.0f);
    const float3 f0 = srgbDecode(float3(255, 240, 223) / 255.0f) / 9.0f;

    float3 specular = float3(0), coat = float3(0);
    light(normalize(float3(2, 3, 4)), float3(1), n, nc, v, roughness, coatRoughness, f0, specular, coat);
    light(normalize(float3(-1.5f, 2, -5)), srgbDecode(float3(255, 242, 216) / 255.0f) * 3.5f,
          n, nc, v, roughness, coatRoughness, f0, specular, coat);
    pointLight(float3(-3, -1.5f, 2.4f), srgbDecode(float3(255, 192, 181) / 255.0f) * 24.0f, 14.0f,
               s.world, n, nc, v, roughness, coatRoughness, f0, specular, coat);
    pointLight(float3(3, 2, -1.2f), srgbDecode(float3(255, 79, 122) / 255.0f) * 28.0f, 14.0f,
               s.world, n, nc, v, roughness, coatRoughness, f0, specular, coat);
    pointLight(float3(0, -0.05f, -1.2f), srgbDecode(float3(255, 66, 106) / 255.0f) * 8.0f, 4.0f,
               s.world, n, nc, v, roughness, coatRoughness, f0, specular, coat);

    float2 baseBRDF = dfg(n, v, roughness);
    float3 fresnel = f0 * baseBRDF.x + baseBRDF.y;
    float3 reflected = normalize(mix(reflect(-v, n), n, roughness * roughness));
    specular += environment(room, reflected, roughness) * fresnel;
    float remainder = 1.0f - baseBRDF.x - baseBRDF.y;
    float3 meanFresnel = f0 + (1.0f - f0) * 0.047619f;
    specular += environment(room, n, 1.0f) * fresnel * meanFresnel * remainder / (1.0f - meanFresnel * remainder);

    float2 coatBRDF = dfg(nc, v, coatRoughness);
    float3 coatRay = normalize(mix(reflect(-v, nc), nc, coatRoughness * coatRoughness));
    coat += environment(room, coatRay, coatRoughness) * (coatBRDF.x * 0.04f + coatBRDF.y);

    float3 transmittedInk;
    for (int channel = 0; channel < 3; channel++) {
        float index = 2.0f + (float(channel) - 1.0f) * 0.00125f;
        float3 exit = s.world + refract(-v, n, 1.0f / index) * thickness;
        transmittedInk[channel] = inkSample(paper, exit, roughness, u);
    }
    float3 transmittance = gummy * pow(attenuation, float3(thickness / 7.0f));
    // The WebGL transmission pass clears to premultiplied white at alpha 0.5.
    float3 transmittedColor = mix(float3(0.5f), srgbDecode(float3(18, 20, 19) / 255.0f), transmittedInk);
    float3 color = (1.0f - fresnel) * transmittance * transmittedColor + specular;
    color = color * (1.0f - 0.95f * schlick(float3(0.04f), saturate(dot(nc, v)))) + coat * 0.95f;
    float alpha = 1.0f - dot(1.0f - transmittedInk, transmittance) / 6.0f;
    // Three.js stores the physically computed color directly in its alpha framebuffer.
    return float4(toneMap(color), alpha);
}
