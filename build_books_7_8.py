#!/usr/bin/env python3
"""
Builds District VII (The Lamp Had Not Gone Out: 1–2 Samuel) and District VIII (A Still Small Voice: 1 & 2 Kings)
from Timothy Holt's interior print PDFs:
  - Extracts all 41 embedded JPEGs from the-lamp-had-not-gone-out-interior-print.pdf
  - Extracts all 41 embedded JPEGs from a-still-small-voice-interior-print.pdf
  - Samples 4-band palettes (top, horizon, ground, accent)
  - Writes assets/data/samuel-manifest.json and assets/data/kings-manifest.json
"""

import json
import re
from pathlib import Path
from build_assets import sample_palette_via_bmp

ROOT = Path("/Users/Timotheus/Desktop/Pilgrim Way Art World Game")
INTERIORS_DIR = ROOT / "Pilgrim Walk Game Art" / "art-masters" / "interiors"
ASSETS_DIR = ROOT / "assets"


def extract_jpegs_from_pdf(pdf_path: Path):
    data = pdf_path.read_bytes()
    streams = []
    for m in re.finditer(b"stream\r?\n", data):
        start = m.end()
        end = data.find(b"endstream", start)
        if end != -1:
            s = data[start:end].strip(b"\r\n")
            if len(s) > 10000 and s[:2] == b"\xff\xd8":
                streams.append(s)
    return streams


SAMUEL_PARTS = [
    {
        "part": 1,
        "title": "My Heart Exults",
        "epigraph": "My heart exults in Yahweh!",
        "epigraphRef": "1 Samuel 2:1",
        "lightName": "Light of the Tabernacle Lamp",
        "lightHint": "Beside the clay lamp that had not yet gone out in the quiet Shiloh sanctuary"
    },
    {
        "part": 2,
        "title": "A King Like All the Nations",
        "epigraph": "Make us a king to judge us like all the nations.",
        "epigraphRef": "1 Samuel 8:5",
        "lightName": "Light of the Stone of Help",
        "lightHint": "Near the upright Ebenezer witness stone in the hill pasture"
    },
    {
        "part": 3,
        "title": "A Man After His Own Heart",
        "epigraph": "Yahweh has sought for himself a man after his own heart.",
        "epigraphRef": "1 Samuel 13:14",
        "lightName": "Light of the Elah Brook",
        "lightHint": "Where five smooth river stones glisten in the clear valley stream"
    },
    {
        "part": 4,
        "title": "Shepherd of My People",
        "epigraph": "I took you from the sheep pen, from following the sheep, to be prince over my people.",
        "epigraphRef": "2 Samuel 7:8",
        "lightName": "Light of the King’s Table",
        "lightHint": "Beside the place kept continually for Jonathan’s lame son"
    },
    {
        "part": 5,
        "title": "My Son, My Son",
        "epigraph": "Yahweh is my rock, my fortress, and my deliverer.",
        "epigraphRef": "2 Samuel 22:2",
        "lightName": "Light of the Threshing Floor Altar",
        "lightHint": "Near Araunah’s threshing floor on the hill before the Finale Plaza"
    }
]

SAMUEL_SCENES = {
    6: "samuel_lamp",
    15: "anointing_horn",
    18: "five_smooth_stones",
    30: "kings_table"
}

