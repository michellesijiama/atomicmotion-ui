"""Small editable typewriter phrases that curl gently around the illustration."""
import bpy
import math
import random


def create_lettering(group,font_path):
    font=bpy.data.fonts.load(str(font_path))
    rng=random.Random(33)
    ink=bpy.data.materials.new('LETTERING · uneven ink pressed into paper');ink.use_nodes=True
    n,l=ink.node_tree.nodes,ink.node_tree.links;n.clear()
    coord=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=930
    l.new(coord.outputs['Window'],noise.inputs['Vector'])
    ink_wash=n.new('ShaderNodeValToRGB');ink_wash.label='Dry and wet ink within each letter'
    ink_wash.color_ramp.elements[0].color=(.17,.15,.13,1);ink_wash.color_ramp.elements[1].color=(.40,.37,.34,1)
    l.new(noise.outputs['Fac'],ink_wash.inputs[0])
    emission=n.new('ShaderNodeEmission');l.new(ink_wash.outputs[0],emission.inputs[0])
    out=n.new('ShaderNodeOutputMaterial');l.new(emission.outputs[0],out.inputs[0])
    def text(name,body,location,size):
        data=bpy.data.curves.new(name,'FONT');data.font=font;data.body=body
        data.size=size;data.align_x='CENTER';data.align_y='CENTER'
        data.materials.append(ink)
        obj=bpy.data.objects.new(name,data);group.objects.link(obj)
        obj.location=location;obj.location.z+=rng.uniform(-.0015,.0015)
        obj.rotation_euler=(math.pi/2,0,0)
        return obj
    def arc(label,body,cx,cz,radius,center_angle,size):
        step=math.degrees(size*.64/radius)
        start=center_angle+step*(len(body)-1)/2
        for i,char in enumerate(body):
            angle=math.radians(start-i*step)
            ob=text(f'{label} · letter {i+1:02d}',char,(cx+radius*math.cos(angle),-1.75,cz+radius*math.sin(angle)),size)
            ob.rotation_euler[1]=math.pi/2-angle+rng.uniform(-.004,.004)
    arc('Little nap','shh... little nap',.12,2.72,.98,42,.070)
    arc('Sweet dreams','soft little dreams',-.05,1.38,1.12,135,.065)
    text('Caption · bowl of dreams','A bowl full of soft little dreams.',(0,-1.75,.035),.067)
    text('Caption · let the pudding sleep','Shh... let the little piggies sleep.',(0,-1.75,-.05),.067)
