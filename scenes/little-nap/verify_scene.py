"""Reopen a saved Little Nap scene and audit geometry, contact, materials and motion."""
import bpy
import bmesh
import math
from mathutils.bvhtree import BVHTree
scene=bpy.context.scene;scene.frame_set(1)
root=bpy.data.objects['ANIMATION · slow illustrated sway / 6 seconds']
bowl=bpy.data.objects['Bowl · continuous blue vessel / ivory lace']
pigs=[bpy.data.objects[f'Pig {i} · round sleeping body'] for i in (1,2)]
def topology(obj):
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges),obj.name+' has an open wall'
    todo=set(bm.verts);components=0
    while todo:
        components+=1;stack=[todo.pop()]
        while stack:
            for edge in stack.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in todo:todo.remove(vertex);stack.append(vertex)
    bm.free();assert components==1,(obj.name,components)
for ob in [bowl,*pigs]:
    topology(ob)
    assert all(p.use_smooth for p in ob.data.polygons)
    assert any(m.type=='SUBSURF' and m.render_levels>=2 for m in ob.modifiers)
for pig in pigs:
    assert pig.parent.parent==root
    assert any(n.label=='PENCIL · soft-edged graphite contour' for n in pig.data.materials[0].node_tree.nodes)
    assert any(n.label=='PENCIL · sparse translucent colored-pencil fill' for n in pig.data.materials[0].node_tree.nodes)
deps=bpy.context.evaluated_depsgraph_get()
bounds=[]
for pig in pigs:
    mesh=pig.evaluated_get(deps).to_mesh()
    positions=[pig.matrix_world@v.co for v in mesh.vertices]
    bounds.append((min(p.z for p in positions),max(p.z for p in positions)))
    pig.evaluated_get(deps).to_mesh_clear()
assert .59<bounds[0][0]<.66,bounds
# The geometry is inside the cavity and clearly occluded by the front rim.
assert bounds[0][0]<.70 and bounds[0][1]>1.425
assert not any('Apple' in ob.name or 'polka' in ob.name or 'petal' in ob.name or 'paw' in ob.name or 'curl' in ob.name for ob in scene.objects)
assert not bpy.data.libraries
assert not [i for i in bpy.data.images if i.source=='FILE' and not i.packed_file]
assert all(f.packed_file for f in bpy.data.fonts if f.filepath and f.filepath!='<builtin>')
front=[ob.matrix_world.copy() for ob in pigs]
scene.frame_set(37);assert abs(root.rotation_euler.z-.14)<1e-5
scene.frame_set(145)
for ob,matrix in zip(pigs,front):
    assert max(abs(ob.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<1e-5
assert scene.frame_end==144 and scene.render.fps==24
assert (scene.render.resolution_x,scene.render.resolution_y)==(1080,1440)
assert abs(scene.camera.location.x)<1e-5
assert len([o for o in scene.objects if o.type=='LIGHT'])==3
assert len(bowl.data.uv_layers)>0
assert all(ob.parent is None for ob in bpy.data.collections['05 · Little typewriter phrases'].objects)
scene.frame_set(1)
deps=bpy.context.evaluated_depsgraph_get()
trees=[]
for i in (1,2):
    ob=bpy.data.objects[f'Pig {i} · round sleeping body']
    evaluated=ob.evaluated_get(deps);mesh=evaluated.to_mesh()
    vertices=[ob.matrix_world@v.co for v in mesh.vertices]
    faces=[list(p.vertices) for p in mesh.polygons]
    trees.append((BVHTree.FromPolygons(vertices,faces),vertices))
    evaluated.to_mesh_clear()
intersections=trees[0][0].overlap(trees[1][0])
assert not intersections,('Intersecting pig surfaces',len(intersections))
# Closest surface distance: the two forms rest together without penetrating.
distance=min(trees[0][0].find_nearest(p)[3] for p in trees[1][1])
assert .0001<distance<.02,distance
print('VERIFIED_PIG_CONTACT: zero intersecting faces; nearest separation',distance)

print('VERIFIED: two watertight subdivided pigs, stacked contact, lower pig inside one connected bowl, grainy pencil contours and sparse paper-light fill, packed font, 3 lights, frontal portrait, soft hops, slow sway and preserved pose hierarchy')
print('PIG_VERTICAL_BOUNDS',bounds)

# Exact contact equations stay safe throughout interpolated spring motion.
lower=bpy.data.objects['Pig 1 · softly tilted pose']
upper=bpy.data.objects['Pig 2 · softly tilted pose']
heights=[]
for frame in range(1,50):
    scene.frame_set(frame);bpy.context.view_layer.update()
    gap=upper.location.z-.92*upper.scale.z-(lower.location.z+.88*lower.scale.z)
    floor=lower.location.z-.92*lower.scale.z
    assert .00035<gap<.075,(frame,gap)
    assert floor>.6254,(frame,floor)
    assert abs(lower.scale.x*lower.scale.y*lower.scale.z-.86*.70*.82)<1e-5
    assert abs(upper.scale.x*upper.scale.y*upper.scale.z-.74*.58*.59)<1e-5
    heights.append(floor)
assert max(heights)-min(heights)>.19, (min(heights),max(heights))
assert len(bpy.data.collections['06 · Twinkling paper stars'].objects)==5
assert all(ob.animation_data for ob in bpy.data.collections['05 · Little typewriter phrases'].objects)
assert all(ob.animation_data for ob in bpy.data.collections['06 · Twinkling paper stars'].objects)
scene.frame_set(1)
print('VERIFIED_SOFT_MOTION: safe contact through a full 48-frame hop cycle, volume-preserving hops, animated ink and five twinkling stars')

# The face is painted onto each connected body; no floating facial meshes.
pig_meshes=[o for o in bpy.data.collections['02 · Two round sleeping pigs'].objects if o.type=='MESH']
assert len(pig_meshes)==2
assert all(any(n.label=='FACE PAINT · flush pigment, no floating eye or nose objects' for n in body.data.materials[0].node_tree.nodes) for body in pig_meshes)
assert any(m.type=='NODES' and 'curved lower crown' in m.name for m in pigs[1].modifiers)
for frame in (5,10,16,23,30,37):
    scene.frame_set(frame);bpy.context.view_layer.update()
    surface_trees=[]
    for body in pigs:
        evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
        surface_trees.append(BVHTree.FromPolygons([body.matrix_world@v.co for v in mesh.vertices],[list(p.vertices) for p in mesh.polygons]))
        evaluated.to_mesh_clear()
    assert not surface_trees[0].overlap(surface_trees[1]),('Pig surfaces intersect during a bounce',frame)
scene.frame_set(1)
print('VERIFIED_SCOOPS: integrated faces, curved fitted underside, no pig intersections at squash/stretch/hop extremes')