SAMUEL_POEMS = [
    (1, 1, "ten sons", "1 Samuel 1:3–8", "“Hannah, why do you weep? Why don’t you eat? Why is your heart grieved?”",
     "every year the same road\nup to Shiloh.\n\nevery year the same table,\nthe double portion\nset in front of her,\nand the same voice across the room\nreminding her what she didn't have.\n\nso she didn't eat.\n\nher husband loved her.\nam I not better to you\nthan ten sons? he asked.\n\nhe meant it kindly.\n\nbut some aches\naren't answered at the table.\n\nthey have to be carried\nup the hill\nto God."),
    (2, 1, "only her lips moved", "1 Samuel 1:12–18", "“I poured out my soul before Yahweh.”",
     "no words came out.\nonly her lips moved.\n\nthe old priest watching\nthought she was drunk.\n\nshe wasn't.\nshe was pouring.\n\nthe whole jar of it:\nthe years, the rival,\nthe empty arms,\nthe promise she was ready to make.\n\nand when she stood up\nshe went and ate,\nand her face\nwasn't sad anymore.\n\nnothing had changed yet.\n\nexcept where\nshe had put it."),
    (3, 1, "asked of the Lord", "1 Samuel 1:20–28", "“I prayed for this child, and Yahweh has given me my petition which I asked of him.”",
     "she named him Samuel:\nI asked him of the Lord.\n\nshe nursed him.\nshe weaned him.\n\nthen she carried him up the hill\nwith flour and wine\nand brought him to the old priest\nat the same door\nwhere she had prayed.\n\nwhat she asked for,\nshe gave back.\n\nnot because God took it.\n\nbecause she knew\nwhose it was\nbefore it was ever hers."),
    (4, 1, "no rock like our God", "1 Samuel 2:1–8", "“He raises up the poor out of the dust.”",
     "she didn't sing about herself.\n\nshe sang about bows\nbreaking in strong hands,\nthe full going out to work for bread,\nthe hungry sitting down to eat.\n\nshe sang about a God\nwho stoops to the dust\nand lifts the poor out of it\nand gives them a seat\nwith princes.\n\nthe barren one was singing.\n\nshe knew\nwhich way\nhis hands move."),
    (5, 1, "a little robe", "1 Samuel 2:18–21", "“his mother made him a little robe, and brought it to him from year to year”",
     "every year\na little bigger.\n\nshe measured him in her mind\nall year long,\nguessing how much he'd grown.\n\nthen up the road to Shiloh\nwith the robe folded in her arms.\n\nshe gave him away\nand never stopped\nmaking him things.\n\nthat's what giving to God\nlooks like sometimes:\n\nopen hands,\nand a needle\nstill moving."),
    (6, 1, "speak", "1 Samuel 3:1–10", "“Speak; for your servant hears.”",
     "the word of the Lord was rare\nin those days.\n\nthe lamp hadn't gone out yet,\nand a boy lay down\nnear the ark.\n\nthree times a voice called his name.\nthree times he ran\nto the wrong room.\n\nthat's all right.\nmost of us do.\n\nthen he learned the sentence:\nspeak,\nfor your servant hears.\n\nGod wasn't waiting\nfor him to be older.\n\nonly to be listening."),
    (7, 1, "the straight way", "1 Samuel 6:7–13", "“The cows took the straight way by the way to Beth Shemesh.”",
     "the ark had been taken,\nand no one who took it\ncould keep it.\n\nso they sent it home\non a new cart\nbehind two cows\nthat had never worn a yoke.\n\nthe cows went lowing\nall the way\nand didn't turn\nto the right or the left.\n\ndown in the valley\nthe reapers looked up\nfrom the wheat\n\nand saw what they thought\nthey had lost for good\n\ncoming up the road."),
    (8, 1, "stone of help", "1 Samuel 7:3–12", "“Yahweh helped us until now.”",
     "Samuel set a stone\nin a field\nand gave it a name:\nstone of help.\n\nnot every stone\nis meant for a wall.\n\nsome are there\nto be looked at,\n\nso that on the day\nyou're afraid again\nyou can walk out to the field\nand put your hand on it\nand remember.\n\nhe helped us\nthis far.\n\nhe doesn't plan\nto stop\nhere."),
    (9, 2, "like everyone else", "1 Samuel 8:4–9", "“they have not rejected you, but they have rejected me as the king over them.”",
     "Samuel was old.\nhis sons took bribes.\n\ngive us a king, the elders said,\nlike all the nations.\n\nit hurt him.\nhe took it to God.\n\nand God said,\nit isn't you they're refusing.\nit's me.\n\nthen, strangely:\nlisten to them.\n\nhe lets us choose.\nhe tells us plainly\nwhat it will cost.\n\nand he doesn't leave\nwhen we choose wrong."),
    (10, 2, "the lost donkeys", "1 Samuel 9:3–24", "“don’t set your mind on them; for they have been found.”",
     "Saul went out\nlooking for donkeys.\n\nthree days of hills.\nbread gone from the sacks.\nnothing to show.\n\nhe was ready to turn back.\n\nand in the town\nan old seer was already waiting,\nwith a seat kept at the table\nand a portion set aside.\n\nyour donkeys are found, he said.\ndon't set your mind on them.\n\nyou went out\nlooking for something small,\n\nand someone\nhad been looking\nfor you."),
    (11, 2, "among the baggage", "1 Samuel 10:20–24", "“Behold, he has hidden himself among the baggage.”",
     "the lot fell on his tribe,\nthen his family,\nthen his name.\n\nand they couldn't find him.\n\nthe tallest man in Israel\nwas hiding\namong the bags.\n\nI understand him.\n\nit's one thing\nto be chosen.\n\nit's another\nto stand up\nin front of everyone\nand let it be true."),
    (12, 2, "seven days", "1 Samuel 13:8–14", "“I forced myself therefore, and offered the burnt offering.”",
     "he waited seven days.\n\nthe enemy gathered.\nthe people slipped away,\na few more every morning.\n\nand the prophet didn't come.\n\nso he did it himself.\njust this once.\nhe had good reasons.\n\nthe smoke was still rising\nwhen Samuel arrived.\n\nwaiting is hardest\nat the very end,\n\nright before\nthe one you're waiting for\ncomes over the hill."),
    (13, 2, "the bleating of the sheep", "1 Samuel 15:13–22", "“to obey is better than sacrifice, and to listen than the fat of rams.”",
     "I have done\nwhat the Lord commanded,\nSaul said.\n\nand the old man said,\nthen what is this bleating\nin my ears?\n\nyou can bring God\nthe best of the flock\n\nand still not bring him\nwhat he asked for.\n\nhe isn't counting sheep.\n\nhe's listening\nfor whether\nwe heard him."),
    (14, 2, "Samuel mourned", "1 Samuel 15:27–35", "“Samuel mourned for Saul”",
     "as Samuel turned to go,\nSaul caught the edge of his robe,\nand it tore.\n\nthe kingdom is torn from you\nlike this, Samuel said.\n\nthen he went home to Ramah\nand never went to see Saul again.\n\nbut he mourned for him.\n\nand the Lord\nwas grieved too.\n\na verdict\ncan be true\nand still be wept over.\n\nthis one was."),
    (15, 3, "the youngest", "1 Samuel 16:6–13", "“man looks at the outward appearance, but Yahweh looks at the heart.”",
     "seven sons walked past the prophet.\n\nthe tall one.\nthe strong one.\nthe one who looked like a king.\n\nnot this one.\nnot this one either.\n\nare these all?\n\nwell, there's the youngest.\nhe's out with the sheep.\n\nnobody had thought\nto call him in.\n\nso the whole feast stood waiting\nuntil a boy came in from the field,\n\nand God said,\nthis is he."),
    (16, 3, "the harp", "1 Samuel 16:14–23", "“David took the harp, and played with his hand; so Saul was refreshed”",
     "a king who couldn't rest.\na shepherd boy\nwith a harp.\n\nno sermon.\nno argument.\njust his hand on the strings,\n\nand the dark\nlifting\nfor a while.\n\ndon't underestimate\nwhat a song can do\nin a troubled room.\n\nsometimes the kindest thing\nyou can bring\nis music,\nand the patience\nto keep playing."),
    (17, 3, "untested", "1 Samuel 17:38–40", "“I can’t go with these; for I have not tested them.”",
     "the king dressed him\nin his own armor.\n\nbronze helmet.\ncoat of mail.\na sword at his side.\n\nhe tried to walk\nand stopped.\n\nI can't go in these.\n\nhe took them off\nand went down to the brook\nwith his staff in his hand.\n\nyou can't fight\nin someone else's faith.\n\nuse what God\nhas already taught\nyour hands."),
    (18, 3, "five smooth stones", "1 Samuel 17:40–50", "“chose for himself five smooth stones out of the brook”",
     "he bent down at the brook\nand chose five.\n\nsmooth ones.\nstones the water\nhad been shaping\nfor years,\n\nlike the boy\nchoosing them.\n\nacross the valley\nstood a man in bronze\nwith a spear like a weaver's beam.\n\nyou come to me with a sword, David said.\nI come to you\nin the name of the Lord.\n\nthe battle is his.\n\none stone\nwas enough."),
    (19, 3, "knit", "1 Samuel 18:1–4", "“the soul of Jonathan was knit with the soul of David”",
     "the king's son\ntook off his robe\nand put it on the shepherd.\n\nthen his sword.\nhis bow.\nhis sash.\n\neverything that said\nthis will be mine someday,\ngiven away.\n\nJonathan could have seen\na rival.\n\nhe saw a friend,\nand loved him\nas his own soul.\n\nthere are people like this.\n\nif you have one,\nyou are rich."),
    (20, 3, "the arrow", "1 Samuel 20:35–42", "“Isn’t the arrow beyond you?”",
     "they had agreed on a sign.\nif the arrow falls short, come home.\nif it flies past, go.\n\nthe arrow flew past.\n\na boy gathered it up\nand knew nothing.\n\nbut out in the field\ntwo friends held each other\nand wept,\nDavid the most.\n\ngo in peace, Jonathan said.\nthe Lord is between you and me\nforever.\n\nsome goodbyes\nare not an ending.\n\nthey are a promise\nwith a long road in it."),
    (21, 3, "the edge of his robe", "1 Samuel 24:1–12", "“I will not stretch out my hand against my lord; for he is Yahweh’s anointed.”",
     "the man hunting him\nwalked into the cave\nwhere he was hiding.\n\nthis is your day,\nhis men whispered.\n\nhe crept close\nand cut a corner\nfrom the king's robe.\n\nthat was all.\neven that troubled his heart.\n\noutside, he held up the scrap:\nsee? I could have.\nI didn't.\n\nmercy isn't weakness.\n\nit's strength\nthat has decided\nto keep its hands open."),
    (22, 3, "bread on the road", "1 Samuel 25:14–33", "“Blessed is your discretion, and blessed are you, who have kept me today from blood guiltiness”",
     "her husband had insulted David's men,\nand four hundred of them\nwere coming with swords.\n\nshe didn't argue.\nshe didn't wait.\n\nshe loaded the donkeys\nwith bread and raisins\nand cakes of figs\nand rode out to meet them.\n\non me be the blame, she said,\nand talked an angry man\nback from the edge.\n\nsome peacemakers\ncome with speeches.\n\nsome come with bread,\nat the right hour,\non the right road."),
    (23, 3, "strength in God", "1 Samuel 30:1–8", "“David strengthened himself in Yahweh his God.”",
     "they came home\nto smoke.\n\nthe town burned.\nwives and children taken.\nthey wept\nuntil they had no strength to weep.\n\nthen his own men\ntalked of stoning him.\n\nno one was left\nto comfort David,\nso he went\nto the one who was.\n\nhe didn't feel strong first.\nhe went to God\nand found strength there.\n\nthen he asked, shall I go?\nand went,\nand brought them all back."),
    (24, 3, "under the tamarisk", "1 Samuel 31:1–13", "“They took their bones and buried them under the tamarisk tree in Jabesh, and fasted seven days.”",
     "Saul fell on Mount Gilboa,\nand his sons with him.\n\nlong before,\nwhen Jabesh was surrounded\nand helpless,\nSaul had come for them.\n\nthey remembered.\n\nall night\nthe brave men of Jabesh walked,\nand carried their king away,\nand buried him under a tamarisk,\nand fasted seven days.\n\nwhatever else\nwas true of Saul,\n\nsomeone remembered\nthe day he came."),
    (25, 4, "how the mighty have fallen", "2 Samuel 1:11–27", "“I am distressed for you, my brother Jonathan.”",
     "the man who brought the news\nthought it would please him.\n\nit didn't.\n\nDavid tore his clothes\nand fasted until evening,\nfor Saul,\nwho had hunted him,\nand for Jonathan,\nwho had loved him.\n\nthen he made a song:\nhow the mighty have fallen.\n\nand in the middle of it,\none line\nthat wasn't about kings at all:\n\nmy brother Jonathan.\nyou were very pleasant to me."),
    (26, 4, "bone and flesh", "2 Samuel 5:1–3", "“You will be shepherd of my people Israel”",
     "all the tribes came to Hebron\nand said,\nwe are your bone and your flesh.\n\nyears of running\nended at a gate.\n\nthey didn't ask him\nto be a warrior.\nhe was already that.\n\nthey reminded him\nwhat God had said:\nyou will shepherd my people.\n\nthe crown\nwas a bigger field.\n\nthe work\nwas the same."),
    (27, 4, "the sound in the treetops", "2 Samuel 5:22–25", "“When you hear the sound of marching in the tops of the mulberry trees, then stir yourself up”",
     "the same enemy.\nthe same valley.\n\nlast time God said,\ngo up.\n\nthis time he said,\ncircle around.\nwait by the trees.\nwhen you hear marching\nin the tops of the leaves,\nmove.\n\nDavid asked again.\nhe didn't assume.\n\nyesterday's answer\nisn't always\ntoday's.\n\nso he listened\nfor the wind."),
    (28, 4, "with all his might", "2 Samuel 6:12–22", "“David danced before Yahweh with all his might”",
     "the ark came up the road,\nand the king\ncouldn't keep still.\n\na linen ephod,\nnothing grand,\nleaping and dancing\nin front of everyone.\n\nfrom her window\nMichal looked down\nand despised him.\n\nit was before the Lord, he said.\nI'll be humbler still.\n\nthen he gave bread\nand dates and raisins\nto every person there.\n\njoy that is real\nspills over\ninto everyone's hands."),
    (29, 4, "who am I", "2 Samuel 7:1–18", "“Who am I, Lord Yahweh, and what is my house, that you have brought me this far?”",
     "I live in cedar, the king said,\nand God lives in a tent.\nlet me build him a house.\n\nthat night the answer came:\nI never asked for one.\n\nI took you\nfrom following the sheep.\nI have been with you\nwherever you went.\n\nyou won't build me a house.\nI will build you one.\n\nand David went in\nand sat before the Lord\nand could only say,\n\nwho am I,\nthat you have brought me\nthis far?"),
    (30, 4, "at the king's table", "2 Samuel 9:1–13", "“You will eat bread at my table continually.”",
     "is there anyone left\nof Saul's house,\nthat I may show him kindness\nfor Jonathan's sake?\n\nthere was.\na son,\nlame in both feet,\nliving far away in Lo Debar.\n\nhe bowed to the ground\nand called himself a dead dog.\n\nDavid called him by name.\ndon't be afraid.\nyou will eat at my table.\n\na place set every day\nfor a promise\nmade to a friend\n\nlong after\nthe friend was gone."),
    (31, 4, "until your beards have grown", "2 Samuel 10:1–5", "“Wait at Jericho until your beards have grown, and then return.”",
     "he sent them\nto comfort a grieving king.\n\nthey came back shamed,\nhalf their beards shaved away,\ntheir robes cut short.\n\nDavid didn't make them\nwalk through Jerusalem\nlike that.\n\nstay at Jericho, he said.\ncome home\nwhen your beards have grown.\n\nthere is a kind of mercy\nthat asks no questions,\n\njust gives you time,\nand a place to wait,\nuntil you feel\nlike yourself again."),
    (32, 5, "when kings go out", "2 Samuel 11:1–17", "“But David stayed at Jerusalem.”",
     "it was the season\nwhen kings went out to war.\n\nDavid stayed home.\n\none evening, restless,\nhe walked on the roof,\nand saw,\nand asked,\nand sent.\n\nnot one great fall,\nbut small steps,\neach one easier\nthan it should have been,\n\nuntil a faithful soldier\ncarried a letter\nto his own death.\n\nthe worst thing David ever did\nbegan on a quiet evening\nwith nothing to do."),
    (33, 5, "you are the man", "2 Samuel 12:1–13", "“You are the man.”",
     "Nathan told a story.\n\na poor man.\none little ewe lamb.\nit ate his food\nand drank from his cup\nand slept in his arms\nlike a daughter.\n\nand a rich man\nwith flocks and herds\nwho took it anyway.\n\nthat man deserves to die! the king said.\n\nand the prophet said,\nyou are the man.\n\nno more hiding then.\nI have sinned against the Lord.\n\nand the answer came just as quickly:\nthe Lord has put away your sin."),
    (34, 5, "I will go to him", "2 Samuel 12:15–23", "“I will go to him, but he will not return to me.”",
     "seven days on the ground, fasting.\n\nthen whispering in the hall,\nand he knew.\n\nhe got up.\nhe washed.\nhe changed his clothes,\nwent to worship,\nand ate.\n\nwhile he was alive, I hoped, he said.\nnow,\ncan I bring him back?\n\nI will go to him.\nhe will not come to me.\n\nthe grief didn't end there.\n\nbut now\nit had somewhere\nto go."),
    (35, 5, "here I am", "2 Samuel 15:23–30", "“behold, here I am. Let him do to me as seems good to him.”",
     "his own son\nhad stolen the hearts of Israel.\n\nthe priests came out\ncarrying the ark,\nand David sent it back.\n\nif God is pleased with me,\nhe'll bring me home to see it.\nif not,\nhere I am.\n\nthen he climbed the Mount of Olives\nbarefoot,\nweeping as he went.\n\nhe didn't carry God along\nlike a charm.\n\nhe put himself\nin God's hands\nand walked."),
    (36, 5, "deal gently", "2 Samuel 18:1–5", "“Deal gently for my sake with the young man, even with Absalom.”",
     "the son had come against the father\nwith an army.\n\nand the father\nstood by the gate\nas his men marched out\nand said to every captain,\nwhere all could hear:\n\ndeal gently\nwith the young man.\nfor my sake.\n\nnot the rebel.\nnot the enemy.\nthe young man.\n\nhe was fighting\nfor his life,\n\nand still trying to save\nthe one\nwho had come to take it."),
    (37, 5, "my son, my son", "2 Samuel 18:24–33", "“My son, my son Absalom!”",
     "two runners came.\n\nthe king asked each one\nthe same question:\nis it well with the young man?\n\nand when he understood,\nhe climbed to the room over the gate\nand wept.\n\nmy son, my son.\nI wish I had died\ninstead of you.\n\nthe battle was won.\nit didn't reach that room.\n\nno one grieves like that\nfor an enemy.\n\nonly for a child\nthey never stopped\nwaiting for."),
    (38, 5, "my lamp", "2 Samuel 22:1–29", "“For you are my lamp, Yahweh. Yahweh will light up my darkness.”",
     "long ago in Shiloh\na boy named Samuel\nslept near a lamp\nthat hadn't gone out yet.\n\nnow David,\nlooking back\nover caves and wars\nand his own worst days,\n\nsings:\n\nyou are my lamp, Lord.\nyou light up my darkness.\n\nnot, you took the darkness away.\n\nyou lit it.\n\nand that was enough\nto walk by."),
    (39, 5, "water from Bethlehem", "2 Samuel 23:13–17", "“he would not drink of it, but poured it out to Yahweh.”",
     "hiding in a cave,\nhe said it almost to himself:\nif only someone would bring me water\nfrom the well by the gate\nin Bethlehem.\n\nthree of his men heard.\nthey broke through the enemy camp\nand brought it back.\n\nand he couldn't drink it.\n\nhe poured it out\non the ground\nbefore the Lord.\n\nthese men risked their lives.\nit isn't mine to drink.\n\nsome gifts are too holy to keep.\n\nyou give them\nback to God."),
    (40, 5, "nothing", "2 Samuel 24:18–25", "“I will not offer burnt offerings to Yahweh my God which cost me nothing.”",
     "the plague stopped\nat a farmer's threshing floor.\n\ntake it, the farmer said.\nthe oxen too.\nthe yokes for wood.\nall of it, free.\n\nno, said the king.\nI'll pay.\n\nI will not give the Lord\nwhat cost me nothing.\n\nhe counted out the silver\nand built his altar there,\non the hill\nwhere one day\nhis son would build\na house for God.\n\nand the plague was lifted\nfrom the land.")
]


