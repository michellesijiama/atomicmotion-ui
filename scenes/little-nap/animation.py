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


def animate_pigs(group,bowl_group,duration=192):
    lower=bpy.data.objects['Pig 1 · softly tilted pose']
    upper=bpy.data.objects['Pig 2 · softly tilted pose']
    controls=bpy.data.objects.new('MOTION · soft pudding controls',None)
    bpy.context.scene.collection.objects.link(controls)
    curves={
        'lower_squish':[(1,1),(43,1),(49,.79),(56,1.085),(64,.955),(74,1),(78,1),(84,.91),(90,1.04),(101,1),(117,1),(123,.93),(131,1.04),(138,1.01),(146,.96),(155,1),(193,1)],
        'upper_squish':[(1,1),(77,1),(84,.80),(91,1.095),(99,.955),(109,1),(119,1),(125,.96),(132,.93),(139,1.065),(148,.98),(157,1),(193,1)],
        'hop_height':[(1,0),(123,0),(131,.075),(138,.12),(146,0),(193,0)],
        'upper_air_gap':[(1,0),(127,0),(136,.025),(143,.035),(151,0),(193,0)],
        'lower_drop':[(1,4.7),(33,4.7),(39,3.8),(45,1.75),(49,0),(181,0),(187,4.7),(193,4.7)],
        'upper_drop':[(1,4.7),(67,4.7),(73,3.8),(79,1.75),(84,0),(181,0),(187,4.7),(193,4.7)],
        'bowl_drop':[(1,4.6),(7,3.95),(13,2.1),(18,0),(23,.055),(29,0),(35,.012),(41,0),(181,0),(187,4.6),(193,4.6)],
        'lower_wobble':[(1,0),(45,0),(51,.9),(57,-.55),(64,.28),(72,0),(80,0),(86,.5),(94,-.25),(105,0),(125,.3),(135,-.3),(147,.15),(157,0),(193,0)],
        'upper_wobble':[(1,0),(80,0),(87,.85),(94,-.50),(101,.24),(111,0),(129,.28),(141,-.25),(153,0),(193,0)],
        'drawing_visibility':[(1,1),(165,1),(181,0),(192,0),(193,1)],
    }
    for name,keys in curves.items():
        for frame,value in keys:
            controls[name]=float(value);controls.keyframe_insert(f'["{name}"]',frame=frame)
    cyclic(controls)
    def drive(obj,path,index,expression):
        driver=obj.driver_add(path,index).driver;driver.type='SCRIPTED'
        for name in curves:
            if name not in expression:continue
            variable=driver.variables.new();variable.name=name;variable.type='SINGLE_PROP'
            variable.targets[0].id=controls;variable.targets[0].data_path=f'["{name}"]'
        driver.expression=expression
    for pose,base,sq,wob in [(lower,(.86,.70,.82),'lower_squish','lower_wobble'),(upper,(.74,.58,.59),'upper_squish','upper_wobble')]:
        drive(pose,'scale',0,f'{base[0]} / sqrt({sq}) * (1 + .03 * {wob})')
        drive(pose,'scale',1,f'{base[1]} / sqrt({sq}) / (1 + .03 * {wob})')
        drive(pose,'scale',2,f'{base[2]} * {sq}')
    drive(lower,'location',2,'.6256 + .92 * .82 * lower_squish + hop_height + lower_drop')
    drive(upper,'location',2,'.6256 + 1.80 * .82 * lower_squish + hop_height + lower_drop + .92 * .59 * upper_squish + .0005 + upper_air_gap + upper_drop')
    drive(upper,'rotation_euler',1,'-.06 + .04 * upper_wobble')
    bowl=bpy.data.objects['Bowl · continuous blue vessel / ivory lace']
    bowl_pose=bpy.data.objects.new('Bowl · soft landing pose',None);bowl_group.objects.link(bowl_pose)
    bowl_pose.parent=bowl.parent
    world=bowl.matrix_world.copy();bowl.parent=bowl_pose;bowl.matrix_world=world
    drive(bowl_pose,'location',2,'bowl_drop')
    for index,impact in [(1,49),(2,84)]:
        body=bpy.data.objects[f'Pig {index} · round sleeping body']
        body.shape_key_add(name='Basis')
        flop=body.shape_key_add(name='Soft ear wobble');flop.slider_min=-.6
        for base,target in zip(body.data.vertices,flop.data):
            p=base.co
            mask=max(0,min(1,(abs(p.x)-.58)/.30))*max(0,min(1,(p.z-.60)/.20))
            mask*=max(0,min(1,(p.length-.98)/.09))
            target.co.z-=.12*mask;target.co.x+=math.copysign(.035*mask,p.x)
        for frame,value in [(1,0),(impact-3,0),(impact+4,.9),(impact+10,-.32),(impact+17,.35),(impact+25,0),(130,.16),(140,-.12),(153,0),(193,0)]:
            flop.value=float(value);flop.keyframe_insert('value',frame=frame)
        cyclic(body.data.shape_keys)
    for name,frame in [('Bowl lands',18),('First pudding lands',49),('Second pudding lands',84),('Puddings settle',113),('Gentle shared hop',138),('Fade to paper',173)]:
        bpy.context.scene.timeline_markers.new(name,frame=frame)
    bpy.context.scene.frame_set(113)
    return controls


