"""Five round pig tangyuan in clear soup and an illustrated blue lace bowl.

blender -b --factory-startup --python scenes/little-nap/create_scene.py [-- --draft | --animation | --save-only]
"""
import bpy
import sys
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
sys.path.insert(0,str(HERE));sys.path.insert(0,str(HERE.parent/'shared'))
from pencil_materials import pencil
from pig import create_pigs
from bowl import create_bowl
from pencil_finish import finish_bowl
from soup import create_water
from paper_fibers import xuan_paper
from animation import animate_scene,create_stars,POSTER
from lettering import create_lettering

DRAFT='--draft' in sys.argv
ANIMATION='--animation' in sys.argv
SAVE_ONLY='--save-only' in sys.argv
OUT=ROOT/('.tmp/little-nap' if DRAFT else 'public/studio/little-nap');OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
base=bpy.data.collections.get('Collection');base.name='01 · Fibrous white paper'
def collection(name):
    group=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(group);return group
pig_group=collection('02 · Five round pig tangyuan')
bowl_group=collection('03 · One-piece blue lace bowl')
soup_group=collection('04 · Clear soup and moving reflections')
rig=collection('05 · Camera and softbox lighting')
lettering=collection('06 · Floating ink lettering')
stars=collection('07 · Golden paper sparkles')
pigs=create_pigs(pig_group)
blue=pencil('BOWL · cornflower blue pencil / integrated lace',(.16,.36,.78),.90,soft_edges=False)
bowl=create_bowl(bowl_group,blue);finish_bowl(blue)
water=create_water(soup_group,pigs)
camera_data=bpy.data.cameras.new('Camera · fixed frontal view')
camera=bpy.data.objects.new('Camera · Little Nap',camera_data);rig.objects.link(camera);camera_data.type='ORTHO';camera_data.ortho_scale=5.15
scene=bpy.context.scene;scene.camera=camera
animate_scene(camera,pigs,soup_group)
create_lettering(lettering,HERE.parent/'apple-club/fonts/CourierPrime-Regular.ttf',camera)
create_stars(stars,camera)
# Paper faces the fixed frontal camera.
bpy.ops.mesh.primitive_plane_add(size=200)
back=bpy.context.object;back.name='Paper · camera-facing xuan fibers'
for c in list(back.users_collection):c.objects.unlink(back)
base.objects.link(back);back.parent=camera;back.location=(0,0,-25);back.rotation_euler=(0,0,0);back.data.materials.append(xuan_paper())
def area(name,location,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);rig.objects.link(obj);obj.location=location;obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
area('KEY · upper-left window',(-3.5,-4,6),420,3.2)
area('FILL · gentle paper bounce',(4,-2,3),35,5)
area('RIM · light through clear soup',(2,2,5),90,3.5)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.16
scene.render.engine='CYCLES';scene.cycles.samples=24 if DRAFT else 96;scene.cycles.use_denoising=True;scene.cycles.max_bounces=12;scene.cycles.transparent_max_bounces=24
scene.cycles.adaptive_threshold=.035 if DRAFT else .015
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
    if any(d.type=='METAL' for d in prefs.devices):
        for device in prefs.devices:device.use=device.type=='METAL'
        scene.cycles.device='GPU'
except Exception:scene.cycles.device='CPU'
scene.render.resolution_x=720 if DRAFT else 1080;scene.render.resolution_y=960 if DRAFT else 1440;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.filepath='//little-nap.png'
scene.frame_set(POSTER)
readme=bpy.data.texts.new('READ ME · Little Nap');readme.use_fake_user=True
readme.write('LITTLE NAP / FIVE LITTLE TANGYUAN\n\nFive round pig rice dumplings float in clear water, inside one connected blue lace bowl.\nAll five dumplings are whole, with faces painted into their skin. There is no spoon or exposed filling.\nThe camera stays fixed at the 19-degree frontal view. Five whole dumplings have tiny individual buoyant sways, soft nuzzles and almost imperceptible elastic shape changes.\nFrames 1–192 at 24 fps form a seamless eight-second loop. The file opens at the resting front view, frame 1.\nThe paper, lettering and softly glowing stars follow the camera. All geometry, shaders, lighting and motion remain editable.\nNo textures, add-ons or external fonts are needed. Courier Prime is packed under SIL OFL 1.1.\n\n'+(ROOT/'LICENSE').read_text()+'\n\nFONT LICENSE\n'+(HERE.parent/'apple-club/fonts/OFL.txt').read_text())
scene['Title']='Little Nap';scene['License']='MIT — AtomicMotion';scene['Medium']='Colored-pencil tangyuan / clear soup / fibrous paper';scene['Camera view']='Fixed frontal camera, 19-degree elevation and -8-degree azimuth'
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.object.select_all(action='DESELECT');pigs[0].select_set(True);bpy.context.view_layer.objects.active=pigs[0]
bpy.ops.file.pack_all()
(OUT/'LICENSE.txt').write_text((ROOT/'LICENSE').read_text()+'\n\nCOURIER PRIME TYPEFACE\n\n'+(HERE.parent/'apple-club/fonts/OFL.txt').read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'little-nap.blend'),compress=True)
if not SAVE_ONLY:
    scene.render.filepath=str(OUT/'little-nap.png');assert bpy.ops.render.render(write_still=True)=={'FINISHED'}
if ANIMATION:
    frames=ROOT/'.tmp/little-nap/hopping-gif-frames';frames.mkdir(parents=True,exist_ok=True)
    for stale in frames.glob('frame-*.png'):stale.unlink()
    scene.render.resolution_x=480;scene.render.resolution_y=640;scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=12
    scene.frame_step=2;scene.render.filepath=str(frames/'frame-');assert bpy.ops.render.render(animation=True)=={'FINISHED'}
print('LITTLE_NAP_COMPLETE',OUT,flush=True)