KINGS_PARTS = [
    {
        "part": 1,
        "title": "A House for His Name",
        "epigraph": "I will dwell among the children of Israel, and will not forsake my people Israel.",
        "epigraphRef": "1 Kings 6:13",
        "lightName": "Light of the Cedar Sanctuary",
        "lightHint": "Where the luminous cloud of glory fills the quiet gold-and-cedar house"
    },
    {
        "part": 2,
        "title": "A Lamp in Jerusalem",
        "epigraph": "That David my servant may have a lamp always before me in Jerusalem.",
        "epigraphRef": "1 Kings 11:36",
        "lightName": "Light of the Unextinguished Lamp",
        "lightHint": "Beside the torn cloak where one tribe is kept for David’s sake"
    },
    {
        "part": 3,
        "title": "The God Who Answers",
        "epigraph": "The God who answers by fire, let him be God.",
        "epigraphRef": "1 Kings 18:24",
        "lightName": "Light of Mount Horeb’s Cave",
        "lightHint": "At the mouth of the mountain cave where the still small voice speaks after the fire"
    },
    {
        "part": 4,
        "title": "Open His Eyes",
        "epigraph": "Yahweh, please open his eyes, that he may see.",
        "epigraphRef": "2 Kings 6:17",
        "lightName": "Light of the Hills of Dothan",
        "lightHint": "Along the ridge blazing with unseen horses and chariots of fire"
    },
    {
        "part": 5,
        "title": "I Have Seen Your Tears",
        "epigraph": "I have heard your prayer. I have seen your tears.",
        "epigraphRef": "2 Kings 20:5",
        "lightName": "Light of the Exiled Table",
        "lightHint": "Near the dial steps and the final table of daily bread before the Finale Plaza"
    }
]