def fade_drawing(material,controls):
    nodes,links=material.node_tree.nodes,material.node_tree.links
    output=nodes.get('Material Output');surface=output.inputs['Surface'].links[0].from_socket
    clear=nodes.new('ShaderNodeBsdfTransparent')
    mix=nodes.new('ShaderNodeMixShader');mix.label='Drawing gently fades back into the paper'
    links.new(clear.outputs[0],mix.inputs[1]);links.new(surface,mix.inputs[2]);links.new(mix.outputs[0],output.inputs['Surface'])
    driver=mix.inputs[0].driver_add('default_value').driver;driver.type='SCRIPTED'
    variable=driver.variables.new();variable.name='visibility';variable.type='SINGLE_PROP'
    variable.targets[0].id=controls;variable.targets[0].data_path='["drawing_visibility"]'
    driver.expression='visibility'


def animate_ink(group,duration=192):
    for i,obj in enumerate(group.objects):
        original=obj.location.copy();angle=obj.rotation_euler.y
        caption=obj.name.startswith('Caption')
        amplitude=.012 if caption else .045
        phase=(0 if obj.name.startswith('Little nap') else math.pi)+i*.06
        for frame in range(1,duration+2,6):
            t=math.tau*(frame-1)/duration
            obj.location.z=original.z+amplitude*math.sin(t+phase)
            obj.location.x=original.x+amplitude*.25*math.sin(t*2+phase)
            obj.rotation_euler.y=angle+(.005 if caption else .028)*math.sin(t+phase)
            obj.keyframe_insert('location',frame=frame);obj.keyframe_insert('rotation_euler',index=1,frame=frame)
        cyclic(obj)
    bpy.context.scene.frame_set(1)


