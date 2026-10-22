#!/usr/bin/env python3
"""
Builds District V (Be Strong and Courageous: Joshua & Judges) and District VI (Where You Go: Ruth)
from Timothy Holt's interior print PDFs:
  - Extracts all 41 embedded JPEGs from be-strong-and-courageous-interior-print.pdf
  - Extracts all 25 embedded JPEGs from where-you-go-interior-print.pdf
  - Samples 4-band palettes (top, horizon, ground, accent)
  - Writes assets/data/joshua-judges-manifest.json and assets/data/ruth-manifest.json
"""

import json
import os
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


JOSHUA_JUDGES_PARTS = [
    {
        "part": 1,
        "title": "Be Strong and Courageous",
        "epigraph": "Be strong and courageous. Don’t be afraid.",
        "epigraphRef": "Joshua 1:9",
        "lightName": "Light of the Jordan Crossing",
        "lightHint": "Beside the twelve wet river stones stacked near the reeds of the bank"
    },
    {
        "part": 2,
        "title": "Not One Thing Has Failed",
        "epigraph": "Not one thing has failed of all the good things which Yahweh your God spoke concerning you.",
        "epigraphRef": "Joshua 23:14",
        "lightName": "Light of the Covenant Oak",
        "lightHint": "Under the ancient oak of Shechem beside the great witness stone"
    },
    {
        "part": 3,
        "title": "Another Generation",
        "epigraph": "Another generation arose after them who didn’t know Yahweh.",
        "epigraphRef": "Judges 2:10",
        "lightName": "Light of Deborah’s Palm",
        "lightHint": "In the shade of the hill-country palm tree between Ramah and Bethel"
    },
    {
        "part": 4,
        "title": "Mighty Man of Valor",
        "epigraph": "Yahweh is with you, you mighty man of valor!",
        "epigraphRef": "Judges 6:12",
        "lightName": "Light of the Broken Pitcher",
        "lightHint": "Where the clay pitcher shatters to let the hidden torchlight blaze"
    },
    {
        "part": 5,
        "title": "Remember Me",
        "epigraph": "Remember me, please, and strengthen me, please, only this once.",
        "epigraphRef": "Judges 16:28",
        "lightName": "Light of the Answered Prayer",
        "lightHint": "Near the olive and fig trees before the Finale Plaza"
    }
]

JOSHUA_JUDGES_SCENES = {
    3: "scarlet_line",
    6: "jordan_stones",
    10: "jericho_walls",
    33: "torches_jars"
}

