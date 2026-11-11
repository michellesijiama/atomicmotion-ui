"""Build and render the Mango on Silver still life in Blender 5.2 / Cycles."""
import json
import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DRAFT = "--draft" in sys.argv
EXPORT = next((name for name in ("rednote", "wallpaper") if f"--{name}" in sys.argv), None)
OUTPUT = ROOT / (".tmp/mango-on-silver" if DRAFT else "output/mango-on-silver" if EXPORT else "public/studio/mango-on-silver")
FILENAME = "mango-on-silver" + (f"-{EXPORT}" if EXPORT else "")
WIDTH = 1080
HEIGHT = {"rednote": 1440, "wallpaper": 1920}.get(EXPORT, 1339)
SCALE = 2 if EXPORT and not DRAFT else 1
OUTPUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Mango on Silver · still life"


def collection(name):
    group = bpy.data.collections.new(name)
    scene.collection.children.link(group)
    return group


def mesh_object(name, vertices, faces, group, materials, smooth=True):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = smooth
    obj = bpy.data.objects.new(name, mesh)
    group.objects.link(obj)
    return obj


def material(name, color, roughness, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.location = (400, 80)
    mat.node_tree.nodes.get("Material Output").location = (715, 80)
    return mat, bsdf


def grain(mat, bsdf, coordinates, scale, distance, strength, location):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.label = "Fine surface relief"
    noise.location = location
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 2.3
    links.new(coordinates, noise.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.location = (170, -215)
    bump.inputs["Distance"].default_value = distance
    bump.inputs["Strength"].default_value = strength
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return noise


def emission(name, color, strength=1):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    light = nodes.new("ShaderNodeEmission")
    light.inputs[0].default_value = (*color, 1)
    light.inputs[1].default_value = strength
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location.x = 240
    links.new(light.outputs[0], output.inputs["Surface"])
    return mat


set_group = collection("01 · Deep blue seamless")
plate_group = collection("02 · Silver dessert plate")
bead_group = collection("03 · Mango crepe cake")
letter_group = collection("04 · Poster lettering")
rig_group = collection("05 · Camera and lighting")
reflect_group = collection("06 · Reflection cards")

backdrop, bsdf = material("Backdrop · navy and cold blue-gray", (.13, .22, .34), .93)
nodes, links = backdrop.node_tree.nodes, backdrop.node_tree.links
coords = nodes.new("ShaderNodeTexCoord")
coords.location = (-980, 200)
grain(backdrop, bsdf, coords.outputs["Object"], 136, .003, .23, (-725, -280))

# Broad, unfocused pools of navy rise from a much lighter steel-blue tabletop.
palette = [
    ["9bafbc", "7a94a9", "526d8c", "35537d", "37547e", "4a6b91", "6d8da9"],
    ["a3b5c0", "7490a6", "3f5d82", "2e4770", "2c446d", "3d6189", "6186a5"],
    ["98aeba", "7592a9", "3e5e83", "2b456f", "2a4169", "3f6185", "6689a6"],
    ["aebfce", "94adbf", "678aa7", "55769a", "4c6b90", "6585a3", "93acbf"],
    ["ced9e6", "c1d1e0", "a6bacf", "9db4ca", "a9bed4", "bbcbde", "d0dce9"],
    ["d6dfe9", "d4dfea", "c8d7e6", "c7d7e8", "cbd9e9", "d4e0ed", "dde6ef"],
    ["dce4ee", "dce5ef", "d4dfea", "d8e1ed", "d9e3ee", "dbe5f0", "e1e9f3"],
]
swatches = bpy.data.images.new("Backdrop · hand-mixed palette", width=7, height=7, alpha=False)
pixels = []
for row in reversed(palette):
    for swatch in row:
        pixels.extend([*(channel / 255 for channel in bytes.fromhex(swatch)), 1])
swatches.pixels.foreach_set(pixels)
swatches.update()
swatches.pack()
gradient = nodes.new("ShaderNodeTexImage")
gradient.label = "Soft navy and steel-blue color field"
gradient.image = swatches
gradient.interpolation = "Cubic"
gradient.extension = "EXTEND"
gradient.location = (-720, 270)
links.new(coords.outputs["Window"], gradient.inputs["Vector"])
ray = nodes.new("ShaderNodeLightPath")
ray.location = (-730, 620)
camera_color = nodes.new("ShaderNodeMixRGB")
camera_color.location = (-410, 280)
camera_color.inputs[1].default_value = (.110, .153, .216, 1)
links.new(ray.outputs["Is Camera Ray"], camera_color.inputs[0])
links.new(gradient.outputs["Color"], camera_color.inputs[2])
diffuse = nodes.new("ShaderNodeVectorMath")
diffuse.operation = "SCALE"
diffuse.location = (-135, 310)
diffuse.inputs["Scale"].default_value = .79
links.new(camera_color.outputs[0], diffuse.inputs[0])
links.new(diffuse.outputs["Vector"], bsdf.inputs["Base Color"])
links.new(camera_color.outputs[0], bsdf.inputs["Emission Color"])
bsdf.inputs["Emission Strength"].default_value = .40
bsdf.inputs["Specular IOR Level"].default_value = .13
view_layer = scene.view_layers[0]
mask = view_layer.aovs.add()
mask.name = "Backdrop"
mask.type = "VALUE"
aov = nodes.new("ShaderNodeOutputAOV")
aov.aov_name = mask.name
aov.inputs["Value"].default_value = 1
aov.location = (715, -120)

sweep = [(-28, 0), (5.1, 0)]
for step in range(1, 33):
    angle = math.pi / 2 * step / 32
    sweep.append((5.1 + 4 * math.sin(angle), 4 * (1 - math.cos(angle))))
sweep.append((9.1, 16))
mesh_object("Deep blue seamless sweep",
            [(x, y, z) for y, z in sweep for x in (-28, 28)],
            [(2*i, 2*i+1, 2*i+3, 2*i+2) for i in range(len(sweep) - 1)],
            set_group, [backdrop])

silver, bsdf = material("Silver · hand-polished stainless steel", (.72, .74, .75), .184, 1)
bsdf.inputs["Anisotropic"].default_value = .29
coords = silver.node_tree.nodes.new("ShaderNodeTexCoord")
coords.location = (-950, -65)
brush = silver.node_tree.nodes.new("ShaderNodeVectorMath")
brush.operation = "MULTIPLY"
brush.location = (-740, -65)
brush.inputs[1].default_value = (5, 5, 13)
silver.node_tree.links.new(coords.outputs["Object"], brush.inputs[0])
grain(silver, bsdf, brush.outputs[0], 34, .0009, .15, (-490, -65))
well_silver = silver.copy()
well_silver.name = "Silver · satin plate well"
well_silver.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = .34
rim_silver, rim = material("Silver · rolled polished lip", (.83, .84, .86), .119, 1)
rim.inputs["Anisotropic"].default_value = .18

# A turned cross section makes both sides of the shallow dish and its rolled lip.
profile = [
    (.0001, .045), (.81, .045), (1.02, .044), (1.06, .024), (1.09, .012),
    (1.15, .012), (1.18, .022), (1.19, .052), (1.25, .073), (1.36, .080),
    (1.44, .091), (1.50, .105), (1.60, .137), (1.73, .166), (1.80, .172),
    (1.847, .198), (1.862, .219), (1.858, .241), (1.842, .254), (1.819, .254),
    (1.802, .247), (1.759, .231), (1.692, .212), (1.64, .191), (1.57, .163),
    (1.52, .136), (1.485, .118), (1.452, .105), (1.39, .102), (.0001, .102),
]

ROSES = 6
ROSE_PHASE = -math.pi / 2


def plate_point(radius, height, angle):
    weight = max(0, min(1, (radius - 1.40) / .45))
    phase = (angle - ROSE_PHASE) * ROSES
    rose_lobe = (.5 + .5 * math.cos(phase)) ** 6
    scalloped_radius = radius + weight * (.063 * rose_lobe + .016 * math.cos(phase * 2))
    height += weight * (.014 * rose_lobe)
    return (scalloped_radius * math.cos(angle), scalloped_radius * math.sin(angle), height)


def lathe_geometry(profile, sides):
    vertices = [
        plate_point(radius, height, angle * math.tau / sides)
        for radius, height in profile for angle in range(sides)
    ]
    faces = []
    for ring in range(len(profile) - 1):
        following = ring + 1
        for side in range(sides):
            next_side = (side + 1) % sides
            faces.append((ring * sides + side, ring * sides + next_side,
                          following * sides + next_side, following * sides + side))
    faces.extend((tuple(reversed(range(sides))),
                  tuple(range(len(vertices) - sides, len(vertices)))))
    return vertices, faces


def interpolate_profile(profile):
    points = [Vector(point) for point in profile]
    result = []
    for index, (start, end) in enumerate(zip(points, points[1:])):
        before = points[max(0, index - 1)]
        after = points[min(len(points) - 1, index + 2)]
        interval = (end - start).length
        m1 = (end - before).normalized() * interval * .75
        m2 = (after - start).normalized() * interval * .75
        for step in range(4):
            t = step / 4
            point = ((2*t**3 - 3*t**2 + 1)*start + (t**3 - 2*t**2 + t)*m1
                     + (-2*t**3 + 3*t**2)*end + (t**3 - t**2)*m2)
            height = start.y if start.y == end.y else point.y
            result.append((max(.0001, point.x), height))
    return [*result, profile[-1]]


sides = 240
vertices, faces = lathe_geometry(interpolate_profile(profile), sides)
plate = mesh_object("Plate · scalloped sterling silver", vertices, faces, plate_group, [silver, rim_silver, well_silver])
well_start = next(index for index, (radius, _) in enumerate(profile) if radius == 1.52)
for face in plate.data.polygons:
    if 14 * 4 * sides <= face.index < 21 * 4 * sides:
        face.material_index = 1
    elif face.index >= well_start * 4 * sides and face.index != len(faces) - 2:
        face.material_index = 2


# Use the Bead Club outline with a scene-specific edit to its lower rows.
source = (ROOT / "components/play/bead-club/bead-club.tsx").read_text()
entry = re.search(r'"guava-crepe-cake":\s*(?=\{)', source)
pattern, _ = json.JSONDecoder().raw_decode(source[entry.end():])
base_edit = json.loads(Path(__file__).with_name("flat-base.json").read_text())
start_row = base_edit["startRow"]
pattern["rows"][start_row:start_row + len(base_edit["rows"])] = base_edit["rows"]
grid_width = len(pattern["rows"][0])
grid_height = len(pattern["rows"])
pitch = .079
cells = {
    (x, -y)
    for y, row in enumerate(pattern["rows"])
    for x, cell in enumerate(row) if cell != "."
}
texture_dir = Path(__file__).with_name("textures")
texture_assets = {}
for key in ("color", "terry-normal", "glints", "glint-normal"):
    asset = bpy.data.images.load(str(texture_dir / f"{key}.webp"))
    asset.name = f"Bead Club UI · {key}"
    if key != "color":
        asset.colorspace_settings.name = "Non-Color"
    asset.pack()
    texture_assets[key] = asset


def bead_material(name, front):
    mat, bsdf = material(name, (.65, .42, .4), 1 if front else .95)
    bsdf.inputs["Specular IOR Level"].default_value = .06 if front else .15
    nodes, links = mat.node_tree.nodes, mat.node_tree.links

    def texture(key, label, x, y):
        node = nodes.new("ShaderNodeTexImage")
        node.image = texture_assets[key]
        node.label = label
        node.location = (x, y)
        node.extension = "EXTEND"
        return node

    color = texture("color", "Pressed mango palette · Bead Club canvas", -620, 530)
    pigment = nodes.new("ShaderNodeVectorMath")
    pigment.operation = "SCALE"
    pigment.label = "Compensate for direct portrait lighting"
    pigment.location = (-320, 530)
    pigment.inputs["Scale"].default_value = .83
    links.new(color.outputs["Color"], pigment.inputs[0])
    links.new(pigment.outputs[0], bsdf.inputs["Base Color"])
    if front:
        bsdf.inputs["Sheen Weight"].default_value = .02
        bsdf.inputs["Sheen Roughness"].default_value = 1
        bsdf.inputs["Sheen Tint"].default_value = (1, .92, .90, 1)
        bsdf.inputs["Coat Roughness"].default_value = .20
        for key, label, strength, socket, height in [
            ("terry-normal", "Terry loops · original UI normal map", .64, "Normal", 270),
            ("glint-normal", "Glint facets · original UI normal map", 1, "Coat Normal", -255),
        ]:
            image = texture(key, label, -620, height)
            normal = nodes.new("ShaderNodeNormalMap")
            normal.location = (-305, height)
            normal.inputs["Strength"].default_value = strength
            links.new(image.outputs["Color"], normal.inputs["Color"])
            links.new(normal.outputs["Normal"], bsdf.inputs[socket])
        glints = texture("glints", "Sparse glints · original UI mask", -620, 5)
        links.new(glints.outputs["Color"], bsdf.inputs["Coat Weight"])
        sparkle = nodes.new("ShaderNodeMath")
        sparkle.operation = "MULTIPLY"
        sparkle.label = "Silver glints hold their shape in the portrait lighting"
        sparkle.location = (-300, 10)
        sparkle.inputs[1].default_value = .39
        links.new(glints.outputs["Color"], sparkle.inputs[0])
        links.new(sparkle.outputs[0], bsdf.inputs["Emission Strength"])
        bsdf.inputs["Emission Color"].default_value = (1, .95, .92, 1)
    return mat


front = bead_material("Bead Club · original terry, glints and pigment", True)
edge_mat = bead_material("Bead Club · fused satin edge", False)
offset_x = (min(x for x, _ in cells) + max(x for x, _ in cells) + 1) / 2
offset_y = (min(y for _, y in cells) + max(y for _, y in cells) + 1) / 2
vertices, faces, indices, side_cells = [], [], [], []
vertex_indices = {}
corners = ((0, 0), (1, 0), (1, 1), (0, 1))
neighbors = ((0, -1), (1, 0), (0, 1), (-1, 0))


def vertex(x, y, z):
    key = (x, y, z)
    if key not in vertex_indices:
        vertex_indices[key] = len(vertices)
        vertices.append(((x - offset_x) * pitch, (y - offset_y) * pitch, z))
    return vertex_indices[key]


def face(points, side_cell=None):
    faces.append(tuple(points))
    indices.append(0 if side_cell is None else 1)
    side_cells.append(side_cell)


for x, y in sorted(cells):
    bottom = [vertex(x + a, y + b, -.024) for a, b in corners]
    seam = [vertex(x + a, y + b, .0235) for a, b in corners]
    top = [vertex(x + (.96 if a else .04), y + (.96 if b else .04), .024) for a, b in corners]
    face(reversed(bottom), (x, y))
    face(top)
    for side, (dx, dy) in enumerate(neighbors):
        following = (side + 1) % 4
        face((seam[side], seam[following], top[following], top[side]))
        if (x + dx, y + dy) not in cells:
            face((bottom[side], bottom[following], seam[following], seam[side]), (x, y))

cake = mesh_object("Mango crepe cake · upright fused pixel sheet", vertices, faces, bead_group, [front, edge_mat], False)
uvs = cake.data.uv_layers.new(name="Bead Club canvas")
for polygon, index, side_cell in zip(cake.data.polygons, indices, side_cells):
    polygon.material_index = index
    for loop_index in polygon.loop_indices:
        x, y, _ = vertices[cake.data.loops[loop_index].vertex_index]
        x, y = x / pitch + offset_x, y / pitch + offset_y
        if side_cell is not None:
            x = x * .79 + (side_cell[0] + .5) * .21
            y = y * .79 + (side_cell[1] + .5) * .21
        uvs.data[loop_index].uv = (x / grid_width, 1 + y / grid_height)

bevel = cake.modifiers.new("Soft pressed perimeter", "BEVEL")
bevel.width = .0045
bevel.segments = 3
bevel.limit_method = "ANGLE"
bevel.angle_limit = math.radians(50)


def bezier_stroke(name, points, radius, mat, group, pressures=None):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 32
    data.bevel_resolution = 5
    data.bevel_depth = radius
    data.use_fill_caps = True
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for index, (point, coordinates) in enumerate(zip(spline.bezier_points, points)):
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
        point.co = coordinates
        if pressures is not None:
            point.radius = pressures[index]
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    data.materials.append(mat)
    return obj


# Sterling silver relief: six layered roses with veined leaves and a molded border.
trim, _ = material("Silver · chased floral relief", (.74, .74, .71), .161, 1)
rim_surface = sorted(profile[18:])


def rim_height(radius):
    for (r1, z1), (r2, z2) in zip(rim_surface, rim_surface[1:]):
        if r1 <= radius <= r2:
            return z1 + (z2 - z1) * (radius - r1) / (r2 - r1)
    return rim_surface[-1][1]


def border_curve(name, radius, thickness, lift):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = thickness
    data.bevel_resolution = 5
    spline = data.splines.new("POLY")
    spline.points.add(719)
    spline.use_cyclic_u = True
    for index, point in enumerate(spline.points):
        angle = math.tau * index / len(spline.points)
        scallop = .007 * math.cos((angle - ROSE_PHASE) * 2 * ROSES)
        r = radius + scallop
        point.co = (*plate_point(r, rim_height(r) + lift, angle), 1)
    obj = bpy.data.objects.new(name, data)
    plate_group.objects.link(obj)
    data.materials.append(rim_silver)


border_curve("Rim · outer rolled silver cord", 1.837, .016, .004)
border_curve("Rim · inner rolled silver cord", 1.787, .012, .009)

relief_vertices, relief_faces = [], []


def relief_point(angle, x, y, lift):
    radius = math.hypot(1.68 + x, y)
    direction = angle + math.atan2(y, 1.68 + x)
    return plate_point(radius, rim_height(radius) + lift, direction)


def add_relief_patch(angle, shape):
    rows, columns = 9, 9
    offset = len(relief_vertices)
    for i in range(rows):
        for j in range(columns):
            x, y, height = shape(i / (rows - 1), 2*j / (columns - 1) - 1)
            relief_vertices.append(relief_point(angle, x, y, height))
    for i in range(rows - 1):
        for j in range(columns - 1):
            a = offset + i * columns + j
            relief_faces.append((a, a + columns, a + columns + 1, a + 1))


def add_petal(angle, orientation, length, width, elevation):
    cosine, sine = math.cos(orientation), math.sin(orientation)

    def shape(u, v):
        lobe = math.sin(math.pi * (.065 + .79*u)) ** .66
        along = (.011 + length * u) * (1 - .13*u*v*v + .045*u*math.sin(6*v))
        across = width * v * lobe + .013*u*u
        rise = elevation * (.93 - .41*u) * (1 - .44*v*v)
        lip = (.009 + elevation * .24) * math.exp(-((u - .91) / .15)**2)
        curled = rise + lip * (1 - .45*v*v) + .009*u*math.sin(2.3*v + orientation)
        return (along*cosine - across*sine, along*sine + across*cosine, curled)

    add_relief_patch(angle, shape)


def add_leaf(angle, start, end, width, name):
    start, end = Vector(start), Vector(end)
    direction = (end - start).normalized()
    tangent = Vector((-direction.y, direction.x))

    def shape(u, v):
        bulge = math.sin(math.pi * u)
        serration = 1 + .10 * math.sin(math.tau * u * 6)
        point = start.lerp(end, u) + tangent * (width * v * bulge * serration)
        height = .006 + bulge * (.026 - .017 * abs(v)) + .004 * u * v
        return (*point, height)

    add_relief_patch(angle, shape)
    bezier_stroke(f"{name} · stem", [relief_point(angle, *shape(t, 0)) for t in (.04, .31, .64, .94)],
                  .0039, rim_silver, plate_group, [.48, 1, .81, .20])
    for i in range(4):
        start_u = .23 + i*.133
        for sign in (-1, 1):
            bezier_stroke(f"{name} · vein {i+1}", [
                relief_point(angle, *shape(start_u, 0)),
                relief_point(angle, *shape(start_u + .069, sign * .43)),
                relief_point(angle, *shape(start_u + .125, sign * .86)),
            ], .0027, rim_silver, plate_group, [.54, .76, .20])


for section in range(ROSES):
    angle = ROSE_PHASE + section * math.tau / ROSES
    for count, length, width, lift, turn in [
        (6, .149, .062, .042, .11),
        (5, .108, .048, .063, .46),
        (4, .073, .032, .085, .82),
    ]:
        for petal in range(count):
            direction = petal * math.tau / count + turn
            add_petal(angle, direction, length * (1 + .052*math.sin(petal * 2.4)), width, lift)
    curl = []
    for index in range(16):
        fraction = index / 15
        theta = fraction * math.tau * 1.32
        radius = .004 + fraction * .040
        curl.append(relief_point(angle, math.cos(theta)*radius,
                                 math.sin(theta)*radius, .089 - fraction*.022))
    bezier_stroke(f"Rose {section + 1} · curled bud", curl, .010, trim, plate_group)
    for side in (-1, 1):
        add_leaf(angle, (-.054, side*.089), (-.107, side*.257), .047, f"Rose {section + 1} · inner leaf")
        add_leaf(angle, (.030, side*.096), (.102, side*.224), .042, f"Rose {section + 1} · outer leaf")

flowers = mesh_object("Repoussé · rose petals and leaves", relief_vertices, relief_faces, plate_group, [trim])
metal = flowers.modifiers.new("Raised silver edges", "SOLIDIFY")
metal.thickness = .004
metal.offset = -1

# Small round bosses tie the border together where the floral clusters meet the cords.
boss_vertices, boss_faces = [], []
for section in range(ROSES):
    angle = ROSE_PHASE + section * math.tau / ROSES
    for offset, radius, size in [(-.162, 1.767, .041), (.162, 1.767, .041),
                                 (.499, 1.816, .034), (.546, 1.816, .034)]:
        center = Vector(plate_point(radius, rim_height(radius) + .002, angle + offset))
        first = len(boss_vertices)
        rings, sides = 8, 20
        for row in range(rings + 1):
            latitude = math.pi * row / rings
            for side in range(sides):
                azimuth = math.tau * side / sides
                radial = size * math.sin(latitude)
                boss_vertices.append(center + Vector((radial * math.cos(azimuth), radial * math.sin(azimuth),
                                                      size * .77 * math.cos(latitude))))
        for row in range(rings):
            for side in range(sides):
                a = first + row * sides
                next_side = (side + 1) % sides
                boss_faces.append((a + side, a + sides + side, a + sides + next_side, a + next_side))
mesh_object("Rim · silver bead accents", boss_vertices, boss_faces, plate_group, [rim_silver])

# Rest the foot ring on the tabletop and the upright sheet directly in the well.
plate_height = -min(vertex.co.z for vertex in plate.data.vertices)
for obj in plate_group.objects:
    obj.location.z += plate_height
cake.rotation_euler.x = math.pi / 2
bottom = min(vertex.co.y for vertex in cake.data.vertices)
cake.location = (0, -.15, plate_height + profile[-1][1] - bottom)

camera_data = bpy.data.cameras.new("Portrait lens")
camera = bpy.data.objects.new("Camera · Mango on Silver poster", camera_data)
rig_group.objects.link(camera)
target = cake.location.copy()
if EXPORT == "wallpaper":
    target.z += .34
camera.location = target + Vector((0, -9.63, 4.31))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 5.43
camera_data.sensor_fit = "HORIZONTAL"
camera_data.passepartout_alpha = 1
camera_data.dof.use_dof = True
camera_data.dof.focus_object = cake
camera_data.dof.aperture_fstop = 2.05
scene.camera = camera

scene.render.resolution_x = WIDTH * SCALE
scene.render.resolution_y = HEIGHT * SCALE
scene.render.resolution_percentage = 55 if DRAFT else 100


def area(name, position, target, power, color, size, height=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "DISK" if height is None else "RECTANGLE"
    data.size = size
    if height is not None:
        data.size_y = height
    obj = bpy.data.objects.new(name, data)
    rig_group.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return obj


area("01 · Directional window key", (-3.85, -2.75, 4.85), (0, 0, 1.18), 685, (1, .96, .90), .66)
area("02 · Cool shadow fill", (2.7, -4.0, 4.4), (0, 0, 1.2), 57, (.70, .83, 1), 5.1)
area("03 · White rim bounce", (1.6, 3.8, 5.2), (0, 0, 1.05), 65, (.93, .96, 1), 3.4, 1.8)


def reflection_card(name, position, target, width, height, color, strength):
    mat = emission(name, color, strength)
    vertices = [(-width/2, -height/2, 0), (width/2, -height/2, 0),
                (width/2, height/2, 0), (-width/2, height/2, 0)]
    obj = mesh_object(name, vertices, [(0, 1, 2, 3)], reflect_group, [mat], False)
    obj.location = position
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("Z", "Y").to_euler()
    obj.visible_camera = False
    obj.visible_shadow = False
    obj.visible_diffuse = False
    obj.visible_transmission = False
    obj.visible_volume_scatter = False


reflection_card("White strip · long plate highlight", (-1.9, 4.4, 2.45), (0, 0, .16),
                4.6, 1.32, (.92, .96, 1), 1.15)
reflection_card("Pearl card · broad silver reflection", (-.4, 4.6, 3.8), (0, 0, .12),
                4.5, 2.5, (.78, .85, .98), .67)
reflection_card("Black flag · rim definition", (2.4, 2.2, 2.45), (0, 0, .1),
                3.3, .78, (.007, .014, .025), 1)
reflection_card("Cool fill · front edge", (-1.75, -3, 2.45), (0, 0, .1),
                1.3, 3.7, (.50, .67, .93), .72)

scene.world = bpy.data.worlds.new("Cool ambient studio")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (.31, .45, .64, 1)
background.inputs["Strength"].default_value = .23

# Render the editable lettering through a separate camera so the typography
# stays sharp while the physical lens defocuses the background.
letter_scene = bpy.data.scenes.new("Mango on Silver · typography")
letter_scene.render.engine = "CYCLES"
letter_scene.cycles.samples = 16
letter_scene.render.film_transparent = True
letter_scene.render.resolution_x = WIDTH * SCALE
letter_scene.render.resolution_y = HEIGHT * SCALE
letter_scene.render.resolution_percentage = scene.render.resolution_percentage
letter_scene.collection.children.link(letter_group)
scene.collection.children.unlink(letter_group)
letter_camera = bpy.data.objects.new("Lettering camera", camera_data.copy())
letter_camera.data.dof.use_dof = False
letter_camera.data.dof.focus_object = None
letter_scene.collection.objects.link(letter_camera)
letter_scene.camera = letter_camera
camera_frame = letter_camera.data.view_frame(scene=letter_scene)
pixel = (max(v.x for v in camera_frame) - min(v.x for v in camera_frame)) / WIDTH


def screen_point(x, y):
    return ((x - WIDTH / 2) * pixel, (1339 / 2 - y) * pixel, -1)


def lettering_visibility(obj):
    obj.parent = letter_camera
    obj.visible_shadow = False
    obj.visible_diffuse = False
    obj.visible_glossy = False
    obj.visible_transmission = False


ink = emission("Ink · muted silver-blue script", (.58, .70, .77), 1)
type_ink = emission("Ink · deep slate letterpress", (.009, .014, .023), 1)
font = bpy.data.fonts.load(str(ROOT / "scenes/apple-club/fonts/CourierPrime-Regular.ttf"))
font.pack()

# Custom center-line script with pressure variation and a loose underline.
signature = [
    ([(2, 52), (14, 38), (33, 20), (46, 9), (51, 11), (46, 22),
      (34, 39), (22, 61), (26, 63), (42, 42), (61, 23), (72, 19),
      (72, 26), (61, 45), (57, 57), (63, 51), (77, 33), (94, 18),
      (105, 18), (103, 27), (95, 43), (93, 53), (100, 57), (110, 50)],
     [.32, .61, .78, .75, .58, .83, 1.17, 1.28, .82, .56, .76, .62,
      .77, 1.18, 1.15, .66, .57, .68, .57, .86, 1.15, 1.12, .77, .40]),
    ([(137, 37), (131, 33), (118, 38), (108, 49), (109, 57), (117, 58),
      (128, 51), (137, 38), (132, 48), (132, 54), (140, 56), (150, 49)],
     [.34, .59, .86, 1.16, 1.02, .77, .74, .91, 1.04, 1.01, .62, .34]),
    ([(147, 51), (155, 41), (163, 35), (163, 40), (154, 55), (162, 48),
      (174, 38), (182, 36), (182, 43), (176, 53), (181, 56), (194, 49)],
     [.36, .68, .67, .81, 1.06, .65, .56, .65, .83, 1.05, .71, .33]),
    ([(220, 35), (212, 32), (199, 38), (191, 48), (192, 55), (201, 56),
      (211, 49), (220, 37)],
     [.35, .62, .87, 1.10, .95, .76, .73, .80]),
    ([(222, 35), (215, 49), (203, 69), (189, 83), (177, 87), (171, 83),
      (176, 76), (192, 68), (214, 60), (234, 48)],
     [.61, .93, 1.26, 1.06, .71, .59, .63, .73, .62, .30]),
    ([(250, 34), (241, 33), (232, 40), (228, 49), (234, 55), (246, 52),
      (255, 44), (257, 37), (252, 34), (248, 39), (253, 43), (268, 40), (279, 32)],
     [.30, .61, .95, 1.15, .97, .74, .74, .77, .55, .47, .46, .56, .24]),
    ([(30, 73), (71, 79), (118, 77), (157, 71), (199, 66), (245, 54), (286, 36)],
     [.29, .68, .85, .75, .55, .47, .18]),
]
for index, (points, pressure) in enumerate(signature, start=1):
    obj = bezier_stroke(f"Mango script · stroke {index}", [
        screen_point(650 + x * .91, 309 + y * .91 - .084 * x) for x, y in points
    ], pixel * 2.5, ink, letter_group, pressure)
    lettering_visibility(obj)


def caption(name, copy, x, y):
    data = bpy.data.curves.new(name, "FONT")
    data.body = copy
    data.font = font
    data.size = pixel * 33.4
    data.space_character = .97
    data.materials.append(type_ink)
    obj = bpy.data.objects.new(name, data)
    letter_group.objects.link(obj)
    obj.location = screen_point(x, y)
    obj.rotation_euler.z = math.radians(2.6)
    lettering_visibility(obj)


caption("Caption · left heading", "LITTLE BEAD CLUB", 218, 1097)
caption("Caption · flavor", "MANGO CREPE CAKE", 218, 1133)
caption("Caption · right heading", "ATOMIC MOTION", 675, 1077)
caption("Caption · studio", "3D STUDIO", 724, 1111)


def add_film_grain():
    tree = bpy.data.node_groups.new("Optical softness and film grain", "CompositorNodeTree")
    tree.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    scene.compositing_node_group = tree
    nodes, links = tree.nodes, tree.links
    render = nodes.new("CompositorNodeRLayers")
    render.scene = scene
    render.layer = view_layer.name
    render.location = (-1160, 250)
    letters = nodes.new("CompositorNodeRLayers")
    letters.label = "Sharp poster lettering"
    letters.scene = letter_scene
    letters.layer = letter_scene.view_layers[0].name
    letters.location = (-1160, 20)
    diffusion = nodes.new("CompositorNodeBlur")
    diffusion.label = "Fine optical diffusion"
    diffusion.location = (-900, 520)
    radius = 1.45 * SCALE if not DRAFT else .80
    diffusion.inputs["Size"].default_value = (radius, radius)
    links.new(render.outputs["Image"], diffusion.inputs["Image"])
    softened = nodes.new("ShaderNodeMix")
    softened.data_type = "RGBA"
    softened.label = "Blend the lens diffusion into the still life"
    softened.location = (-665, 520)
    softened.inputs[0].default_value = .42
    links.new(render.outputs["Image"], softened.inputs[6])
    links.new(diffusion.outputs["Image"], softened.inputs[7])
    poster = nodes.new("CompositorNodeAlphaOver")
    poster.location = (-410, 520)
    poster.inputs["Factor"].default_value = 0 if EXPORT == "wallpaper" else 1
    links.new(softened.outputs[2], poster.inputs["Background"])
    links.new(letters.outputs["Image"], poster.inputs["Foreground"])
    coordinates = nodes.new("CompositorNodeImageCoordinates")
    coordinates.location = (-665, -135)
    links.new(poster.outputs["Image"], coordinates.inputs["Image"])
    silver_halide = nodes.new("ShaderNodeTexWhiteNoise")
    silver_halide.label = "Fine monochrome grain"
    silver_halide.noise_dimensions = "2D"
    silver_halide.location = (-430, 0)
    links.new(coordinates.outputs["Pixel"], silver_halide.inputs["Vector"])
    clumps = nodes.new("ShaderNodeTexNoise")
    clumps.label = "Grain clumps"
    clumps.noise_dimensions = "2D"
    clumps.inputs["Scale"].default_value = .58 / SCALE if not DRAFT else .71
    clumps.inputs["Detail"].default_value = .6
    clumps.location = (-430, -245)
    links.new(coordinates.outputs["Pixel"], clumps.inputs["Vector"])
    blend = nodes.new("ShaderNodeMix")
    blend.location = (-185, -75)
    blend.inputs[0].default_value = .32
    links.new(silver_halide.outputs["Value"], blend.inputs[2])
    links.new(clumps.outputs["Fac"], blend.inputs[3])
    gain = nodes.new("ShaderNodeMath")
    gain.operation = "MULTIPLY_ADD"
    gain.label = "Grain amount · adjust multiplier"
    gain.location = (30, -75)
    amount = .42 if not DRAFT else .37
    gain.inputs[1].default_value = amount
    gain.inputs[2].default_value = 1 - amount / 2
    links.new(blend.outputs[0], gain.inputs[0])
    multiply = nodes.new("ShaderNodeMix")
    multiply.data_type = "RGBA"
    multiply.blend_type = "MULTIPLY"
    multiply.location = (265, 155)
    multiply.inputs[0].default_value = 1
    links.new(poster.outputs["Image"], multiply.inputs[6])
    links.new(gain.outputs[0], multiply.inputs[7])
    chroma = nodes.new("ShaderNodeTexWhiteNoise")
    chroma.noise_dimensions = "3D"
    chroma.label = "Independent red, green and blue grain"
    chroma.location = (-430, -505)
    position = nodes.new("ShaderNodeVectorMath")
    position.operation = "ADD"
    position.location = (-650, -540)
    position.inputs[1].default_value = (0, 0, 18)
    links.new(coordinates.outputs["Pixel"], position.inputs[0])
    links.new(position.outputs[0], chroma.inputs["Vector"])
    scatter = nodes.new("ShaderNodeVectorMath")
    scatter.operation = "MULTIPLY_ADD"
    scatter.label = "Backdrop chromatic grain strength"
    scatter.location = (-150, -490)
    strength = (.008, .009, .011)
    scatter.inputs[1].default_value = strength
    scatter.inputs[2].default_value = tuple(-channel/2 for channel in strength)
    links.new(chroma.outputs["Color"], scatter.inputs[0])
    matte = nodes.new("ShaderNodeVectorMath")
    matte.operation = "SCALE"
    matte.location = (85, -450)
    links.new(scatter.outputs[0], matte.inputs[0])
    links.new(render.outputs["Backdrop"], matte.inputs["Scale"])
    exposure = nodes.new("ShaderNodeVectorMath")
    exposure.operation = "DOT_PRODUCT"
    exposure.label = "Linear luminance"
    exposure.location = (-170, 520)
    exposure.inputs[1].default_value = (.2126, .7152, .0722)
    links.new(poster.outputs["Image"], exposure.inputs[0])
    envelope = nodes.new("ShaderNodeMapRange")
    envelope.label = "Stronger grain in low exposures"
    envelope.interpolation_type = "SMOOTHERSTEP"
    envelope.clamp = True
    envelope.location = (55, 515)
    envelope.inputs["From Min"].default_value = .035
    envelope.inputs["From Max"].default_value = .66
    envelope.inputs["To Min"].default_value = .094 if not DRAFT else .082
    envelope.inputs["To Max"].default_value = .005
    links.new(exposure.outputs["Value"], envelope.inputs["Value"])
    center = nodes.new("ShaderNodeMath")
    center.operation = "SUBTRACT"
    center.location = (40, -270)
    center.inputs[1].default_value = .5
    links.new(blend.outputs[0], center.inputs[0])
    shadow_grain = nodes.new("ShaderNodeMath")
    shadow_grain.operation = "MULTIPLY"
    shadow_grain.label = "Shadow-weighted luminance grain"
    shadow_grain.location = (265, -245)
    links.new(center.outputs[0], shadow_grain.inputs[0])
    links.new(envelope.outputs[0], shadow_grain.inputs[1])
    balance = nodes.new("ShaderNodeVectorMath")
    balance.operation = "MULTIPLY"
    balance.label = "Balance grain in the blue shadows"
    balance.location = (505, -240)
    balance.inputs[1].default_value = (.60, .96, 1.17)
    links.new(shadow_grain.outputs[0], balance.inputs[0])
    grain_sum = nodes.new("ShaderNodeVectorMath")
    grain_sum.operation = "ADD"
    grain_sum.location = (745, -225)
    links.new(balance.outputs[0], grain_sum.inputs[0])
    links.new(matte.outputs[0], grain_sum.inputs[1])
    add = nodes.new("ShaderNodeMix")
    add.data_type = "RGBA"
    add.blend_type = "ADD"
    add.location = (970, 155)
    add.inputs[0].default_value = 1
    links.new(multiply.outputs[2], add.inputs[6])
    links.new(grain_sum.outputs[0], add.inputs[7])
    output = nodes.new("NodeGroupOutput")
    output.location = (1190, 155)
    links.new(add.outputs[2], output.inputs["Image"])


add_film_grain()

scene.render.engine = "CYCLES"
scene.cycles.samples = 32 if DRAFT else 144
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .027 if DRAFT else .012
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.glossy_bounces = 5
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = .33

try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    if any(device.type == "METAL" for device in prefs.devices):
        for device in prefs.devices:
            device.use = device.type == "METAL"
        scene.cycles.device = "GPU"
except (TypeError, RuntimeError):
    pass

for screen in bpy.data.screens:
    for space in (area.spaces.active for area in screen.areas if area.type == "VIEW_3D"):
        space.region_3d.view_perspective = "CAMERA"

readme = bpy.data.texts.new("Mango on Silver · scene notes")
readme.write(
    "MANGO ON SILVER / ATOMIC MOTION\n\n"
    "The Mango crepe cake has tapered lower corners and stands directly on its straight base in a level rose-embossed plate. "
    "The recolored Bead Club pigment and the original terry and glint maps are packed. The camera focuses on the single slice, with subtle optical diffusion in the compositor. "
    "The compositor overlays the editable lettering scene and adds adjustable film grain.\n\n"
    "F12 renders the portrait in Cycles. Output: //mango-on-silver.png.\n"
    "The scene uses the Bead Club cake layout. See the embedded license and artwork terms.\n"
)
license_text = bpy.data.texts.new("License and artwork terms")
license_text.write((ROOT / "public/studio/mango-on-silver/LICENSE.txt").read_text())
scene.render.filepath = "//mango-on-silver.png"
bpy.context.preferences.filepaths.save_version = 0
if not DRAFT and not EXPORT:
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "mango-on-silver.blend"), compress=True)
scene.render.filepath = str(OUTPUT / f"{FILENAME}.png")
bpy.ops.render.render(write_still=True)
