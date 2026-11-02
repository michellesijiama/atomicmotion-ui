"""Camera-facing, editable ink lettering on the fibrous paper composition."""
import bpy
import math
from bisect import bisect_left
from mathutils import Vector
from animation import cyclic,DURATION,slide_keys


def create_lettering(group,font_path,camera):
    ink_stage=bpy.data.objects.new('Ink · follows the sliding bowl',None);group.objects.link(ink_stage);ink_stage.parent=camera
    slide_keys(ink_stage,Vector((1,0,0)))
    font=bpy.data.fonts.load(str(font_path))
    ink=bpy.data.materials.new('LETTERING · warm dry ink');ink.use_nodes=True
    n,l=ink.node_tree.nodes,ink.node_tree.links;n.clear()
    coord=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=740;l.new(coord.outputs['Window'],noise.inputs[0])
    color=n.new('ShaderNodeValToRGB');color.color_ramp.elements[0].color=(.20,.17,.14,1);color.color_ramp.elements[1].color=(.52,.45,.38,1);l.new(noise.outputs['Fac'],color.inputs[0])
    em=n.new('ShaderNodeEmission');l.new(color.outputs[0],em.inputs[0]);out=n.new('ShaderNodeOutputMaterial');l.new(em.outputs[0],out.inputs[0])
    def text(name,body,x,y,size,angle=0):
        data=bpy.data.curves.new(name,'FONT');data.font=font;data.body=body;data.size=size;data.align_x='CENTER';data.align_y='CENTER';data.materials.append(ink)
        obj=bpy.data.objects.new(name,data);group.objects.link(obj);obj.parent=ink_stage;obj.location=(x,y,-13.5);obj.rotation_euler.z=angle
        for frame in range(1,DURATION+2,6):
            t=math.tau*(frame-1)/DURATION
            obj.location.y=y+.002*math.sin(t+x);obj.rotation_euler.z=angle+.002*math.sin(t+x)
            obj.keyframe_insert('location',index=1,frame=frame);obj.keyframe_insert('rotation_euler',index=2,frame=frame)
        cyclic(obj)
        return obj
    # Trace the actual projected upper rim, then space letters by arc length.
    bpy.context.view_layer.update()
    center=camera.matrix_world.inverted()@Vector((0,0,1.425))
    rx,ry=1.66,1.66*math.sin(math.radians(19))
    points=[];distances=[0.]
    for j in range(1201):
        angle=math.pi*(1-j/1200)
        normal=Vector((math.cos(angle)/rx,math.sin(angle)/ry)).normalized()
        point=Vector((center.x+rx*math.cos(angle),center.y+ry*math.sin(angle)))+normal*.13
        if points:distances.append(distances[-1]+(point-points[-1]).length)
        points.append(point)
    def rim_phrase(label,body,center_angle,size):
        index=round((math.pi-math.radians(center_angle))/math.pi*1200)
        middle=distances[index];advance=size*.61
        for i,char in enumerate(body):
            distance=middle+(i-(len(body)-1)/2)*advance
            j=max(1,min(1199,bisect_left(distances,distance)))
            amount=(distance-distances[j-1])/(distances[j]-distances[j-1])
            point=points[j-1].lerp(points[j],amount)
            tangent=points[j+1]-points[j-1]
            text(f'{label} · {i+1:02d}',char,point.x,point.y,size,math.atan2(tangent.y,tangent.x))
    rim_phrase('Five little wishes','five little wishes',128,.066)
    rim_phrase('Sweet little nap','tiny wobbly dreams',52,.063)
    text('Caption · dumpling dreams','Little dumplings, a very big nap.',0,-1.68,.067)
    text('Caption · warm water','Warm water. Soft cheeks. Sweet dreams.',0,-1.80,.059)
