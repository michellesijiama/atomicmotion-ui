"""Grainy pencil contours with sparse, paper-light colored interiors."""
from paper_fibers import fibers


def pencil_surface(material,color,ink_color,fill=.18,ink_mask=None,decoration=None):
    nodes,links=material.node_tree.nodes,material.node_tree.links
    def node(kind,label,x,y):
        n=nodes.new(kind);n.label='PENCIL · '+label;n.location=(x,y);return n
    def op(operation,a,b,x=0,y=0):
        n=node('ShaderNodeMath',operation,x,y);n.operation=operation
        for i,value in enumerate((a,b)):
            if isinstance(value,(int,float)):n.inputs[i].default_value=value
            else:links.new(value,n.inputs[i])
        return n.outputs[0]
    coord=node('ShaderNodeTexCoord','paper-space pencil pressure',-1000,0)
    geometry=node('ShaderNodeNewGeometry','contour angle',-1000,350)
    dot=node('ShaderNodeVectorMath','visible silhouette',-800,350);dot.operation='DOT_PRODUCT'
    links.new(geometry.outputs['Normal'],dot.inputs[0]);links.new(geometry.outputs['Incoming'],dot.inputs[1])
    facing=op('ABSOLUTE',dot.outputs['Value'],0,-600,350)
    pressure=node('ShaderNodeTexNoise','uneven hand pressure',-800,0)
    pressure.inputs['Scale'].default_value=28;pressure.inputs['Detail'].default_value=2
    links.new(coord.outputs['Window'],pressure.inputs['Vector'])
    width=op('ADD',.25,op('MULTIPLY',pressure.outputs['Fac'],.10,-600,0),-400,0)
    contour=node('ShaderNodeMapRange','soft-edged graphite contour',-200,350);contour.clamp=True
    contour.inputs['From Min'].default_value=.025;contour.inputs['To Min'].default_value=1;contour.inputs['To Max'].default_value=0
    links.new(width,contour.inputs['From Max']);links.new(facing,contour.inputs['Value'])
    tooth=node('ShaderNodeTexNoise','broken pencil grains',-800,-250)
    tooth.inputs['Scale'].default_value=650;tooth.inputs['Detail'].default_value=2
    links.new(coord.outputs['Window'],tooth.inputs['Vector'])
    grains=node('ShaderNodeValToRGB','paper gaps within each stroke',-550,-250)
    grains.color_ramp.elements[0].position=.29;grains.color_ramp.elements[0].color=(.28,.28,.28,1)
    grains.color_ramp.elements[1].position=.64;grains.color_ramp.elements[1].color=(1,1,1,1)
    links.new(tooth.outputs['Fac'],grains.inputs[0])
    stroke=op('MULTIPLY',contour.outputs[0],grains.outputs[0],100,350)
    field=fibers(nodes,links,coord.outputs['Window'])
    paper=node('ShaderNodeValToRGB','uncolored fibrous paper inside the drawing',-300,-500)
    paper.color_ramp.elements[0].position=.06;paper.color_ramp.elements[0].color=(.86,.86,.845,1)
    paper.color_ramp.elements[1].position=.48;paper.color_ramp.elements[1].color=(1.16,1.155,1.14,1)
    links.new(field,paper.inputs[0])
    amount=op('MULTIPLY',fill,op('MULTIPLY',grains.outputs[0],pressure.outputs['Fac'],-100,-150),150,-150)
    wash=node('ShaderNodeMixRGB','sparse translucent colored-pencil fill',400,-150)
    links.new(amount,wash.inputs[0]);links.new(paper.outputs[0],wash.inputs[1]);links.new(color,wash.inputs[2])
    current=wash.outputs[0]
    if decoration is not None:
        lace=node('ShaderNodeMixRGB','blue lace pencil linework',620,-150)
        links.new(op('MULTIPLY',decoration,grains.outputs[0],400,-400),lace.inputs[0])
        links.new(current,lace.inputs[1]);lace.inputs[2].default_value=(.16,.32,.61,1);current=lace.outputs[0]
    outline=node('ShaderNodeMixRGB','warm hand-drawn outline',850,200)
    links.new(stroke,outline.inputs[0]);links.new(current,outline.inputs[1]);outline.inputs[2].default_value=(*ink_color,1)
    current=outline.outputs[0]
    if ink_mask is not None:
        face=node('ShaderNodeMixRGB','keep the flush ink face legible',1080,200)
        links.new(ink_mask,face.inputs[0]);links.new(current,face.inputs[1]);links.new(color,face.inputs[2]);current=face.outputs[0]
    emission=node('ShaderNodeEmission','colored pencil on paper',1300,200);links.new(current,emission.inputs['Color'])
    diffuse=node('ShaderNodeBsdfDiffuse','quiet light on the paper',1300,0);links.new(current,diffuse.inputs['Color'])
    drawn=node('ShaderNodeMixShader','paper-light shading',1500,200);drawn.inputs[0].default_value=.94
    links.new(diffuse.outputs[0],drawn.inputs[1]);links.new(emission.outputs[0],drawn.inputs[2])
    clear=node('ShaderNodeBsdfTransparent','a little light through the thin wash',1500,-200)
    alpha=node('ShaderNodeMixShader','pale fill / strong pencil edges',1750,200)
    protection=stroke
    if ink_mask is not None:protection=op('MAXIMUM',stroke,ink_mask,1250,-400)
    links.new(op('MULTIPLY',.08,op('SUBTRACT',1,protection,1500,-400),1720,-400),alpha.inputs[0])
    links.new(drawn.outputs[0],alpha.inputs[1]);links.new(clear.outputs[0],alpha.inputs[2])
    reverse=node('ShaderNodeMixShader','clear reverse face',1950,200)
    links.new(geometry.outputs['Backfacing'],reverse.inputs[0]);links.new(alpha.outputs[0],reverse.inputs[1]);links.new(clear.outputs[0],reverse.inputs[2])
    output=nodes.get('Material Output');links.new(reverse.outputs[0],output.inputs['Surface']);output.location=(2200,200)
    return material


def finish_bowl(material):
    nodes=material.node_tree.nodes
    base=next(n for n in nodes if n.label=='Pigment on warm white cotton paper')
    lace=next(n for n in nodes if n.label.startswith('IVORY LACE ·'))
    decoration=lace.inputs[0].links[0].from_socket
    return pencil_surface(material,base.outputs[0],(.045,.115,.28),.50,decoration=decoration)
