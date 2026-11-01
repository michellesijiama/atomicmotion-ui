"""Soft dessert hops, delayed ear flops, floating ink and quiet paper sparkles."""
import bpy
import math


def cyclic(obj):
    action=obj.animation_data.action if obj.animation_data else None
    if not action:return
    bag=action.layers[0].strips[0].channelbag(obj.animation_data.action_slot)
    for curve in bag.fcurves:
        for key in curve.keyframe_points:
            key.interpolation='BEZIER';key.handle_left_type='AUTO_CLAMPED';key.handle_right_type='AUTO_CLAMPED'
        curve.modifiers.new('CYCLES')


def animate_pigs(group):
    lower=bpy.data.objects['Pig 1 · softly tilted pose']
    upper=bpy.data.objects['Pig 2 · softly tilted pose']
    controls=bpy.data.objects.new('MOTION · soft pudding controls',None)
    bpy.context.scene.collection.objects.link(controls)
    # All transform drivers read a separate control object. This keeps the
    # contact equations exact between beats without transform dependency cycles.
    beats=[(1,1,0,1,0),(5,.85,0,.94,0),(10,1.10,.14,.87,.025),
           (16,1.04,.20,1.10,.070),(23,.89,.025,.98,.035),
           (30,1.05,0,.91,0),(38,1,0,1.03,0),(49,1,0,1,0)]
    names=('lower_squish','hop_height','upper_squish','upper_air_gap')
    for offset in (0,48,96):
        for frame,*values in beats:
            for name,value in zip(names,values):
                controls[name]=float(value);controls.keyframe_insert(f'["{name}"]',frame=frame+offset)
    cyclic(controls)
    def drive(obj,path,index,expression):
        driver=obj.driver_add(path,index).driver;driver.type='SCRIPTED'
        for name in names:
            variable=driver.variables.new();variable.name=name;variable.type='SINGLE_PROP'
            variable.targets[0].id=controls;variable.targets[0].data_path=f'["{name}"]'
        driver.expression=expression
    for pose,base,property_name in [(lower,(.86,.70,.82),'lower_squish'),(upper,(.74,.58,.59),'upper_squish')]:
        for i,value in enumerate(base):
            drive(pose,'scale',i,f'{value} / sqrt({property_name})' if i<2 else f'{value} * {property_name}')
    drive(lower,'location',2,'.6256 + .92 * .82 * lower_squish + hop_height')
    drive(upper,'location',2,'.6256 + 1.80 * .82 * lower_squish + hop_height + .92 * .59 * upper_squish + .0005 + upper_air_gap')
    for index in (1,2):
        body=bpy.data.objects[f'Pig {index} · round sleeping body']
        body.shape_key_add(name='Basis')
        flop=body.shape_key_add(name='Soft ear wobble')
        for base,target in zip(body.data.vertices,flop.data):
            p=base.co
            mask=max(0,min(1,(abs(p.x)-.58)/.30))*max(0,min(1,(p.z-.60)/.20))
            mask*=max(0,min(1,(p.length-.98)/.09))
            target.co.z-=.16*mask;target.co.x+=math.copysign(.045*mask,p.x)
        for offset in (0,48,96):
            for frame,value in [(1,0),(7,.95),(13,-.35),(21,.65),(29,-.18),(38,.08),(49,0)]:
                flop.value=value;flop.keyframe_insert('value',frame=frame+offset)
        # Shape key actions use the same editable cyclic Bezier curves.
        cyclic(body.data.shape_keys)
    bpy.context.scene.frame_set(1)


def animate_ink(group):
    for i,obj in enumerate(group.objects):
        original=obj.location.copy();angle=obj.rotation_euler.y
        caption=obj.name.startswith('Caption')
        amplitude=.012 if caption else .045
        phase=(0 if obj.name.startswith('Little nap') else math.pi)+i*.06
        for frame in range(1,146,6):
            t=math.tau*(frame-1)/144
            obj.location.z=original.z+amplitude*math.sin(t+phase)
            obj.location.x=original.x+amplitude*.25*math.sin(t*2+phase)
            obj.rotation_euler.y=angle+(.005 if caption else .028)*math.sin(t+phase)
            obj.keyframe_insert('location',frame=frame);obj.keyframe_insert('rotation_euler',index=1,frame=frame)
        cyclic(obj)
    bpy.context.scene.frame_set(1)


def create_stars(group):
    material=bpy.data.materials.new('STARS · speckled midnight-blue ink');material.use_nodes=True
    n,l=material.node_tree.nodes,material.node_tree.links;n.clear()
    coord=n.new('ShaderNodeTexCoord');grain=n.new('ShaderNodeTexNoise');grain.inputs['Scale'].default_value=530
    l.new(coord.outputs['Window'],grain.inputs['Vector'])
    tint=n.new('ShaderNodeValToRGB');tint.color_ramp.elements[0].color=(.065,.10,.15,1)
    tint.color_ramp.elements[1].color=(.65,.69,.73,1);l.new(grain.outputs['Fac'],tint.inputs[0])
    emission=n.new('ShaderNodeEmission');l.new(tint.outputs[0],emission.inputs['Color'])
    out=n.new('ShaderNodeOutputMaterial');l.new(emission.outputs[0],out.inputs['Surface'])
    specs=[(-1.16,2.77,.105,0),(1.14,2.12,.085,1.9),(.91,3.57,.060,3.2),
           (-1.27,1.72,.043,4.3),(1.29,3.10,.039,.8)]
    for index,(x,z,size,phase) in enumerate(specs,1):
        vertices=[(math.cos(a)**3*size,0,math.sin(a)**3*size*1.25) for a in [math.tau*i/64 for i in range(64)]]
        data=bpy.data.meshes.new('Four-point paper sparkle');data.from_pydata(vertices,[],[tuple(range(64))]);data.materials.append(material)
        obj=bpy.data.objects.new(f'Star {index} · quiet twinkle',data);group.objects.link(obj);obj.location=(x,-1.80,z)
        for frame in range(1,146,6):
            t=math.tau*(frame-1)/144
            pulse=.18+.82*((1+math.sin(t*3+phase))/2)**2
            obj.scale=(pulse,pulse,pulse);obj.location.z=z+.025*math.sin(t+phase)
            obj.rotation_euler.y=.10*math.sin(t+phase)
            obj.keyframe_insert('scale',frame=frame);obj.keyframe_insert('location',index=2,frame=frame)
            obj.keyframe_insert('rotation_euler',index=1,frame=frame)
        cyclic(obj)
    bpy.context.scene.frame_set(1)
