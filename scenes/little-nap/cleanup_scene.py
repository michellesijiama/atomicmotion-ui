"""Prepare the editable scene as a self-contained, portable Blender download."""
import bpy


def prepare_download():
    scene = bpy.context.scene
    controls = bpy.data.collections.get('08 · Animation controls')
    if controls is None:
        controls = bpy.data.collections.new('08 · Animation controls')
        scene.collection.children.link(controls)
    stage = bpy.data.objects['STAGE · bowl slides into the paper']
    if stage.name not in controls.objects:
        controls.objects.link(stage)
    for collection in list(stage.users_collection):
        if collection != controls:
            collection.objects.unlink(stage)

    # Packed bytes travel with the download; the path is only a portable label.
    bpy.ops.file.pack_all()
    for font in bpy.data.fonts:
        if font.packed_file:
            font.filepath = '//fonts/CourierPrime-Regular.ttf'
    # A downloaded file must render without the author's GPU preferences.
    scene.cycles.device = 'CPU'
    scene.render.filepath = '//renders/little-nap-'
    scene.frame_set(169)
    readme = bpy.data.texts['READ ME · Little Nap']
    if not readme.as_string().startswith('DOWNLOAD QUICK START'):
        readme.from_string(
            'DOWNLOAD QUICK START\n\n'
            'Blender 5.2.2 LTS. This file contains its packed font and all materials.\n'
            'Space over the timeline: play the 12-second loop. F12: render a still.\n'
            'Frame 169 is the resting composition; frame 1 starts on empty paper.\n'
            'Collections 01-08 separate paper, piglets, bowl, water, lighting, ink, stars and controls.\n'
            'Enable viewport overlays to see lights and the sliding stage control.\n'
            'Cycles defaults to CPU for portability; select your GPU locally if desired.\n'
            'Animation image sequences write to renders/ beside this file.\n'
            'Source and downloads: https://atomicmotion.dev/3d-studio/little-nap\n\n'
            + readme.as_string()
        )
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = None
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.region_3d.view_perspective = 'CAMERA'
                space.region_3d.view_camera_zoom = 0
                space.shading.type = 'MATERIAL'
                space.shading.use_scene_world = True
                space.shading.use_scene_lights = True
                space.overlay.show_overlays = False
                space.show_gizmo = False

    removed = bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=False, do_recursive=True)
    print('PREPARED_DOWNLOAD: orphan data removed:', removed, flush=True)


if __name__ == '__main__':
    prepare_download()
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
