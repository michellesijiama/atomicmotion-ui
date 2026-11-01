"""Editable Cycles shaders for a colored-pencil illustration, MIT license."""
import bpy


def pencil(name, pigment, coverage=.72, transparent=False, soft_edges=True):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*pigment, 1)
    n, l = m.node_tree.nodes, m.node_tree.links
    n.clear()
    def node(kind, name, x, y):
        v=n.new(kind);v.label=name;v.location=(x,y);return v
    def math(op, a, b, x, y):
        v=node('ShaderNodeMath',op,x,y);v.operation=op
        if isinstance(a,(int,float)):v.inputs[0].default_value=a
        else:l.new(a,v.inputs[0])
        if isinstance(b,(int,float)):v.inputs[1].default_value=b
        else:l.new(b,v.inputs[1])
        return v.outputs[0]
    coord=node('ShaderNodeTexCoord','Grain follows the paper, not the object',-1100,300)
    grain=node('ShaderNodeTexNoise','Fine pigment / paper tooth',-850,400)
    grain.inputs['Scale'].default_value=620
    grain.inputs['Detail'].default_value=2
    grain.inputs['Roughness'].default_value=.8
    l.new(coord.outputs['Window'],grain.inputs['Vector'])
    pressure=node('ShaderNodeTexNoise','Uneven pencil pressure',-850,100)
    pressure.inputs['Scale'].default_value=24
    pressure.inputs['Detail'].default_value=3
    l.new(coord.outputs['Window'],pressure.inputs['Vector'])
    drag=node('ShaderNodeVectorMath','Fine diagonal pencil strokes',-1080,-180)
    drag.operation='MULTIPLY';drag.inputs[1].default_value=(340,52,1)
    l.new(coord.outputs['Window'],drag.inputs[0])
    strokes=node('ShaderNodeTexNoise','Overlapping hatch marks',-850,-180)
    strokes.inputs['Scale'].default_value=1
    strokes.inputs['Detail'].default_value=2
    l.new(drag.outputs['Vector'],strokes.inputs['Vector'])
    geo=node('ShaderNodeNewGeometry','Soft illustrated volume',-850,-450)
    dot=node('ShaderNodeVectorMath','Pencil shading direction',-630,-450)
    dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=(-.56,-.65,.52)
    l.new(geo.outputs['Normal'],dot.inputs[0])
    shade=math('MULTIPLY',dot.outputs['Value'],.30,-410,-420)
    shade=math('ADD',shade,.65,-220,-420)
    pressure_value=math('MULTIPLY',pressure.outputs['Fac'],.28,-620,100)
    grain_value=math('MULTIPLY',grain.outputs['Fac'],.75,-620,400)
    pigment_amount=math('ADD',grain_value,pressure_value,-410,300)
    hatch=math('MULTIPLY',strokes.outputs['Fac'],.13,-620,-100)
    pigment_amount=math('ADD',pigment_amount,hatch,-220,250)
    ramp=node('ShaderNodeValToRGB','Individual grains, with white paper between',0,280)
    ramp.color_ramp.elements[0].position=.35
    ramp.color_ramp.elements[0].color=(0,0,0,1)
    ramp.color_ramp.elements[1].position=.57
    ramp.color_ramp.elements[1].color=(1,1,1,1)
    l.new(pigment_amount,ramp.inputs[0])
    amount=math('MULTIPLY',ramp.outputs['Color'],coverage,240,320)
    if not transparent and soft_edges:
        edge_normal=node('ShaderNodeSeparateXYZ','Soft pencil silhouette',-410,-700)
        l.new(geo.outputs['Normal'],edge_normal.inputs[0])
        facing=math('ABSOLUTE',edge_normal.outputs['Y'],0,-200,-700)
        feather=node('ShaderNodeMapRange','Paper breaks through the outer contour',20,-650)
        feather.inputs['From Min'].default_value=0
        feather.inputs['From Max'].default_value=.25
        feather.inputs['To Min'].default_value=.08
        feather.inputs['To Max'].default_value=1
        feather.clamp=True
        l.new(facing,feather.inputs['Value'])
        amount=math('MULTIPLY',amount,feather.outputs[0],460,320)
    tone=node('ShaderNodeMixRGB','Layered colored pigment',0,-120)
    tone.blend_type='MIX'
    tone.inputs[1].default_value=(*(c*.46 for c in pigment),1)
    tone.inputs[2].default_value=(*pigment,1)
    l.new(shade,tone.inputs[0])
    color=node('ShaderNodeMixRGB','Pigment on warm white cotton paper',450,100)
    color.inputs[1].default_value=(.94,.93,.90,1)
    l.new(amount,color.inputs[0]);l.new(tone.outputs[0],color.inputs[2])
    diffuse=node('ShaderNodeBsdfDiffuse','Matte pencil, illuminated by the softboxes',700,100)
    diffuse.inputs['Roughness'].default_value=1
    l.new(color.outputs[0],diffuse.inputs['Color'])
    emission=node('ShaderNodeEmission','Keep the paper whites clean',700,-80)
    l.new(color.outputs[0],emission.inputs[0]);emission.inputs[1].default_value=1
    mix=node('ShaderNodeMixShader','Illustrated light response',930,100)
    mix.inputs[0].default_value=.72
    l.new(diffuse.outputs[0],mix.inputs[1]);l.new(emission.outputs[0],mix.inputs[2])
    out=node('ShaderNodeOutputMaterial','Surface',1350,100)
    if transparent:
        # The bowl is made of discontinuous blue pigment, so fruit remains
        # visible between the marks. This is a shader, not an image overlay.
        clear=node('ShaderNodeBsdfTransparent','Paper showing through the bowl',930,-160)
        final=node('ShaderNodeMixShader','Translucent pencil bowl',1150,100)
        normal=node('ShaderNodeSeparateXYZ','Bowl pigment gathers at the silhouette',-400,-680)
        l.new(geo.outputs['Normal'],normal.inputs[0])
        facing=math('ABSOLUTE',normal.outputs['Y'],0,-170,-680)
        edge=math('SUBTRACT',1,facing,40,-680)
        edge=math('MULTIPLY',edge,.38,240,-680)
        edge=math('ADD',edge,.32,440,-680)
        alpha=math('MULTIPLY',ramp.outputs['Color'],edge,740,400)
        l.new(alpha,final.inputs[0]);l.new(clear.outputs[0],final.inputs[1])
        l.new(mix.outputs[0],final.inputs[2]);l.new(final.outputs[0],out.inputs[0])
    else:
        l.new(mix.outputs[0],out.inputs[0])
    return m


def paper():
    m=bpy.data.materials.new('PAPER · fine cotton fibers / warm white')
    m.use_nodes=True
    n,l=m.node_tree.nodes,m.node_tree.links
    n.clear()
    tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=430
    tex.inputs['Detail'].default_value=3
    c=n.new('ShaderNodeTexCoord');l.new(c.outputs['Window'],tex.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=(.84,.84,.81,1)
    ramp.color_ramp.elements[1].color=(1,1,.985,1)
    l.new(tex.outputs['Fac'],ramp.inputs[0])
    e=n.new('ShaderNodeEmission');l.new(ramp.outputs[0],e.inputs[0])
    out=n.new('ShaderNodeOutputMaterial');l.new(e.outputs[0],out.inputs[0])
    return m
