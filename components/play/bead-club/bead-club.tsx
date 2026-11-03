"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ArrowLeft, CakeSlice } from "lucide-react";

export type BeadClubProps = {
  /** Uses compact sizing for gallery previews. */
  loop?: boolean;
  /** Additional classes for the preview area. */
  className?: string;
};

type Bead = { x: number; y: number; color: string };
type BeadMaterial = "pressed" | "frosted" | "glitter" | "terry" | "jelly";
type Artwork = { id: string; name: string; price: string; description: string; detailDescription: string; category: "Tarts" | "Cakes"; beads: Bead[]; material: BeadMaterial; translucentColors?: readonly string[] };
const PHONE_HEIGHT = 390 * 2822 / 1406;
const APP_BACKGROUND = "#f2f2f2";
// Simplified from the user-supplied cake illustration sheet. Each occupied cell
// represents one bead, with exactly 700 beads per cake and a limited color palette.
// The reference artwork retains its own rights, separate from the component code.
const cakePatterns: Record<string, { palette: string[]; rows: string[] }> = {
  "lavender-grape-tart": {
    "palette": [
      "#99427d",
      "#cca38a",
      "#98553c",
      "#b79c32",
      "#a94517",
      "#f0a673",
      "#e9b43f",
      "#e1b00d",
      "#f6b1af",
      "#e19e3c",
      "#e6bc5c",
      "#ecbe91",
      "#f4cfb8",
      "#e5beb9",
      "#e6c0a5",
      "#eec97b",
      "#df837f",
      "#fce1c8",
      "#f39b99",
      "#c37464",
      "#c36934",
      "#e3945f",
      "#88261d",
      "#da8049"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      ".........................0..............",
      "........................f10m............",
      "......................376e10m4..........",
      ".....................a37f100l333........",
      "..............9..m4.96afee1a34k300c8....",
      "............f96n4nlaaaf11a6kmmmk20ch8...",
      ".........hhc699aafffffal6334mmmmk6aac8..",
      "........ieba99affffffff63333kmmkn9a6bc..",
      "....chhg4496699affffaa63nl5b5l2k99a9bh8.",
      "..ichbkjkkl9999naaa66aaa6laa5fn4499acc88",
      "..8hcnnnnn67769996aaaaaa6666fblkkn9b8i88",
      "..8clnn99l9777699aa6776a6666af9999ac888i",
      ".iccnn96nn9777feb6777ace666a5nk999bhc88i",
      ".8hclnn95eeebecdddeechdebbeddd1beec8888.",
      ".chcbnnlddccceccdceeece111ddddccd8888i8.",
      "88cebb5bcccbb111cfaabhe111155eccce888i8.",
      "jjclll1hccbbbjm21111j2j111l9l11bhcc88i8.",
      ".m15j1i8iiiiigjiiggijj11gie11111c12i8j..",
      ".mjiiiigggjggiiigiiiiiii8iiiiiii8j222...",
      ".4kgggi24mmmmgjjjjgjjgg22gjggj2gij122...",
      "..4nlg5nknnkkkkkknnkklnnknknk4kji2222...",
      "..kllllllll55lll55555lnlll5l5555l422....",
      "..4kk4kkk4kkknnnnknlnnnnnnnlnlnnn42.....",
      ".............44444444444444444444.......",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  },
  "rose-lychee-tart": {
    "palette": [
      "#ed473c",
      "#ee2518",
      "#f50906",
      "#e95725",
      "#e5b180",
      "#f4dfc8",
      "#f4cbaf",
      "#f1d6b6",
      "#f7e8da",
      "#f6e0a8",
      "#efcba3",
      "#f3dabc",
      "#f1d1ad",
      "#e2c994",
      "#ebd6a1",
      "#f4d392",
      "#eec497",
      "#eec677",
      "#d6a261",
      "#ec8060",
      "#c46539",
      "#c3874a",
      "#e99936",
      "#da8721"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "...........................00...........",
      "..........................0110..........",
      "..........................01000.........",
      "......................aca0000010........",
      ".................0000jfa41112220f.......",
      "................021j0145412211133j0.....",
      "..............fj2211110ffi31ji33333m....",
      "..........fcaa901233333hhihhag01313n....",
      "........4f9bbbbj1311114geebc55a01111....",
      "......f99gg7b76g32210gb4jc7bbaac64jg....",
      "....959fc47888gg54ja6bcc4i4g4ia5b5b66...",
      "...9999fg5855b4a7b58885cgg6cg4g85557b...",
      "..f99ea7c5b55hiab555588bg885bc468555bb..",
      "..f9ff9hccc5amma7aacc75cc8588b64ac557c..",
      "..99fh9hga7bfhhcaaaaa754abb5555c4gcbcg..",
      "..ffehfhi4g7999gaaacccg4aa777b55g4g7bg..",
      "..fffhbfefdeeeecagaaggh4ggaaaac5bgjjg...",
      "...mfeee94ii4ddeedggddeegggaaaa7afjje...",
      "...niedddddddili4deeeeeeeddgaaaac44hf...",
      "...nn4d4jjee9ed4iiii4kk44dddeedde4iff...",
      "....nnkkkkdik4e44e4kdjkiiii444d9ddd4f...",
      "....nmkilllkkki10d0j40g9ed4d4ili4dek0...",
      "....nmllllllklkkkkklk10004e44cedijj10...",
      "....nmmlllklillllllllkk03llkkkkk0100....",
      ".....nmmmnmmmmmimmkkmiiiilllkllkkmmm....",
      ".......nnnnmnnnnnnnnnnnnnnmnnmmnnnn.....",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  },
  "pistachio-roll": {
    "palette": [
      "#e7cdab",
      "#d6a87a",
      "#ecc395",
      "#ebd6b9",
      "#e1c09a",
      "#f5e8d5",
      "#a7af56",
      "#8e9737",
      "#dacb87",
      "#f8d0ad",
      "#f2c97e",
      "#f6ce9c",
      "#e5ce96",
      "#f2c5af",
      "#bfc064",
      "#cfcc6b",
      "#c3c77e",
      "#e4b58c",
      "#f6cf8a",
      "#edb6a5",
      "#f8d6bf",
      "#bc594c",
      "#dba393",
      "#d38a79"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "...........................041..........",
      ".........................03334h.........",
      ".......................63335044h........",
      ".....................77e30330444h.......",
      "....................776433333444h.......",
      "..................6e77g00035k43412......",
      "................gg777g50000330041h......",
      "..............e66ge7e8530000000413c.....",
      "...........666g676g67g5530000041b36.....",
      ".........7eg676g66ge7e0555524h0kkg77....",
      ".......eg66gg66g676g66855k555k5g66g6....",
      ".....ge6g676g67ge76g66e66853g0e6e6f8....",
      "...6eggegggg8884cc88ccccc8c888c000kdh...",
      "...2h02b2b9bbb9b99bbb9b99k9dk9999bijh...",
      "..iiaaaaiiiaaiaaaaiiaaiaaaiiaaaaaaa9j...",
      "...aaaibbb2b2299bcbcb9dk999k9999kkkkj...",
      "...99cccc2dkkj088efff84j48ccd8ff802kj...",
      "..ffffffef89cffffeffffffef8fffffee8kj...",
      "..fffffffffc8ffffffefffffeefeeffefdjj...",
      "..feffffff89d4c88fff8c992cccffff8djjj...",
      "..f842c8aiib21d999bbbb9bb29bb21hbb2jj...",
      "..fiiiiiiiiaiiiiaaiiiiiibbiiiiiiaaadj...",
      "..a999999ddd9jnlmmjjjnlmdmm4jjdkk9ddj...",
      "..kjjjmmmmnmjdmnjmnnllllllllllllnkkdj...",
      "..dmjnmkdjmnmdkdmmmmnnnnnnllndjjh99j....",
      "..jkhh4dd99jjmmmjj99b2hhh4412hh.........",
      "...hhh4hhhhhhhm.........................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  },
  "bayberry-lychee-cake": {
    "palette": [
      "#e8c765",
      "#f2c73e",
      "#d8ab3a",
      "#dfa107",
      "#bd9a1c",
      "#a76936",
      "#d7cbb9",
      "#dcd4c2",
      "#f0efed",
      "#d5ba7f",
      "#e4dbc8",
      "#e4d8b7",
      "#c5ab8e",
      "#b49163",
      "#d1be9f",
      "#ebe9e2",
      "#e7e2d5",
      "#d6c7ab",
      "#eeb716",
      "#c9a96a",
      "#e2ce95",
      "#ebdca8",
      "#e2ca88",
      "#e7d59e"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "...................mm4mm................",
      "................i1lc5dakk0m.............",
      "...............i11mcdegbbblk0...........",
      "..............i322j24ma69j9jj0..........",
      ".............333i23440jnj20kk01.........",
      "............33330m32mb40550llmm1........",
      "...........3333i1020m9444000i0lmk.......",
      "...........3333i10300444422133i1ah......",
      ".........ii44333i1301344i43122097ag.....",
      ".........3444333i1i1222234i0g67g766.....",
      ".........i333i33i011ed20mekga666777.....",
      ".........1i331ii1j1nfa6afg7hjdjdd97.....",
      "........821ii121m7na7gabejj55jjjdd7.....",
      ".......8g91iim6laahchjdddj9ehjj9dj7.....",
      "......ff8aj0lfacjkjdjjjc6gffhe7fab6.....",
      "......fggbhahejd99hhceaf8b0m6chg876.....",
      ".....hbhe9jdj9eaf6e6ccdn033keddega6.....",
      ".....jb9dj5eahaghcc6e923334djklle76.....",
      "......9jha6a6cd5decc23ii14dkllnljca.....",
      "......9b8g6haehddd54ii1ncjlllnnldd7.....",
      "......j6gbe6cce8j53ii0cd9lnllnnnkd......",
      "......9cch6cccje02iijddmlkkkkkknm6......",
      "......ehc22332i0j99j9mnmkkmjkkknja......",
      "......jah22j9nm9mj9lkkkkkm9mkknnja......",
      "......jcd9knnk99m9jlmnkkkkmkkkn9ca......",
      "......jjmk9mknnnlmjnkkmmmmknlll96f......",
      "......j9kmnnnmmkmkmknknmknlkccj.........",
      "......j9lnmm9kknkknnkkmjdd..............",
      ".......mnnklnlln9jdd....................",
      "......j9nm99jd..........................",
      "......jj................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  },
  "blueberry-basque": {
    "palette": [
      "#e3c0cc",
      "#b97e90",
      "#c78e9e",
      "#b896a7",
      "#515562",
      "#33343b",
      "#414750",
      "#61646d",
      "#d5a1af",
      "#a46a78",
      "#96646b",
      "#9c954c",
      "#8c8146",
      "#725239",
      "#a77883",
      "#7d5b5d",
      "#856a6b",
      "#616d7c",
      "#767a8a",
      "#757a79",
      "#737072",
      "#687282",
      "#6c7685",
      "#7d8160"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      ".........................88.............",
      ".........................0820...........",
      ".........................02100..........",
      "......................288218008.........",
      ".......................88191888.........",
      ".......................a1811180.........",
      "....................646f221111e3........",
      ".................e.54h6f829922380.......",
      "..............e31ea5776f2189120000......",
      "............1321382fhl679289e12800......",
      ".........ie22e288e1a4hlh6222882808......",
      ".......23ge82808b32955545a822ee2e3......",
      ".....1188833830bb0025546520191a380......",
      "...aa9e28e1882e33083775471228880800.....",
      "...9ffaa9a9eee112183h454h4128880808.....",
      "....e9a9999aa99a9ee176446g91888008ac....",
      "...cbeebe9aeafaf99aeg6655211e9100efc....",
      "...cbbccbcbbbcaaeaa1d665fe999a9903db....",
      "....bccbbbbbbbbbbccbbccca99ee99913b.....",
      "....ddddddcdccbbbbbbbbbbba9e99eaeeb.....",
      ".....jkgfffffddddcccbbbbcdddddfe7db.....",
      ".....hmmimiiiilkfdddddddddfc744g5cb.....",
      ".....mmlmmlljknnncbccfffgncclmhl5db.....",
      "......jjjkmjbbbbbnncbbbbcbccjlhi45b.....",
      "......kjjkj7nbbcjjincbccbccblhlmh7b.....",
      "......gggjjkjjnnnnjjnbcbbcccmmllmgc.....",
      ".....fggagggjkjiijjjcbcbbbbnlmlmmg......",
      ".......ffgggggggkkkjnncnnnnjmllmmg......",
      "............ffggggggkjkkllllmmlllc......",
      ".................ffggggggkkkk7nckc......",
      ".......................fgaggfgcccc......",
      "...........................fffccc.......",
      "................................c.......",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  },
  "mango-lychee-basque": {
    "palette": [
      "#d5c7a2",
      "#e8dcc8",
      "#dfd1b8",
      "#c56065",
      "#f0e4d8",
      "#d1a6aa",
      "#d7b1b2",
      "#d29183",
      "#929452",
      "#788734",
      "#b5a881",
      "#c89d9e",
      "#bba096",
      "#cab0a6",
      "#c8b694",
      "#e7c6c9",
      "#e1bdbf",
      "#a39f69",
      "#8d6760",
      "#98766e",
      "#a78776",
      "#ba8f8c",
      "#ab8d88",
      "#dcb6b8"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "...................0000.................",
      "..................240020e...............",
      "..................111000e0..............",
      ".................222200ee001111.........",
      ".................211120eee021142........",
      "..................12120000002444........",
      "..................422000e773k1111.......",
      "..............ggg62e9ae3333782411.......",
      "............nffg6ke990733337h21112......",
      ".........ggfggngc999a07333338244212.....",
      "......f5gfgffffgfdklle273337a444412.....",
      ".....5g6n6gg5fnnfff5bl00737e0444442.....",
      ".....l5nbnf6bgngfgn6f6ce00e24444112.....",
      "......88hk8heabnf6bnfgggfngf144111......",
      "......9999999998hedngf4g65656g244d......",
      "......ahaaaaaa8899988ae0ggngfbkl6l......",
      "......ggn56db5fdaah889998ahhaec56b......",
      "......fglccccccgn56ndcah999999h565......",
      "......nnccdddckbcjk66ggn6da899hbb5......",
      ".....n5ggccddbdcmccc6f6kbffne8855b......",
      ".....nnnnnffg6gfdcccc6dcc6fgndbbb5......",
      ".....ngn56nngn6fgnffgkmddmm6gg5blb......",
      ".....nfdk8hhhkhhe6gfgfn55ccbbn5n65......",
      "......6jiiiiijj888hhhacadnf5lllg6n......",
      "......e6bmcliiijjjjjk8888h8888jb6f......",
      "......98hdfgccbbkiikmjjjjjkh899l5f......",
      ".......98888hadgdmmmiiiiijjmnh9a56......",
      "..........999998hadncllmjjk6nncc5n......",
      "................9998aegg665f5gb55fn.....",
      "....................9998acadbb565ng.....",
      ".........................99989a6nng.....",
      "...............................bgg6.....",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  },
  "guava-crepe-cake": {
    "palette": [
      "#bfb50c",
      "#f56968",
      "#e7df94",
      "#d6d773",
      "#f9eef0",
      "#eabebc",
      "#c68674",
      "#abac8d",
      "#8c9f70",
      "#d2bba8",
      "#f2caca",
      "#dd938c",
      "#c5c646",
      "#9faa59",
      "#aab465",
      "#b4ba6f",
      "#d85f38",
      "#c5b388",
      "#c3b59d",
      "#6f9a54",
      "#829040",
      "#e3a9a7",
      "#5a8d44",
      "#f7d9d7"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      ".......................0................",
      ".....................42c2b11............",
      ".................bb233n23b11............",
      "................1123cccc3gb11...........",
      "................162c32cc36111ana........",
      "......5nnnnnnnnn5c3cccc33gggb5aa5.......",
      ".....lll5lannnnn4333c3330ggkha5nbb......",
      "....i9555ll555nn450333c006dkdda5an5.....",
      ".....m87i555lbl5nnh0000chkkkk9n5a5......",
      ".....i788887i99lbl5bh95559kkklbbaa......",
      ".....9eehii888877lllbbbl5ab6k6l54b......",
      ".....edeee9a59788879llbblab6bbn5l.......",
      ".....edefdefedfh997887ilbb5lb5nnl.......",
      ".....ddeffddeeeee95l97789lblla5b56......",
      ".....fdeeedeeefeeflhhh9i87lbbnnbb6......",
      ".....5heedddeeffeefddeeh5789lbbb66......",
      ".....87ii997eeefeedefeeeh595l66666......",
      ".....mmj8795ieddddeefeeeehn55b6666......",
      "......8mmmmj799hihfeeeffee955l6666......",
      "......n9778jmj79955hedeeedh5n56666......",
      ".....5aa5bb98mmjjj8i9feddeina5b666......",
      ".....blal11bai8mmmmm87i9995a55b66b......",
      ".....jjj7lbl5alb677jmmj877l5anb6ba......",
      ".......jj8iannb1laaai88jjj7lnnblaa......",
      ".........mj8in5laal5ab1b8mjb556naa......",
      "...........jjjj7i5aanb1b57895bln5a......",
      "..............mmjj8795llbn444anaaa......",
      ".................mmmm8877inn44n5a.......",
      ".....................mkjmjinnaaan.......",
      ".........................j6laaan........",
      "...........................66la.........",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  },
  "yogurt-mille-feuille": {
    "palette": [
      "#ebab74",
      "#d87b0d",
      "#f1a50c",
      "#80761a",
      "#cd905f",
      "#e6cea7",
      "#eedab8",
      "#f8c191",
      "#f6f3ec",
      "#eedebe",
      "#f4e2c0",
      "#f9e6c5",
      "#c6c8c8",
      "#8fa9cb",
      "#9eb5d4",
      "#99b1d0",
      "#7895bb",
      "#abc0dc",
      "#bbcee7",
      "#a4bad8",
      "#85a0c4",
      "#8ca5c8",
      "#94adce",
      "#6787b0"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "..............................07........",
      "..............................07........",
      "..............................077.......",
      "..............................000....0..",
      ".........................33...040...07..",
      "........................334...0047.077..",
      "......................3.3340.000470770..",
      ".......................333304.00000770..",
      "........................3334407440777...",
      "...................655833333340447700...",
      ".................69b65b93332240407004...",
      "...............66b6aa655133224040040....",
      ".............56a66669a5222221400044.....",
      "...........56b9666666ab41122134044......",
      ".........6656666666669b5542223121.......",
      "........6bb55666666666a65512112221......",
      "......6ba9a656669999669959842202211.....",
      "....5556666556996669669a59862202211.....",
      "...b6565555559a99999999a5688022211......",
      "..9b999aaaaaaaaaaaabbbab6b88641110......",
      "..iijhhcccccccccccccccccc8888955cc......",
      "..iiejhhehemmedldddejelfeejjmmdeeh......",
      "..iihjjjeeejjejjejfeeehhjhiihjfehi......",
      "..iihefmjfejjfeemjeddffmfemmmkljhh......",
      "..dlgggkdmfmfeflmdddffddfemmfdljhe......",
      "..ihjjhjhheejjfdfmdldlkmdfejjmdejh......",
      "..hhjjffehhhhjfmdehhhjjjehhfmeejhe......",
      "..mmmfllllddffffmfmehjemfmllklkdkm......",
      "..jffmlgkdlmefmdllddmdmfdllddmefdj......",
      "..hjjemdlkddkkehjhhjefmddeedklfdlk......",
      "..ggnggggggnnnnnnngnnnnggggkdklkkd......",
      "...........................gk...........",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  },
  "raspberry-basque": {
    "palette": [
      "#c99f68",
      "#8d3820",
      "#c63727",
      "#ceb137",
      "#f2ede1",
      "#ebd7a1",
      "#ebe0c4",
      "#e2d3b5",
      "#fbfaf8",
      "#ece3d2",
      "#d8bdad",
      "#e1cabf",
      "#e4cec4",
      "#dec7ba",
      "#e6d9c5",
      "#e7d4cb",
      "#b7704c",
      "#d6cd6d",
      "#e3db83",
      "#d9bb8a",
      "#f0bc69",
      "#ba9424",
      "#d2c257",
      "#dcd579"
    ],
    "rows": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................000g............",
      "......................gkikik2...........",
      ".....................gkk31gkg...........",
      "....................gkkkl11k22..........",
      "....................10kkg1gk22..........",
      "....................1gkj0k0222..........",
      "................l.901ggik22222..........",
      ".............m33l370g1gg212g20..........",
      ".........h3ji33m33k49g011111156.........",
      "......864d7ejmm3j979e960l1ggjde6........",
      "......89e484797je4e99je45hjk3aa0h5......",
      ".....884988948844484e7449e49j601g3k.....",
      ".....984688e488e9889a986788478h3d454....",
      ".....becdef9944998897789788978494888....",
      ".....cbdbbdbcffffff9fae7748e74846488....",
      "....dfbbbbdbbbbbadbdaddddfccbce9e6e.....",
      "....dcbbbbadbbbbadbbbbbdbbbbdbbdde......",
      "....dcbbbbcbbbbbbddddddcbcbcfffcdc......",
      "....bcbbbbbbbbbbbbbbbddcaafa000dbf......",
      "....affffcbbbbbbbdbbdbbbdc0llll0cc......",
      "....gjj0abbbcccccffcbcccfdl3333llj......",
      "....333lll00000aa0gadjaabal3hiimlm......",
      "....3hinmmnhmmm00333033l0l3nnhiih3j.....",
      "....mnnhnimmhhnhnmmhnmmmnnhmhhiniml.....",
      "....niiin3mihhnhnm3nhhnmihn3hnmnihl.....",
      "....iiiinniinhnnhhhnnhhiinnm333mihl.....",
      "....niiihnnniiniinninnnnnnnhm3m3h3l.....",
      "....3hnhhhhhniiiiiinhinnnnimhnnmhll.....",
      ".................hhhmnhnniihmnnmm33.....",
      "...........................nhhhmm3......",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................"
    ]
  }
};

const artworks: Artwork[] = [
  { id: "lavender-grape-tart", name: "Lavender grape tart", price: "$9.50", description: "Lavender cream, blackcurrant and grapes in a buttery tart shell", detailDescription: "Golden grapes and blackcurrant nestle in lavender cream over a buttery tart shell, finished with soft pink piping and tiny flowers", category: "Tarts" },
  { id: "rose-lychee-tart", name: "Rose lychee tart", price: "$9.00", description: "Rose cream, juicy lychee and berries on a crisp tart base", detailDescription: "Juicy lychee and bright berries sit on rose cream, with a crisp golden base and a generous swirl of vanilla frosting", category: "Tarts" },
  { id: "pistachio-roll", name: "Pistachio roll cake", price: "$9.50", description: "Pistachio rolls layered with lychee cream and bayberry filling", detailDescription: "Pistachio rolls meet pale pink cream and a ribbon of bayberry, topped with a soft scoop of lychee cream", category: "Cakes" },
  { id: "bayberry-lychee-cake", name: "Bayberry lychee cake", price: "$8.50", description: "Airy sponge, fresh cream and a bright fruit topping", detailDescription: "Light sponge and fresh cream wrap around juicy fruit, with a golden citrus topping and little green leaves", category: "Cakes" },
  { id: "blueberry-basque", name: "Blueberry basque", price: "$9.50", description: "Blueberry cheesecake with pistachio cream and a flower finish", detailDescription: "Deep blueberry layers and nutty pistachio cream meet a toasted cheesecake base, finished with berries and a little violet flower", category: "Cakes" },
  { id: "mango-lychee-basque", name: "Mango lychee basque", price: "$9.00", description: "Soft fruit cream, lychee pieces and layers of pistachio cake", detailDescription: "Pink fruit cream and pale green pistachio layers hold pieces of lychee, with a soft cream swirl and fresh fruit on top", category: "Cakes" },
  { id: "guava-crepe-cake", name: "Guava crepe cake", price: "$9.50", description: "Pink guava cream, pistachio crepe rolls and fresh fruit", detailDescription: "Pistachio crepe rolls sit between layers of pink guava cream, with fresh fruit and a delicate flower on top", category: "Cakes" },
  { id: "yogurt-mille-feuille", name: "Yogurt mille feuille", price: "$10.00", description: "Delicate blue layers, yogurt cream and golden physalis", detailDescription: "Delicate blue layers support a soft cloud of yogurt cream, crowned with golden physalis and a tiny edible flower", category: "Cakes" },
  { id: "raspberry-basque", name: "Raspberry basque", price: "$9.00", description: "Pistachio cheesecake, raspberry cream and a fresh berry", detailDescription: "Nutty pistachio cheesecake meets soft raspberry cream, with piped vanilla frosting and a bright berry on top", category: "Cakes" },
].map(art => {
  const pattern = cakePatterns[art.id];
  const beads = pattern.rows.flatMap((row, y) => [...row].flatMap((color, x) => color === "." ? [] : [{ x, y, color: pattern.palette[parseInt(color, 24)] }]));
  return { ...art, category: art.category as Artwork["category"], material: "terry", beads };
});

function FlatBeadArt({ art, count = art.beads.length, }: { art: Artwork; count?: number }) {
  const id = React.useId().replace(/:/g, "");
  const placed = art.beads.slice(0, count);
  const glitter = art.material === "glitter";
  // Overlapping cells fuse into one continuous surface. The material is lit
  // and textured once across the whole piece, never stamped onto each cell.
  // A separate silhouette mask keeps the gentle color bleed inside the piece.
  const cell = (bead: Bead) => `M${bead.x - .06} ${bead.y - .06}h1.12v1.12h-1.12Z`;
  const silhouette = placed.map(cell).join("");
  const depth = { x: .1, y: .28 };
  const occupied = new Set(placed.map(bead => `${bead.x},${bead.y}`));
  const underside = new Map<string, string[]>();
  const sides: { path: string; color: string }[] = [];
  const shade = (color: string, amount: number) => `#${color.slice(1).match(/../g)!.map(channel => Math.round(parseInt(channel, 16) * amount).toString(16).padStart(2, "0")).join("")}`;
  const wall = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1}L${x2} ${y2}L${x2 + depth.x} ${y2 + depth.y}L${x1 + depth.x} ${y1 + depth.y}Z`;
  for (const bead of placed) {
    const paths = underside.get(bead.color) ?? [];
    paths.push(cell(bead));
    underside.set(bead.color, paths);
    // Only the exposed perimeter has a side wall. Interior joins stay fused.
    if (!occupied.has(`${bead.x + 1},${bead.y}`)) sides.push({ path: wall(bead.x + 1.06, bead.y - .06, bead.x + 1.06, bead.y + 1.06), color: shade(bead.color, .84) });
    if (!occupied.has(`${bead.x},${bead.y + 1}`)) sides.push({ path: wall(bead.x - .06, bead.y + 1.06, bead.x + 1.06, bead.y + 1.06), color: shade(bead.color, .9) });
  }
  return <svg viewBox="0 0 40 42" role="img" aria-label={`${art.name} ${art.material} fused bead pattern`} className="bc-art" data-material={art.material} style={art.material === "jelly" ? { opacity: .8 } : undefined}>
    <defs>
      <filter id={`${id}-edge`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation=".14" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 -5.5" />
      </filter>
      <mask id={`${id}-shape`} maskUnits="userSpaceOnUse" x="-1" y="-1" width="42" height="44" style={{ maskType: "alpha" }}>
        <path d={silhouette} fill="#fff" filter={`url(#${id}-edge)`} />
      </mask>
      <filter id={`${id}-surface`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation=".14" result="melted" />
        <feTurbulence type="fractalNoise" baseFrequency={art.material === "pressed" ? "3.1 5.3" : "4.2"} numOctaves="3" seed="23" result="grain" />
        <feDiffuseLighting in="grain" surfaceScale=".16" diffuseConstant=".8" lightingColor="#fff" result="relief"><feDistantLight azimuth="225" elevation="50" /></feDiffuseLighting>
        <feComponentTransfer in="relief" result="softRelief"><feFuncA type="linear" slope=".13" /></feComponentTransfer>
        <feComposite in="softRelief" in2="melted" operator="in" result="texture" />
        <feBlend in="melted" in2="texture" mode="soft-light" result="pressed" />
        <feMorphology in="SourceAlpha" operator="erode" radius=".055" result="inside" />
        <feComposite in="SourceAlpha" in2="inside" operator="out" result="rim" />
        <feFlood floodColor="#fff" floodOpacity=".2" result="light" />
        <feComposite in="light" in2="rim" operator="in" result="lip" />
        <feMerge><feMergeNode in="pressed" /><feMergeNode in="lip" /></feMerge>
      </filter>
      <linearGradient id={`${id}-light`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff" stopOpacity=".05" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#5c5149" stopOpacity=".04" /></linearGradient>
    </defs>
    <g className="bc-bead-thickness" aria-hidden="true">
      <g transform={`translate(${depth.x} ${depth.y})`} mask={`url(#${id}-shape)`}>
        {[...underside].map(([color, paths]) => <path key={color} d={paths.join("")} fill={shade(color, .84)} />)}
      </g>
      {sides.map((side, index) => <path key={index} d={side.path} fill={side.color} stroke={side.color} strokeWidth=".045" strokeLinejoin="round" />)}
    </g>
    <g className="bc-material-surface" mask={`url(#${id}-shape)`}>
      <g className="bc-fused-colors" filter={`url(#${id}-surface)`}>
        {placed.map(bead => <g key={`${bead.x}-${bead.y}`} data-bead-color={bead.color} style={{ transformOrigin: `${bead.x + .5}px ${bead.y + .5}px` }}><path d={cell(bead)} fill={bead.color} /></g>)}
      </g>
      <path d={silhouette} fill={`url(#${id}-light)`} />
      {placed.map(bead => {
        const seed = ((bead.x * 73856093) ^ (bead.y * 19349663)) >>> 0;
        const x = bead.x + .13 + (seed % 71) / 100;
        const y = bead.y + .1 + ((seed >>> 6) % 76) / 100;
        if (glitter && seed % 5 === 0) return <path key={`${bead.x}-${bead.y}`} d={`M${x} ${y - .045}l.04 .04l-.035 .06l-.04 -.045Z`} fill="#fff" opacity=".65" />;
        if (seed % 19 === 0) return <circle key={`${bead.x}-${bead.y}`} cx={x} cy={y} r=".025" fill="#fff" opacity=".3" />;
        return null;
      })}
    </g>
  </svg>;
}

// One offscreen renderer serves every preview; displayed canvases are plain 2D.
// Geometry and lighting, rather than painted side-wall colors, create the depth.
function fusedShapes(beads: Bead[]) {
  type Edge = { x: number; y: number; ex: number; ey: number; dir: number; used?: boolean };
  const occupied = new Set(beads.map(b => `${b.x},${b.y}`));
  const edges: Edge[] = [];
  const starts = new Map<string, Edge[]>();
  const add = (edge: Edge) => { edges.push(edge); const key = `${edge.x},${edge.y}`; const list = starts.get(key) ?? []; list.push(edge); starts.set(key, list); };
  for (const b of beads) {
    if (!occupied.has(`${b.x},${b.y - 1}`)) add({ x: b.x, y: b.y, ex: b.x + 1, ey: b.y, dir: 0 });
    if (!occupied.has(`${b.x + 1},${b.y}`)) add({ x: b.x + 1, y: b.y, ex: b.x + 1, ey: b.y + 1, dir: 1 });
    if (!occupied.has(`${b.x},${b.y + 1}`)) add({ x: b.x + 1, y: b.y + 1, ex: b.x, ey: b.y + 1, dir: 2 });
    if (!occupied.has(`${b.x - 1},${b.y}`)) add({ x: b.x, y: b.y + 1, ex: b.x, ey: b.y, dir: 3 });
  }
  const loops: { points: { x: number; y: number }[]; area: number }[] = [];
  for (const first of edges) {
    if (first.used) continue;
    const points: { x: number; y: number }[] = [];
    let edge: Edge | undefined = first;
    while (edge && !edge.used) {
      edge.used = true; points.push({ x: edge.x, y: edge.y });
      if (edge.ex === first.x && edge.ey === first.y) break;
      const dir: number = edge.dir;
      edge = (starts.get(`${edge.ex},${edge.ey}`) ?? []).filter(candidate => !candidate.used).sort((a, b) => [1, 0, 3, 2].indexOf((a.dir - dir + 4) % 4) - [1, 0, 3, 2].indexOf((b.dir - dir + 4) % 4))[0];
    }
    const area = points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2;
    if (points.length > 2) loops.push({ points, area });
  }
  const outer = loops.filter(loop => loop.area > 0);
  const contains = (poly: { x: number; y: number }[], p: { x: number; y: number }) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if ((poly[i].y > p.y) !== (poly[j].y > p.y) && p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) inside = !inside;
    }
    return inside;
  };
  const rounded = <T extends THREE.Path>(path: T, points: { x: number; y: number }[]) => {
    const outline = points.flatMap((p, i) => { const b = points[(i + 1) % points.length]; return [p, { x: (p.x + b.x) / 2, y: (p.y + b.y) / 2 }]; });
    const corners = outline.map((p, i) => {
      const a = outline[(i + outline.length - 1) % outline.length], b = outline[(i + 1) % outline.length];
      const da = Math.hypot(a.x - p.x, a.y - p.y), db = Math.hypot(b.x - p.x, b.y - p.y), r = Math.min(.09, da / 3, db / 3);
      return { p, entry: { x: p.x + (a.x - p.x) * r / da, y: p.y + (a.y - p.y) * r / da }, exit: { x: p.x + (b.x - p.x) * r / db, y: p.y + (b.y - p.y) * r / db } };
    });
    // Route every curve endpoint and control point through the same transform.
    const model = (x: number, y: number): [number, number] => [x - 20, 21 - y];
    path.moveTo(...model(corners[0].entry.x, corners[0].entry.y));
    for (let i = 0; i < corners.length; i++) {
      const { p, exit } = corners[i], next = corners[(i + 1) % corners.length];
      path.quadraticCurveTo(...model(p.x, p.y), ...model(exit.x, exit.y));
      const dx = next.p.x - p.x, dy = next.p.y - p.y, length = Math.hypot(dx, dy);
      // A restrained scallop keeps each melted bead visible along the cut edge.
      const mx = (exit.x + next.entry.x) / 2 + dy / length * .04;
      const my = (exit.y + next.entry.y) / 2 - dx / length * .04;
      path.quadraticCurveTo(...model(mx, my), ...model(next.entry.x, next.entry.y));
    }
    path.closePath(); return path;
  };
  return outer.map(loop => {
    const shape = rounded(new THREE.Shape(), loop.points);
    for (const hole of loops.filter(item => item.area < 0)) {
      if (contains(loop.points, hole.points[0])) shape.holes.push(rounded(new THREE.Path(), hole.points));
    }
    return shape;
  });
}

let beadGrain: Uint8ClampedArray | undefined;
let beadGrainLoading: Promise<void> | undefined;
function loadBeadGrain() {
  if (!beadGrainLoading) beadGrainLoading = new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 1344;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.drawImage(image, 0, 0, canvas.width, canvas.height); beadGrain = ctx.getImageData(0, 0, canvas.width, canvas.height).data; }
      resolve();
    };
    image.onerror = () => resolve();
    image.src = "/components/bead-club/fused-pearl-grain.png";
  });
  return beadGrainLoading;
}

type GrainSurface = { normal: THREE.CanvasTexture; roughness: THREE.CanvasTexture; pigment: Float32Array; sparkle?: THREE.CanvasTexture; sparkleNormal?: THREE.CanvasTexture };
let grainSurface: GrainSurface | undefined;
function fusedGrainSurface() {
  if (grainSurface) return grainSurface;
  const width = 1280, height = 1344, pitch = 8;
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const normal = ctx.createImageData(width, height), roughness = ctx.createImageData(width, height);
  const pigment = new Float32Array(width * height);
  const hash = (x: number, y: number) => {
    let n = Math.imul(x, 1597334677) ^ Math.imul(y, 3812015801);
    n = Math.imul(n ^ n >>> 16, 2246822507);
    return (n ^ n >>> 13) >>> 0;
  };
  const columns = Math.ceil(width / pitch) + 2, rows = Math.ceil(height / pitch) + 2;
  const grains = Array.from({ length: columns * rows }, (_, i) => {
    const x = i % columns - 1, y = Math.floor(i / columns) - 1, seed = hash(x, y);
    const angle = (seed & 65535) / 65535 * Math.PI * 2, tilt = .24 + ((seed >>> 16) & 255) / 255 * .5;
    return { x: (x + .15 + (seed & 255) / 255 * .7) * pitch, y: (y + .15 + ((seed >>> 8) & 255) / 255 * .7) * pitch, nx: Math.cos(angle) * tilt, ny: Math.sin(angle) * tilt, seed };
  });
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const gx = Math.floor(x / pitch), gy = Math.floor(y / pitch);
    let nearest = grains[(gy + 1) * columns + gx + 1], distance = Infinity;
    for (let cy = gy; cy <= gy + 2; cy++) for (let cx = gx; cx <= gx + 2; cx++) {
      const grain = grains[cy * columns + cx], dx = x - grain.x, dy = y - grain.y;
      const d = dx * dx + dy * dy;
      if (d < distance) { distance = d; nearest = grain; }
    }
    const i = (y * width + x) * 4;
    const nx = nearest.nx + (x - nearest.x) / pitch * .18;
    const ny = nearest.ny - (y - nearest.y) / pitch * .18;
    const length = Math.hypot(nx, ny, 1);
    normal.data[i] = (nx / length * .5 + .5) * 255;
    normal.data[i + 1] = (ny / length * .5 + .5) * 255;
    normal.data[i + 2] = (1 / length * .5 + .5) * 255; normal.data[i + 3] = 255;
    const pearl = beadGrain ? beadGrain[i] / 255 : .86;
    const r = 75 + (nearest.seed >>> 8 & 255) / 255 * 120 + (pearl - .86) * 80;
    roughness.data[i] = roughness.data[i + 1] = roughness.data[i + 2] = r; roughness.data[i + 3] = 255;
    pigment[y * width + x] = .97 + (nearest.seed & 255) / 255 * .06;
  }
  ctx.putImageData(normal, 0, 0);
  const normalMap = new THREE.CanvasTexture(canvas); normalMap.generateMipmaps = false; normalMap.minFilter = THREE.LinearFilter;
  const roughCanvas = document.createElement("canvas"); roughCanvas.width = width; roughCanvas.height = height;
  roughCanvas.getContext("2d")!.putImageData(roughness, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas); roughnessMap.generateMipmaps = false; roughnessMap.minFilter = THREE.LinearFilter;
  grainSurface = { normal: normalMap, roughness: roughnessMap, pigment };
  return grainSurface;
}

let terrySurface: GrainSurface | undefined;
function terryGrainSurface() {
  if (terrySurface) return terrySurface;
  const width = 1280, height = 1344, pitch = 14;
  const pile = document.createElement("canvas"); pile.width = width; pile.height = height;
  const ctx = pile.getContext("2d")!;
  ctx.fillStyle = "#666"; ctx.fillRect(0, 0, width, height); ctx.lineCap = "round";
  for (let y = -pitch; y < height + pitch; y += pitch) for (let x = -pitch; x < width + pitch; x += pitch) {
    let seed = Math.imul(x + pitch, 1597334677) ^ Math.imul(y + pitch, 3812015801);
    seed = (Math.imul(seed ^ seed >>> 16, 2246822507) ^ seed >>> 13) >>> 0;
    const size = 9 + (seed & 255) / 255 * 7, curl = ((seed >>> 8) & 255) / 255;
    ctx.save();
    ctx.translate(x + (curl - .5) * pitch, y + (((seed >>> 16) & 255) / 255 - .5) * pitch);
    ctx.rotate((seed & 65535) / 65535 * Math.PI * 2);
    const loop = new Path2D();
    loop.moveTo(-size * .45, size * .12);
    loop.bezierCurveTo(-size * .55, -size * .55, size * .5, -size * .55, size * .4, size * .03);
    loop.bezierCurveTo(size * .3, size * .35, -size * .1, size * .3, -size * .1, size * .04);
    const thickness = 4 + curl * 2;
    for (const [color, scale] of [["#8c8c8c", 1.4], ["#aaa", 1], ["#c5c5c5", .6], ["#d6d6d6", .24]] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = thickness * scale; ctx.stroke(loop);
    }
    ctx.restore();
  }
  const smooth = document.createElement("canvas"); smooth.width = width; smooth.height = height;
  const smoothCtx = smooth.getContext("2d")!; smoothCtx.filter = "blur(.65px)"; smoothCtx.drawImage(pile, 0, 0);
  const heights = smoothCtx.getImageData(0, 0, width, height).data;
  const normal = ctx.createImageData(width, height), roughness = ctx.createImageData(width, height);
  const pigment = new Float32Array(width * height);
  let mean = 0; for (let i = 0; i < heights.length; i += 4) mean += heights[i] / 255;
  mean /= width * height;
  const sample = (x: number, y: number) => heights[(Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4] / 255;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, h = heights[i] / 255;
    const nx = -(sample(x + 1, y) - sample(x - 1, y)) * 3;
    const ny = (sample(x, y + 1) - sample(x, y - 1)) * 3;
    const length = Math.hypot(nx, ny, 1);
    normal.data[i] = (nx / length * .5 + .5) * 255;
    normal.data[i + 1] = (ny / length * .5 + .5) * 255;
    normal.data[i + 2] = (1 / length * .5 + .5) * 255; normal.data[i + 3] = 255;
    roughness.data[i] = roughness.data[i + 1] = roughness.data[i + 2] = 255; roughness.data[i + 3] = 255;
    pigment[y * width + x] = 1 + (h - mean) * .18;
  }
  ctx.putImageData(normal, 0, 0);
  const normalMap = new THREE.CanvasTexture(pile); normalMap.generateMipmaps = false; normalMap.minFilter = THREE.LinearFilter;
  smoothCtx.putImageData(roughness, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(smooth); roughnessMap.generateMipmaps = false; roughnessMap.minFilter = THREE.LinearFilter;
  const sparkleCanvas = document.createElement("canvas"); sparkleCanvas.width = width; sparkleCanvas.height = height;
  const sparkleCtx = sparkleCanvas.getContext("2d")!;
  sparkleCtx.fillStyle = "#000"; sparkleCtx.fillRect(0, 0, width, height); sparkleCtx.fillStyle = "#fff";
  const facetCanvas = document.createElement("canvas"); facetCanvas.width = width; facetCanvas.height = height;
  const facetCtx = facetCanvas.getContext("2d")!; facetCtx.fillStyle = "rgb(128,128,255)"; facetCtx.fillRect(0, 0, width, height);
  for (let y = 5; y < height; y += 10) for (let x = 5; x < width; x += 10) {
    const seed = (Math.imul(x, 1597334677) ^ Math.imul(y, 3812015801)) >>> 0;
    if (seed % 4 !== 0) continue;
    const px = x + (seed % 7 - 3), py = y + ((seed >>> 8) % 7 - 3);
    const nx = -.31 + ((seed >>> 8 & 255) / 255 - .5) * .32, ny = .43 + ((seed >>> 16 & 255) / 255 - .5) * .32;
    const length = Math.hypot(nx, ny, 1);
    facetCtx.fillStyle = `rgb(${Math.round((nx / length * .5 + .5) * 255)},${Math.round((ny / length * .5 + .5) * 255)},${Math.round((1 / length * .5 + .5) * 255)})`;
    for (const target of [sparkleCtx, facetCtx]) {
      const padding = target === facetCtx ? 2 : 0;
      target.beginPath(); target.ellipse(px, py, (seed % 23 === 0 ? 5.5 : 3 + (seed % 5) * .25) + padding, 1.7 + padding, seed % 628 / 100, 0, Math.PI * 2); target.fill();
    }
  }
  const sparkleMap = new THREE.CanvasTexture(sparkleCanvas); sparkleMap.generateMipmaps = false; sparkleMap.minFilter = THREE.LinearFilter;
  const sparkleNormal = new THREE.CanvasTexture(facetCanvas); sparkleNormal.generateMipmaps = false; sparkleNormal.minFilter = THREE.LinearFilter;
  terrySurface = { normal: normalMap, roughness: roughnessMap, pigment, sparkle: sparkleMap, sparkleNormal };
  return terrySurface;
}

type BeadMaterials = { faces: THREE.MeshPhysicalMaterial[]; mask?: THREE.MeshBasicMaterial };
function physicalMaterials(art: Artwork): BeadMaterials {
  const terry = art.material === "terry", jelly = art.material === "jelly";
  const resolution = 16, surface = terry ? terryGrainSurface() : fusedGrainSurface();
  const glints = terryGrainSurface();
  const color = document.createElement("canvas"); color.width = 40 * resolution; color.height = 42 * resolution;
  const ctx = color.getContext("2d")!;
  ctx.fillStyle = art.beads[0]?.color ?? "#f0eade"; ctx.fillRect(0, 0, color.width, color.height);
  for (const bead of art.beads) { ctx.fillStyle = bead.color; ctx.fillRect((bead.x - .2) * resolution, (bead.y - .2) * resolution, resolution * 1.4, resolution * 1.4); }
  for (const bead of art.beads) { ctx.fillStyle = bead.color; ctx.fillRect(bead.x * resolution, bead.y * resolution, resolution, resolution); }
  const fused = document.createElement("canvas"); fused.width = color.width; fused.height = color.height;
  const fusedCtx = fused.getContext("2d")!; fusedCtx.filter = "blur(.7px)"; fusedCtx.drawImage(color, 0, 0);
  const image = fusedCtx.getImageData(0, 0, color.width, color.height);
  for (let pixel = 0; pixel < color.width * color.height; pixel++) {
    const i = pixel * 4;
    const grainPixel = Math.floor(Math.floor(pixel / color.width) / color.height * 1344) * 1280 + Math.floor((pixel % color.width) / color.width * 1280);
    const pearl = !terry && beadGrain ? beadGrain[grainPixel * 4] / 255 : .86;
    const tint = surface.pigment[grainPixel] * (1 + (pearl - .86) * .15);
    for (let c = 0; c < 3; c++) image.data[i + c] *= tint;
  }
  ctx.putImageData(image, 0, 0);
  for (const bead of art.beads) {
    const x = bead.x * resolution, y = bead.y * resolution;
    const lip = ctx.createLinearGradient(x, y, x + resolution, y + resolution);
    lip.addColorStop(0, "#ffffff32"); lip.addColorStop(.3, "#ffffff00"); lip.addColorStop(.72, "#ffffff00"); lip.addColorStop(1, "#4a382423");
    ctx.fillStyle = lip; ctx.fillRect(x, y, resolution, resolution);
    ctx.beginPath(); ctx.roundRect(x + .45, y + .45, resolution - .9, resolution - .9, 2.5);
    ctx.strokeStyle = "#ffffff2b"; ctx.lineWidth = .7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + resolution - .6, y + 3); ctx.lineTo(x + resolution - .6, y + resolution - 2); ctx.quadraticCurveTo(x + resolution - .6, y + resolution - .6, x + resolution - 2, y + resolution - .6); ctx.lineTo(x + 3, y + resolution - .6);
    ctx.strokeStyle = "#5c493d18"; ctx.lineWidth = .65; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + resolution * .5, y + resolution * .5, resolution * .11, resolution * .09, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#574b3614"; ctx.fill();
  }
  const map = new THREE.CanvasTexture(color); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  let transmissionMap: THREE.CanvasTexture | undefined, opacityMap: THREE.CanvasTexture | undefined, jellyNormal: THREE.CanvasTexture | undefined;
  if (jelly) {
    const transmission = document.createElement("canvas"), opacity = document.createElement("canvas");
    for (const canvas of [transmission, opacity]) { canvas.width = color.width; canvas.height = color.height; }
    const tctx = transmission.getContext("2d")!, actx = opacity.getContext("2d")!;
    tctx.fillStyle = "#000"; tctx.fillRect(0, 0, color.width, color.height);
    actx.fillStyle = "#fff"; actx.fillRect(0, 0, color.width, color.height);
    const gelColors = new Set(art.translucentColors);
    for (const bead of art.beads) if (gelColors.has(bead.color)) {
      tctx.fillStyle = "#fff"; actx.fillStyle = "#dedede";
      for (const target of [tctx, actx]) target.fillRect(bead.x * resolution, bead.y * resolution, resolution, resolution);
    }
    const gelBeads = art.beads.filter(bead => gelColors.has(bead.color));
    const minX = Math.min(...gelBeads.map(b => b.x)), maxX = Math.max(...gelBeads.map(b => b.x)) + 1;
    const minY = Math.min(...gelBeads.map(b => b.y)), maxY = Math.max(...gelBeads.map(b => b.y)) + 1;
    const lens = document.createElement("canvas"); lens.width = color.width; lens.height = color.height;
    const lensCtx = lens.getContext("2d")!, lensPixels = lensCtx.createImageData(lens.width, lens.height);
    const gelPixels = tctx.getImageData(0, 0, lens.width, lens.height).data;
    for (let y = 0; y < lens.height; y++) for (let x = 0; x < lens.width; x++) {
      const i = (y * lens.width + x) * 4, body = gelPixels[i] > 128;
      const left = minX, right = maxX, top = minY, bottom = maxY;
      const nx = body ? ((x / resolution - left) / (right - left) - .5) * 1.3 : 0;
      const ny = body ? -((y / resolution - top) / (bottom - top) - .5) * 1.4 : 0;
      const length = Math.hypot(nx, ny, 1);
      lensPixels.data[i] = (nx / length * .5 + .5) * 255;
      lensPixels.data[i + 1] = (ny / length * .5 + .5) * 255;
      lensPixels.data[i + 2] = (1 / length * .5 + .5) * 255; lensPixels.data[i + 3] = 255;
    }
    lensCtx.putImageData(lensPixels, 0, 0); jellyNormal = new THREE.CanvasTexture(lens);
    transmissionMap = new THREE.CanvasTexture(transmission); opacityMap = new THREE.CanvasTexture(opacity);
  }
  const face = jelly ? new THREE.MeshPhysicalMaterial({
    map, transmission: .62, transmissionMap, thickness: .5, ior: 1.45,
    roughness: .18, metalness: 0, attenuationDistance: 3,
    normalMap: jellyNormal, normalScale: new THREE.Vector2(1, 1),
    clearcoat: 1, clearcoatMap: glints.sparkle, clearcoatRoughness: .2,
    clearcoatNormalMap: glints.sparkleNormal, clearcoatNormalScale: new THREE.Vector2(1, 1),
  }) : terry ? new THREE.MeshPhysicalMaterial({
    map, normalMap: surface.normal, normalScale: new THREE.Vector2(.38, .38),
    color: new THREE.Color(1.1, 1.1, 1.1), roughness: 1, metalness: 0, specularIntensity: .06,
    clearcoat: 1, clearcoatMap: glints.sparkle, clearcoatRoughness: .2,
    clearcoatNormalMap: glints.sparkleNormal, clearcoatNormalScale: new THREE.Vector2(1, 1),
    sheen: .02, sheenRoughness: 1, sheenColor: new THREE.Color("#fff6f4"),
  }) : new THREE.MeshPhysicalMaterial({
    map, normalMap: surface.normal, normalScale: new THREE.Vector2(.3, .3),
    roughnessMap: surface.roughness, roughness: .85, metalness: 0, ior: 1.5,
    clearcoat: 1, clearcoatMap: glints.sparkle, clearcoatRoughness: .2,
    clearcoatNormalMap: glints.sparkleNormal, clearcoatNormalScale: new THREE.Vector2(1, 1),
  });
  const side = jelly ? face.clone() : new THREE.MeshPhysicalMaterial({ map, roughness: terry ? .95 : .48, metalness: 0, clearcoat: terry ? 0 : .25, clearcoatRoughness: .4, specularIntensity: terry ? .15 : 1 });
  if (jelly) { side.normalMap = null; side.clearcoatNormalMap = null; }
  return { faces: [face, side], mask: jelly ? new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: opacityMap, transparent: true, depthWrite: true }) : undefined };
}

type BeadStudio = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.OrthographicCamera; mesh: THREE.Mesh; materials: Map<string, BeadMaterials>; completed: Map<string, THREE.BufferGeometry> };
let beadStudio: BeadStudio | undefined;
let beadWebGLUnavailable = false;
function getBeadStudio() {
  if (beadStudio) return beadStudio;
  if (beadWebGLUnavailable) return null;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); }
  catch { beadWebGLUnavailable = true; return null; }
  renderer.setPixelRatio(1); renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const room = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04).texture; scene.environment = environment; scene.environmentIntensity = .36; room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6edfa, .18));
  const light = new THREE.DirectionalLight(0xffffff, 1.7); light.position.set(-28, 38, 32); light.castShadow = true;
  Object.assign(light.shadow.camera, { left: -26, right: 26, top: 27, bottom: -27, near: 1, far: 120 });
  light.shadow.mapSize.set(512, 512); light.shadow.bias = -.0002; light.shadow.normalBias = .03; light.shadow.radius = 3.5;
  scene.add(light);
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial()); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  const camera = new THREE.OrthographicCamera(-23, 23, 23, -23, .1, 180); camera.position.set(0, 0, 95); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
  beadStudio = { renderer, scene, camera, mesh, materials: new Map(), completed: new Map() };
  return beadStudio;
}