KINGS_SCENES = {
    6: "temple_cloud",
    18: "carmel_fire",
    21: "still_small_voice",
    32: "chariots_of_fire"
}

KINGS_POEMS = [
    (1, 1, "the way of all the earth", "1 Kings 2:1–3", "“I am going the way of all the earth. You be strong therefore, and show yourself a man”",
     "an old king,\ngoing the way of all the earth,\ndoesn't talk about swords\nor borders.\n\nhe talks about walking.\n\nkeep his ways.\nkeep his word.\nwalk before him\nwith all your heart.\n\nthat's the strength\nhe means.\n\nnot the grip\nof a hand on a throne,\nbut the steadiness\nof feet on a path."),
    (2, 1, "an understanding heart", "1 Kings 3:5–10", "“Give your servant therefore an understanding heart”",
     "ask, God said,\nand the whole night waited.\n\na young king\nwith everything to want\nsaid,\nI am just a little child.\nI don't know how\nto go out or come in.\n\nthen he asked,\nnot for long life,\nnot for riches,\nbut for a heart\nthat could hear.\n\nand God was pleased.\n\nsometimes the wisest thing\nyou can say\nis how little you know,\nand then ask\nto be taught."),
    (3, 1, "the living child", "1 Kings 3:16–28", "“Give her the living child, and definitely do not kill him. She is his mother.”",
     "two women,\none baby,\nno witnesses.\n\nthe king didn't search\nfor evidence.\nhe searched\nfor love.\n\nand he found it\nin the one\nwho would rather lose her son\nthan see him hurt.\n\ngive her the child,\nshe said.\nonly let him live.\n\nthat was how he knew.\n\nlove will let go\nbefore it lets\nharm come."),
    (4, 1, "cedar and hyssop", "1 Kings 4:29–34", "“He spoke of trees, from the cedar that is in Lebanon even to the hyssop that grows out of the wall”",
     "the tall cedar of Lebanon\nand the little hyssop\nin a crack of the wall.\n\nhe had words for both.\n\nwisdom notices\nthe small things too."),
    (5, 1, "no hammer heard", "1 Kings 6:7", "“The house, when it was under construction, was built of stone prepared at the quarry”",
     "the stones were cut\nsomewhere else,\nfar off, at the quarry,\nwhere the noise was.\n\nby the time they reached the hill\nthey only had to be\nset in place.\n\na house for God\nrising\nin silence.\n\nmaybe that's how he builds\nin us too:\nthe hard shaping done\nin places we'd rather forget,\nso that when we arrive,\nwe fit."),
    (6, 1, "the cloud", "1 Kings 8:6–11", "“the cloud filled Yahweh’s house, so that the priests could not stand to minister by reason of the cloud”",
     "the priests set the ark\nin its place\nand stepped out,\n\nand a cloud came in\nbehind them\nand filled the house,\n\nso thick with glory\nthat no one\ncould stand to work.\n\nall that cedar,\nall that gold,\nall that careful building,\n\nand the best moment\nwas the one\nwhen nobody could do\nanything at all."),
    (7, 1, "how much less this house", "1 Kings 8:22–30", "“heaven and the heaven of heavens can’t contain you; how much less this house that I have built!”",
     "he built the finest house\nthe land had ever seen,\nthen stood in front of it\nwith open hands\nand said,\nit can't hold you.\n\nheaven can't hold you.\n\nbut hear us\nwhen we pray toward this place.\nand when you hear,\nforgive.\n\nnot a house to keep God in.\na place to turn toward\nwhen we need\nto be found."),
    (8, 1, "not even half", "1 Kings 10:1–9", "“Behold, not even half was told me!”",
     "she came a long way\nwith camels and spices and gold\nand all her hardest questions.\n\nshe'd heard the stories.\nshe didn't believe them.\n\nthen she saw\nthe table,\nthe house,\nthe way up to the house of God,\nand she had nothing left\nto say.\n\nnot even half, she said at last.\nnot even half was told me.\n\nsome things you only know\nby going to see."),
    (9, 2, "a little at a time", "1 Kings 11:1–8", "“his heart was not perfect with Yahweh his God, as the heart of David his father was.”",
     "it didn't happen in a day.\n\nthe man who asked for wisdom,\nwho prayed at the altar\nwith open hands,\n\ngrew old,\nand his heart turned\na little,\nand then a little more,\n\nuntil there were altars\non the hill across the valley\nto gods with other names.\n\nnobody wakes up\nfar from God.\n\nyou drift\none small turn\nat a time."),
    (10, 2, "twelve pieces", "1 Kings 11:29–36", "“Ahijah took the new garment that was on him, and tore it in twelve pieces.”",
     "a prophet in a field\ntook off his new cloak\nand tore it\ninto twelve pieces.\n\ntake ten, he told Jeroboam.\nthe kingdom would break.\n\nbut not all of it.\none tribe kept,\nfor David's sake,\nfor Jerusalem's sake,\n\nso there would always be\na lamp.\n\neven when God\nlets things tear,\nhe leaves a light\nburning."),
    (11, 2, "good words", "1 Kings 12:1–16", "“If you will be a servant to this people today, and will serve them, and answer them with good words, then they will be your servants forever.”",
     "the old men said,\nbe their servant today\nand they'll serve you forever.\n\nthe young men said,\nmake the yoke heavier.\n\nhe listened\nto the young men.\n\nand a kingdom\nthat had held together\nthrough three kings\ncame apart\nover one answer.\n\nthe gentle word\nwould have cost him\nnothing."),
    (12, 2, "too far to go", "1 Kings 12:26–30", "“It is too much for you to go up to Jerusalem.”",
     "it's too far, the king said.\ntoo much for you.\nstay here.\nhere is a god you can reach.\n\ntwo gold calves,\none at each end of the land,\nso no one would have\nto make the climb.\n\nit sounded like kindness.\n\nbut the easy road\nled the people\naway from the house\nwhere God had put his name.\n\nnot every shortcut\nis a mercy."),
    (13, 2, "the hand restored", "1 Kings 13:1–6", "“pray for me, that my hand may be restored me again.”",
     "the king stretched out his hand\nto seize the man of God,\nand it dried\nand would not come back.\n\nthen the king said,\npray for me.\n\nand the man he had just tried\nto arrest\nprayed,\nand the hand came back\nas it was before.\n\nof all the signs that day,\nmaybe this was the clearest:\na prayer\nfor the one who was against him."),
    (14, 3, "ravens", "1 Kings 17:1–6", "“The ravens brought him bread and meat in the morning, and bread and meat in the evening; and he drank from the brook.”",
     "hide by the brook, God said.\nthe ravens will feed you.\n\nof all the messengers,\nbirds that take,\nnot birds that give.\n\nand yet:\nbread in the morning,\nbread in the evening,\nand water running over stones.\n\nhe didn't get a storehouse.\nhe got a morning,\nand then an evening,\nand then another morning.\n\nenough,\ntwice a day,\non black wings."),
    (15, 3, "a handful of flour", "1 Kings 17:8–16", "“The jar of meal didn’t run out, and the jar of oil didn’t fail”",
     "a widow gathering two sticks\nat the city gate\nfor one last meal.\n\na handful of flour,\na little oil.\nthat was everything.\n\na stranger asked her\nto make his bread first,\nand she did.\n\nand the next morning\nthere was flour in the jar,\nand the next.\n\nnever full.\nnever empty.\njust enough,\nevery time she reached in."),
    (16, 3, "your son lives", "1 Kings 17:17–24", "“Behold, your son lives.”",
     "the boy stopped breathing,\nand his mother\nhad only questions.\n\nElijah didn't argue.\nhe said, give me your son,\nand carried him upstairs\nand cried out to God.\n\nthree times he stretched out\nover the child.\n\nand God listened.\n\nthen down the stairs\nwith the boy in his arms:\nsee, your son lives.\n\nsome prayers\nare carried up the stairs\nin grief\nand come back down\nbreathing."),
    (17, 3, "how long", "1 Kings 18:20–21", "“How long will you waver between the two sides?”",
     "how long, he asked them,\nwill you stand there\nbetween two roads?\n\nand the people\ndidn't say a word.\n\nsilence\nis an answer too."),
    (18, 3, "fire on Carmel", "1 Kings 18:30–39", "“Yahweh, he is God! Yahweh, he is God!”",
     "all day they shouted,\nand no one answered.\n\nthen Elijah rebuilt\nthe broken altar,\ntwelve stones,\none for each tribe,\n\nand poured water on it\nthree times,\ntill the trench was full.\n\none short prayer\nat the evening offering:\nlet them know\nyou have turned their hearts back.\n\nand the fire fell\nand licked up\neven the water."),
    (19, 3, "a cloud like a hand", "1 Kings 18:41–45", "“Behold, a small cloud, like a man’s hand, is rising out of the sea.”",
     "years without rain.\n\nhe bent down to the ground,\nhis face between his knees,\nand sent his servant\nto look at the sea.\n\nnothing.\ngo again.\nnothing.\ngo again.\n\nseven times.\n\nand then\na cloud no bigger\nthan a hand.\n\nthat was all he needed\nto send word to the king:\nhurry home,\nbefore the rain."),
    (20, 3, "under the broom tree", "1 Kings 19:3–8", "“Arise and eat, because the journey is too great for you.”",
     "after the fire,\nhe ran,\na day into the desert,\nand lay down under a bush.\nit is enough, he said.\ntake my life.\n\nheaven didn't lecture him.\nan angel touched him,\nand there was bread\nbaking on the coals\nand a jar of water.\n\neat, and sleep.\nthen eat again.\nthe journey is too much for you.\n\nsometimes the holiest thing\nis a warm loaf\nand a little more sleep."),
    (21, 3, "a still small voice", "1 Kings 19:9–13", "“After the fire, there was a still small voice.”",
     "a wind that broke the rocks.\nnot there.\n\nan earthquake.\nnot there.\n\na fire.\nnot there either.\n\nthen something\nso quiet\nhe had to cover his face\nand step outside\nto hear it.\n\nwhat are you doing here, Elijah?\n\nGod doesn't always shout.\nsometimes he asks\na gentle question,\nand waits."),
    (22, 3, "the mantle", "1 Kings 19:19–21", "“Elijah went over to him, and put his mantle on him.”",
     "a young man plowing\nbehind twelve yoke of oxen,\nthe last in the line.\n\na prophet crossed the field\nand threw his cloak\nacross his shoulders.\n\nthat was the whole invitation.\n\nand Elisha\nboiled the oxen\nover the wood of his own yoke,\nfed the people,\nand followed.\n\nno plow left\nto go back to."),
    (23, 3, "I will not leave you", "2 Kings 2:1–11", "“Elijah went up by a whirlwind into heaven.”",
     "wait here, Elijah said.\nat Gilgal. at Bethel. at Jericho.\n\nI will not leave you,\nElisha said,\nevery time.\n\nso they walked\nand talked\nall the way to the river,\nand across it,\n\nuntil fire came between them\nand the old prophet\nwent up\nin a whirlwind.\n\nthe last thing\nthey did together\nwas walk."),
    (24, 4, "a double portion", "2 Kings 2:9–12", "“Please let a double portion of your spirit be on me.”",
     "ask, Elijah said,\nbefore I am taken.\n\nand Elisha\ndidn't ask for land,\nor safety,\nor a name.\n\nhe asked for more\nof what he'd seen\nin the man he'd followed.\n\nthat's a hard thing,\nElijah said.\nif you see me go,\nit will be yours.\n\nso he kept his eyes on him\nto the very end."),
    (25, 4, "where is the God of Elijah", "2 Kings 2:13–15", "“Where is Yahweh, the God of Elijah?”",
     "he picked up the cloak\nthat had fallen\nand walked back to the river\nalone.\n\nthe same water.\nthe same cloak.\nno Elijah.\n\nwhere is the God of Elijah?\nhe asked,\nand struck the water.\n\nand the river opened.\n\nthe prophet was gone.\nGod was not."),
    (26, 4, "another jar", "2 Kings 4:1–7", "“Bring me another container.”",
     "a widow with debts,\ntwo sons,\nand one small pot of oil.\n\ngo borrow jars, Elisha said.\nnot just a few.\n\nshe shut the door\nand poured,\nand poured,\nuntil her son said,\nthere isn't another one.\n\nthen it stopped.\n\nthe oil didn't run out.\nthe jars did.\n\nbring more\nthan you think."),
    (27, 4, "a little room on the roof", "2 Kings 4:8–13", "“Please let’s make a little room on the roof.”",
     "a bed.\na table.\na chair.\na lamp.\n\nthat's all she gave him:\na small room on the roof\nfor a man who kept\npassing by.\n\nand when he asked\nwhat he could do for her,\nshe said,\nI live among my own people.\n\nshe wasn't trading.\nshe was only\nmaking room."),
    (28, 4, "it is well", "2 Kings 4:18–37", "“It is well.”",
     "the promised son,\ngrown into a boy,\ndied on her knees at noon.\n\nshe laid him on the prophet's bed,\nshut the door,\nand rode.\n\nis it well? they asked.\nit is well, she said,\nand kept riding.\n\nshe caught hold of his feet.\nI will not leave you, she said,\nthe words he once said\nto his own master.\n\nand in the little room on the roof\nthe child grew warm,\nsneezed seven times,\nand opened his eyes."),
    (29, 4, "the girl from Israel", "2 Kings 5:1–4", "“I wish that my lord were with the prophet who is in Samaria!”",
     "she was taken\nfrom her home,\na little girl\nserving in a foreign house.\n\nshe had every reason\nto stay quiet.\n\nbut when she saw\nthe great captain's sickness,\nshe said,\nI wish he could see the prophet.\nhe would heal him.\n\nthe whole story turns\non one small voice\nthat could have said nothing,\nand didn't."),
    (30, 4, "wash, and be clean", "2 Kings 5:9–15", "“his flesh was restored like the flesh of a little child, and he was clean.”",
     "he came with horses and chariots,\nsilver and gold,\nand the prophet\ndidn't even come to the door.\n\ngo wash in the Jordan.\nseven times.\n\nhe was furious.\nhe had pictured something grand.\n\nbut his servants said,\nif he'd asked some great thing,\nwouldn't you have done it?\n\nso he went down\ninto the plain little river.\nonce. twice.\nseven times.\n\nand came up\nwith the skin of a child."),
    (31, 4, "it was borrowed", "2 Kings 6:1–7", "“He cut down a stick, threw it in there, and made the iron float.”",
     "it was borrowed,\nhe cried,\nas the iron sank.\n\nand God\nlifted it from the river\nfor a man worried\nabout what he owed.\n\nno loss\nis too small\nto bring him."),
    (32, 4, "more with us", "2 Kings 6:15–17", "“Don’t be afraid; for those who are with us are more than those who are with them.”",
     "the servant got up early\nand saw the army\nall around the city.\n\nwhat shall we do?\n\nand Elisha didn't say\nrun,\nor hide,\nor it isn't as bad as it looks.\n\nhe prayed,\nopen his eyes.\n\nand the hills\nwere full of horses\nand chariots of fire.\n\nthe danger was real.\nso was everything\nhe couldn't see."),
    (33, 4, "a day of good news", "2 Kings 7:3–9", "“Today is a day of good news, and we keep silent.”",
     "four lepers at the gate\nof a starving city,\nnothing left to lose,\n\nwalked into the enemy camp\nat twilight\nand found it empty.\n\ntents. bread. silver.\nthey ate and drank.\nthey hid what they could.\n\nthen one of them said,\nthis isn't right.\ntoday is a day of good news,\nand we keep silent.\n\nso the outsiders\nwent back to the city\nthat had shut them out\nto tell it\nthere was bread."),
    (34, 5, "by every prophet", "2 Kings 17:6–18", "“Yet Yahweh testified to Israel, and to Judah, by every prophet, and every seer”",
     "turn back, he said,\nby every prophet,\nby every seer,\nyear after year.\n\nElijah on the mountain.\nElisha by the river.\nvoice after voice.\n\nthey would not listen.\n\nand one day\nthe towers of Samaria\nstood empty,\nand the road east\nwas full of the people\nwho had lived there.\n\nit wasn't that God\nstopped speaking.\n\nit was that no one\nturned around."),
    (35, 5, "spread before the Lord", "2 Kings 19:14–19", "“Then Hezekiah went up to Yahweh’s house, and spread it before Yahweh.”",
     "the letter was full of threats.\nthe empire at the door\nhad swallowed\nnation after nation.\n\nHezekiah read it,\nthen carried it up\nto the house of God\nand spread it open.\n\nhere, Lord.\nread this.\nopen your eyes and see.\n\nyou don't have to know\nwhat to do\nwith the letter\nin your hands.\n\nyou can lay it open\nbefore him."),
    (36, 5, "the shadow on the steps", "2 Kings 20:1–11", "“Then he turned his face to the wall, and prayed to Yahweh”",
     "set your house in order,\nthe prophet said.\nyou will die.\n\nand the king\nturned his face to the wall\nand wept.\n\nthe prophet was not yet\nout of the middle of the city\nwhen God sent him back:\n\nI have heard your prayer.\nI have seen your tears.\n\nand for a sign,\nthe shadow on the steps\nwent back ten steps.\n\nno tear falls\nanywhere\nhe isn't looking."),
    (37, 5, "found in the house", "2 Kings 22:3–11", "“I have found the book of the law in Yahweh’s house.”",
     "they were only\nfixing the building.\n\ncounting the money,\npaying the masons,\nbuying timber and stone.\n\nand somewhere in the dust\nof God's own house\nlay God's own word,\nforgotten.\n\nwhen they read it to the king\nhe tore his clothes.\n\nnot because the book was new.\nbecause it was old,\nand no one\nhad listened."),
    (38, 5, "a tender heart", "2 Kings 22:14–20", "“because your heart was tender, and you humbled yourself before Yahweh”",
     "the word was hard.\nthe city would fall.\nwhat was written\nwould come true.\n\nbut to the king,\nthis:\n\nbecause your heart was tender,\nbecause you wept,\nI have heard you.\n\nhe couldn't change\nwhat was coming.\nhe could still\nbe soft before God.\n\nso he called everyone,\nsmall and great,\nup to the house of God\nand read them every word."),
    (39, 5, "bronze pomegranates", "2 Kings 25:8–17", "“He burned Yahweh’s house, the king’s house, and all the houses of Jerusalem”",
     "the house that was too small\nto hold God\nburned.\n\nthe cedar Solomon cut,\nthe stones shaped in silence,\nthe bronze pomegranates,\nbroken up and carried off.\n\nthe walls came down.\nthe people were led away.\n\nand the heaviest thing\nin the story\nis not the fire.\n\nit's how long\nGod kept calling\nbefore it came."),
    (40, 5, "bread all his days", "2 Kings 25:27–30", "“Jehoiachin ate bread before him continually all the days of his life”",
     "thirty-seven years\na captive in Babylon.\n\nthen a new king\nlifted his head,\nspoke kindly to him,\nchanged his prison clothes,\n\nand set bread before him\nevery day\nfor the rest of his life.\n\nthat's where the story ends.\nnot with the fire,\nbut with a son of David\nat a table,\neating.\n\na lamp,\nstill burning\nin a far country.")
]