JOSHUA_JUDGES_POEMS = [
    (1, 1, "after Moses", "Joshua 1:1–9", "“As I was with Moses, so I will be with you. I will not fail you nor forsake you.”",
     "Moses is dead.\nthat is how it starts.\n\nthe one who talked with God\nlike a friend,\nthe one who held the staff\nover the sea,\ngone.\n\nand now it's you.\n\nthree times God says it:\nbe strong.\nbe strong.\nbe strong and courageous.\n\nnot because you are.\nbecause he is\ngoing with you,\nthe same as before."),
    (2, 1, "day and night", "Joshua 1:8", "“you shall meditate on it day and night”",
     "before the river,\nbefore the walls,\na book.\n\nkeep it in your mouth,\nhe said.\nturn it over\nat noon,\nturn it over\nby lamplight.\n\nthe land was ahead.\nthe way into it\nwas words."),
    (3, 1, "the scarlet line", "Joshua 2:8–21", "“Then she tied the scarlet line in the window.”",
     "she had heard the stories.\nthe sea,\nthe kings across the river.\n\neveryone in Jericho had heard.\ntheir hearts melted.\n\nhers did something else.\n\nyour God, she said,\nis God in heaven above\nand on the earth beneath.\n\na woman on the wall,\nwith the wrong past\nand the right answer,\n\ntying a red thread\nto her window\nlike a knot in a promise:\n\nremember me.\nremember my house."),
    (4, 1, "this way before", "Joshua 3:1–6", "“for you have not passed this way before.”",
     "keep your distance\nfrom the ark, they were told.\nnot so you'd be far from God.\n\nso you could see\nwhere it was going.\n\nyou have not passed\nthis way before.\n\nnone of us have.\nthat's why we follow\nsomething we can see\na long way off."),
    (5, 1, "the edge of the water", "Joshua 3:14–17", "“the feet of the priests who bore the ark had dipped in the edge of the water”",
     "it was harvest.\nthe river was over its banks.\n\nof course it was.\n\nnothing moved\nuntil someone's feet\nwere wet.\n\nthen, far upstream,\nthe water stood still\nin a heap,\n\nand the priests\nstood in the middle\non dry ground\n\nuntil every last one\nhad crossed.\n\nsometimes the miracle\nwaits for your sandal\nto touch the flood."),
    (6, 1, "what these stones mean", "Joshua 4:1–24", "“What do these stones mean?”",
     "twelve men\nwaded back into the riverbed\nand each one\nlifted a stone\nto his shoulder.\n\nwet stones.\nheavy stones.\nfrom the place\nwhere the priests had stood.\n\nstack them, God said,\nwhere you camp tonight.\n\none day a child\nwill put a hand on them\nand ask.\n\nand you will get to say,\nwe walked through here\non dry ground."),
    (7, 1, "the last morning of manna", "Joshua 5:10–12", "“The manna ceased on the next day, after they had eaten of the produce of the land.”",
     "forty years\nof bread on the ground\nevery morning.\n\nthen one day\nthey ate the grain of the land,\nroasted,\n\nand the next morning\nthere was none.\n\nno one had announced it.\nno one had to.\n\nthe God who fed them\nin the desert\nwas feeding them now\nwith fields.\n\nsame hands.\ndifferent bread."),
    (8, 1, "holy ground", "Joshua 5:13–15", "“Take off your sandals, for the place on which you stand is holy.”",
     "are you for us\nor for our enemies?\n\na fair question\noutside Jericho.\n\nno, came the answer.\n\nnot on your side.\nin charge.\n\nso Joshua did the only thing\nthat made sense.\n\nhe took off his sandals."),
    (9, 1, "seven days of silence", "Joshua 6:1–16", "“You shall not shout nor let your voice be heard”",
     "once around.\nback to camp.\n\nonce around.\nback to camp.\n\nsix days of walking\npast a locked city\nwithout a word.\n\nonly the rams' horns\nand the sound of feet.\n\nit must have felt foolish.\nit must have felt like nothing.\n\nsome obedience\nis just keeping quiet\nand going around again."),
    (10, 1, "the wall fell down flat", "Joshua 6:15–20", "“the wall fell down flat”",
     "the seventh day.\nseven times around.\n\nthen the long blast,\nand the shout\nthey had been holding\nfor a week,\n\nand the stones\nthat had never moved\nfor anyone\n\nlay down.\n\nnot pushed.\nnot climbed.\n\njust\ntold."),
    (11, 2, "in the middle of Israel", "Joshua 6:22–25", "“She lives in the middle of Israel to this day”",
     "when the dust settled\nthere was one window\nstill tied with red.\n\nthey brought her out,\nand her father,\nand her mother,\nand her brothers,\nand all she had.\n\nthe outsider\nfrom the wall\n\nnow living\nin the middle\nof the people of God.\n\nthat was always\nhow the story\nwas meant to go."),
    (12, 2, "hidden in the ground", "Joshua 7:19–26", "“Tell me now what you have done! Don’t hide it from me!”",
     "a beautiful robe.\nsome silver.\na bar of gold.\n\nI saw them, I wanted them,\nI took them, I hid them.\nthe oldest four steps there are.\n\nmy son, Joshua said,\ndon't hide it from me.\n\nthey raised a heap of stones\nin the valley of Achor,\nthe valley of trouble.\n\nmuch later, a prophet heard God promise\nto make that same valley\na door of hope."),
    (13, 2, "the little ones and the foreigners", "Joshua 8:30–35", "“with the women, the little ones, and the foreigners who were among them.”",
     "he read all of it.\nevery word.\n\nnot only to the elders.\nnot only to the men.\n\nto the women.\nto the little ones.\nto the foreigners\nstanding at the edges.\n\nno one was too small\nor too new\nto hear what God had said."),
    (14, 2, "the day the sun stood still", "Joshua 10:12–14", "“There was no day like that before it or after it, that Yahweh listened to the voice of a man”",
     "sun, stand still,\nhe said.\n\nand the sun\nstayed in the middle of the sky.\n\nthe text doesn't marvel\nat the sun.\n\nit marvels\nat this:\n\nGod listened\nto the voice\nof a man."),
    (15, 2, "give me this hill country", "Joshua 14:6–14", "“Now therefore give me this hill country”",
     "forty years old\nwhen he went in as a spy.\neighty-five now,\nafter forty-five years of waiting.\n\nand he doesn't ask\nfor the easy valley.\n\nhe asks for the hill country,\nthe walled towns, the giants.\n\nI'm as strong now\nas I was then, he says.\n\nhe followed the LORD\nwholeheartedly.\n\nthat's what it looks like\nat eighty-five."),
    (16, 2, "springs of water", "Joshua 15:16–19", "“Give me a blessing.”",
     "you gave me dry land,\nAchsah said to her father.\n\ngive me springs of water too.\n\nso he gave her\nthe upper springs\nand the lower springs.\n\nit is not greedy\nto ask a father\nfor water."),
    (17, 2, "cities of refuge", "Joshua 20:1–6", "“Assign the cities of refuge”",
     "six cities\nwith open gates.\n\nfor the one who did harm\nwithout meaning to,\nrunning with his heart in his throat.\n\nget inside, God said.\ntell the elders at the gate.\nthey will take you in.\n\neven in the law\nthere were doors\nleft open\nfor the ones\nwho didn't mean it."),
    (18, 2, "as for me and my house", "Joshua 24:14–15", "“choose today whom you will serve”",
     "the gods beyond the river.\nthe gods of the land.\nor the LORD.\n\nchoose, he said.\ntoday.\n\nnot someday.\nnot when the harvest is in.\n\nhe was an old man\nstanding in front of a nation,\nand he made his own choice\nout loud:\n\nas for me\nand my house,\nwe will serve the LORD.\n\na house is where\nit gets decided."),
    (19, 2, "the stone heard", "Joshua 24:26–27", "“it has heard all Yahweh’s words”",
     "he set up a great stone\nunder the oak.\n\nthis stone has heard\neverything God said to us,\nhe told them.\n\na strange witness.\n\nit would never speak.\nnever move.\nnever forget.\n\njust stand there,\nyear after year,\nin case anyone\nneeded reminding."),
    (20, 2, "Joseph's bones", "Joshua 24:29–32", "“They buried the bones of Joseph, which the children of Israel brought up out of Egypt, in Shechem”",
     "Joshua died,\na hundred and ten years old.\n\nand they buried\none more thing.\n\na box of bones\ncarried all the way\nout of Egypt,\nthrough the sea,\nthrough forty years of sand,\nacross the river.\n\nJoseph had asked them\nnot to leave him there.\n\nthey didn't.\n\nevery promise\ncomes home."),
    (21, 3, "who didn't know", "Judges 2:7–10", "“another generation arose after them who didn’t know Yahweh”",
     "the ones who had seen it\ngrew old.\nthe ones who had crossed the river\nwere buried.\n\nand the stones\nwere still there.\n\nbut no one asked\nwhat they meant.\n\nforgetting\ndoesn't take a rebellion.\n\nonly\none generation\nthat isn't told."),
    (22, 3, "round again", "Judges 2:11–19", "“for it grieved Yahweh because of their groaning”",
     "they forgot.\nthey turned to other gods.\nthey were crushed.\nthey cried out.\n\nGod raised up a judge,\nand the land had rest.\n\nthen the judge died,\nand they forgot.\n\naround and around,\nlike a donkey at the mill.\n\nthe wonder isn't\nthat they kept circling.\nit's that every time they groaned\nit grieved him,\n\nand every time,\nhe came."),
    (23, 3, "under the palm tree", "Judges 4:4–5", "“She lived under Deborah’s palm tree between Ramah and Bethel in the hill country of Ephraim”",
     "no palace.\nno throne.\n\na palm tree\non a hill road\nbetween two towns.\n\nand the people\nkept walking up\nto sit in its shade\nand ask her\nwhat was right.\n\na prophet,\na judge,\nand later she would call herself\na mother in Israel.\n\nwisdom doesn't need a hall.\nit can sit\nunder a tree."),
    (24, 3, "if you will go with me", "Judges 4:6–14", "“Hasn’t Yahweh gone out before you?”",
     "if you'll go with me,\nI'll go, Barak said.\n\nif not,\nI won't.\n\nshe went.\n\nand when the day came\nshe didn't tell him\nto be brave.\n\nshe told him\nwho was already\nout in front."),
    (25, 3, "a jug of milk", "Judges 5:24–25", "“He asked for water. She gave him milk. She brought him butter in a lordly dish.”",
     "he came running\nto a tent that looked safe.\n\nhe asked for water.\nshe gave him milk in her best dish\nand covered him with a rug.\n\nthe captain of nine hundred iron chariots\ncame to a tent\nand never left it.\n\nDeborah had said\nit would be a woman's hand.\n\nthe song calls her\nblessed among women in the tent.\n\nwe will leave the rest\nin the dark of the tent."),
    (26, 3, "the stars fought", "Judges 5:4–21", "“From the sky the stars fought.”",
     "nine hundred chariots of iron.\n\nand then the clouds poured water,\nand the ancient river Kishon\nswept them away.\n\nfrom the sky\nthe stars fought,\nDeborah sang.\n\nwhen God goes out before you,\neven the rain\nis under orders."),
    (27, 3, "like the sun", "Judges 5:31", "“let those who love him be as the sun when it rises in its strength.”",
     "the song ends\nnot with the battle\nbut with the morning.\n\nthose who love him\nwill be like the sun\nwhen it comes up\nin its strength.\n\nnot a flash.\nnot a fire.\n\nsteady.\nrising.\nwarming everything\nit touches.\n\nand the land had rest\nforty years."),
    (28, 4, "in the winepress", "Judges 6:11–12", "“His son Gideon was beating out wheat in the wine press, to hide it from the Midianites.”",
     "wheat belongs\non a threshing floor,\nin the open,\nin the wind.\n\nGideon was threshing\nin a hole in the rock,\nwhere no one could see.\n\nthat's where the angel\nfound him.\n\nand called him\nmighty man of valor.\n\nGod names you\nby what he sees coming,\nnot by where\nyou're hiding."),
    (29, 4, "the least", "Judges 6:13–16", "“I am the least in my father’s house.”",
     "if God is with us,\nwhy all this?\nwhere are the wonders\nour fathers told us about?\n\nhonest questions.\nGod didn't scold them.\n\nmy clan is the poorest.\nI'm the least in my house.\n\nGod didn't argue that either.\n\nhe only said,\nI will be with you.\n\nthat was the answer\nto every one\nof Gideon's objections."),
    (30, 4, "the LORD is peace", "Judges 6:22–24", "“Peace be to you! Don’t be afraid. You shall not die.”",
     "he had seen the angel of the LORD\nface to face,\nand he was sure\nthat was the end of him.\n\npeace, God said.\ndon't be afraid.\nyou won't die.\n\nso he built an altar\nright there\nand named it\nthe LORD is peace.\n\na scared man\nnaming a stone\nafter the first thing\nGod told him."),
    (31, 4, "the fleece", "Judges 6:36–40", "“wrung the dew out of the fleece, a bowl full of water.”",
     "wet fleece,\ndry ground.\nhe wrung it out\nand filled a bowl.\n\nthen he asked again.\ndon't be angry with me.\njust once more.\n\ndry fleece,\nwet ground.\n\nGod did so,\nthe text says.\nno lecture. no thunder.\n\njust dew, exactly where\na frightened man\nneeded it."),
    (32, 4, "too many", "Judges 7:2–7", "“The people who are with you are too many for me”",
     "thirty-two thousand.\ntoo many.\n\nlet the fearful go home.\nten thousand.\nstill too many.\n\ndown to the water.\nthree hundred.\n\nnot because God needed\nfewer men.\n\nbecause he wanted\nno one to say afterward,\nwe did this ourselves."),
    (33, 4, "torches in jars", "Judges 7:16–21", "“empty pitchers, with torches within the pitchers.”",
     "a trumpet in one hand.\na clay jar in the other,\nand a fire\nhidden inside it.\n\nin the middle of the night\nthey stood around the camp\nand broke the jars.\n\nthree hundred small lights\nblazing all at once.\n\nevery man stood in his place.\nthey didn't have to do more.\n\nsometimes the light\nonly gets out\nwhen the jar\nbreaks."),
    (34, 5, "the trees choose a king", "Judges 9:7–15", "“The trees set out to anoint a king over themselves.”",
     "the trees wanted a king.\n\nthe olive said, and leave my oil?\nthe fig said, and leave my sweetness?\nthe vine said, and leave my wine?\n\neach one busy\nwith the good thing\nit was made to give.\n\nso they asked the bramble.\ncome, it said,\nrest in my shade.\n\na thornbush\nhas no shade."),
    (35, 5, "with tambourines", "Judges 11:30–40", "“the daughters of Israel went yearly to celebrate the daughter of Jephthah”",
     "a rash promise\nmade at the edge of a war.\n\nwhen he came home,\nhis only child ran out the door\ndancing, with tambourines.\n\nthis is one of the hardest pages\nin the book.\n\nshe asked for two months\non the mountains with her friends.\n\nand every year after,\nthe daughters of Israel\nwent out for four days\nto remember her.\n\nsome stories we can't explain.\nwe can only refuse to forget\nthe one who was hurt."),
    (36, 5, "a name too wonderful", "Judges 13:15–23", "“Why do you ask about my name, since it is incomprehensible?”",
     "what's your name,\nManoah asked,\nso we can honor you?\n\nwhy ask, came the answer.\nit's beyond you.\n\nthen the flame went up\nfrom the rock,\nand the angel went up\nin the flame.\n\nwe're going to die,\nsaid Manoah.\n\nno, said his wife.\nif he wanted us dead\nhe wouldn't have told us\nall this.\n\nsometimes faith\nis the one in the room\nwho reasons it through."),
    (37, 5, "out of the strong", "Judges 14:8–14", "“Out of the strong came out sweetness.”",
     "he found honey\nwhere no one would look.\n\ninside the thing\nthat had roared at him.\n\nhe ate it walking,\nand gave some to his parents,\nand never said\nwhere it came from.\n\nout of the eater, food.\nout of the strong, sweetness.\n\nthat riddle is bigger\nthan the man who told it."),
    (38, 5, "but he didn't know", "Judges 16:17–22", "“However, the hair of his head began to grow again after he was shaved.”",
     "I'll go out like before,\nhe said,\nand shake myself free.\n\nbut he didn't know\nthe LORD had left him.\n\nthat's the saddest line\nin his story.\n\nthey took his eyes.\nthey put him at the mill\nin bronze chains,\ngrinding in circles.\n\nand then this,\nquiet as anything:\n\nhis hair\nbegan to grow again."),
    (39, 5, "remember me", "Judges 16:25–30", "“remember me, please, and strengthen me, please, only this once”",
     "he asked the boy\nwho held his hand\nto let him feel the pillars.\n\na man who had once\ntorn gates from a city\nnow needing help\nto find a wall.\n\nand then he prayed.\nthe first real prayer\nwe hear from him\nin a long time.\n\nremember me.\nplease.\njust once more.\n\nand God\nremembered him."),
    (40, 5, "in his own eyes", "Judges 21:25", "“Everyone did that which was right in his own eyes.”",
     "no king in Israel.\n\neveryone did\nwhat seemed right\nto them.\n\nthat's how the book ends.\nnot with a battle.\nwith a sentence.\n\nand the long wait begins\nfor a king\nwho would do\nwhat was right\nin God's eyes.")
]