function drawPhysicalBeads(canvas: HTMLCanvasElement, art: Artwork, count: number) {
  const studio = getBeadStudio();
  if (!studio || studio.renderer.getContext().isContextLost()) return false;
  const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return false;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.ceil(rect.width * pixelRatio), height = Math.ceil(rect.height * pixelRatio);
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d")!; ctx.clearRect(0, 0, width, height);
  if (!count) return true;
  let geometry = count === art.beads.length ? studio.completed.get(art.id) : undefined;
  if (!geometry) {
    const uv = (vertices: number[], index: number) => new THREE.Vector2((vertices[index * 3] + 20) / 40, (vertices[index * 3 + 1] + 21) / 42);
    geometry = new THREE.ExtrudeGeometry(fusedShapes(art.beads.slice(0, count)), {
      depth: .34, curveSegments: 3, bevelEnabled: true, bevelThickness: .13, bevelSize: .14, bevelSegments: 4, steps: 1,
      UVGenerator: { generateTopUV: (_g, vertices, ...indices) => indices.map(i => uv(vertices, i)), generateSideWallUV: (_g, vertices, ...indices) => indices.map(i => uv(vertices, i)) },
    });
    if (count === art.beads.length) studio.completed.set(art.id, geometry);
  }
  const materials = studio.materials.get(art.id) ?? physicalMaterials(art); studio.materials.set(art.id, materials);
  studio.mesh.geometry = geometry; studio.mesh.material = materials.faces;
  const aspect = width / height, viewHeight = Math.max(45, 43 / aspect);
  Object.assign(studio.camera, { left: -viewHeight * aspect / 2, right: viewHeight * aspect / 2, top: viewHeight / 2, bottom: -viewHeight / 2 }); studio.camera.updateProjectionMatrix();
  studio.scene.background = materials.mask ? new THREE.Color(APP_BACKGROUND) : null;
  studio.renderer.setSize(width, height, false); studio.renderer.render(studio.scene, studio.camera);
  // Blur only the alpha-derived cast shadow; keep the bead surface sharp.
  ctx.save();
  if (!materials.mask) {
    ctx.shadowColor = "rgba(73,61,48,.16)";
    ctx.shadowBlur = 5 * pixelRatio;
    ctx.shadowOffsetY = 3 * pixelRatio;
    ctx.shadowOffsetX = .5 * pixelRatio;
  }
  ctx.drawImage(studio.renderer.domElement, 0, 0);
  ctx.restore();
  if (materials.mask) {
    studio.scene.background = null; studio.mesh.material = materials.mask;
    studio.renderer.render(studio.scene, studio.camera);
    ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(studio.renderer.domElement, 0, 0); ctx.globalCompositeOperation = "source-over";
    studio.mesh.material = materials.faces;
  }
  if (count !== art.beads.length) geometry.dispose();
  return true;
}

