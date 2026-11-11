#include <metal_stdlib>
using namespace metal;

struct BlossomUniforms {
    float time;
    float brightness;
    float warmth;
    float toneProgress;
    uint hasWallpaper;
    uint reducedMotion;
};

vertex float4 blossomVertex(uint id [[vertex_id]]) {
    const float2 vertices[3] = {float2(-1, -1), float2(3, -1), float2(-1, 3)};
    return float4(vertices[id], 0, 1);
}

static float hash(float2 p) {
    return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

static float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + float2(1, 0)), f.x),
               mix(hash(i + float2(0, 1)), hash(i + 1.0), f.x), f.y);
}

static float2 wind(float2 p, float time, bool reduced) {
    float2 base = float2(0.006, 0.009);
    float drift = reduced ? 0.0 : sin(time * 0.37);
    float2 q = p * (base + drift * float2(0.0022, -0.0014));
    float x = noise(q) * 0.65 + noise(q * 2.0 + 7.0) * 0.35;
    float y = noise(q + 13.0) * 0.65 + noise(q * 2.0 + 23.0) * 0.35;
    float amplitude = reduced ? 30.0 : 29.0 + sin(time * 0.7) * 7.0;
    return p + amplitude * (float2(x, y) - 0.5);
}

static float3 saturation(float3 rgb, float amount) {
    float luminance = dot(rgb, float3(0.213, 0.715, 0.072));
    return saturate(mix(float3(luminance), rgb, amount));
}

static float3 warmTint(float3 rgb) {
    float3 sepia = float3(dot(rgb, float3(0.393, 0.769, 0.189)),
                          dot(rgb, float3(0.349, 0.686, 0.168)),
                          dot(rgb, float3(0.272, 0.534, 0.131)));
    float3 warm = saturation(saturate(mix(rgb, sepia, 0.92)), 1.3);
    // CSS hue-rotate(-4deg), then brightness(1.03).
    float3 rotated = float3(dot(warm, float3(0.983277, 0.051619, -0.034897)),
                            dot(warm, float3(0.010285, 0.988887, 0.000828)),
                            dot(warm, float3(0.055381, -0.048119, 0.992738)));
    return saturate(rotated * 1.03);
}

static float3 leafShadow(float2 p) {
    // The offline wall is original procedural artwork.
    float2 branch = p + float2(sin(p.y * 8.0), sin(p.x * 7.0)) * 0.06;
    float foliage = noise(branch * 4.0 + 5.2) * 0.57 + noise(p * 10.0 - 1.7) * 0.28
                  + noise(p * 23.0 + 4.1) * 0.15;
    float shadow = smoothstep(0.32, 0.66, foliage);
    return mix(float3(0.985, 0.983, 0.965), float3(0.707, 0.748, 0.763), shadow);
}

fragment float4 blossomScene(float4 position [[position]], constant BlossomUniforms &u [[buffer(0)]],
                             constant float &resolution [[buffer(1)]],
                             texture2d<float> wallpaper [[texture(0)]]) {
    constexpr sampler sampleImage(address::clamp_to_edge, filter::linear);
    float2 p = position.xy * (420.0 / resolution);
    float t = u.time;
    float2 lean = u.reducedMotion ? float2(0) : float2(sin(t * 0.23) * 12.0, sin(t * 0.14 + 1.7) * 7.0);
    float angle = u.reducedMotion ? 0.0 : sin(t * 0.11 + 0.6) * 0.00872664626;
    float scale = u.reducedMotion ? 1.1 : 1.1 + sin(t * 0.09) * 0.02;
    float2 point = p - 210.0 - lean;
    float2 imagePoint = float2(cos(angle) * point.x + sin(angle) * point.y,
                               -sin(angle) * point.x + cos(angle) * point.y) / scale + 210.0;
    float2 uv = wind(imagePoint, t, u.reducedMotion != 0) / 420.0;

    float3 wall;
    if (u.hasWallpaper) {
        float ratio = float(wallpaper.get_width()) / float(wallpaper.get_height());
        uv = ratio >= 1.0 ? float2((uv.x - 0.5) / ratio + 0.5, uv.y)
                          : float2(uv.x, (uv.y - 1.0) * ratio + 1.0);
        wall = wallpaper.sample(sampleImage, uv).rgb;
    } else {
        wall = leafShadow(uv);
    }

    wall = mix(wall, warmTint(wall), u.warmth * u.warmth);
    wall = saturation(wall * (0.66 + u.brightness * 0.34), 1.12 - u.brightness * 0.12);
    wall *= mix(float3(1), float3(46.0, 50.0, 96.0) / 255.0, (1.0 - u.brightness) * 0.5);
    return float4(wall, 1);
}

static float roundedBox(float2 p, float2 center, float2 halfSize, float radius) {
    float2 q = abs(p - center) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

fragment float4 blossomGlass(float4 position [[position]], constant BlossomUniforms &u [[buffer(0)]],
                             constant float &resolution [[buffer(1)]],
                             texture2d<float> wall [[texture(0)]]) {
    constexpr sampler sampleWall(address::clamp_to_edge, filter::linear);
    float2 uv = position.xy / resolution;
    float2 p = uv * 420.0;
    float pill = roundedBox(p, float2(121, 210), float2(36, 100), 36);
    float toneHalf = u.toneProgress * 47.5;
    float tone = roundedBox(p, float2(251, 110 + toneHalf), float2(84, toneHalf), min(22.0, toneHalf));
    float mask = max(1.0 - smoothstep(-0.5, 0.5, pill),
                     (1.0 - smoothstep(-0.5, 0.5, tone)) * u.toneProgress);
    float3 regular = wall.sample(sampleWall, uv).rgb;
    if (mask <= 0.0) return float4(regular, 1.0);

    // Five offsets in each direction approximate the 14-point CSS Gaussian.
    float3 blur = 0.0;
    const float weights[5] = {0.06136, 0.24477, 0.38774, 0.24477, 0.06136};
    for (int y = 0; y < 5; y++) {
        for (int x = 0; x < 5; x++) {
            float2 offset = float2(x - 2, y - 2) * (14.0 / 420.0);
            blur += wall.sample(sampleWall, uv + offset).rgb * weights[x] * weights[y];
        }
    }
    return float4(mix(regular, saturation(blur, 1.3), mask), 1.0);
}
