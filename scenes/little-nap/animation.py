"""Fixed frontal camera, tiny independent tangyuan sways and following water ripples."""
import bpy
import math
from mathutils import Vector

DURATION=192
POSTER=1


def cyclic(obj):
    if not obj.animation_data or not obj.animation_data.action:return
    action=obj.animation_data.action
    bag=action.layers[0].strips[0].channelbag(obj.animation_data.action_slot)
    for curve in bag.fcurves:
        for key in curve.keyframe_points:
            key.interpolation='BEZIER';key.handle_left_type='AUTO_CLAMPED';key.handle_right_type='AUTO_CLAMPED'
        curve.modifiers.new('CYCLES')


def animate_scene(camera,pigs,soup_group):
    scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=DURATION;scene.render.fps=24
    target=Vector((.13,0,1.0));elevation=math.radians(19);azimuth=math.radians(-8)
    camera.location=target+Vector((10*math.cos(elevation)*math.sin(azimuth),-10*math.cos(elevation)*math.cos(azimuth),10*math.sin(elevation)))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    for i,pig in enumerate(pigs):
        original=pig.location.copy();rotation=pig.rotation_euler.copy();radius=pig['Base radius']
        pig['Motion']='A tiny individual buoyant sway, with its own phase, direction and soft elastic nuzzle.'
        pig['Float height']=original.z
        phase_offset=(.3,1.75,3.15,4.4,5.5)[i]
        amplitude=(.012,.019,.010,.016,.014)[i]
        softness=(.009,.013,.008,.011,.010)[i]
        inward=Vector((original.x,original.y,0)).normalized()*.018
        for frame in range(1,DURATION+2):
            t=math.tau*(frame-1)/DURATION;phase=t+phase_offset
            bob=amplitude*(.65*math.sin(phase)+.35*math.sin(2*t+phase_offset*1.7))
            squish=1+softness*(.72*math.sin(phase+.7)+.28*math.sin(2*t+phase_offset*.3))
            dx=.009*math.sin(phase)+.003*math.sin(2*t+phase_offset*.6)
            dy=.007*math.cos(t+phase_offset*.6)
            pig.location=original-inward+Vector((dx,dy,bob+radius*(squish-1)))
            pig.scale=(radius/math.sqrt(squish),radius/math.sqrt(squish),radius*squish)
            pig.rotation_euler=(rotation.x+.012*math.sin(phase)+.005*math.sin(2*t+phase_offset*.5),.009*math.sin(t+phase_offset*.4),rotation.z+.012*math.sin(t+phase_offset*1.2)+.006*math.sin(2*t+phase_offset))
            pig.keyframe_insert('location',frame=frame);pig.keyframe_insert('scale',frame=frame);pig.keyframe_insert('rotation_euler',frame=frame)
        cyclic(pig)
    # Object-color uniforms animate the wash without recompiling its shader each frame.
    ripples=[obj for obj in soup_group.objects if obj.name.startswith('Ripple ') and obj.type=='CURVE']
    ripple_material=ripples[0].data.materials[0].copy();ripple_material.name='WATER · gentle shared ripple wash'
    n,l=ripple_material.node_tree.nodes,ripple_material.node_tree.links
    out=next(node for node in n if node.type=='OUTPUT_MATERIAL');surface=out.inputs['Surface'].links[0].from_socket
    info=n.new('ShaderNodeObjectInfo');clear=n.new('ShaderNodeBsdfTransparent');fade=n.new('ShaderNodeMixShader')
    l.new(info.outputs['Alpha'],fade.inputs[0]);l.new(clear.outputs[0],fade.inputs[1]);l.new(surface,fade.inputs[2]);l.new(fade.outputs[0],out.inputs['Surface'])
    for obj in ripples:
        obj.data.materials[0]=ripple_material
        for frame in range(1,DURATION+2,3):
            index=int(obj['Tangyuan'].split()[1])-1
            phase=math.tau*(frame-1)/DURATION+(.3,1.75,3.15,4.4,5.5)[index]
            spread=1+.018*math.sin(phase-.5)
            obj.scale=(spread,spread,1);obj.color=(1,1,1,.17+.045*math.cos(phase-.6))
            obj.keyframe_insert('scale',frame=frame);obj.keyframe_insert('color',index=3,frame=frame)
        cyclic(obj)
    reflections=[obj for obj in soup_group.objects if obj.name.startswith('Water reflection')]
    material=reflections[0].data.materials[0]
    n,l=material.node_tree.nodes,material.node_tree.links
    emission=next(node for node in n if node.type=='EMISSION');original=emission.inputs['Color'].links[0].from_socket
    info=n.new('ShaderNodeObjectInfo');multiply=n.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
    l.new(original,multiply.inputs[1]);l.new(info.outputs['Color'],multiply.inputs[2]);l.new(multiply.outputs[0],emission.inputs['Color']);emission.inputs['Strength'].default_value=2
    for i,obj in enumerate(reflections):
        for frame in range(1,DURATION+2,3):
            phase=math.tau*(frame-1)/DURATION
            brightness=.65+.12*math.sin(phase+i*.7)
            obj.color=(brightness,brightness,brightness,1)
            pulse=1+.015*math.sin(phase+i*.5);obj.scale=(pulse,pulse,1);obj.rotation_euler.z=.018*math.sin(phase+i*.7)
            obj.keyframe_insert('color',frame=frame);obj.keyframe_insert('scale',frame=frame);obj.keyframe_insert('rotation_euler',index=2,frame=frame)
        cyclic(obj)
    for label,frame in [('Quiet water',1),('Little individual sways',49),('Soft nuzzles',97),('A gentle drift',145)]:scene.timeline_markers.new(label,frame=frame)


