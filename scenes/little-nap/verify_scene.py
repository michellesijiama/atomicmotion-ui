"""Audit the saved pudding scene, staged landings, glow and safe visible contacts."""
import bpy
import bmesh
import math
from mathutils.bvhtree import BVHTree

scene=bpy.context.scene
root=bpy.data.objects['ANIMATION · slow illustrated sway / 8 seconds']
controls=bpy.data.objects['MOTION · soft pudding controls']
bowl=bpy.data.objects['Bowl · continuous blue vessel / ivory lace']
pigs=[bpy.data.objects[f'Pig {i} · round sleeping body'] for i in (1,2)]
poses=[bpy.data.objects[f'Pig {i} · softly tilted pose'] for i in (1,2)]

def frame(number):scene.frame_set(number);bpy.context.view_layer.update()
def topology(obj):
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(edge.is_manifold for edge in bm.edges),obj.name+' has an open wall'
    remaining=set(bm.verts);count=0
    while remaining:
        count+=1;stack=[remaining.pop()]
        while stack:
            for edge in stack.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in remaining:remaining.remove(vertex);stack.append(vertex)
    bm.free();assert count==1,(obj.name,count)

def surface(obj):
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
    vertices=[obj.matrix_world@v.co for v in mesh.vertices]
    tree=BVHTree.FromPolygons(vertices,[list(p.vertices) for p in mesh.polygons])
    evaluated.to_mesh_clear();return tree,vertices

frame(113)
for obj in [bowl,*pigs]:
    topology(obj);assert all(p.use_smooth for p in obj.data.polygons)
for pig in pigs:
    assert pig.parent.parent==root
    assert any(m.type=='SUBSURF' and m.render_levels==3 for m in pig.modifiers)
    labels=[n.label for n in pig.data.materials[0].node_tree.nodes]
    assert 'PENCIL · soft-edged graphite contour' in labels
    assert 'FACE PAINT · flush pigment, no floating eye or nose objects' in labels
assert len([o for o in bpy.data.collections['02 · Two round sleeping pigs'].objects if o.type=='MESH'])==2
assert not bpy.data.libraries
assert not [i for i in bpy.data.images if i.source=='FILE' and not i.packed_file]
assert all(f.packed_file for f in bpy.data.fonts if f.filepath and f.filepath!='<builtin>')
assert bpy.data.texts.get('READ ME · Little Nap')
assert scene.frame_end==192 and scene.render.fps==24
assert (scene.render.resolution_x,scene.render.resolution_y)==(1080,1440)
assert len([o for o in scene.objects if o.type=='LIGHT'])==3
assert abs(scene.camera.location.x)<1e-6
frame(18);assert abs(controls['bowl_drop'])<1e-5 and controls['lower_drop']>4 and controls['upper_drop']>4
frame(49);assert abs(controls['lower_drop'])<1e-5 and controls['upper_drop']>4 and abs(controls['lower_squish']-.79)<1e-5
frame(84);assert abs(controls['upper_drop'])<1e-5 and abs(controls['upper_squish']-.80)<1e-5
frame(113);assert controls['lower_squish']==1 and controls['upper_squish']==1
assert abs(bowl.parent.location.z)<1e-6
print('VERIFIED_DROP_ORDER: bowl lands at 18, lower pudding at 49, upper pudding at 84; settled at 113',flush=True)

# Actual evaluated surfaces are checked during both landings and the shared hop.
for number in (49,56,79,84,91,99,113,123,131,138,146,155):
    frame(number)
    a,vertices=surface(pigs[0]);b,other=surface(pigs[1])
    assert not a.overlap(b),('Pig surfaces intersect',number)
    if number in (49,84,113,138):
        vessel,_=surface(bowl)
        assert not vessel.overlap(a),('Lower pudding intersects bowl',number)
    assert abs(math.prod(poses[0].scale)-.86*.70*.82)<1e-5
    assert abs(math.prod(poses[1].scale)-.74*.58*.59)<1e-5
    if number==113:
        gap=min(a.find_nearest(v)[3] for v in other if v.z<2.40)
        assert .0001<gap<.02,gap
        assert .60<min(v.z for v in vertices)<.66
    print('VERIFIED_CONTACT_FRAME',number,flush=True)

stars=bpy.data.collections['06 · Twinkling paper stars']
parents=[o for o in stars.objects if o.name.startswith('Star ')]
assert len(parents)==5
assert len([o for o in stars.objects if o.name.startswith('Glow halo')])==5
assert all(o.animation_data for o in parents)
for obj in [o for o in stars.objects if o.name.startswith('Sparkle core')]:
    assert obj.data.materials[0].node_tree.animation_data
assert all(o.animation_data for o in bpy.data.collections['05 · Little typewriter phrases'].objects)
frame(1);start={o.name:o.matrix_world.copy() for o in [bowl,*pigs,*parents]}
frame(193)
for name,matrix in start.items():
    obj=bpy.data.objects[name]
    assert max(abs(obj.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<1e-5
frame(181);assert controls['drawing_visibility']==0
frame(193);assert controls['drawing_visibility']==1
frame(113)
print('VERIFIED_SCENE: silky connected pudding meshes, painted faces, packed font, three lights, warm glow halos, animated ink and seamless eight-second staging',flush=True)
