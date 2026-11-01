"""One continuous hollow bowl with an integrated UV-based ivory lace print."""
import bpy
import math


def add_lace(material):
    nodes,links=material.node_tree.nodes,material.node_tree.links
    def node(kind,label):
        n=nodes.new(kind);n.label=label;n.name=label;return n
    def op(operation,a,b=0):
        n=node('ShaderNodeMath','Lace · '+operation.lower())
        n.operation=operation
        for i,value in enumerate((a,b)):
            if isinstance(value,(int,float)):n.inputs[i].default_value=value
            else:links.new(value,n.inputs[i])
        return n.outputs[0]
    def thread(distance,width):return op('LESS_THAN',op('ABSOLUTE',distance),width)
    uv=node('ShaderNodeTexCoord','Lace · follows the bowl surface')
    xy=node('ShaderNodeSeparateXYZ','Lace · angle and height')
    links.new(uv.outputs['UV'],xy.inputs[0])
    u,v=xy.outputs['X'],xy.outputs['Y']
    repeat=op('MULTIPLY',u,20)
    phase=op('MULTIPLY',repeat,math.tau)
    x=op('SUBTRACT',op('MULTIPLY',op('FRACT',repeat),2),1)
    y=op('DIVIDE',op('SUBTRACT',v,1.145),.22)
    angle=op('ARCTAN2',y,x)
    radius=op('SQRT',op('ADD',op('MULTIPLY',x,x),op('MULTIPLY',y,y)))
    petals=op('ADD',.43,op('MULTIPLY',op('COSINE',op('MULTIPLY',angle,6)),.14))
    flower=thread(op('SUBTRACT',radius,petals),.035)
    center=thread(op('SUBTRACT',radius,.115),.028)
    upper=thread(op('SUBTRACT',v,op('ADD',1.337,op('MULTIPLY',op('COSINE',phase),.026))),.006)
    lower=thread(op('SUBTRACT',v,op('ADD',.956,op('MULTIPLY',op('COSINE',phase),.049))),.006)
    rim=thread(op('SUBTRACT',v,1.394),.008)
    rail=thread(op('SUBTRACT',v,1.365),.004)
    diagonal_a=thread(op('SINE',op('ADD',op('MULTIPLY',phase,2),op('MULTIPLY',v,45))),.075)
    diagonal_b=thread(op('SINE',op('SUBTRACT',op('MULTIPLY',phase,2),op('MULTIPLY',v,45))),.075)
    lattice=op('MAXIMUM',diagonal_a,diagonal_b)
    band=op('MULTIPLY',op('GREATER_THAN',v,1.005),op('LESS_THAN',v,1.305))
    # Fine mesh remains between the flowers, leaving each rosette legible.
    lattice=op('MULTIPLY',lattice,op('MULTIPLY',band,op('GREATER_THAN',radius,.64)))
    mask=flower
    for part in [center,upper,lower,rim,rail,lattice]:mask=op('MAXIMUM',mask,part)
    grain=next(n for n in nodes if n.label=='Fine pigment / paper tooth')
    mask=op('MULTIPLY',mask,op('ADD',.82,op('MULTIPLY',grain.outputs['Fac'],.18)))
    base=next(n for n in nodes if n.label=='Pigment on warm white cotton paper')
    destinations=[link.to_socket for link in list(base.outputs[0].links)]
    lace=node('ShaderNodeMixRGB','IVORY LACE · six-petal rosettes / scallops / fine net')
    lace.inputs[2].default_value=(.98,.955,.88,1)
    links.new(mask,lace.inputs[0]);links.new(base.outputs[0],lace.inputs[1])
    for destination in destinations:links.new(lace.outputs[0],destination)
    # Keep the pattern nodes in a named, editable frame in the shader editor.
    frame=nodes.new('NodeFrame');frame.label='IVORY LACE · 20 repeats around the bowl';frame.name='Integrated lace print'
    pattern=[n for n in nodes if n.name.startswith('Lace ·') or n==uv or n==xy]
    depths={}
    def depth(n):
        if n not in depths:
            sources=[link.from_node for socket in n.inputs for link in socket.links if link.from_node in pattern]
            depths[n]=1+max((depth(source) for source in sources),default=-1)
        return depths[n]
    rows={}
    for n in pattern:
        column=depth(n);row=rows.get(column,0);rows[column]=row+1
        n.parent=frame;n.location=(column*180,-row*150)
    frame.location=(-1800,-1000)
    lace.location=(650,400)


def create_bowl(group,material):
    # Revolve one closed wall profile: underside → low foot → bowl exterior →
    # rounded lip → inner wall → cavity floor. No separately attached base.
    profile=[(.48,.30),(.54,.32),(.56,.36),(.54,.40),(.48,.425),
             (.39,.445),(.36,.485),(.40,.525),(.55,.56),(.76,.60),
             (.98,.68),(1.20,.82),(1.40,1.00),(1.56,1.20),
             (1.64,1.36),(1.66,1.40),(1.65,1.425),(1.625,1.425),
             (1.61,1.40),(1.59,1.32),(1.50,1.17),(1.34,.98),
             (1.16,.83),(.94,.71),(.70,.645),(.45,.62),(.20,.615)]
    count=192
    vertices=[(0,0,.30)];coords=[(.5,.30)]
    for radius,z in profile:
        for j in range(count):
            a=math.tau*j/count
            vertices.append((radius*math.cos(a),radius*math.sin(a),z))
            coords.append((j/count,z))
    end=len(vertices);vertices.append((0,0,.615));coords.append((.5,.615))
    faces=[]
    for j in range(count):faces.append((0,1+(j+1)%count,1+j))
    for i in range(len(profile)-1):
        for j in range(count):
            a=1+i*count+j;b=1+i*count+(j+1)%count
            faces.append((a,b,b+count,a+count))
    last=1+(len(profile)-1)*count
    for j in range(count):faces.append((last+j,last+(j+1)%count,end))
    data=bpy.data.meshes.new('Continuous hollow bowl / foot and rounded rim')
    data.from_pydata(vertices,[],faces);data.update()
    uv=data.uv_layers.new(name='Lace · circumference / physical height')
    for polygon in data.polygons:
        us=[coords[data.loops[k].vertex_index][0] for k in polygon.loop_indices]
        seam=max(us)-min(us)>.5
        for k in polygon.loop_indices:
            u,v=coords[data.loops[k].vertex_index]
            if seam and u<.5:u+=1
            uv.data[k].uv=(u,v)
        polygon.use_smooth=True
    obj=bpy.data.objects.new('Bowl · continuous blue vessel / ivory lace',data)
    group.objects.link(obj);data.materials.append(material)
    sub=obj.modifiers.new('Continuous soft ceramic profile','SUBSURF')
    sub.levels=2;sub.render_levels=2
    obj['Construction']='Single connected, watertight mesh including the foot, lip and inner wall.'
    obj['Decoration']='Ivory lace is printed by UV shader nodes; no floating decorations.'
    add_lace(material)
    return obj
