"""Little Nap: two editable round sleeping pigs in a continuous blue lace bowl.

blender -b --factory-startup --python scenes/little-nap/create_scene.py [-- --draft | --animation]
All models and shaders are original. The supplied reference is not embedded.
"""
import bpy
import sys
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
sys.path.insert(0,str(HERE))
sys.path.insert(0,str(HERE.parent/'shared'))
from pencil_materials import pencil, paper
from motion import setup_turntable
from bowl import create_bowl
from pig import create_pig
from lettering import create_lettering
from animation import animate_pigs, animate_ink, create_stars
from paper_fibers import xuan_paper
from pencil_finish import finish_bowl

DRAFT='--draft' in sys.argv
ANIMATION='--animation' in sys.argv
OUT=ROOT/('.tmp/little-nap' if DRAFT else 'public/studio/little-nap')
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
base=bpy.data.collections.get('Collection');base.name='01 · White cotton paper'
def collection(name):
    c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
pig=collection('02 · Two round sleeping pigs')
bowl=collection('03 · One-piece blue bowl / ivory lace')
rig=collection('04 · Softbox lighting & camera')
lettering=collection('05 · Little typewriter phrases')
stars=collection('06 · Twinkling paper stars')
body=create_pig(pig)
blue=pencil('BOWL · matte cornflower blue / integrated ivory lace',(.16,.36,.78),.90,soft_edges=False)
next(n for n in blue.node_tree.nodes if n.label=='Illustrated light response').inputs[0].default_value=.50
# Layer pale blue highlights over deep cornflower pigment.
tone=next(n for n in blue.node_tree.nodes if n.label=='Layered colored pigment')
tone.inputs[1].default_value=(.025,.08,.30,1)
tone.inputs[2].default_value=(.35,.60,.95,1)
vessel=create_bowl(bowl,blue)
finish_bowl(blue)
turntable=setup_turntable(pig,bowl,title='Little Nap',sway=True)
animate_pigs(pig)
create_lettering(lettering,HERE.parent/'apple-club/fonts/CourierPrime-Regular.ttf')
animate_ink(lettering);create_stars(stars)

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,2.7,1.3),rotation=(1.57079632679,0,0))
back=bpy.context.object;back.name='Cotton paper · full-frame tooth'
for c in list(back.users_collection):c.objects.unlink(back)
base.objects.link(back);back.data.materials.append(xuan_paper())
def aim(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
def area(name,location,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);rig.objects.link(ob);ob.location=location;aim(ob,(0,0,1.3))
area('KEY · directional upper-left window',(-3.5,-4,6),420,3.2)
area('FILL · quiet paper bounce',(4,-2,3),35,5)
area('RIM · gentle translucent edge',(2.0,1.8,4.8),90,3.5)
camera_data=bpy.data.cameras.new('Portrait · two quiet sleeping pigs')
camera=bpy.data.objects.new('Camera · Little Nap',camera_data);rig.objects.link(camera)
camera.location=(0,-12,2.40);aim(camera,(0,0,2.02))
camera_data.type='ORTHO';camera_data.ortho_scale=5.2
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES'
scene.cycles.samples=48 if DRAFT else 128
scene.cycles.use_denoising=True;scene.cycles.max_bounces=16
scene.cycles.transparent_max_bounces=24
scene.render.use_persistent_data=True
scene.cycles.adaptive_threshold=.025 if DRAFT else .012
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL';prefs.get_devices()
    if any(d.type=='METAL' for d in prefs.devices):
        for d in prefs.devices:d.use=d.type=='METAL'
        scene.cycles.device='GPU'
except Exception:scene.cycles.device='CPU'
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.16
scene.view_settings.view_transform='Standard'
scene.render.resolution_x=720 if DRAFT else 1080
scene.render.resolution_y=960 if DRAFT else 1440
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.color_depth='8'
scene.render.filepath='//little-nap.png'
readme=bpy.data.texts.new('READ ME · Little Nap');readme.use_fake_user=True
readme.write('LITTLE NAP / ATOMIC MOTION\n\nBlender 5.2.2 / Cycles / 1080 x 1440.\n'
    'Two soft colored-pencil pig scoops stack in a blue lace bowl.\n'
    'They are soft pig-shaped desserts, with folded ears, rose noses,\n'
    'and closed ink eyelids. Their soft scoop silhouettes stay clear.\n'
    'The lower pig sits in the cavity; the upper pig rests on its companion.\n'
    'The upper underside follows the actual curved lower crown by raycast.\n'
    'The nose is sculpted into the skin; eyes and nostrils are flush pigment.\n'
    'The bowl is one continuous watertight mesh including its foot and inner\n'
    'wall. Its lace is a UV shader print, not separate floating decorations.\n'
    'All geometry, pencil contours, pale fill, pigment grains, paper fibers, lettering,\n'
    'light rig and camera remain editable. The outlines use grainy pencil pressure.\n'
    'The small typewriter phrases are editable text using packed Courier Prime.\n'
    'Pig and bowl use pencil contours, sparse pale fill and paper tooth.\n'
    'The pig shader uses actual transparency, variable pigment dilution,\n'
    'clear reverse faces and fibrous edge breakup, not glossy glass.\n'
    'The round bodies are voxel-welded, then polished and subdivided\n'
    'at level 2, so the rounded silhouette has no profile-ring banding.\n'
    'Animation: frames 1–144 at 24 fps; a seamless six-second soft hop loop.\n'
    'Volume-preserving squash/stretch, delayed ears, tiny airy hops,\n'
    'slow frontal swaying, floating ink and twinkling paper stars stay editable.\n'
    'The upper height follows the lower crown with a driver to avoid overlap.\n'
    'Press Space over the timeline to play; ANIMATION holds the slow sway.\n'
    'The supplied pig reference guided the proportions and is not embedded.\n\n'
    +(ROOT/'LICENSE').read_text()+'\n\nFONT LICENSE\n'
    +(HERE.parent/'apple-club/fonts/OFL.txt').read_text())
scene['Title']='Little Nap';scene['License']='MIT — Atomic Motion'
scene['Medium']='Colored-pencil pig scoops / textured contours and sparse transparent fill'
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
scene.frame_set(5);bpy.context.view_layer.update()
assert abs(bpy.data.objects['MOTION · soft pudding controls']['lower_squish']-.85)<1e-4, 'Squash motion is not evaluating'
scene.frame_set(16);bpy.context.view_layer.update()
assert bpy.data.objects['MOTION · soft pudding controls']['hop_height']>.19, 'Hop motion is not evaluating'
scene.frame_set(1)
bpy.ops.file.pack_all()
(OUT/'LICENSE.txt').write_text((ROOT/'LICENSE').read_text()+'\n\nCOURIER PRIME TYPEFACE\n\n'+(HERE.parent/'apple-club/fonts/OFL.txt').read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'little-nap.blend'),compress=True)
scene.render.filepath=str(OUT/'little-nap.png')
assert bpy.ops.render.render(write_still=True)=={'FINISHED'}, 'Still render was interrupted'
if ANIMATION:
    frames=ROOT/'.tmp/little-nap/rotation';frames.mkdir(parents=True,exist_ok=True)
    scene.render.resolution_x=480;scene.render.resolution_y=640
    scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=16
    scene.frame_step=2;scene.render.filepath=str(frames/'frame-')
    assert bpy.ops.render.render(animation=True)=={'FINISHED'}, 'Animation render was interrupted'
print('LITTLE_NAP_COMPLETE',OUT)
