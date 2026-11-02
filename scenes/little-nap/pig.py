"""Five almost-spherical pig tangyuan with continuous skin and flush pencil faces."""
import bpy
import bmesh
import math
from watercolor_materials import watercolor


def create_pigs(group):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40)
    body=bpy.context.object
    for c in list(body.users_collection):c.objects.unlink(body)
    group.objects.link(body)
    body.name='Tangyuan 1 · round sleeping pig'
    for v in body.data.vertices:
        x,y,z=v.co
        # A tiny integrated snout; preserve the round rice-dumpling silhouette.
        nose=.045*math.exp(-(((x-.015)/.235)**2+((z-.12)/.15)**2))
        v.co.y-=nose*max(0,-y)**5
        v.co.x+=.005*math.sin(z*3+y)*(1-z*z)
    pieces=[body]
    for side in (-1,1):
        # Small folded ears meet the sphere below its surface before welding.
        verts=[];faces=[];rings=12;segments=12
        for i in range(rings+1):
            t=i/rings
            x=side*(.57+.17*t)
            z=.73+.29*t-.08*t*t
            width=.135*(1-t)**.8+.004
            thickness=.055*(1-t)+.007
            for j in range(segments):
                a=math.tau*j/segments
                verts.append((x+width*math.cos(a),-.07-.08*t*t+thickness*math.sin(a),z))
        for i in range(rings):
            for j in range(segments):
                a=i*segments+j;b=i*segments+(j+1)%segments
                faces.append((a,b,b+segments,a+segments))
        faces.extend([tuple(reversed(range(segments))),tuple(rings*segments+j for j in range(segments))])
        mesh=bpy.data.meshes.new('Small rice-dumpling ear');mesh.from_pydata(verts,[],faces)
        ear=bpy.data.objects.new('Ear to weld',mesh);group.objects.link(ear);pieces.append(ear)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces:obj.select_set(True)
    bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
    bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
    weld=body.modifiers.new('One continuous dumpling with tiny folded ears','REMESH');weld.mode='VOXEL';weld.voxel_size=.045
    bpy.ops.object.modifier_apply(modifier=weld.name)
    smooth=body.modifiers.new('Soft rice dough','SMOOTH');smooth.factor=.42;smooth.iterations=3
    sub=body.modifiers.new('Silky round surface','SUBSURF');sub.levels=2;sub.render_levels=2
    for p in body.data.polygons:p.use_smooth=True
    skin=watercolor('TANGYUAN · rose milk pencil wash',(.99,.47,.52),face_z=.12)
    body.data.materials.clear();body.data.materials.append(skin)
    # Five spaced dumplings leave visible water between them.
    pigs=[]
    for i in range(5):
        obj=body if i==0 else body.copy()
        if i:group.objects.link(obj)
        obj.name=f'Tangyuan {i+1} · round sleeping pig'
        angle=math.radians(-90+72*i)
        radius=[.39,.385,.40,.395,.385][i]
        obj.location=(.94*math.cos(angle),.94*math.sin(angle),1.235+[0,.015,-.005,.01,0][i])
        obj.scale=(radius,radius,radius)
        obj.rotation_euler=(-.50+[0,.03,-.04,.025,-.02][i],0,[-.04,-.12,.07,-.05,.12][i])
        obj['Base radius']=radius
        obj['Construction']='A round, welded rice dumpling. Eyes and snout pigment are painted on its actual skin.'
        pigs.append(obj)
    return pigs
