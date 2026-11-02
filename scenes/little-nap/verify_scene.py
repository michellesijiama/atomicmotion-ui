"""Audit five tangyuan, contained water, tiny individual sways and a fixed camera."""
import bpy
import bmesh
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

scene=bpy.context.scene
pigs=[bpy.data.objects[f'Tangyuan {i} · round sleeping pig'] for i in range(1,6)]
bowl=bpy.data.objects['Bowl · continuous blue vessel / ivory lace']
water=bpy.data.objects['Soup · clear water inside the bowl']

def topology(obj):
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges),obj.name+' has an open wall'
    remaining=set(bm.verts);components=0
    while remaining:
        components+=1;stack=[remaining.pop()]
        while stack:
            for edge in stack.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in remaining:remaining.remove(vertex);stack.append(vertex)
    bm.free();assert components==1,(obj.name,components)

def tree(obj):
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
    result=BVHTree.FromPolygons([evaluated.matrix_world@v.co for v in mesh.vertices],[tuple(p.vertices) for p in mesh.polygons])
    evaluated.to_mesh_clear();return result

assert len([o for o in scene.objects if o.name.startswith('Tangyuan ')])==5
for obj in [*pigs,bowl,water]:topology(obj)
assert all(len(pig.data.vertices)<20000 for pig in pigs),'Unintended baked subdivision in a dumpling mesh'
assert not [o for o in scene.objects if o.name.startswith(('Strawberry','Spoon','Handle'))]
assert all(pig.data==pigs[0].data for pig in pigs)
for pig in pigs:
    assert all(p.use_smooth for p in pig.data.polygons)
    assert any(m.type=='SUBSURF' and m.render_levels>=2 for m in pig.modifiers)
    labels=[n.label for n in pig.data.materials[0].node_tree.nodes]
    assert 'PENCIL · soft-edged graphite contour' in labels
    assert 'FACE PAINT · flush pigment, no floating eye or nose objects' in labels
assert not bpy.data.libraries
assert not [i for i in bpy.data.images if i.source=='FILE' and not i.packed_file]
assert len(water.data.shape_keys.key_blocks)==3
assert len([o for o in scene.objects if o.name.startswith('Ripple carrier')])==5
assert all(f.packed_file for f in bpy.data.fonts if f.filepath and f.filepath!='<builtin>')
assert bpy.data.texts.get('READ ME · Little Nap')
assert bpy.data.collections.get('08 · Animation controls')
assert scene.cycles.device=='CPU','Download should not require a configured GPU'
assert scene.render.filepath=='//renders/little-nap-'
for name in ('meshes','materials','curves','cameras','lights','worlds','actions','collections','fonts'):
    assert not [block.name for block in getattr(bpy.data,name) if block.users==0],('Unused data',name)
assert all(font.filepath.startswith('//') for font in bpy.data.fonts if font.packed_file)
assert scene.frame_end==288 and scene.render.fps==24
assert (scene.render.resolution_x,scene.render.resolution_y)==(1080,1440)
assert len([o for o in scene.objects if o.type=='LIGHT'])==3
scene.frame_set(169);bpy.context.view_layer.update()
bowl_tree=tree(bowl);water_tree=tree(water)
assert not bowl_tree.overlap(water_tree),'Water passes through the ceramic'
frames=(1,37,61,65,70,79,97,121,169,217,253,277,278,289)
for frame in frames:
    scene.frame_set(frame);bpy.context.view_layer.update()
    bowl_tree=tree(bowl);water_tree=tree(water)
    surfaces=[tree(pig) for pig in pigs]
    for i,(pig,surface) in enumerate(zip(pigs,surfaces)):
        assert abs(math.prod(pig.scale)-pig['Base radius']**3)<1e-5,('Motion changes dumpling volume',pig.name,frame)
        assert not surface.overlap(bowl_tree),('Tangyuan intersects bowl',pig.name,frame)
        bottom=pig.location.z-max(pig.scale)
        if bottom>1.165:assert not surface.overlap(water_tree),('Airborne tangyuan still crosses the water',pig.name,frame)
        elif bottom<1.125:assert surface.overlap(water_tree),('Resting tangyuan leaves the water',pig.name,frame)
        for other in surfaces[i+1:]:assert not surface.overlap(other),('Tangyuan intersect each other',frame)
    print('VERIFIED_CLEAR_CONTACTS',frame,flush=True)

target=Vector((.13,0,1))
def angle(frame):
    scene.frame_set(frame);v=scene.camera.location-target
    return math.degrees(math.atan2(v.z,math.hypot(v.x,v.y)))
assert abs(angle(1)-19)<.01
assert abs(angle(97)-19)<.01
assert not scene.camera.animation_data, 'Camera must remain fixed'
different_phases=False
for frame in (121,145,169,193,217):
    scene.frame_set(frame)
    heights=[pig.location.z-pig['Float height'] for pig in pigs]
    different_phases|=max(heights)-min(heights)>.008
    assert max(abs(value) for value in heights)<.050,('Sway is too large',frame)
    assert all(max(pig.scale)/min(pig.scale)<1.040 for pig in pigs),'Shape change is too pronounced'
assert different_phases,'The piglets must not move like identical copies'
stage=bpy.data.objects['STAGE · bowl slides into the paper']
scene.frame_set(1);assert stage.location.length>4.9
scene.frame_set(70);assert stage.location.length<1e-5
scene.frame_set(69);assert all(pig.color[3]>.9 for pig in pigs),'Missing startled expression'
scene.frame_set(169);assert all(pig.color[3]<.001 for pig in pigs),'Surprise must settle back to sleepy eyes'
objects=[stage,scene.camera,bowl,water,*pigs,*bpy.data.collections['07 · Golden paper sparkles'].objects,*bpy.data.collections['06 · Floating ink lettering'].objects]
scene.frame_set(1);bpy.context.view_layer.update();start={o.name:o.matrix_world.copy() for o in objects}
scene.frame_set(289);bpy.context.view_layer.update()
for obj in objects:
    assert max(abs(obj.matrix_world[i][j]-start[obj.name][i][j]) for i in range(4) for j in range(4))<1e-4,('Loop seam',obj.name)
scene.frame_set(169)
print('VERIFIED_SCENE: five round connected tangyuan, flush faces, contained moving water, three lights, packed font and a seamless twelve-second loop: bowl slide, startled painted eyes, independent floating sways and nuzzles with a fixed frontal camera',flush=True)
