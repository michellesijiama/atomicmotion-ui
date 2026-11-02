"""A seamless, real 360-degree turntable for editable studio models."""
import bpy
import math
from mathutils import Matrix


def setup_turntable(*collections, title='Apple Club', sway=False, duration_frames=144, amplitude=.14):
    scene=bpy.context.scene
    bpy.context.view_layer.update()
    seconds=duration_frames/24
    root=bpy.data.objects.new(f'ANIMATION · slow illustrated sway / {seconds:g} seconds' if sway else f'ANIMATION · 360° turntable / {seconds:g} seconds',None)
    scene.collection.objects.link(root)
    root.empty_display_type='CIRCLE'
    root.empty_display_size=1.8
    root.location=(0,0,0)
    for collection in collections:
        members=set(collection.objects)
        for obj in members:
            if obj.parent in members:
                continue
            world=obj.matrix_world.copy()
            obj.parent=root
            obj.matrix_parent_inverse=Matrix.Translation(-root.location)
            obj.matrix_world=world
    scene.frame_start=1
    scene.frame_end=duration_frames
    scene.render.fps=24
    quarter=duration_frames//4
    for frame,angle in ([(1,0),(1+quarter,amplitude),(1+2*quarter,0),(1+3*quarter,-amplitude),(1+duration_frames,0)] if sway else [(1,0),(1+duration_frames,math.tau)]):
        root.rotation_euler[2]=angle
        root.keyframe_insert(data_path='rotation_euler',index=2,frame=frame)
    action=root.animation_data.action
    action.name=title+(' · slow frontal sway' if sway else ' · continuous 360° turntable')
    channelbag=action.layers[0].strips[0].channelbag(root.animation_data.action_slot)
    for curve in channelbag.fcurves:
        for key in curve.keyframe_points:
            key.interpolation='BEZIER' if sway else 'LINEAR'
            if sway:key.handle_left_type='AUTO_CLAMPED';key.handle_right_type='AUTO_CLAMPED'
        curve.modifiers.new('CYCLES')
    for name,frame in ([('Front',1),('Sway right',1+quarter),('Front again',1+2*quarter),('Sway left',1+3*quarter)] if sway else [('Front',1),('Quarter turn',1+quarter),('Back',1+2*quarter),('Three-quarter turn',1+3*quarter)]):
        scene.timeline_markers.new(name,frame=frame)
    scene.frame_set(1)
    return root
