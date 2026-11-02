"""Flush watercolor facial marks, evaluated on the actual pig surface."""

def paint_face(nodes,links,base,z0):
    def node(kind,label):
        n=nodes.new(kind);n.label='Face · '+label;return n
    def op(operation,a,b=0):
        n=node('ShaderNodeMath',operation.lower());n.operation=operation
        for i,value in enumerate((a,b)):
            if isinstance(value,(int,float)):n.inputs[i].default_value=value
            else:links.new(value,n.inputs[i])
        return n.outputs[0]
    def fade(value,low,high):
        n=node('ShaderNodeMapRange','soft pigment edge');n.clamp=True
        n.inputs['From Min'].default_value=low;n.inputs['From Max'].default_value=high
        n.inputs['To Min'].default_value=1;n.inputs['To Max'].default_value=0
        links.new(value,n.inputs['Value']);return n.outputs[0]
    coord=node('ShaderNodeTexCoord','local surface coordinates')
    xyz=node('ShaderNodeSeparateXYZ','surface x / y / z');links.new(coord.outputs['Object'],xyz.inputs[0])
    x,y,z=xyz.outputs['X'],xyz.outputs['Y'],xyz.outputs['Z']
    front=op('LESS_THAN',y,-.30)
    def radius(cx,cz,rx,rz):
        dx=op('DIVIDE',op('SUBTRACT',x,cx),rx)
        dz=op('DIVIDE',op('SUBTRACT',z,cz),rz)
        return op('ADD',op('MULTIPLY',dx,dx),op('MULTIPLY',dz,dz))
    def ellipse(cx,cz,rx,rz):return fade(radius(cx,cz,rx,rz),.78,1.22)
    result=base;ink_masks=[]
    def wash(mask,tint,label,strength=1):
        nonlocal result
        mix=node('ShaderNodeMixRGB',label)
        links.new(op('MULTIPLY',op('MULTIPLY',mask,front),strength),mix.inputs[0])
        links.new(result,mix.inputs[1]);mix.inputs[2].default_value=(*tint,1)
        result=mix.outputs[0]
    for side in (-1,1):wash(ellipse(side*.47,z0+.025,.18,.13),(1,.15,.24),'soft cheek wash',.22)
    wash(ellipse(.015,z0,.215,.132),(.94,.16,.25),'rose pigment over the sculpted snout',.80)
    nose_ring=fade(op('ABSOLUTE',op('SUBTRACT',radius(.015,z0,.215,.132),1)),.015,.13)
    wash(nose_ring,(.43,.15,.18),'pencil outline of the soft snout',.8);ink_masks.append(nose_ring)
    for side in (-1,1):
        q=op('DIVIDE',op('SUBTRACT',x,side*.29),.105 if side<0 else .098)
        curve=op('ADD',z0+.19+(.01 if side>0 else 0),op('MULTIPLY',op('MULTIPLY',q,q),.07))
        stroke=fade(op('ABSOLUTE',op('SUBTRACT',z,curve)),.004,.014)
        stroke=op('MULTIPLY',stroke,fade(op('ABSOLUTE',q),.90,1.10))
        wash(stroke,(.105,.025,.020),'closed sleeping eyelid painted into the skin')
        ink_masks.append(stroke)
        nostril=ellipse(side*.075+.015,z0+.004,.021,.035)
        wash(nostril,(.16,.035,.025),'tiny ink nostril');ink_masks.append(nostril)
    ears=[]
    for side in (-1,1):
        ear=op('MULTIPLY',ellipse(side*.68,.88,.10,.11),op('LESS_THAN',y,.02))
        mix=node('ShaderNodeMixRGB','soft pink within each folded ear')
        links.new(ear,mix.inputs[0]);links.new(result,mix.inputs[1]);mix.inputs[2].default_value=(.91,.37,.42,1)
        result=mix.outputs[0];ears.append(ear)
    frame=nodes.new('NodeFrame');frame.label='FACE PAINT · flush pigment, no floating eye or nose objects'
    members=[n for n in nodes if n.label.startswith('Face ·')]
    for i,n in enumerate(members):n.parent=frame;n.location=((i%10)*180,-(i//10)*180)
    frame.location=(-1800,-2400)
    ink=ink_masks[0]
    for mask in ink_masks[1:]:ink=op('MAXIMUM',ink,mask)
    return result,op('MAXIMUM',op('MULTIPLY',ink,front),op('MULTIPLY',op('MAXIMUM',*ears),.70))