def create_stars(group,camera):
    halo=bpy.data.materials.new('STARS · soft golden glow on paper');halo.use_nodes=True
    n,l=halo.node_tree.nodes,halo.node_tree.links;n.clear()
    uv=n.new('ShaderNodeTexCoord');distance=n.new('ShaderNodeVectorMath');distance.operation='DISTANCE';distance.inputs[1].default_value=(.5,.5,0)
    l.new(uv.outputs['UV'],distance.inputs[0])
    ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.02;ramp.color_ramp.elements[0].color=(.32,.32,.32,1)
    ramp.color_ramp.elements[1].position=.48;ramp.color_ramp.elements[1].color=(0,0,0,1);ramp.color_ramp.interpolation='EASE';l.new(distance.outputs['Value'],ramp.inputs[0])
    clear=n.new('ShaderNodeBsdfTransparent');em=n.new('ShaderNodeEmission');em.inputs[0].default_value=(1,.72,.20,1)
    mix=n.new('ShaderNodeMixShader');l.new(ramp.outputs[0],mix.inputs[0]);l.new(clear.outputs[0],mix.inputs[1]);l.new(em.outputs[0],mix.inputs[2])
    out=n.new('ShaderNodeOutputMaterial');l.new(mix.outputs[0],out.inputs[0]);halo.surface_render_method='BLENDED'
    specs=[(-1.48,1.30,.055),(1.48,1.32,.058),(-1.46,-1.39,.035),(1.38,-1.35,.038),(.49,1.83,.032)]
    for i,(x,y,size) in enumerate(specs):
        parent=bpy.data.objects.new(f'Star {i+1} · glowing twinkle',None);group.objects.link(parent);parent.parent=camera;parent.location=(x,y,-7.5)
        verts=[(size*math.cos(a)**3,size*1.3*math.sin(a)**3,.01) for a in [math.tau*j/64 for j in range(64)]]
        mesh=bpy.data.meshes.new('Four-point pencil sparkle');mesh.from_pydata(verts,[],[tuple(range(64))])
        core=bpy.data.objects.new(f'Sparkle core {i+1}',mesh);group.objects.link(core);core.parent=parent
        mat=bpy.data.materials.new(f'STAR {i+1} · luminous honey');mat.use_nodes=True
        n,l=mat.node_tree.nodes,mat.node_tree.links;n.clear();em=n.new('ShaderNodeEmission');em.inputs[0].default_value=(1,.64,.16,1);em.inputs[1].default_value=2
        out=n.new('ShaderNodeOutputMaterial');l.new(em.outputs[0],out.inputs[0]);mesh.materials.append(mat)
        radius=size*4
        mesh=bpy.data.meshes.new('Golden halo card');mesh.from_pydata([(-radius,-radius,0),(radius,-radius,0),(radius,radius,0),(-radius,radius,0)],[],[(0,1,2,3)])
        uv=mesh.uv_layers.new()
        for loop,co in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=co
        mesh.materials.append(halo);glow=bpy.data.objects.new(f'Glow halo {i+1}',mesh);group.objects.link(glow);glow.parent=parent
        for frame in range(1,DURATION+2,6):
            t=math.tau*(frame-1)/DURATION;pulse=.40+.60*((1+math.sin(3*t+i))/2)**2
            parent.scale=(pulse,pulse,pulse);parent.location.y=y+.018*math.sin(t+i)
            parent.keyframe_insert('scale',frame=frame);parent.keyframe_insert('location',index=1,frame=frame)
        cyclic(parent)
