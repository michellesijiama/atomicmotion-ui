"""Original 2.5D colored-pencil apple still life, made entirely in Blender.

blender -b --factory-startup --python scenes/apple-club/create_scene.py [-- --draft | --animation]
MIT license. No reference image is embedded or used as a texture.
"""
import bpy
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from pencil_materials import pencil, paper
from motion import setup_turntable

random.seed(72)
ROOT=HERE.parents[1]
DRAFT='--draft' in sys.argv
ANIMATION='--animation' in sys.argv
OUT=ROOT/('.tmp/apple-club' if DRAFT else 'public/still-life/apple-club')
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
base=bpy.data.collections.get('Collection');base.name='01 · Cotton paper'
def collection(name):
    c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
fruit=collection('02 · Apples / whole and sliced')
bowl=collection('03 · Blue pencil bowl')
details=collection('04 · Pencil flecks & little stars')
type_group=collection('05 · Editable typography')
rig=collection('06 · Softbox lighting & camera')
def move(obj,group):
    for c in list(obj.users_collection):c.objects.unlink(obj)
    group.objects.link(obj);return obj
def mesh(name,verts,faces,mat,group):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);group.objects.link(obj);data.materials.append(mat)
    for p in data.polygons:p.use_smooth=True
    return obj
def sphere(name,location,scale,mat,group,segments=64):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=32,location=location)
    obj=move(bpy.context.object,group);obj.name=name;obj.scale=scale;obj.data.materials.append(mat)
    for p in obj.data.polygons:p.use_smooth=True
    return obj
def curve(name,points,radius,mat,group):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=24
    data.bevel_depth=radius;data.bevel_resolution=3
    s=data.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data);group.objects.link(obj);data.materials.append(mat);return obj

red=pencil('APPLE · vermilion pencil / layered paper tooth',(.91,.055,.026),.99)
peel=pencil('PEEL · red pencil edge',(.78,.028,.018),1)
flesh=pencil('FLESH · warm ivory pencil',(.98,.84,.54),.55)
core=pencil('CORE · pale ochre shading',(.72,.46,.16),.45)
seed=pencil('SEED · warm brown graphite',(.12,.044,.012),.98)
green=pencil('LEAF · spring green pencil',(.31,.57,.045),.94)
blue=pencil('BOWL · cornflower pencil / translucent pigment',(.13,.35,.75),.92,True)
blue_edge=pencil('RIM & FOOT · cornflower blue',(.24,.43,.80),.88)
white=pencil('DOT · uncolored paper',(.98,.98,.93),.5)
dot_green=pencil('DOT · emerald pencil',(.015,.63,.28),.99)
graphite=pencil('TYPE & STARS · soft graphite',(.14,.12,.09),.89)
ink=bpy.data.materials.new('TYPE · warm graphite lettering')
ink.use_nodes=True
ink.node_tree.nodes.clear()
e=ink.node_tree.nodes.new('ShaderNodeEmission');e.inputs[0].default_value=(.22,.20,.18,1)
o=ink.node_tree.nodes.new('ShaderNodeOutputMaterial');ink.node_tree.links.new(e.outputs[0],o.inputs[0])
paper_mat=paper()

# A true mesh apple: broad shoulders, five lobes and a depressed stem well.
verts,faces=[],[]
N,M=128,64
for i in range(M+1):
    t=math.pi*i/M
    for j in range(N):
        a=2*math.pi*j/N
        rr=math.sin(t)*(.96+.055*math.cos(5*a)*math.sin(t)**2)*(.96+.10*math.cos(t))
        zz=.83*math.cos(t)
        if math.cos(t)>0:zz-=.17*math.exp(-(math.sin(t)/.28)**2)
        else:zz+=.04*math.exp(-(math.sin(t)/.20)**2)
        verts.append((.86*rr*math.cos(a),.75*rr*math.sin(a)+.13,zz+1.64))
for i in range(M):
    for j in range(N):
        a=i*N+j;b=i*N+(j+1)%N;faces.append((a,b,b+N,a+N))