function BeadArt({ art, count = art.beads.length, }: { art: Artwork; count?: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    let frame = 0, disposed = false, textureReady = false;
    const paint = () => { if (!textureReady || disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { try { if (drawPhysicalBeads(canvas, art, count)) setReady(true); } catch { setReady(false); } }); };
    const observer = new ResizeObserver(paint); observer.observe(canvas);
    void loadBeadGrain().then(() => { textureReady = true; paint(); });
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); };
  }, [art, count]);
  return <div className="bc-art bc-art-3d" role="img" aria-label={`${art.name}, ${art.material === "jelly" ? "translucent jelly" : art.material === "terry" ? "soft textured" : "pearlescent"} bead pattern`} data-material={art.material} data-render-mode={ready ? "physical" : "fallback"} data-placed={count} data-active-color={art.beads[Math.max(0, count - 1)]?.color}>
    <canvas ref={ref} aria-hidden="true" style={{ width: "100%", height: "100%", opacity: ready ? 1 : 0 }} />
    {!ready && <div aria-hidden="true" style={{ display: "contents" }}><FlatBeadArt art={art} count={count} /></div>}
  </div>;
}

const menuSections = [
  { id: "all", title: "All", items: artworks },
  { id: "tarts", title: "Tarts", items: artworks.filter(art => art.category === "Tarts") },
  { id: "cakes", title: "Cakes", items: artworks.filter(art => art.category === "Cakes") },
];