RUTH_PARTS = [
    {
        "part": 1,
        "title": "Empty",
        "epigraph": "I went out full, and Yahweh has brought me home again empty.",
        "epigraphRef": "Ruth 1:21",
        "lightName": "Light of the Bethlehem Road",
        "lightHint": "Beside the stone milestone where two roads meet toward Bethlehem"
    },
    {
        "part": 2,
        "title": "Gleaning",
        "epigraph": "Who has not abandoned his kindness to the living and to the dead.",
        "epigraphRef": "Ruth 2:20",
        "lightName": "Light of the Gleaner’s Field",
        "lightHint": "Among the golden barley sheaves and the cool water jars"
    },
    {
        "part": 3,
        "title": "The Threshing Floor",
        "epigraph": "Shall I not seek rest for you, that it may be well with you?",
        "epigraphRef": "Ruth 3:1",
        "lightName": "Light of the Sheltering Wing",
        "lightHint": "By the winnowing floor where the mantle of refuge is spread"
    },
    {
        "part": 4,
        "title": "Redeemed",
        "epigraph": "Blessed be Yahweh, who has not left you today without a near kinsman.",
        "epigraphRef": "Ruth 4:14",
        "lightName": "Light of the House of Bread",
        "lightHint": "Near the town gate elders’ bench before the Finale Plaza"
    }
]