whole=mesh('Apple · whole / five-lobed shoulders',verts,faces,red,fruit)
curve('Stem · whole apple',[(0,.13,2.28),(.01,.15,2.48),(.10,.15,2.57)],.032,seed,fruit)

def leaf(name,start,end,width,group):
    a,b=Vector(start),Vector(end);axis=b-a;side=Vector((axis.z,0,-axis.x)).normalized()
    verts,faces=[],[]
    for i in range(25):
        u=i/24
        for j in range(13):
            v=-1+j/6
            co=a+axis*u+side*(math.sin(math.pi*u)**.8*width*v)
            co.y+=.05*v*v-.055*math.sin(math.pi*u)
            verts.append(co)
    for i in range(24):
        for j in range(12):
            k=i*13+j;faces.append((k,k+1,k+14,k+13))
    ob=mesh(name,verts,faces,green,group)
    s=ob.modifiers.new('Paper thin leaf','SOLIDIFY');s.thickness=.008
    return ob
leaf('Leaf · whole apple',(.04,.12,2.41),(.62,.08,2.66),.14,fruit)

# The cut face stays a cream-colored apple with a brown, five-point seed core.
# A red peel border and a thick rear shell keep it readable as real geometry.
center=Vector((-.10,.08,3.32))
def outline(a,r=1):
    x=.72*math.cos(a)*(1+.035*math.cos(5*a))
    z=.71*math.sin(a)
    if z>0:z-=.105*math.exp(-(x/.18)**2)
    else:z+=.025*math.exp(-(x/.13)**2)
    return Vector((x*r,0,z*r))
def disc(name,rad,y,mat):
    verts=[tuple(center+Vector((0,y,0)))];faces=[]
    for j in range(192):verts.append(tuple(center+outline(j*math.tau/192,rad)+Vector((0,y,0))))
    for j in range(192):faces.append((0,1+j,1+(j+1)%192))
    return mesh(name,verts,faces,mat,fruit)
disc('Slice · red peel border',1,-.16,peel)
disc('Slice · ivory flesh',.945,-.18,flesh)
disc('Slice · back red peel border',1,.125,peel)
disc('Slice · back ivory flesh',.945,.14,flesh)
verts,faces=[],[]
for y in [-.155,.12]:
    for j in range(192):verts.append(tuple(center+outline(j*math.tau/192)+Vector((0,y,0))))
for j in range(192):faces.append((j,(j+1)%192,(j+1)%192+192,j+192))
mesh('Slice · thick apple peel shell',verts,faces,red,fruit)
for i in range(5):
    a=math.tau*i/5+math.pi/2
    loc=center+Vector((.17*math.cos(a),-.196,.17*math.sin(a)))
    ob=sphere(f'Core chamber {i+1}',loc,(.067,.008,.18),core,fruit,32)
    ob.rotation_euler[1]=-a+math.pi/2
    loc=center+Vector((.20*math.cos(a),-.215,.20*math.sin(a)))
    ob=sphere(f'Apple seed {i+1}',loc,(.026,.012,.059),seed,fruit,32)
    ob.rotation_euler[1]=-a+math.pi/2+.23
    back_core=ob.copy();back_core.data=ob.data
    back_core.name=f'Apple seed back {i+1}'
    fruit.objects.link(back_core);back_core.location.y=center.y+.17
    loc=center+Vector((.17*math.cos(a),.15,.17*math.sin(a)))
    ob=sphere(f'Core chamber back {i+1}',loc,(.067,.008,.18),core,fruit,32)
    ob.rotation_euler[1]=-a+math.pi/2
curve('Stem · apple slice',[(-.1,.10,3.91),(-.07,.11,4.04),(.005,.10,4.11)],.025,seed,fruit)
leaf('Leaf · apple slice',(-.06,.10,4.02),(.35,.09,4.12),.105,fruit)