function MenuGrid({ items, selectedId, detailShift, onOpen, onClose }: { items: Artwork[]; selectedId: string | null; detailShift: number; onOpen: (art: Artwork, button: HTMLButtonElement) => void; onClose: () => void }) {
  return <div className="bc-food-grid">
    {items.map(art => {
      const expanded = art.id === selectedId;
      return <article className="bc-menu-card" key={art.id} data-expanded={expanded} data-dimmed={!!selectedId && !expanded} inert={!!selectedId && !expanded} aria-hidden={!!selectedId && !expanded} style={{ "--detail-shift": `${expanded ? detailShift : 0}px` } as React.CSSProperties}>
        <button className="bc-menu-open" aria-label={`${expanded ? "Close" : "Open"} ${art.name}`} aria-expanded={expanded} onClick={event => expanded ? onClose() : onOpen(art, event.currentTarget)}><BeadArt art={art} /></button>
        <div className="bc-menu-caption">
          <div className="bc-caption-summary" aria-hidden={expanded} inert={expanded}><div className="bc-menu-heading"><h3>{art.name}</h3><p className="bc-menu-price">{art.price}</p></div><p className="bc-menu-description">{art.description}</p></div>
          <div className="bc-caption-detail" aria-hidden={!expanded} inert={!expanded}><div className="bc-menu-heading"><h3>About this cake</h3><p className="bc-menu-price">{art.price}</p></div><p className="bc-menu-description">{art.detailDescription}</p></div>
        </div>
      </article>;
    })}
  </div>;
}