RUTH_SCENES = {
    4: "ruth_road",
    8: "ruth_gleaning",
    15: "threshing_cloak",
    20: "kinsman_sandal"
}

RUTH_POEMS = [
    (1, 1, "house of bread", "Ruth 1:1", "“there was a famine in the land”",
     "it begins with an empty field\nin a town called House of Bread.\n\na man looks at the dust\nand makes the choice\nhungry men have always made:\n\nhe packs what he can carry,\ntakes his wife and two sons,\nand walks toward the bread\nhe can see."),
    (2, 1, "one breath", "Ruth 1:3–5", "“the woman was bereaved of her two children and of her husband”",
     "first her husband.\nthen, ten years on,\nboth of her sons.\n\nthe text says it in one breath,\nthe way grief does—\ntoo heavy to linger on,\ntoo heavy to put down.\n\nshe is left\nwith two daughters-in-law,\na word for what she is now,\nand no word\nfor what comes next."),
    (3, 1, "news from home", "Ruth 1:6", "“Yahweh had visited his people in giving them bread”",
     "news travels even to Moab:\nthere is bread in Bethlehem again.\n\nno angel, no voice from heaven—\njust word from a traveler,\na harvest on the other side of the hills.\n\nsometimes this is how God visits:\nthrough ordinary news\nthat it is time\nto go home."),
    (4, 1, "where you go", "Ruth 1:14–17", "“where you go, I will go; and where you stay, I will stay”",
     "Orpah kissed her and went back.\nno one blames her.\nit was the sensible road.\n\nbut Ruth stayed—\n\nyour road, my road.\nyour roof, my roof.\nyour people, my people.\nyour God, my God.\n\nshe had nothing to gain\nand everything to lose,\nand she chose\nan old woman's empty hands."),
    (5, 1, "call me bitter", "Ruth 1:19–21", "“Don’t call me Naomi. Call me Mara”",
     "the whole town came out:\nis this Naomi?\n\ndon't call me pleasant, she said.\ncall me bitter.\nI went out full\nand came home empty.\n\nshe said it plainly, about God,\nand the book keeps her words\nwithout correcting them.\n\nthere is room in Scripture\nfor a woman\nnot ready yet\nto say thank you."),
    (6, 1, "barley harvest", "Ruth 1:22", "“They came to Bethlehem in the beginning of barley harvest.”",
     "she said she came home empty.\nbut look who walked beside her.\n\nand look at the fields—\nthe first barley bending gold\nthe very season they arrived.\n\nthe story doesn't argue with her grief.\nit just sets the table\nand waits."),
    (7, 2, "as it happened", "Ruth 2:3", "“she happened to come to the portion of the field belonging to Boaz”",
     "she happened to come\nto the field of Boaz.\n\nthe storyteller almost smiles.\nhappened.\n\nas if a Moabite widow\nwandering among strangers' fields\njust chanced on the one man in Bethlehem\nwho was family.\n\ncall it luck\nif you want.\nthe book has another name for it\nand waits for you to notice."),
    (8, 2, "the edges", "Ruth 2:2–7", "“let me glean and gather after the reapers among the sheaves”",
     "the law left the edges of the field\nfor the poor and the foreigner.\n\nshe was both.\n\nso she bent where others had already been,\nmorning into afternoon,\npicking up what fell.\n\nnot ashamed\nto begin with leftovers.\nso much grace\nstarts at the edges."),
    (9, 2, "the water jars", "Ruth 2:8–9", "“When you are thirsty, go to the vessels, and drink from that which the young men have drawn.”",
     "he told the young men\nto leave her alone.\n\nhe told her\nthe water was hers too.\n\nit isn't the grand gesture\nthat changes a life.\nit is someone with power\nsaying: you are safe here,\nand there is enough to drink."),
    (10, 2, "under his wings", "Ruth 2:11–12", "“under whose wings you have come to take refuge”",
     "Boaz blessed her\nwith a picture:\n\na young bird\nthat has flown a long way\nfrom the land of its birth,\ntucked now\nunder the wings of the God of Israel.\n\nhe doesn't know yet\nthat he will be\nthe answer\nto his own prayer."),
    (11, 2, "carry some home", "Ruth 2:14–18", "“She ate, was satisfied, and left some of it.”",
     "at mealtime he called her over.\nbread. a bowl to dip it in.\na handful of roasted grain\npassed hand to hand.\n\nshe ate until she was full,\nmaybe for the first time in a long time,\nand saved what was left\nfor Naomi.\n\nthat is how the hungry love:\neat,\nthen carry some home."),
    (12, 2, "one of ours", "Ruth 2:19–20", "“The man is a close relative to us, one of our near kinsmen.”",
     "she came home at dusk\nwith an ephah of barley\nand a name.\n\nBoaz? Naomi said,\nand something in her\nthat had lain still for years\nsat up.\n\nhe's one of ours.\na kinsman.\none who can redeem.\n\nthe first hope in the book\narrives in a sack of grain\nat the end of a long day."),
    (13, 3, "all that you say", "Ruth 3:1–6", "“All that you say, I will do.”",
     "wash. anoint yourself.\nput on your cloak.\ngo down to the floor.\n\nit was a strange, brave plan,\nolder than we understand,\nand Ruth trusted the woman\nwho had once said\ncall me bitter.\n\nall that you say, I will do—\n\nshe said it the way\nshe had once said\nyour God, my God:\nwith her whole life."),
    (14, 3, "the heap of grain", "Ruth 3:7–8", "“he went to lie down at the end of the heap of grain”",
     "the harvest was in.\nthe work was done.\nthe heap of grain lay pale under the stars.\n\nand a woman came softly\nin the dark\nto ask a question\nwithout words.\n\nthe story tells it quietly.\nso will we."),
    (15, 3, "the corner of the cloak", "Ruth 3:9", "“spread the corner of your garment over your servant; for you are a near kinsman.”",
     "spread your wing over me,\nshe said—\nthe same word\nhe had used for God.\n\nyou prayed that I would find shelter\nunder his wings.\nbe the answer, Boaz.\nbe the corner of the cloak.\n\nsometimes God's wings\nlook like a person\nwilling to be\nthe answer."),
    (16, 3, "a worthy woman", "Ruth 3:10–11", "“all the city of my people knows that you are a worthy woman.”",
     "don't be afraid, he said.\neveryone knows who you are.\n\nnot the Moabite.\nnot the widow.\nnot the foreigner at the edge of the field.\n\na worthy woman.\n\nthe town had been watching all along—\nevery sunrise in the barley,\nevery handful carried home—\nand had quietly\nchanged her name."),
    (17, 3, "not empty", "Ruth 3:15–17", "“Don’t go empty to your mother-in-law.”",
     "he filled her mantle with barley\nbefore the sun came up.\n\ndon't go back empty, he said—\nnot knowing\nhe was answering\nthe bitterest thing Naomi ever said.\n\nempty is not\nthe last word.\nit never was."),
    (18, 3, "wait", "Ruth 3:18", "“Wait, my daughter, until you know what will happen”",
     "wait, my daughter.\n\nthe hardest part of hope\nis the afternoon\nafter you have done everything you can.\n\nthe grain is measured.\nthe question is asked.\nsomewhere a man is walking to the gate.\n\nsit down.\nhe will not rest\nuntil it's settled."),
    (19, 4, "at the gate", "Ruth 4:1–2", "“Boaz went up to the gate and sat down there.”",
     "no swords, no speeches.\njust a man at the gate\nin the morning,\ncalling another man to sit,\ngathering ten elders\nas witnesses.\n\nthis is how redemption looks\nin a small town:\na bargain spoken aloud,\npatience,\nand someone who shows up early."),
    (20, 4, "the sandal", "Ruth 4:6–8", "“a man took off his sandal, and gave it to his neighbor”",
     "the nearer kinsman\nwanted the field\nbut not the widow.\n\nso he untied his sandal\nand handed it over—\nthe old way of saying\nthis is yours now.\n\none man kept his inheritance safe.\nthe other gave himself away,\nand his is the name\nwe still say."),
    (21, 4, "we are witnesses", "Ruth 4:9–12", "“We are witnesses.”",
     "we are witnesses,\nsaid the whole gate.\n\nthey blessed a foreign woman\nwith the names of Rachel and Leah,\nthe mothers who built the house of Israel.\n\na Moabite\nwritten into the family prayer.\n\nthat is the kind of house\nGod builds:\nthe door stays open\nlong after\nyou'd think it would close."),
    (22, 4, "a son", "Ruth 4:13", "“Yahweh enabled her to conceive, and she bore a son.”",
     "after ten empty years in Moab,\na son.\n\nthe book is careful\nto say who gave him:\nthe Lord.\n\nevery birth is a gift.\nthis one\nwas also an answer."),
    (23, 4, "full", "Ruth 4:14–16", "“your daughter-in-law, who loves you, who is better to you than seven sons”",
     "the women gathered around Naomi\nand counted it out like a blessing:\n\na restorer of life.\na nurse for your old age.\na daughter-in-law who loves you,\nbetter than seven sons.\n\nshe laid the child in her lap,\nthe woman who had come home empty,\n\nand her arms\nwere full."),
    (24, 4, "the family line", "Ruth 4:17", "“They named him Obed. He is the father of Jesse, the father of David.”",
     "the neighbors named him.\na son is born to Naomi, they said.\n\nObed.\nfather of Jesse.\ngrandfather of a shepherd boy\nwho would be king.\n\nand from there the line runs on,\ngeneration after generation,\nto another child\nin the House of Bread.\n\na famine, a funeral, a foreigner, a field—\nand out of it,\nthe family of the Messiah.")
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
        slug="joshua-judges",
        prefix="j",
        book_num=5,
        title="Be Strong and Courageous",
        subtitle="Joshua & Judges in Poems & Pictures",
        before_you_begin=(
            "Joshua begins with a man told three times to be strong, standing where Moses used to stand. "
            "Then come a scarlet line tied in a window, priests stepping into a river in flood, twelve stones "
            "carried up from the riverbed, the last morning of manna, seven trumpets of rams' horns, an old man "
            "asking for the hard hill country, and a people told to choose today whom they will serve. Judges "
            "begins with a generation that forgot, and goes round and round: a woman judging under a palm tree, "
            "a farmer threshing wheat in a winepress, a fleece wet with dew, torches hidden in clay jars, a strong "
            "man whose hair began to grow again, and a last prayer between two pillars."
        ),
        pdf_name="be-strong-and-courageous-interior-print.pdf",
        parts_list=JOSHUA_JUDGES_PARTS,
        poems_list=JOSHUA_JUDGES_POEMS,
        scenes_map=JOSHUA_JUDGES_SCENES
    )

    build_book(
        slug="ruth",
        prefix="r",
        book_num=6,
        title="Where You Go",
        subtitle="Ruth in Poems & Pictures",
        before_you_begin=(
            "Ruth is a short story about a famine, three funerals, a foreign widow, and a field of barley. "
            "By the last page, an empty house is full and a family line runs toward David. This book walks "
            "through its four chapters in twenty-four short poems. Each poem sits beside a picture and under "
            "a single line of Scripture."
        ),
        pdf_name="where-you-go-interior-print.pdf",
        parts_list=RUTH_PARTS,
        poems_list=RUTH_POEMS,
        scenes_map=RUTH_SCENES
    )
