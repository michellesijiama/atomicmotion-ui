"""A seamless, real 360-degree turntable for the editable apple models."""
import bpy
import math
from mathutils import Matrix


def setup_turntable(*collections):
    scene=bpy.context.scene
    bpy.context.view_layer.update()
    root=bpy.data.objects.new('ANIMATION · 360° turntable / 6 seconds',None)
    scene.collection.objects.link(root)
    root.empty_display_type='CIRCLE'
    root.empty_display_size=1.8
    root.location=(0,0,0)
    for collection in collections:
        for obj in collection.objects:
            world=obj.matrix_world.copy()
            obj.parent=root
            obj.matrix_parent_inverse=Matrix.Translation(-root.location)
            obj.matrix_world=world
    scene.frame_start=1
    scene.frame_end=144
    scene.render.fps=24
    for frame,angle in [(1,0),(145,math.tau)]:
        root.rotation_euler[2]=angle
        root.keyframe_insert(data_path='rotation_euler',index=2,frame=frame)
    action=root.animation_data.action
    action.name='Apple Club · continuous 360° turntable'
    channelbag=action.layers[0].strips[0].channelbag(root.animation_data.action_slot)
    for curve in channelbag.fcurves:
        for key in curve.keyframe_points:key.interpolation='LINEAR'
        curve.modifiers.new('CYCLES')
    for name,frame in [('Front',1),('Quarter turn',37),('Back',73),('Three-quarter turn',109)]:
        scene.timeline_markers.new(name,frame=frame)
    scene.frame_set(1)
    return root
