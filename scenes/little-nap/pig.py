"""Two small round sleeping pigs stacked softly in a blue lace bowl."""
import bpy
import bmesh
import math
from mathutils import Vector
from watercolor_materials import watercolor
from contact import conform_scoop


def create_pig(group):
    def move(obj):
        for c in list(obj.users_collection):c.objects.unlink(obj)
        group.objects.link(obj);return obj
    def sphere(name,loc,scale,mat):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=64,location=loc)
        obj=move(bpy.context.object);obj.name=name;obj.scale=scale;obj.data.materials.append(mat)
        for p in obj.data.polygons:p.use_smooth=True
        return obj
    def one_pig(index,location,scale,tilt,color):
        before=set(group.objects)
        skin=watercolor(f'PIG {index} · watercolor wash / furry translucent pigment',color,None,face_z=.22 if index==1 else .10)
        body=sphere(f'Pig {index} · round sleeping body',(0,0,0),(1,1,1),skin)
        for v in body.data.vertices:
            x,y,z=v.co
            front=max(0,-y)**4
            face_z=.22 if index==1 else .10
            v.co.x=x*(1.06+.10*math.exp(-((z+.25)/.55)**2))+.10*(1-z*z)*math.sin(z*2+.8)
            v.co.y=y*(.92+.06*math.cos(z*2+1))+.05*math.sin(2*x+z)*(1-z*z)
            # The nose and cheeks are sculpted into the same connected skin.
            nose=.15*math.exp(-(((x-.015)/.215)**4+((z-face_z)/.13)**4))
            cheeks=sum(.035*math.exp(-(((x-side*.34)/.22)**2+((z-face_z)/.22)**2)) for side in (-1,1))
            v.co.y-=(nose+cheeks)*front
            v.co.z=max(-.92,z-.10*x+.07*math.sin(2.8*x+1.6*y)*(1-z*z))
        pieces=[body]
        for side in [-1,1]:
            verts=[];faces=[];U,V=20,16
            for i in range(U+1):
                u=i/U
                center=Vector((side*(.62+.32*u),-.12-.18*u*u,
                               .70+(.36*u-.30*u**3)*(1 if side<0 else .75)))
                tangent=Vector((side*.32,-.36*u,.36-.90*u*u)).normalized()
                across=Vector((tangent.z,0,-tangent.x)).normalized()
                for j in range(V):
                    a=math.tau*j/V
                    verts.append(center+across*(((.17 if side<0 else .145)*(1-u)**.7+.007)*math.cos(a))+Vector((0,(.065*math.sin(math.pi*u)+.022)*math.sin(a),0)))
            for i in range(U):
                for j in range(V):
                    a=i*V+j;b=i*V+(j+1)%V;faces.append((a,b,b+V,a+V))
            faces.extend([tuple(reversed(range(V))),tuple(U*V+j for j in range(V))])
            mesh=bpy.data.meshes.new('Soft folded pig ear');mesh.from_pydata(verts,[],faces);mesh.materials.append(skin)
            ear=bpy.data.objects.new(f'Pig {index} · folded ear {side}',mesh);group.objects.link(ear);pieces.append(ear)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in pieces:obj.select_set(True)
        bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        bm=bmesh.new();bm.from_mesh(body.data)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
        remesh=body.modifiers.new('Connected round body and simple folded ears','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.026
        bpy.ops.object.modifier_apply(modifier=remesh.name)
        smooth=body.modifiers.new('Softly polished round form','SMOOTH');smooth.factor=.45;smooth.iterations=4
        sub=body.modifiers.new('Silky silhouette / subdivision 2','SUBSURF');sub.levels=2;sub.render_levels=2
        for p in body.data.polygons:p.use_smooth=True
        bpy.context.view_layer.update()
        pose=bpy.data.objects.new(f'Pig {index} · softly tilted pose',None);group.objects.link(pose)
        for obj in set(group.objects)-before-{pose}:
            world=obj.matrix_world.copy();obj.parent=pose;obj.matrix_world=world
        pose.location=location;pose.scale=scale;pose.rotation_euler[1]=tilt
        body['Character']='An organic sleeping pig scoop: integrated snout, flush watercolor face and soft folded ears.'
        return body
    lower=one_pig(1,(-.05,.03,1.38),(.86,.70,.82),0,(.95,.29,.40))
    upper=one_pig(2,(.12,.03,2.6449),(.74,.58,.59),-.10,(.99,.43,.42))
    conform_scoop(upper,lower)
    return lower