def build_book(slug, prefix, book_num, title, subtitle, before_you_begin, pdf_name, parts_list, poems_list, scenes_map):
    pdf_path = INTERIORS_DIR / pdf_name
    streams = extract_jpegs_from_pdf(pdf_path)
    expected = len(poems_list) + 1
    print(f"Extracted {len(streams)} JPEG streams from {pdf_name} (expected {expected})")

    web_dir = ASSETS_DIR / slug / "web"
    hero_dir = ASSETS_DIR / slug / "hero"
    web_dir.mkdir(parents=True, exist_ok=True)
    hero_dir.mkdir(parents=True, exist_ok=True)

    cover_rel = f"assets/{slug}/web/{prefix}-{book_num:03d}-000.jpg"
    (ROOT / cover_rel).write_bytes(streams[0])

    paintings = []
    for n, part_idx, p_title, ref, epigraph, poem_text in poems_list:
        jpg_bytes = streams[n]
        web_rel = f"assets/{slug}/web/{prefix}-{book_num:03d}-{n:03d}.jpg"
        web_path = ROOT / web_rel
        web_path.write_bytes(jpg_bytes)

        is_scene = n in scenes_map
        hero_rel = None
        if is_scene:
            hero_rel = f"assets/{slug}/hero/{prefix}-{book_num:03d}-{n:03d}-hero.jpg"
            (ROOT / hero_rel).write_bytes(jpg_bytes)

        palette = sample_palette_via_bmp(web_path)
        paintings.append({
            "n": n,
            "part": part_idx,
            "title": p_title,
            "ref": ref,
            "epigraph": epigraph,
            "poem": poem_text,
            "webSrc": web_rel,
            "heroSrc": hero_rel,
            "isScene": is_scene,
            "sceneType": scenes_map.get(n),
            "palette": palette
        })

    manifest = {
        "district": book_num,
        "slug": slug,
        "title": title,
        "subtitle": subtitle,
        "author": "Timothy Holt",
        "publisher": "Inspiring Your Faith · inspiringyourfaith.org",
        "cover": cover_rel,
        "beforeYouBegin": before_you_begin,
        "parts": parts_list,
        "paintings": paintings
    }

    out_json = ASSETS_DIR / "data" / f"{slug}-manifest.json"
    out_json.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"Wrote {out_json} with {len(paintings)} paintings.")