def create_stars(group,duration=192):
    def halo_material():
        mat=bpy.data.materials.new('STARS · warm translucent glow');mat.use_nodes=True
        n,l=mat.node_tree.nodes,mat.node_tree.links;n.clear()
        coord=n.new('ShaderNodeTexCoord')
        xyz=n.new('ShaderNodeSeparateXYZ');l.new(coord.outputs['Generated'],xyz.inputs[0])
        terms=[]
        for socket in ('X','Z'):
            delta=n.new('ShaderNodeMath');delta.operation='SUBTRACT';delta.inputs[1].default_value=.5;l.new(xyz.outputs[socket],delta.inputs[0])
            term=n.new('ShaderNodeMath');term.operation='MULTIPLY';l.new(delta.outputs[0],term.inputs[0]);l.new(delta.outputs[0],term.inputs[1]);terms.append(term)
        square=n.new('ShaderNodeMath');square.operation='ADD';l.new(terms[0].outputs[0],square.inputs[0]);l.new(terms[1].outputs[0],square.inputs[1])
        exponent=n.new('ShaderNodeMath');exponent.operation='MULTIPLY';exponent.inputs[1].default_value=-23;l.new(square.outputs[0],exponent.inputs[0])
        falloff=n.new('ShaderNodeMath');falloff.operation='POWER';falloff.inputs[0].default_value=math.e;l.new(exponent.outputs[0],falloff.inputs[1])
        opacity=n.new('ShaderNodeMath');opacity.operation='MULTIPLY';opacity.inputs[1].default_value=.34;l.new(falloff.outputs[0],opacity.inputs[0])
        emission=n.new('ShaderNodeEmission');emission.inputs['Color'].default_value=(1,.75,.27,1)
        clear=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');l.new(opacity.outputs[0],mix.inputs[0])
        l.new(clear.outputs[0],mix.inputs[1]);l.new(emission.outputs[0],mix.inputs[2])
        out=n.new('ShaderNodeOutputMaterial');l.new(mix.outputs[0],out.inputs['Surface'])
        mat.surface_render_method='BLENDED'
        return mat
    halo=halo_material()
    specs=[(-1.16,2.77,.085,0),(1.14,2.12,.070,1.9),(.91,3.57,.050,3.2),(-1.27,1.72,.037,4.3),(1.29,3.10,.034,.8)]
    for index,(x,z,size,phase) in enumerate(specs,1):
        parent=bpy.data.objects.new(f'Star {index} · glowing twinkle',None);group.objects.link(parent);parent.location=(x,-1.80,z)
        vertices=[(math.cos(a)**3*size,-.025,math.sin(a)**3*size*1.25) for a in [math.tau*i/64 for i in range(64)]]
        data=bpy.data.meshes.new('Four-point luminous sparkle');data.from_pydata(vertices,[],[tuple(range(64))])
        core=bpy.data.objects.new(f'Sparkle core {index}',data);group.objects.link(core);core.parent=parent
        material=bpy.data.materials.new(f'STAR {index} · luminous honey-white core');material.use_nodes=True
        n,l=material.node_tree.nodes,material.node_tree.links;n.clear()
        emission=n.new('ShaderNodeEmission');emission.inputs['Color'].default_value=(1,.58,.12,1)
        out=n.new('ShaderNodeOutputMaterial');l.new(emission.outputs[0],out.inputs['Surface']);data.materials.append(material)
        radius=size*3.6
        mesh=bpy.data.meshes.new('Soft golden halo');mesh.from_pydata([(-radius,0,-radius),(radius,0,-radius),(radius,0,radius),(-radius,0,radius)],[],[(0,1,2,3)]);mesh.materials.append(halo)
        glow=bpy.data.objects.new(f'Glow halo {index}',mesh);group.objects.link(glow);glow.parent=parent
        for frame in range(1,duration+2,6):
            t=math.tau*(frame-1)/duration
            pulse=.18+.82*((1+math.sin(t*3+phase))/2)**2
            parent.scale=(pulse,pulse,pulse);parent.location.z=z+.025*math.sin(t+phase)
            parent.rotation_euler.y=.10*math.sin(t+phase)
            parent.keyframe_insert('scale',frame=frame);parent.keyframe_insert('location',index=2,frame=frame);parent.keyframe_insert('rotation_euler',index=1,frame=frame)
            emission.inputs['Strength'].default_value=2.0+4.0*pulse
            emission.inputs['Strength'].keyframe_insert('default_value',frame=frame)
        cyclic(parent);cyclic(material.node_tree)
    bpy.context.scene.frame_set(113)
