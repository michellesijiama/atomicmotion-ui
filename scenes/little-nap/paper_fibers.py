"""Procedural xuan-paper fibers and softly broken pigment boundaries."""
import bpy


def fibers(nodes,links,coordinate=None):
    if coordinate is None:
        coord=nodes.new('ShaderNodeTexCoord');coordinate=coord.outputs['Window']
    fields=[]
    for scale,angle in [((1050,55,1),-.19),((1150,105,1),.72)]:
        rotate=nodes.new('ShaderNodeVectorRotate');rotate.rotation_type='AXIS_ANGLE'
        rotate.inputs['Axis'].default_value=(0,0,1);rotate.inputs['Angle'].default_value=angle
        links.new(coordinate,rotate.inputs['Vector'])
        stretch=nodes.new('ShaderNodeVectorMath');stretch.operation='MULTIPLY';stretch.inputs[1].default_value=scale
        links.new(rotate.outputs['Vector'],stretch.inputs[0])
        noise=nodes.new('ShaderNodeTexNoise');noise.label='Long, irregular xuan-paper fibers'
        noise.inputs['Scale'].default_value=1;noise.inputs['Detail'].default_value=2.3;noise.inputs['Roughness'].default_value=.72
        links.new(stretch.outputs[0],noise.inputs['Vector']);fields.append(noise.outputs['Fac'])
    mix=nodes.new('ShaderNodeMath');mix.operation='MULTIPLY';links.new(fields[0],mix.inputs[0]);links.new(fields[1],mix.inputs[1])
    return mix.outputs[0]


def xuan_paper():
    material=bpy.data.materials.new('PAPER · xuan fibers / soft cotton tooth');material.use_nodes=True
    n,l=material.node_tree.nodes,material.node_tree.links;n.clear()
    field=fibers(n,l)
    ramp=n.new('ShaderNodeValToRGB');ramp.label='Subtle raised white fibers and soft gray recesses'
    ramp.color_ramp.elements[0].position=.06;ramp.color_ramp.elements[0].color=(.84,.845,.83,1)
    ramp.color_ramp.elements[1].position=.48;ramp.color_ramp.elements[1].color=(1.20,1.195,1.18,1)
    l.new(field,ramp.inputs[0])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.32;bump.inputs['Distance'].default_value=.006
    l.new(field,bump.inputs['Height'])
    diffuse=n.new('ShaderNodeBsdfDiffuse');diffuse.inputs['Roughness'].default_value=1
    l.new(ramp.outputs[0],diffuse.inputs['Color']);l.new(bump.outputs[0],diffuse.inputs['Normal'])
    emission=n.new('ShaderNodeEmission');l.new(ramp.outputs[0],emission.inputs['Color'])
    mix=n.new('ShaderNodeMixShader');mix.inputs[0].default_value=.91
    l.new(diffuse.outputs[0],mix.inputs[1]);l.new(emission.outputs[0],mix.inputs[2])
    out=n.new('ShaderNodeOutputMaterial');l.new(mix.outputs[0],out.inputs['Surface'])
    return material


def soften_boundary(material,width=.20,contact=None):
    n,l=material.node_tree.nodes,material.node_tree.links
    field=fibers(n,l)
    geometry=n.new('ShaderNodeNewGeometry')
    dot=n.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT'
    l.new(geometry.outputs['Normal'],dot.inputs[0]);l.new(geometry.outputs['Incoming'],dot.inputs[1])
    absolute=n.new('ShaderNodeMath');absolute.operation='ABSOLUTE';l.new(dot.outputs['Value'],absolute.inputs[0])
    fade=n.new('ShaderNodeMapRange');fade.label='Pigment thins into the paper at the silhouette';fade.clamp=True
    fade.inputs['From Min'].default_value=.015;fade.inputs['From Max'].default_value=width
    l.new(absolute.outputs[0],fade.inputs['Value'])
    grain=n.new('ShaderNodeMath');grain.operation='MULTIPLY';grain.inputs[1].default_value=2.0;l.new(field,grain.inputs[0])
    coverage=n.new('ShaderNodeMath');coverage.operation='GREATER_THAN'
    l.new(fade.outputs[0],coverage.inputs[0]);l.new(grain.outputs[0],coverage.inputs[1])
    if contact:
        # Keep the tiny resting seam visible: the general fuzzy-edge treatment
        # must not erase two surfaces that touch at a grazing camera angle.
        coord=n.new('ShaderNodeTexCoord');height=n.new('ShaderNodeSeparateXYZ')
        l.new(coord.outputs['Generated'],height.inputs[0])
        seam=n.new('ShaderNodeMath');seam.operation='GREATER_THAN' if contact=='top' else 'LESS_THAN'
        seam.inputs[1].default_value=.94 if contact=='top' else .045
        l.new(height.outputs['Z'],seam.inputs[0])
        keep=n.new('ShaderNodeMath');keep.operation='MAXIMUM'
        l.new(coverage.outputs[0],keep.inputs[0]);l.new(seam.outputs[0],keep.inputs[1])
        boundary=keep.outputs[0]
    else:boundary=coverage.outputs[0]
    output=n.get('Material Output') or next(x for x in n if x.type=='OUTPUT_MATERIAL')
    previous=output.inputs['Surface'].links[0].from_socket
    clear=n.new('ShaderNodeBsdfTransparent')
    mix=n.new('ShaderNodeMixShader');mix.label='Fuzzy watercolor edge / no outline'
    l.new(boundary,mix.inputs[0]);l.new(clear.outputs[0],mix.inputs[1]);l.new(previous,mix.inputs[2])
    l.new(mix.outputs[0],output.inputs['Surface'])
