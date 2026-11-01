"""An editable underside that rests along the lower scoop's actual curved crown."""
import bpy


def conform_scoop(upper,lower):
    graph=bpy.data.node_groups.new('Soft scoop · fitted curved resting surface','GeometryNodeTree')
    graph.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry')
    graph.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
    n,l=graph.nodes,graph.links
    source=n.new('NodeGroupInput');out=n.new('NodeGroupOutput')
    target=n.new('GeometryNodeObjectInfo');target.transform_space='RELATIVE';target.inputs['Object'].default_value=lower
    target.label='Actual lower pig surface, including its soft motion'
    position=n.new('GeometryNodeInputPosition')
    start=n.new('ShaderNodeVectorMath');start.operation='ADD';start.inputs[1].default_value=(0,0,3)
    l.new(position.outputs[0],start.inputs[0])
    ray=n.new('GeometryNodeRaycast');ray.data_type='FLOAT'
    ray.inputs['Ray Direction'].default_value=(0,0,-1);ray.inputs['Ray Length'].default_value=6
    l.new(target.outputs['Geometry'],ray.inputs['Target Geometry']);l.new(start.outputs[0],ray.inputs['Source Position'])
    hit=n.new('ShaderNodeSeparateXYZ');original=n.new('ShaderNodeSeparateXYZ')
    l.new(ray.outputs['Hit Position'],hit.inputs[0]);l.new(position.outputs[0],original.inputs[0])
    gap=n.new('ShaderNodeMath');gap.operation='ADD';gap.inputs[1].default_value=.006;l.new(hit.outputs['Z'],gap.inputs[0])
    delta=n.new('ShaderNodeMath');delta.operation='SUBTRACT'
    l.new(gap.outputs[0],delta.inputs[0]);l.new(original.outputs['Z'],delta.inputs[1])
    positive=n.new('ShaderNodeMath');positive.operation='MAXIMUM';positive.inputs[1].default_value=0
    l.new(delta.outputs[0],positive.inputs[0])
    offset=n.new('ShaderNodeCombineXYZ');l.new(positive.outputs[0],offset.inputs['Z'])
    set_position=n.new('GeometryNodeSetPosition');set_position.label='Lift only the underside into a gentle curved saddle'
    l.new(source.outputs['Geometry'],set_position.inputs['Geometry'])
    l.new(ray.outputs['Is Hit'],set_position.inputs['Selection']);l.new(offset.outputs[0],set_position.inputs['Offset'])
    l.new(set_position.outputs[0],out.inputs['Geometry'])
    for node,location in zip((source,target,position,start,ray,hit,original,gap,delta,positive,offset,set_position,out),
                             ((-800,300),(-800,0),(-800,-250),(-600,-250),(-350,0),(-100,0),(-100,-250),(100,0),(300,-100),(500,-100),(700,-100),(900,300),(1150,300))):node.location=location
    modifier=upper.modifiers.new('Soft scoop rests on the curved lower crown','NODES');modifier.node_group=graph
    # Fit the control mesh, then subdivide the fitted skin smoothly.
    # This keeps the curved contact editable without casting a ray per render vertex.
    bpy.context.view_layer.objects.active=upper
    bpy.ops.object.modifier_move_up(modifier=modifier.name)