export function BeadClub({ loop = false, className }: BeadClubProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const lastCard = React.useRef<HTMLButtonElement | null>(null);
  const back = React.useRef<HTMLButtonElement>(null);
  const menu = React.useRef<HTMLDivElement>(null);
  const scrollBeforeExpand = React.useRef(0);
  const [activeSection, setActiveSection] = React.useState(0);
  const menuId = React.useId();
  const [scale, setScale] = React.useState<number | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailShift, setDetailShift] = React.useState(0);
  const [detailTitle, setDetailTitle] = React.useState("");
  const selected = artworks.find(art => art.id === selectedId) ?? null;
  const category = menuSections[activeSection];
  React.useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(0, Math.min((entry.contentRect.width - (loop ? 34 : 16)) / 390, (entry.contentRect.height - (loop ? 42 : 24)) / PHONE_HEIGHT, 1))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [loop]);
  const open = (art: Artwork, button: HTMLButtonElement) => {
    lastCard.current = button;
    const list = menu.current;
    if (list) {
      scrollBeforeExpand.current = list.scrollTop;
      const rect = button.getBoundingClientRect(), container = list.getBoundingClientRect();
      const unit = list.clientWidth / container.width;
      const center = (rect.top + rect.height / 2 - container.top) * unit;
      const safeCenter = Math.max(210, Math.min(list.clientHeight - 260, center));
      setDetailShift(safeCenter - center);
    }
    setDetailTitle(art.name);
    setSelectedId(art.id);
    requestAnimationFrame(() => back.current?.focus({ preventScroll: true }));
  };
  const close = () => {
    setSelectedId(null);
    requestAnimationFrame(() => {
      menu.current?.scrollTo({ top: scrollBeforeExpand.current, behavior: "instant" });
      lastCard.current?.focus({ preventScroll: true });
    });
  };
  return <div ref={host} className={`bc-stage ${className ?? ""}`} data-preview={loop ? "loop" : "interactive"} onKeyDown={event => { if (event.key === "Escape" && selectedId) close(); }}>
    <style>{styles}</style>
    <div className="bc-phone-space" style={{ width: 390 * (scale ?? 0), height: PHONE_HEIGHT * (scale ?? 0), visibility: scale === null ? "hidden" : "visible" }}><div className="bc-phone" style={{ width: 390, height: PHONE_HEIGHT, transform: `scale(${scale ?? 0})` }}>

      <div className="bc-screen" data-detail={!!selected}>
        <div className="bc-status" aria-hidden="true"><b>9:41</b><div className="bc-indicators"><svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 8v3M5 6v5M9 3v8M13 0v11" stroke="currentColor" strokeWidth="2" /></svg><svg width="15" height="12" viewBox="0 0 15 12"><path d="M1 4Q7.5-1 14 4M3 7q4.5-4 9 0M6 10q1.5-2 3 0" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg><span className="bc-battery" /></div></div>
        <div className="bc-collection">
          <header className="bc-header">
            <div className="bc-header-copy"><span className="bc-brand" aria-hidden={!!selected}>Little Bead Club</span><div className="bc-detail-header" aria-hidden={!selected} inert={!selected}><button ref={back} className="bc-icon" onClick={close} aria-label="Back to collection"><ArrowLeft size={20} /></button><h2 className="bc-detail-title">{detailTitle}</h2></div></div>
            <CakeSlice className="bc-food-icon" size={21} strokeWidth={1.8} aria-hidden="true" />
          </header>
          <nav className="bc-menu-tabs" aria-label="Pattern categories" inert={!!selected} aria-hidden={!!selected}>{menuSections.map((section, index) => <button key={section.id} aria-pressed={activeSection === index} onClick={() => { setActiveSection(index); menu.current?.scrollTo({ top: 0, behavior: "instant" }); }}>{section.title}</button>)}</nav>
          <div ref={menu} className="bc-list" aria-label={selected ? `${selected.name} details` : "Cake menu"} data-expanded={!!selected}>
            <section className="bc-menu-section" key={category.id} aria-labelledby={`${menuId}-${category.id}`}>
              <h2 className="bc-sr-only" id={`${menuId}-${category.id}`}>{category.title}</h2>
              <MenuGrid items={category.items} selectedId={selectedId} detailShift={detailShift} onOpen={open} onClose={close} />
            </section>
          </div>
        </div>
        <div className="bc-top-glass" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="bc-glass-edge" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="bc-glass-reflection" aria-hidden="true" />
        <div className="bc-home" aria-hidden="true" />
      </div>
      {/* Apple Design Resources product bezel; retain its separate asset terms. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bc-device-frame" src="/components/bead-club/iphone-16-pro-white.png" width="1406" height="2822" alt="" aria-hidden="true" draggable={false} />
    </div></div>
  </div>;
}

const styles = `
.bc-stage{width:100%;height:100%;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:transparent;color:#242a26;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;isolation:isolate}
.bc-stage *{box-sizing:border-box}.bc-stage button{cursor:pointer;font-family:inherit;color:inherit}.bc-stage button:focus-visible{outline:2px solid #3c5044;outline-offset:4px}.bc-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.bc-phone-space{position:relative;flex-shrink:0;width:min(390px,calc(100% - 8px));aspect-ratio:1406/2822}.bc-phone{position:absolute;inset:0;width:100%;height:100%;transform-origin:top left;container-type:inline-size}.bc-device-frame{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:20}
.bc-screen{position:absolute;left:7.254623%;top:3.543586%;width:85.775249%;height:92.912828%;overflow:hidden;mask-image:url('/components/bead-club/iphone-screen-mask.svg');-webkit-mask-image:url('/components/bead-club/iphone-screen-mask.svg');mask-size:100% 100%;-webkit-mask-size:100% 100%;background:${APP_BACKGROUND};isolation:isolate}

.bc-status{height:55px;position:relative;display:flex;align-items:center;justify-content:space-between;padding:4px clamp(15px,6cqw,24px) 0 clamp(16px,6.7cqw,26px);z-index:12;font-size:14px;font-weight:600;color:#242a26;background:transparent}.bc-indicators{display:flex;align-items:center;gap:5px}.bc-battery{width:21px;height:10px;border-radius:3px;border:1px solid currentColor;position:relative}.bc-battery:before{content:'';position:absolute;inset:1px;background:currentColor;border-radius:1px}.bc-battery:after{content:'';position:absolute;width:2px;height:4px;right:-4px;top:2px;background:currentColor;border-radius:1px}
.bc-header::before{content:'';position:absolute;left:0;right:0;top:-55px;bottom:-28px;z-index:-1;background:transparent;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);mask-image:linear-gradient(#000 0%,#000 68%,transparent 100%);-webkit-mask-image:linear-gradient(#000 0%,#000 68%,transparent 100%);pointer-events:none}
.bc-collection{position:relative;height:calc(100% - 55px);display:flex;flex-direction:column}.bc-header{position:absolute;top:0;left:0;right:0;z-index:8;flex-shrink:0;min-height:48px;color:#242a26;padding:6px 20px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:16px;font-weight:500;letter-spacing:-.25px}.bc-food-icon{flex-shrink:0;color:#171b18;filter:none;background:none;box-shadow:none}
.bc-menu-tabs{position:absolute;top:48px;left:0;right:0;display:flex;align-items:center;gap:8px;flex-shrink:0;overflow-x:auto;scrollbar-width:none;padding:4px 20px 8px;min-height:56px;z-index:8}.bc-menu-tabs button{flex-shrink:0;min-height:40px;border:1px solid #242a2614;border-radius:999px;background:#ffffff80;padding:0 16px;font-size:14px;font-weight:500;white-space:nowrap;color:#58635b}.bc-menu-tabs button[aria-pressed="true"]{color:#fff;background:#28332c;border-color:#28332c}
.bc-list{position:absolute;inset:0;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:116px 18px 132px;scrollbar-width:none}.bc-list::-webkit-scrollbar{display:none}.bc-menu-section{padding:0}.bc-food-grid{display:grid;grid-template-columns:minmax(0,1fr);row-gap:36px;align-items:start}.bc-menu-card{min-width:0;position:relative;transform:translateY(var(--detail-shift,0px));transition:opacity .24s ease,transform .8s cubic-bezier(.22,.68,.2,1);will-change:auto}.bc-menu-card[data-dimmed="true"]{opacity:0;pointer-events:none}.bc-menu-card[data-expanded="true"]{z-index:4}.bc-menu-open{display:block;width:100%;height:auto;aspect-ratio:1;border:0;background:transparent;padding:0;transform:scale(1);transition:transform .85s cubic-bezier(.22,.68,.2,1)}.bc-menu-card[data-expanded="true"] .bc-menu-open{transform:scale(1.08)}.bc-menu-caption{position:relative;padding:8px 6px 0;text-align:left}.bc-caption-summary{opacity:1;filter:blur(0);transform:translateY(0);transition:opacity .22s ease,filter .22s ease,transform .35s ease}.bc-caption-detail{position:absolute;top:8px;left:6px;right:6px;opacity:0;filter:blur(3px);transform:translateY(8px);pointer-events:none;transition:opacity .22s ease,filter .22s ease,transform .35s ease}.bc-menu-card[data-expanded="true"] .bc-caption-summary{opacity:0;filter:blur(3px);transform:translateY(-5px)}.bc-menu-card[data-expanded="true"] .bc-caption-detail{opacity:1;filter:blur(0);transform:translateY(0);pointer-events:auto;transition:opacity .5s .18s ease,filter .5s .18s ease,transform .65s .18s ease}.bc-menu-heading{display:flex;align-items:baseline;justify-content:space-between;gap:16px}.bc-menu-heading>h2,.bc-menu-heading>h3{min-width:0}.bc-menu-caption h3{font-size:16px;line-height:1.35;font-weight:600;letter-spacing:-.2px;margin:0;overflow-wrap:anywhere}.bc-menu-price{flex-shrink:0;font-size:14px;line-height:1.4;font-weight:500;margin:0;color:#3b453e;white-space:nowrap;font-variant-numeric:tabular-nums}.bc-menu-description{font-size:13px;line-height:1.5;color:#58635b;margin:8px 0 0}.bc-stage svg{flex-shrink:0}
.bc-art{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(.5px 3px 3.5px #493d3029)}.bc-art-3d{position:relative;filter:none}.bc-art-3d>canvas{position:absolute;inset:0;pointer-events:none}
.bc-home{position:absolute;width:104px;height:4px;border-radius:4px;background:#424b45;bottom:9px;left:50%;transform:translateX(-50%);z-index:10}
.bc-top-glass{position:absolute;top:0;left:0;right:0;height:176px;pointer-events:none;z-index:6;background:transparent}.bc-top-glass i{position:absolute;inset:0;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);mask-image:linear-gradient(#000 60%,transparent);-webkit-mask-image:linear-gradient(#000 60%,transparent)}.bc-top-glass i:nth-child(2){height:150px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.bc-top-glass i:nth-child(3){height:128px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.bc-top-glass i:nth-child(4){height:106px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.bc-glass-edge{position:absolute;bottom:0;left:0;right:0;height:124px;pointer-events:none;z-index:9;background:transparent}.bc-glass-edge i{position:absolute;inset:0;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);mask-image:linear-gradient(transparent,#000 75%);-webkit-mask-image:linear-gradient(transparent,#000 75%)}.bc-glass-edge i:nth-child(2){top:20px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.bc-glass-edge i:nth-child(3){top:42px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.bc-glass-edge i:nth-child(4){top:64px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.bc-glass-reflection{position:absolute;inset:0;border-radius:inherit;z-index:7;pointer-events:none;box-shadow:inset 0 0 2px #fff4}
/* The cake canvas stays in its original card throughout expansion. */
.bc-header-copy{position:relative;flex:1;min-width:0;min-height:36px;display:flex;align-items:center}.bc-brand{opacity:1;filter:blur(0);transition:opacity .18s ease,filter .18s ease}.bc-detail-header{position:absolute;inset:0;display:flex;align-items:center;gap:9px;opacity:0;filter:blur(3px);pointer-events:none;transition:opacity .2s ease,filter .2s ease}.bc-detail-title{min-width:0;margin:0;font-size:15px;line-height:1.3;font-weight:600;letter-spacing:-.2px}.bc-icon{width:36px;height:36px;flex:0 0 36px;border:1px solid #242a2624;background:#ffffff50;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:none;display:grid;place-items:center;border-radius:50%}.bc-menu-tabs{opacity:1;filter:blur(0);transition:opacity .2s ease,filter .2s ease}.bc-screen[data-detail="true"] .bc-brand{opacity:0;filter:blur(3px)}.bc-screen[data-detail="true"] .bc-detail-header{opacity:1;filter:blur(0);pointer-events:auto;transition:opacity .45s .16s ease,filter .45s .16s ease}.bc-screen[data-detail="true"] .bc-menu-tabs{opacity:0;filter:blur(3px);pointer-events:none}.bc-list[data-expanded="true"]{overflow:hidden}
@media(prefers-reduced-motion:reduce){.bc-stage *{transition-duration:.01ms!important;transition-delay:0ms!important}}
`;