# A shallow, footed, open bowl. Each visible blue mark is procedural pigment;
# the gaps transmit the apple behind the front wall, like the reference drawing.
verts,faces=[],[]
R,H,TOP=1.66,.88,1.40
for i in range(41):
    t=(.015+(math.pi/2-.015)*i/40)
    for j in range(192):
        a=math.tau*j/192
        verts.append((R*math.sin(t)*math.cos(a),R*math.sin(t)*math.sin(a),TOP-H*math.cos(t)))
for i in range(40):
    for j in range(192):
        a=i*192+j;b=i*192+(j+1)%192;faces.append((a,b,b+192,a+192))
mesh('Bowl · open shallow body / blue pencil',verts,faces,blue,bowl)
for name,z,rad,mat in [('Blue lip',TOP,.022,blue_edge),('Fine red rim',TOP-.045,.010,red)]:
    points=[(R*math.cos(j*math.tau/48),R*math.sin(j*math.tau/48),z) for j in range(49)]
    curve(name,points,rad,mat,bowl)
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.57,depth=.25,location=(0,.01,.44))
foot=move(bpy.context.object,bowl);foot.name='Bowl · short blue foot'
foot.data.materials.append(blue_edge)
bevel=foot.modifiers.new('Slightly softened pencil edge','BEVEL');bevel.width=.018;bevel.segments=3
for i,(x,z,r,mat) in enumerate([
    (-1.46,1.31,.042,dot_green),(-1.15,1.13,.070,red),(-.90,.79,.055,white),
    (-.25,1.24,.048,white),(.05,.67,.065,green),(.47,1.10,.044,dot_green),
    (1.15,1.32,.055,red),(1.18,.92,.075,dot_green),(.61,.63,.050,red),(.91,.82,.036,white)
]):
    rr=math.sqrt(max(.01,1-((TOP-z)/H)**2))
    yy=-R*math.sqrt(max(.01,rr*rr-(x/R)**2))-.012
    sphere(f'Pencil polka dot {i+1:02d}',(x,yy,z),(r,.017,r*1.12),mat,bowl,32)
    sphere(f'Pencil polka dot back {i+1:02d}',(-x,-yy,z),(r,.017,r*1.12),mat,bowl,32)

turntable=setup_turntable(fruit,bowl)

for i in range(90):
    x=random.uniform(-1.85,1.85);z=random.uniform(1.15,4.18)
    if abs(x)<.85 and z>1.45:continue
    s=random.uniform(.003,.010)
    verts=[(x-s,-.75,z-s/2),(x+s,-.75,z),(x+s/3,-.75,z+s)]
    mesh(f'Loose pigment fleck {i+1:02d}',verts,[(0,1,2)],red,details)
for i,(x,z,size) in enumerate([(-1.01,3.43,.105),(.98,2.47,.068)]):
    verts=[(x,-.6,z)]
    for j in range(8):
        a=j*math.pi/4;r=size if j%2==0 else size*.22
        verts.append((x+r*math.cos(a),-.6,z+r*math.sin(a)))
    mesh(f'Graphite sparkle {i+1}',verts,[(0,1+j,1+(j+1)%8) for j in range(8)],graphite,details)

# Native text objects remain editable; the font is packed into the .blend.
font_path=HERE/'fonts/CourierPrime-Regular.ttf'
font=bpy.data.fonts.load(str(font_path)) if font_path.exists() else None
def text(name,body,location,size,align='CENTER'):
    data=bpy.data.curves.new(name,'FONT');data.body=body;data.size=size
    data.align_x=align;data.align_y='CENTER';data.space_character=1.05
    if font:data.font=font
    obj=bpy.data.objects.new(name,data);type_group.objects.link(obj)
    obj.location=location;obj.rotation_euler=(math.pi/2,0,0);data.materials.append(ink)
    return obj
lines=['Round cheeks, little green leaves, and a very cheerful shade of red.',
       'Welcome to the apple club—our favourite place to hang out is a',
       'blue bowl.']
