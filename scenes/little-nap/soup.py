"""Editable clear soup and delicate moving water reflections."""
import bpy
import math
from animation import DURATION


def ink_material(name,color):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    n,l=mat.node_tree.nodes,mat.node_tree.links;n.clear()
    coord=n.new('ShaderNodeTexCoord');grain=n.new('ShaderNodeTexNoise');grain.inputs['Scale'].default_value=620
    l.new(coord.outputs['Window'],grain.inputs['Vector'])
    mix=n.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(*color,1);mix.inputs[2].default_value=(1,1,.98,1)
    l.new(grain.outputs['Fac'],mix.inputs[0])
    em=n.new('ShaderNodeEmission');l.new(mix.outputs[0],em.inputs[0])
    out=n.new('ShaderNodeOutputMaterial');l.new(em.outputs[0],out.inputs[0])
    return mat


def line(group,name,points,material,width=.004):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=2
    data.bevel_depth=width;data.bevel_resolution=3
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    obj=bpy.data.objects.new(name,data);group.objects.link(obj);data.materials.append(material)
    return obj


def create_water(group,pigs):
    mat=bpy.data.materials.new('WATER · clear pale-blue pencil wash');mat.use_nodes=True
    n,l=mat.node_tree.nodes,mat.node_tree.links;n.clear()
    coords=n.new('ShaderNodeTexCoord');grain=n.new('ShaderNodeTexNoise');grain.inputs['Scale'].default_value=600
    l.new(coords.outputs['Window'],grain.inputs['Vector'])
    amount=n.new('ShaderNodeMapRange');amount.inputs['To Min'].default_value=.08;amount.inputs['To Max'].default_value=.19
    l.new(grain.outputs['Fac'],amount.inputs[0])
    clear=n.new('ShaderNodeBsdfTransparent')
    wash=n.new('ShaderNodeEmission');wash.inputs['Color'].default_value=(.37,.69,.83,1)
    mix=n.new('ShaderNodeMixShader');l.new(amount.outputs[0],mix.inputs[0]);l.new(clear.outputs[0],mix.inputs[1]);l.new(wash.outputs[0],mix.inputs[2])
    geometry=n.new('ShaderNodeNewGeometry');reverse=n.new('ShaderNodeMixShader')
    l.new(geometry.outputs['Backfacing'],reverse.inputs[0]);l.new(mix.outputs[0],reverse.inputs[1]);l.new(clear.outputs[0],reverse.inputs[2])
    out=n.new('ShaderNodeOutputMaterial');l.new(reverse.outputs[0],out.inputs['Surface'])
    mat.surface_render_method='BLENDED'
    # Closed liquid volume fits inside the continuous ceramic cavity.
    profile=[(.05,.655),(.44,.655),(.69,.68),(.93,.74),(1.15,.86),(1.33,1.025),(1.474,1.145),(1.30,1.145),(1.05,1.145),(.80,1.145),(.55,1.145),(.30,1.145),(.12,1.145)]
    count=128;verts=[(0,0,.655)];faces=[]
    for radius,z in profile:
        for j in range(count):
            a=math.tau*j/count;verts.append((radius*math.cos(a),radius*math.sin(a),z))
    for j in range(count):faces.append((0,1+(j+1)%count,1+j))
    for i in range(len(profile)-1):
        for j in range(count):
            a=1+i*count+j;b=1+i*count+(j+1)%count;faces.append((a,b,b+count,a+count))
    top=len(verts);verts.append((0,0,1.145));last=1+(len(profile)-1)*count
    for j in range(count):faces.append((last+j,last+(j+1)%count,top))
    mesh=bpy.data.meshes.new('Closed clear soup volume');mesh.from_pydata(verts,[],faces);mesh.materials.append(mat);mesh.update()
    water=bpy.data.objects.new('Soup · clear water inside the bowl',mesh);group.objects.link(water)
    for face in mesh.polygons:face.use_smooth=True
    water['Surface height']=1.145
    water.shape_key_add(name='Basis')
    for name,phase in [('Slow surface wave A',0),('Slow surface wave B',1.57079632679)]:
        key=water.shape_key_add(name=name);key.slider_min=-1
        for base,target in zip(water.data.vertices,key.data):
            x,y,z=base.co
            if z>1.144:
                shore=max(0,1-math.hypot(x,y)/1.474)**.7
                target.co.z+=.004*shore*math.sin(10*x+7*y+phase)
        driver=key.driver_add('value').driver;driver.expression=f'sin((frame-1)*2*pi/{DURATION}+{phase})'
    clear_surface=n.new('ShaderNodeBsdfPrincipled');clear_surface.label='Quiet physical highlights on the illustrated water'
    clear_surface.inputs['Base Color'].default_value=(.78,.91,.98,1);clear_surface.inputs['Roughness'].default_value=.12
    clear_surface.inputs['Transmission Weight'].default_value=.92;clear_surface.inputs['IOR'].default_value=1.333
    shimmer=n.new('ShaderNodeMixShader');shimmer.inputs[0].default_value=.10
    l.new(mix.outputs[0],shimmer.inputs[1]);l.new(clear_surface.outputs[0],shimmer.inputs[2]);l.new(shimmer.outputs[0],reverse.inputs[1])
    blue=ink_material('WATERLINES · broken pale-blue pencil',(.24,.51,.68))
    ivory=ink_material('WATERLINES · warm paper reflections',(.96,.97,.91))
    for i,pig in enumerate(pigs):
        carrier=bpy.data.objects.new(f'Ripple carrier {i+1} · follows its tangyuan',None);group.objects.link(carrier);carrier.location=(0,0,1.153)
        follow=carrier.constraints.new('COPY_LOCATION');follow.target=pig;follow.use_x=True;follow.use_y=True;follow.use_z=False
        for arc,(start,end,radius) in enumerate(((.2,1.75,.425),(3.3,5.4,.445))):
            points=[]
            for j in range(55):
                a=start+(end-start)*j/54
                r=radius+.0025*math.sin(7*a+i)
                points.append((r*math.cos(a),r*math.sin(a),0))
            ripple=line(group,f'Ripple {i+1}.{arc+1} · soft waterline',points,blue,.0034)
            ripple.parent=carrier;ripple['Tangyuan']=pig.name
    for i,(a,b,radius) in enumerate(((-2.5,-2.27,1.25),(.35,.56,1.25),(1.85,2.04,1.26),(-.70,-.51,1.15),(2.90,3.08,1.12))):
        points=[(radius*math.cos(a+(b-a)*j/70),radius*math.sin(a+(b-a)*j/70),1.153) for j in range(71)]
        line(group,f'Water reflection {i+1}',points,ivory,.005)
    return water
