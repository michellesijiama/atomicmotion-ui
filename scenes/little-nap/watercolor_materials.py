"""Watercolor gradients with paper tooth and fine pigment particles."""
import bpy
from paper_fibers import fibers, soften_boundary
from face_paint import paint_face


def watercolor(name,color,contact=None,face_z=None):
    material=bpy.data.materials.new(name);material.use_nodes=True
    material.diffuse_color=(*color,1)
    nodes,links=material.node_tree.nodes,material.node_tree.links
    nodes.remove(nodes.get('Principled BSDF'))
    def node(kind,label,x,y):
        n=nodes.new(kind);n.label=label;n.location=(x,y);return n
    def math(operation,a,b,x,y):
        n=node('ShaderNodeMath',operation,x,y);n.operation=operation
        for i,value in enumerate((a,b)):
            if isinstance(value,(int,float)):n.inputs[i].default_value=value
            else:links.new(value,n.inputs[i])
        return n.outputs[0]
    coord=node('ShaderNodeTexCoord','Watercolor · pigment on the paper',-1200,400)
    height=node('ShaderNodeSeparateXYZ','Soft vertical wash',-1000,700)
    links.new(coord.outputs['Generated'],height.inputs[0])
    geometry=node('ShaderNodeNewGeometry','Softly shaded rounded volume',-1200,100)
    light=node('ShaderNodeVectorMath','Gentle illustrated light direction',-1000,100)
    light.operation='DOT_PRODUCT';light.inputs[1].default_value=(-.70,-.35,.65)
    links.new(geometry.outputs['Normal'],light.inputs[0])
    normal=math('ADD',math('MULTIPLY',light.outputs['Value'],.5,-800,100),.5,-600,100)
    pressure=node('ShaderNodeTexNoise','Uneven watercolor wash / broad gradient',-1000,450)
    pressure.inputs['Scale'].default_value=5.5;pressure.inputs['Detail'].default_value=2.5
    links.new(coord.outputs['Generated'],pressure.inputs['Vector'])
    gradient=math('ADD',math('MULTIPLY',height.outputs['Z'],.25,-800,700),math('MULTIPLY',normal,.60,-400,100),-200,500)
    gradient=math('ADD',gradient,math('MULTIPLY',pressure.outputs['Fac'],.15,-800,450),0,500)
    wash=node('ShaderNodeValToRGB','Rose pigment → luminous peach → paper-white light',200,500)
    stops=[(.38,(color[0]*.78,color[1]*.025,color[2]*.27,1)),
           (.58,(color[0],color[1]*.15,color[2]*.30,1)),
           (.74,(1,color[1]*.70+.14,color[2]*.50+.08,1)),
           (.90,(1,color[1]*.35+.69,color[2]*.35+.52,1))]
    ramp=wash.color_ramp;ramp.interpolation='EASE'
    ramp.elements.remove(ramp.elements[1])
    for i,(position,tint) in enumerate(stops):
        element=ramp.elements[0] if i==0 else ramp.elements.new(position)
        element.position=position;element.color=tint
    links.new(gradient,wash.inputs[0])
    tooth=node('ShaderNodeTexNoise','Fine paper tooth / white gaps',-1000,-150)
    tooth.inputs['Scale'].default_value=480;tooth.inputs['Detail'].default_value=2
    links.new(coord.outputs['Window'],tooth.inputs['Vector'])
    coverage=node('ShaderNodeValToRGB','Soft pencil coverage',-750,-150)
    coverage.color_ramp.elements[0].position=.30;coverage.color_ramp.elements[0].color=(.22,.22,.22,1)
    coverage.color_ramp.elements[1].position=.55;coverage.color_ramp.elements[1].color=(.98,.98,.98,1)
    links.new(tooth.outputs['Fac'],coverage.inputs[0])
    fiber=fibers(nodes,links,coord.outputs['Window'])
    paper_fiber=math('MULTIPLY',fiber,.24,-500,-200)
    final_coverage=math('ADD',math('MULTIPLY',coverage.outputs[0],.88,-400,-150),paper_fiber,-200,-150)
    paper_mix=node('ShaderNodeMixRGB','Pigment leaves the paper visible',450,450)
    paper_mix.inputs[1].default_value=(.98,.965,.935,1)
    links.new(final_coverage,paper_mix.inputs[0]);links.new(wash.outputs[0],paper_mix.inputs[2])
    fleck=node('ShaderNodeTexVoronoi','Fine loose pigment particles',-1000,-450)
    fleck.voronoi_dimensions='2D';fleck.inputs['Scale'].default_value=330
    links.new(coord.outputs['Window'],fleck.inputs['Vector'])
    particles=math('LESS_THAN',fleck.outputs['Distance'],.15,-750,-450)
    particles=math('MULTIPLY',particles,.38,-500,-450)
    pigment=node('ShaderNodeMixRGB','Darker pencil grains within the wash',650,400)
    links.new(particles,pigment.inputs[0]);links.new(paper_mix.outputs[0],pigment.inputs[1])
    pigment.inputs[2].default_value=(.48,.035,.10,1)
    surface,ink=paint_face(nodes,links,pigment.outputs[0],face_z) if face_z is not None else (pigment.outputs[0],None)
    emission=node('ShaderNodeEmission','Watercolor illustration surface',900,400)
    links.new(surface,emission.inputs['Color'])
    diffuse=node('ShaderNodeBsdfDiffuse','Matte drawn light and shade',900,200)
    diffuse.inputs['Roughness'].default_value=1
    links.new(surface,diffuse.inputs['Color'])
    drawn=node('ShaderNodeMixShader','Paper first / softly shaded form',1120,400)
    drawn.inputs[0].default_value=.52;links.new(diffuse.outputs[0],drawn.inputs[1]);links.new(emission.outputs[0],drawn.inputs[2])
    final=node('ShaderNodeMixShader','Illustrated jelly softness / no hard glare',1340,400)
    translucent=node('ShaderNodeBsdfTranslucent','Light passing softly through the painted pigment',1120,100)
    links.new(surface,translucent.inputs['Color'])
    final.inputs[0].default_value=.16;links.new(drawn.outputs[0],final.inputs[1]);links.new(translucent.outputs[0],final.inputs[2])
    links.new(final.outputs[0],nodes.get('Material Output').inputs['Surface'])
    nodes.get('Material Output').location=(1560,400)
    # One translucent pigment layer, with clear rear faces: light and background
    # really pass through the wash instead of being painted pale onto an opaque sphere.
    clear=node('ShaderNodeBsdfTransparent','Clear paper between watercolor pigment',1340,100)
    opacity=node('ShaderNodeMixShader','Actual semi-transparent watercolor wash',1540,400)
    dilution=math('ADD',.08,math('MULTIPLY',gradient,.55,1340,-100),1540,-100)
    if ink is not None:dilution=math('MULTIPLY',dilution,math('SUBTRACT',1,math('MULTIPLY',ink,.96,1300,-500),1500,-500),1700,-500)
    links.new(dilution,opacity.inputs[0])
    links.new(final.outputs[0],opacity.inputs[1]);links.new(clear.outputs[0],opacity.inputs[2])
    backface=node('ShaderNodeMixShader','Single pigment layer / clear reverse side',1740,400)
    links.new(geometry.outputs['Backfacing'],backface.inputs[0])
    links.new(opacity.outputs[0],backface.inputs[1]);links.new(clear.outputs[0],backface.inputs[2])
    links.new(backface.outputs[0],nodes.get('Material Output').inputs['Surface'])
    nodes.get('Material Output').location=(1960,400)
    soften_boundary(material,.58,contact)
    return material