for i,line in enumerate(lines):text(f'Caption line {i+1}',line,(0,-.9,.10-i*.073),.077)
def arc_text(label,body,cx,cz,r,start,step):
    for i,char in enumerate(body):
        a=math.radians(start-i*step)
        ob=text(f'{label} · {i+1:02d}',char,(cx+r*math.cos(a),-.7,cz+r*math.sin(a)),.078)
        ob.rotation_euler[1]=math.pi/2-a
arc_text('Hello little apple','hello little apple',-.05,3.25,1.0,55,3.2)
arc_text('Apple apple','apple apple apple',0,1.64,1.03,157,2.7)

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,2,2),rotation=(math.pi/2,0,0))
back=move(bpy.context.object,base);back.name='Cotton paper · full-frame tooth';back.data.materials.append(paper_mat)
def aim(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size
    ob=bpy.data.objects.new(name,d);rig.objects.link(ob);ob.location=loc;aim(ob,(0,0,2))
area('KEY · large soft daylight',(-3,-4,7),400,5)
area('FILL · white paper bounce',(4,-2,3),100,5)
camera_data=bpy.data.cameras.new('Portrait · orthographic illustration')
camera=bpy.data.objects.new('Camera · apple club',camera_data);rig.objects.link(camera)
camera.location=(0,-12,2.25);aim(camera,(0,0,2.18));camera_data.type='ORTHO';camera_data.ortho_scale=5.4
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES'
scene.cycles.samples=48 if DRAFT else 128;scene.cycles.use_denoising=True
scene.cycles.max_bounces=16;scene.cycles.transparent_max_bounces=24
scene.cycles.adaptive_threshold=.025 if DRAFT else .012
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
    if any(d.type=='METAL' for d in prefs.devices):
        for d in prefs.devices:d.use=d.type=='METAL'
        scene.cycles.device='GPU'
except Exception:scene.cycles.device='CPU'
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.view_settings.view_transform='Standard'
scene.render.resolution_x=720 if DRAFT else 1080;scene.render.resolution_y=960 if DRAFT else 1440
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.color_depth='8';scene.render.fps=24
scene.render.filepath='//apple-club.png'
readme=bpy.data.texts.new('READ ME · Apple Club')
readme.write('APPLE CLUB / ATOMIC MOTION\n\nBlender 5.2.2 / Cycles / 1080 x 1440.\n'
    'An original 2.5D colored-pencil still life, with real editable geometry.\n'
    'The pencil grain, paper tooth, shading, and transparent blue bowl are\n'
    'procedural shader nodes, not a flattened illustration or image texture.\n'
    'Whole and sliced apples, brown seeds, leaves, bowl, polka dots, loose\n'
    'pigment, typography, lights and camera remain editable.\n'
    'Animation: frames 1–144, 24 fps, a seamless 6-second 360-degree turn.\n'
    'Press Space in the timeline to play; root ANIMATION holds the keyframes.\n'
    'The paper, typography and stars stay still while the real models rotate.\n'
    'The user-provided reference guided the composition; it is not embedded.\n'
    'The typeface is Courier Prime (SIL Open Font License 1.1), packed here.\n\n'
    +(ROOT/'LICENSE').read_text()+'\n\nFONT LICENSE\n'+(HERE/'fonts/OFL.txt').read_text())
scene['Title']='Apple Club';scene['License']='MIT — Atomic Motion';scene['Medium']='Procedural colored-pencil still life'
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.object.select_all(action='DESELECT');whole.select_set(True);bpy.context.view_layer.objects.active=whole
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'apple-club.blend'),compress=True)
scene.render.filepath=str(OUT/'apple-club.png');bpy.ops.render.render(write_still=True)
if ANIMATION:
    frames=ROOT/'.tmp/apple-club/rotation'
    frames.mkdir(parents=True,exist_ok=True)
    scene.render.resolution_x=600;scene.render.resolution_y=800
    scene.cycles.samples=32;scene.cycles.adaptive_threshold=.035
    scene.frame_step=2
    scene.render.filepath=str(frames/'frame-')
    bpy.ops.render.render(animation=True)
print('APPLE_CLUB_COMPLETE',OUT)