if __name__ == "__main__":
    build_book(
        slug="samuel",
        prefix="s",
        book_num=7,
        title="The Lamp Had Not Gone Out",
        subtitle="1–2 Samuel in Poems & Pictures",
        before_you_begin=(
            "The books of Samuel begin with a woman weeping at a festival table and a boy lying down "
            "near a lamp that had not yet gone out. Then come a king hiding among the baggage, a "
            "shepherd called in from the field, five smooth stones from a brook, two friends and an "
            "arrow shot past the mark, a lame man given a place at the king's table, a prophet's story "
            "about one little ewe lamb, and a father weeping in the room over a gate. "
            "This book walks through it in forty short poems, in five parts: twenty-four from 1 Samuel "
            "and sixteen from 2 Samuel. Each poem sits beside a picture and under a single line of Scripture."
        ),
        pdf_name="the-lamp-had-not-gone-out-interior-print.pdf",
        parts_list=SAMUEL_PARTS,
        poems_list=SAMUEL_POEMS,
        scenes_map=SAMUEL_SCENES
    )

    build_book(
        slug="kings",
        prefix="k",
        book_num=8,
        title="A Still Small Voice",
        subtitle="1 & 2 Kings in Poems & Pictures",
        before_you_begin=(
            "The books of Kings begin with a young king asking for an understanding heart and end "
            "with an exiled king eating bread at a foreign table. In between: stones cut in silence at the "
            "quarry, a cloud of glory filling the temple, a cloak torn in twelve pieces, ravens at a brook, "
            "a widow's last handful of flour, fire on Carmel, a voice so quiet a prophet covered his face "
            "to hear it, a mantle dropped across a plowman's shoulders, a pot of oil that outlasted the "
            "jars, a river that made a proud captain clean, hills full of horses of fire, and a forgotten "
            "book found in the dust of the temple. "
            "This book walks through it in forty short poems, in five parts: Solomon and the temple, "
            "the kingdom torn in two, Elijah, Elisha, and the last kings to the fall of Jerusalem."
        ),
        pdf_name="a-still-small-voice-interior-print.pdf",
        parts_list=KINGS_PARTS,
        poems_list=KINGS_POEMS,
        scenes_map=KINGS_SCENES
    )
