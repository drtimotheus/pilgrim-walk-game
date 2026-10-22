import os
import re
import json
import subprocess
from build_assets import BASE_DIR, OUT_DIR, sample_palette_via_bmp

INTERIORS_DIR = os.path.join(BASE_DIR, "art-masters/interiors")

def extract_jpegs_from_pdf(pdf_path):
    with open(pdf_path, "rb") as f:
        data = f.read()
    jpegs = []
    for m in re.finditer(rb"/DCTDecode", data):
        s = data.find(b"stream", m.end())
        if s == -1:
            continue
        if data[s + 6 : s + 8] == b"\r\n":
            s_start = s + 8
        else:
            s_start = s + 7
        e = data.find(b"endstream", s_start)
        if e == -1:
            continue
        if data[e - 2 : e] == b"\r\n":
            e -= 2
        elif data[e - 1 : e] == b"\n":
            e -= 1
        jpg = data[s_start:e]
        if jpg[:2] == b"\xff\xd8":
            jpegs.append(jpg)
    return jpegs

FIRE_BY_NIGHT_POEMS = [
    (1, "called", "Leviticus 1:1", 1, "the book begins\nwith a voice\nfrom inside a tent.\n\nnot from the mountain now,\nwith thunder and smoke,\n\nbut from a tent\npitched in the middle\nof the camp,\n\namong the cooking fires\nand the washing\nand the children.\n\neverything that follows,\nevery rule about fire and flour,\n\nis an answer\nto one question:\n\nhow do people like us\ncome near?"),
    (2, "a pleasant aroma", "Leviticus 1:9", 1, "smoke going up\nin a straight line\non a still morning.\n\nthe whole camp\ncould see it\nfrom their tent doors.\n\nsomething given away\ncompletely,\nturned to fire and air,\n\nand heaven\ncalled it\npleasant.\n\nyou might think\nwhat you give up\nsimply disappears.\n\nit doesn't.\nit rises."),
    (3, "salt", "Leviticus 2:13", 1, "fine flour.\na little oil.\na pinch of frankincense.\n\nand never\nforget the salt.\n\nsalt doesn't spoil.\nit keeps things.\n\nso every small gift,\neven a handful of flour,\n\nwas seasoned\nwith a reminder:\n\nthis is not a deal\nthat goes bad.\n\nthis is a promise\nthat keeps."),
    (4, "a fifth part more", "Leviticus 6:5", 1, "if you took it,\ngive it back.\n\nif you lied about\nwhat you found,\nreturn it.\n\nand then,\nbefore you go\nto the altar,\n\nadd a fifth.\n\nnot just enough\nto make it even.\n\na little more,\nso your neighbor knows\nyou meant it."),
    (5, "it shall not go out", "Leviticus 6:12-13", 1, "every morning\nsomeone got up\nbefore the others\n\nand fed it.\n\na few pieces of wood.\nnothing grand.\n\nno one ever saw\nthe fire lit.\nonly the fire kept.\n\nthat's most of faith,\nreally.\n\nnot the flash\nfrom heaven.\n\nthe wood,\nevery morning,\nlaid on the coals."),
    (6, "ashes", "Leviticus 6:10-11", 1, "the priest\nin his linen clothes\nswept up the ashes.\n\nthen changed\ninto plain ones\n\nand carried them\nout of the camp\nto a clean place.\n\neven the leftovers\nof holy things\nwere handled with care.\n\nno one\nis too important\nto carry the ashes.\n\nand nothing\nyou gave to God\nis thrown away."),
    (7, "hands lifted", "Leviticus 9:22-24", 1, "after all the washing\nand the waiting\nand the careful fire,\n\nAaron came down\nand lifted up his hands\ntoward the people.\n\nand then\nthe glory came.\n\nfire from before the Lord,\nand the whole crowd\nshouting,\nfalling on their faces.\n\nit all ends\nwith a blessing.\n\nthat's what\nthe altar was for."),
    (8, "holy", "Leviticus 11:45", 2, "holy\ndoesn't mean\nfar away.\n\nit means\nset apart,\n\nthe way you set apart\nthe good cup,\nthe one you keep\nfor someone you love.\n\nGod said,\nbe holy, as I am.\n\nnot,\nstay away.\n\nmore like,\ncome be mine."),
    (9, "the living bird", "Leviticus 14:7", 2, "the priest\nwent outside the camp\nto find him.\n\nthe one who had lived\nout there,\naway from everyone.\n\nhe looked him over,\nand the sickness was gone.\n\nand at the end\nof the washing,\n\na bird\nwas let go\ninto the open field.\n\nyou can go home now.\n\nyou are clean.\nyou are free."),
    (10, "within the veil", "Leviticus 16:12-13", 2, "once a year\none man in plain linen\nwent behind the curtain\n\nwith coals\nand two handfuls of incense.\n\nthe smoke\ncovered the mercy seat\nlike a cloud.\n\nthe closest anyone came\nto God\n\nwas wrapped\nin sweetness\nand mercy."),
    (11, "into the wilderness", "Leviticus 16:21-22", 2, "two hands\non a goat's head.\nevery wrong\nnamed out loud.\n\nthen someone led it\npast the last tent\nand let it go.\n\nit walked\ninto the desert\nand didn't come back.\n\nthat's where\nyour sin went.\n\nnot coming back."),
    (12, "the corners of the field", "Leviticus 19:9-10", 2, "don't cut\nall the way to the edge.\n\ndon't go back\nfor what you dropped.\n\ndon't pick up\nthe grapes\nthat fell.\n\nleave them.\n\nsomeone is coming\nlater in the day\nwith an empty basket.\n\nGod built\na little room\ninto your harvest\n\nfor people\nyou've never met."),
    (13, "as yourself", "Leviticus 19:18", 2, "it's here first,\nin the middle\nof a long list\n\nabout wages\nand weights\nand gossip\nand the deaf and the blind.\n\ndon't carry a grudge.\ndon't get even.\n\nlove your neighbor\nas yourself.\n\nand further down the page,\nthe stranger too,\n\nbecause you knew\nwhat it was like\nto be one."),
    (14, "the land shall rest", "Leviticus 25:4", 2, "six years\nyou plow.\n\nthe seventh,\nyou don't.\n\nthe vine\ngoes wild.\nthe field\ngrows what it likes.\n\nand everyone eats\nfrom it,\nthe servant and the stranger\nand the animals too.\n\neven the dirt\ngets a Sabbath.\n\nGod is not\nin a hurry\nto use anything up."),
    (15, "jubilee", "Leviticus 25:10", 2, "every fiftieth year\na horn\nacross the whole land.\n\nthe field you sold\ncomes back.\n\nthe debt\nis gone.\n\nthe one who had to work\nfor his neighbor\n\nwalks home\nwith his children.\n\nthe land is mine,\nGod said.\n\nno one\nloses everything\nforever."),
    (16, "I will walk among you", "Leviticus 26:11-12", 2, "after all the fire\nand the rules\nand the careful distance,\n\nthis.\n\nnot\nI will watch you.\n\nnot\nI will visit sometimes.\n\nI will walk\namong you.\n\ndown the rows of tents.\npast your door.\n\nthe whole book\nwas leading here."),
    (17, "one by one", "Numbers 1:2", 3, "the book of Numbers\nbegins with names.\n\nnot a guess.\nnot a crowd.\n\nname after name,\nfamily after family,\n\none by one.\n\nyou may feel\nlike a number.\n\nbut in this book\nevery number\nwas a name first."),
    (18, "around the tent", "Numbers 2:2", 3, "every tribe\nhad its place,\n\nevery family\nits banner,\n\nand every tent door\nfaced the same center.\n\nin the middle\nof all that dust\nand noise and marching,\n\na tent\nwhere God lived.\n\nwherever they went,\nthey set it up first.\n\nand set\ntheir own tents\naround it."),
    (19, "bless and keep", "Numbers 6:23-24", 3, "God gave the priests\ntheir words.\n\nthis is how\nyou bless my people.\n\nsay it like this.\n\nhe didn't leave it\nto chance.\n\nhe didn't\nlet them guess.\n\nhe wanted them\nto hear\nexactly this:\n\nbless you.\nkeep you."),
    (20, "his face", "Numbers 6:25-26", 3, "not his hand\nraised against you.\n\nnot his back\nturned.\n\nhis face.\n\nshining.\n\nlifted\ntoward you.\n\nand at the end\nof the blessing,\nthe thing he wants you\nto leave with:\n\npeace."),
    (21, "seven lamps", "Numbers 8:2-3", 3, "the lamps\nwere turned\nto shine forward.\n\nnot up\nat the gold.\n\nnot back\nat the one\nwho lit them.\n\nout,\ninto the room.\n\na light\nis not for looking at.\n\nit's for seeing by."),
    (22, "cloud and fire", "Numbers 9:15-16", 3, "by day\na cloud.\n\nby night\na glow like fire.\n\na child\ncould step out of her tent\nat midnight\n\nand look\ntoward the middle of the camp\n\nand see it\nstill there.\n\nhe didn't leave\nwhen it got dark.\n\nhe doesn't now."),
    (23, "a month, or a year", "Numbers 9:22", 3, "sometimes one night.\nsometimes a month.\nsometimes a whole year\nin the same dry place.\n\nwhen the cloud stayed,\nthey stayed.\nwhen it moved,\nthey moved.\n\nsome seasons\nthe faithful thing\nis to unpack."),
    (24, "a resting place", "Numbers 10:33", 3, "the ark\nwent out ahead.\n\nthree days\nahead of them.\n\nlooking\nfor a place\nwhere they could rest.\n\nyou're not\nthe first one\ndown this road.\n\nhe went ahead\nto find\nsomewhere you can stop."),
    (25, "the dew", "Numbers 11:9", 4, "every night\nwhile they slept\n\nit came down\nwith the dew.\n\nsmall and pale\nlike coriander seed.\n\nthey ground it,\nboiled it,\nbaked it into cakes.\n\nit tasted\nlike fresh oil.\n\nevery morning\nenough.\n\nevery morning\nagain."),
    (26, "we remember the fish", "Numbers 11:5-6", 4, "the cucumbers.\nthe melons.\nthe leeks, the onions, the garlic.\n\nfunny how\nyou can remember\nevery vegetable\n\nand forget\nthe whip.\n\nnothing at all\nbut this manna,\nthey said,\n\nholding\nbread from heaven\nin their hands.\n\nbe careful\nwhat you call\nnothing."),
    (27, "not alone", "Numbers 11:17", 4, "it's too heavy,\nMoses said.\n\nI can't carry them\nalone.\n\nand God\ndidn't tell him\nto try harder.\n\nhe said,\ngather seventy.\n\nand took\nof the Spirit\nthat was on Moses\nand put it on them.\n\nsometimes\nthe answer to your prayer\nis other people."),
    (28, "very humble", "Numbers 12:3", 4, "his own sister and brother\nspoke against him.\n\nhe didn't answer back.\nGod did.\n\nand when Miriam\nwas shut outside the camp,\nMoses was the one who cried,\nheal her.\n\nand the whole people\nwaited seven days\nuntil she was\nbrought back in."),
    (29, "Eshcol", "Numbers 13:23", 4, "one cluster of grapes\nso big\n\nit took\ntwo men\nand a pole.\n\nand pomegranates.\nand figs.\n\nforty days in the land,\nand this is what\nthey carried home.\n\nproof.\n\nevery good thing\nGod had promised\n\nwas hanging\nright there\nbetween them."),
    (30, "grasshoppers", "Numbers 13:30-33", 4, "twelve went.\ntwelve saw\nthe same fruit,\nthe same walls.\n\nten came back\nand said,\nwe were like grasshoppers.\n\nCaleb said,\nlet's go up at once.\n\nsame land.\nsame giants.\n\nthe difference\nwasn't what they saw.\n\nit was\nwho they thought\nwas going with them."),
    (31, "the rod that budded", "Numbers 17:8", 4, "twelve dry sticks\nleft overnight\nin the tent.\n\nin the morning\none of them\nwas a tree.\n\nbuds,\nblossoms,\nand ripe almonds,\n\nall at once,\non wood\ncut and dry\nand lying still.\n\nGod chooses\nby making\nsomething live."),
    (32, "abundantly", "Numbers 20:11", 4, "the people were quarreling.\nMoses was angry.\n\nhe was told\nto speak to the rock,\nand he struck it twice.\n\nand still\nthe water came.\nnot a trickle.\nabundantly.\n\nMoses paid a price that day.\nbut God did not let\nthe people go thirsty."),
    (33, "look and live", "Numbers 21:8-9", 5, "they were tired and angry,\nand the desert\nwas full of snakes.\n\nGod did not\ntake the desert away.\n\nhe gave them\nsomething to look at:\na bronze pole\nlifted up where all could see.\n\nno medicine.\nno climbing.\n\nturn your eyes,\nand live."),
    (34, "spring up, well", "Numbers 21:16-17", 5, "this time\nno one complained.\n\nGod said,\ngather the people,\nI will give them water.\n\nand they sang\nto a hole in the ground.\n\nspring up."),
    (35, "the donkey", "Numbers 22:28", 5, "three times\nshe turned aside.\n\nthree times\nhe struck her.\n\nhe thought\nshe was being stubborn.\n\nshe was\nsaving his life.\n\nthe only one\non that road\nwho could see the angel\n\nwas the donkey.\n\nbe slow to hit\nwhat's stopping you."),
    (36, "I can't reverse it", "Numbers 23:20", 5, "a king\npaid a prophet\nto curse them.\n\nthree times\nhe climbed a mountain.\n\nthree times\nhe opened his mouth,\n\nand blessing\ncame out instead.\n\nno one\ncan hire\na curse on you\n\nstrong enough\nto undo\nwhat God\nhas already said."),
    (37, "but not near", "Numbers 24:17", 5, "from the top of a hill\na man who came to curse\nsaw a star.\n\nnot now.\nnot near.\n\nfar off,\nrising\nout of Jacob.\n\nsome promises\nyou only see\nfrom a distance.\n\nthe star\nwas still coming."),
    (38, "the daughters speak right", "Numbers 27:7", 5, "Mahlah, Noah, Hoglah,\nMilcah, Tirzah.\n\nfive sisters\nwith no brother\nand no share of the land.\n\nthey stood at the door of the tent,\nin front of everyone,\nand asked.\n\nMoses brought it to God.\n\nand God said,\nthey're right,\n\nand wrote it into the law\nfor every daughter after them."),
    (39, "a shepherd", "Numbers 27:16-17", 5, "told he would not\ngo into the land,\n\nMoses didn't argue\nfor himself.\n\nhe prayed\nfor them.\n\ngive them someone\nto go out before them\nand bring them in.\n\ndon't leave them\nlike sheep\nwith no shepherd.\n\nthen he laid his hands\non Joshua\n\nand let go."),
    (40, "cities of refuge", "Numbers 35:11", 5, "even in the law\nthere was a door\nleft open.\n\nsix towns,\nthree on each side\nof the Jordan,\n\nfor the one\nwho never meant it,\nrunning,\nwith nowhere else to go.\n\nget inside,\nand you are safe.\n\nthe long road\nends with a place\nto run to.")
]

CHOOSE_LIFE_POEMS = [
    (1, "long enough", "Deuteronomy 1:6-8", 1, "some places are holy\nand still not home.\n\nthey had camped\nat the foot of the mountain\nwhere God spoke,\n\nand it would have been easy\nto stay.\n\nbut the voice\nthat met them there\nsaid: turn.\ntake your journey.\n\nthe mountain was where\nhe gave the word.\n\nthe road was where\nthey would learn to live it."),
    (2, "carried", "Deuteronomy 1:31", 1, "you remember\nthe long walk.\n\nthe heat,\nthe complaining,\nthe nights you didn't think\nyou'd make it.\n\nMoses remembers\nsomething else:\n\na father\nwith a tired child\nup on his shoulders,\n\nall the way\nyou went,\nuntil you came\nto this place."),
    (3, "you have lacked nothing", "Deuteronomy 2:7", 1, "not nothing\nto want.\n\nthere were forty years\nof wanting.\n\nbut nothing\nto lack.\n\nhe knew your walking,\nevery mile of it,\n\nand every morning\nthere was enough."),
    (4, "that is enough", "Deuteronomy 3:23-27", 1, "Moses begged.\n\njust to cross,\njust to stand\nin the good land\nhe'd walked toward\nfor forty years.\n\nand God said:\nenough.\nspeak no more of this.\n\nbut he didn't send him away\nempty.\n\ngo up, he said.\nlift up your eyes.\nlook west, north, south, east.\n\nsometimes the answer is no,\nand it comes\nwith a view."),
    (5, "so near", "Deuteronomy 4:7", 1, "other nations\nhad tall gods\nfar away\n\non mountaintops,\nin temples\nyou could only enter\nif you were someone.\n\nIsrael had\na God who could be reached\nby calling.\n\nno climbing.\nno appointment.\n\njust your voice,\nwhenever."),
    (6, "what your eyes saw", "Deuteronomy 4:9", 1, "memory\nis a leaky jar.\n\nwhat your eyes saw,\nthe fire, the voice,\nthe bread on the ground,\n\ndrips out\na little every day\nif you leave it\nstanding.\n\nso pour it out\non purpose:\n\ntell your children.\ntell their children.\n\na story told\nis a story kept."),
    (7, "with all your heart", "Deuteronomy 4:29-31", 1, "even from far away.\neven from the place\nyou ended up\nbecause you wandered.\n\nfrom there,\nMoses says,\nyou shall seek.\n\nand from there\nyou shall find.\n\nhe is a merciful God.\nhe doesn't forget\nwhat he promised\n\njust because\nyou did."),
    (8, "alive today", "Deuteronomy 5:3", 1, "most of the people listening\nhad been children at Sinai,\nor not yet born.\n\nand Moses says:\nnot with our fathers.\nwith us.\n\nthe promise\nisn't a family heirloom\nin a box.\n\nit is spoken\nto whoever is standing here,\nalive,\ntoday.\n\nthat includes you."),
    (9, "hear", "Deuteronomy 6:4-5", 2, "before any rule,\na word:\n\nhear.\n\nnot do.\nnot try harder.\n\njust stop\nand listen.\n\none God.\n\nso one love,\nnot divided:\n\nall your heart,\nall your soul,\nall your strength,\n\ngiven to the one\nwho gave it all\nto you."),
    (10, "the doorpost", "Deuteronomy 6:6-9", 2, "not in a temple.\nat the door.\n\nwhere you come in tired.\nwhere you go out\nto work.\n\nwhere the kids run through\na hundred times a day.\n\ntalk about them, he says,\nwhen you sit,\nwhen you walk,\nwhen you lie down,\nwhen you get up.\n\nfaith isn't a room\nin the house.\n\nit's the doorway\nto all of them."),
    (11, "when your son asks", "Deuteronomy 6:20-21", 2, "he won't ask\nfor a lecture.\n\nhe'll ask\nwhat all this means.\n\nso don't start\nwith rules.\n\nstart with:\nwe were slaves.\n\nand then tell him\nabout the hand\nthat brought us out."),
    (12, "the fewest", "Deuteronomy 7:7-8", 2, "he didn't choose them\nbecause they were many.\n\nthey were the fewest.\n\nhe didn't choose them\nbecause they were impressive.\n\nhe chose them\nbecause he loves.\n\nthat's the whole reason.\n\nit was never\nabout the size of the flower."),
    (13, "not by bread alone", "Deuteronomy 8:2-3", 2, "he let them\nbe hungry.\n\nthen fed them\nwith bread\nno one had ever seen,\n\nbread you couldn't store\nor earn,\n\nonly gather,\neach morning,\nand trust.\n\nyou are fed\nby the one who speaks,\n\nnot by what you can\nkeep in a jar."),
    (14, "a good land", "Deuteronomy 8:7-10", 2, "after forty years\nof sand,\n\nMoses reads them the list\nlike a menu:\n\nbrooks and springs,\nwheat and barley,\nvines and figs,\npomegranates,\nolives and honey.\n\nyou shall eat\nand be full,\n\nand then,\nhe says,\n\nbless him."),
    (15, "when you are full", "Deuteronomy 8:11-14", 2, "the wilderness\nwasn't the dangerous part.\n\nhunger kept them\nlooking up.\n\nthe danger\nwas coming later:\n\nthe fine house,\nthe growing flocks,\nthe silver,\nthe full plate,\n\nand a heart\nslowly lifted up\nuntil it forgets\nwhose hand\nbrought it out.\n\nremember in the plenty\nwhat you learned\nin the sand."),
    (16, "the heart's foreskin", "Deuteronomy 10:16", 2, "the sign on the body\nwas never meant\nto stop at the body.\n\nGod wanted\nthe covering\ncut away\nfrom the heart,\n\nthe hard layer,\nthe stiff neck,\nthe part that won't\nturn when he calls.\n\nhe wasn't asking for less of you.\n\nhe was asking\nfor the real you,\nuncovered."),
    (17, "the foreigner", "Deuteronomy 10:17-19", 2, "the great God,\nthe mighty,\nthe awesome,\n\nwho takes\nno bribes,\n\nspends his time\non the fatherless,\nthe widow,\nand the stranger\nwho needs bread\nand a coat.\n\nso love the stranger.\n\nyou know\nhow it feels.\n\nyou were one."),
    (18, "the rain of the sky", "Deuteronomy 11:10-12", 2, "Egypt had a river.\nyou watered your field\nwith your foot,\nturning the channels.\n\nthe new land\nhad hills,\nand drank\nfrom the sky.\n\nwhich meant\nyou'd have to trust.\n\nbut it also meant\nsomeone was watching it,\n\nfrom the first day of the year\nto the last,\n\nevery hillside,\nevery valley."),
    (19, "the tithe feast", "Deuteronomy 14:22-26", 3, "you'd expect\nthe tithe\nto be taken away.\n\ninstead God says:\nbring it\nand eat it,\nin front of me.\n\nroad too long?\ncarry silver instead,\nand buy what you like\nwhen you get there.\n\nthen sit down,\nall of you,\nand rejoice.\n\nthe offering\nwas a feast\nhe was throwing\nfor you."),
    (20, "open your hand", "Deuteronomy 15:7-11", 3, "a closed hand\nand a hard heart\n\nusually come together.\n\nso do\nan open hand\nand a heart\nthat isn't grieved\nwhen it gives.\n\nthe poor, Moses says,\nwon't disappear.\n\nso don't wait\nfor the problem\nto be solved.\n\nopen your hand\ntoday."),
    (21, "not empty", "Deuteronomy 15:12-15", 3, "it wasn't enough\nto open the door.\n\nwhen the servant\nwalked out free,\n\nyou were to fill his arms:\ngrain from the floor,\nwine from the press,\nsomething from the flock.\n\nwhy?\n\nbecause you remember\nthe morning\nyou walked out of Egypt\n\nand did not\nleave with nothing."),
    (22, "altogether joyful", "Deuteronomy 16:13-15", 3, "seven days\nunder branches.\n\nafter the grain\nand the grapes\nwere in.\n\nand the guest list\nwent all the way down:\n\nson, daughter,\nservants,\nthe Levite,\nthe stranger,\nthe orphan,\nthe widow.\n\nno one\nwas supposed to celebrate\nalone."),
    (23, "you may not hide yourself", "Deuteronomy 22:1-3", 3, "it's easy\nnot to see\na wandering sheep.\n\nit isn't yours.\nyou're busy.\n\nbut the law\nsays: see it.\n\nbring it back.\nand if you don't know\nwhose it is,\n\ntake it home,\nfeed it,\nkeep it\nuntil someone\ncomes looking.\n\nlove\nis not looking away."),
    (24, "the mother bird", "Deuteronomy 22:6-7", 3, "a nest by the road,\na mother on her eggs.\n\nand even here,\nin a small thing,\nthe law says:\nlet her go.\n\nGod noticed\nthe bird.\n\nhe wanted you\nto notice her too."),
    (25, "the forgotten sheaf", "Deuteronomy 24:19-21", 3, "you missed one.\n\ndon't go back.\n\nleave the olives\non the high branch.\nleave the grapes\nyou didn't get to.\n\nsomeone is coming\nbehind you\nwith an empty basket.\n\nwhat you forget\nis how God\nremembers them."),
    (26, "the basket", "Deuteronomy 26:5-10", 3, "you set the basket down\nand tell the story,\nout loud:\n\nmy father was a wanderer,\nready to perish.\n\nwe went down to Egypt\nfew in number.\n\nwe were slaves.\nwe cried out.\nhe heard.\n\nhe brought us here.\n\nand here\nis the first\nof what the ground gave.\n\nevery basket\nis a small testimony."),
    (27, "sandals", "Deuteronomy 29:5-6", 4, "forty years\nof stones and sand\n\nand your sandals\ndid not wear out.\n\nno one writes songs\nabout sandals.\n\nbut think of every step\nthey carried,\nevery morning\nthey held.\n\nthe miracles\nyou walk in\nare the easiest\nto miss."),
    (28, "the secret things", "Deuteronomy 29:29", 4, "some things\nhe keeps.\n\nthe why.\nthe when.\nwhat's around the corner.\n\nand some things\nhe hands you,\nopen,\nplain as daylight.\n\ndon't spend your life\nat the locked box.\n\nlive\nby the lamp."),
    (29, "very near", "Deuteronomy 30:11-14", 4, "no one needs to climb\nto heaven for it.\n\nno one needs to sail\nacross the sea.\n\nit isn't too hard.\nit isn't too far.\n\nit's already here,\nin your mouth,\nin your heart.\n\nclose enough\nto do."),
    (30, "choose", "Deuteronomy 30:19-20", 4, "two roads,\nlaid out plain.\n\nGod doesn't hide\nwhich one he wants.\n\nchoose life.\n\nand then he tells you\nwhat life is:\n\nto love him,\nto hear him,\nto cling to him.\n\nfor he is\nyour life,\n\nand the length\nof your days."),
    (31, "he goes before you", "Deuteronomy 31:6-8", 4, "Moses wasn't going.\n\nso he called Joshua\nin front of everyone\nand said:\n\nbe strong.\nbe courageous.\n\nnot because\nyou are.\n\nbecause the Lord\nis already\non the other side\nof the river,\n\ngoing ahead,\nnot leaving,\nnot letting go."),
    (32, "like rain", "Deuteronomy 32:1-2", 4, "he didn't want to pound it in.\n\nhe wanted his words\nto fall\nlike rain\n\non new grass,\nlike dew\nyou don't hear arrive\n\nbut find in the morning\nall over everything."),
    (33, "the eagle", "Deuteronomy 32:10-12", 4, "he found them\nin a howling waste\n\nand kept them\nas the apple of his eye.\n\nand then,\nlike an eagle,\n\nhe stirred up the nest.\n\nit felt like\nfalling.\n\nbut the wings\nwere already underneath,\n\nspread wide,\n\nand they were carried\non his feathers\nthe whole way home."),
    (34, "underneath", "Deuteronomy 33:26-27", 4, "above\nis the sky\nhe rides on to help you.\n\naround\nis the home\nyou live in, which is him.\n\nand when you can't hold on,\n\nunderneath:\narms\nthat don't get tired."),
    (35, "Nebo", "Deuteronomy 34:1-4", 4, "he climbed up\nfrom the plains,\n\nand God\nshowed him everything:\n\nGilead to Dan,\nJudah to the sea,\nthe palms of Jericho.\n\nyou shall see it,\nGod said,\nwith your eyes.\n\nand Moses looked\nthe way you look\nat a promise\nyou know\nwill be kept."),
    (36, "no one knows where", "Deuteronomy 34:5-7", 4, "a hundred and twenty years,\nhis eyes still clear.\n\nand he died\naccording to the word,\nthere in Moab.\n\nand it seems God himself\nburied him.\n\nno stone.\nno shrine.\nno place to go and stand.\n\nonly the words\nhe left behind,\n\nand the people\nwalking on without him,\n\ntoward the land\nhe'd seen.")
]

def build_fire_by_night():
    os.makedirs(os.path.join(OUT_DIR, "fire-by-night/web"), exist_ok=True)
    os.makedirs(os.path.join(OUT_DIR, "fire-by-night/hero"), exist_ok=True)

    pdf_path = os.path.join(INTERIORS_DIR, "fire-by-night-interior-print.pdf")
    jpegs = extract_jpegs_from_pdf(pdf_path)

    scene_kinds = {
        5: "altar_fire",
        21: "menorah",
        32: "rock_water",
        33: "bronze_serpent"
    }

    manifest = {
        "slug": "fire-by-night",
        "title": "Fire by Night",
        "subtitle": "Leviticus & Numbers in Poems & Pictures",
        "beforeYouBegin": "Leviticus and Numbers are the books of the camp at Sinai and the long road after it. They hold a fire on the altar that must never go out, a handful of flour seasoned with salt, a goat walking alone into the desert, corners of a field left standing for the poor, and a horn that sounds liberty every fiftieth year. Then the camp sets out: a blessing spoken over the people, a cloud by day and fire by night, manna in the dew, a cluster of grapes carried on a pole, a dry rod covered in almond blossoms, water pouring from a rock, a donkey that stops in the road, and six cities with their gates open for anyone who needs to run.\n\nThis book walks through them in forty short poems, in five parts: two for Leviticus and three for Numbers. Each poem sits beside a picture and under a single line of Scripture.\n\nThe poems are not the Bible. They are one reader's response to it. Open the books of Leviticus and Numbers alongside this book, and let the real words have the last word.",
        "parts": [
            {
                "index": 1,
                "title": "Part One · The Fire on the Altar",
                "epigraph": "Fire shall be kept burning on the altar continually; it shall not go out.",
                "epigraphRef": "LEVITICUS 6:13",
                "startN": 1,
                "endN": 7
            },
            {
                "index": 2,
                "title": "Part Two · I Will Walk Among You",
                "epigraph": "I will walk among you, and will be your God, and you will be my people.",
                "epigraphRef": "LEVITICUS 26:12",
                "startN": 8,
                "endN": 16
            },
            {
                "index": 3,
                "title": "Part Three · Bless You and Keep You",
                "epigraph": "Yahweh bless you, and keep you.",
                "epigraphRef": "NUMBERS 6:24",
                "startN": 17,
                "endN": 24
            },
            {
                "index": 4,
                "title": "Part Four · Has His Hand Grown Short?",
                "epigraph": "Has Yahweh's hand grown short?",
                "epigraphRef": "NUMBERS 11:23",
                "startN": 25,
                "endN": 32
            },
            {
                "index": 5,
                "title": "Part Five · A Star Out of Jacob",
                "epigraph": "A star will come out of Jacob.",
                "epigraphRef": "NUMBERS 24:17",
                "startN": 33,
                "endN": 40
            }
        ],
        "cover": "assets/fire-by-night/web/f-003-000.jpg",
        "paintings": []
    }

    for idx, raw_jpg in enumerate(jpegs):
        jpg_name = f"f-003-{idx:03d}.jpg"
        web_out = os.path.join(OUT_DIR, "fire-by-night/web", jpg_name)
        with open(web_out, "wb") as f:
            f.write(raw_jpg)

        if idx == 0:
            continue

        hero_rel = f"assets/fire-by-night/web/{jpg_name}"
        if idx in scene_kinds:
            hero_out = os.path.join(OUT_DIR, "fire-by-night/hero", jpg_name)
            with open(hero_out, "wb") as hf:
                hf.write(raw_jpg)
            hero_rel = f"assets/fire-by-night/hero/{jpg_name}"

        pal = sample_palette_via_bmp(web_out)
        if idx in scene_kinds:
            pal["kind"] = scene_kinds[idx]

        _, title, ref, part_num, poem = FIRE_BY_NIGHT_POEMS[idx - 1]
        manifest["paintings"].append({
            "n": idx,
            "file": jpg_name,
            "webSrc": f"assets/fire-by-night/web/{jpg_name}",
            "heroSrc": hero_rel,
            "title": title,
            "ref": ref,
            "poem": poem,
            "part": part_num,
            "isScene": idx in scene_kinds,
            "sceneKind": scene_kinds.get(idx, None),
            "palette": pal
        })

    with open(os.path.join(OUT_DIR, "data/fire-by-night-manifest.json"), "w") as out_f:
        json.dump(manifest, out_f, indent=2)
    print("Successfully built fire-by-night-manifest.json with", len(manifest["paintings"]), "paintings.")

def build_choose_life():
    os.makedirs(os.path.join(OUT_DIR, "choose-life/web"), exist_ok=True)
    os.makedirs(os.path.join(OUT_DIR, "choose-life/hero"), exist_ok=True)

    pdf_path = os.path.join(INTERIORS_DIR, "choose-life-interior-print.pdf")
    jpegs = extract_jpegs_from_pdf(pdf_path)

    scene_kinds = {
        10: "mezuzah",
        25: "sheaf",
        30: "two_roads",
        35: "nebo"
    }

    manifest = {
        "slug": "choose-life",
        "title": "Choose Life",
        "subtitle": "Deuteronomy in Poems & Pictures",
        "beforeYouBegin": "Deuteronomy is Moses' farewell. The people are camped on the plains of Moab, with the wilderness behind them and the Jordan in front, and an old man stands up to remind them of everything: sandals that did not wear out in forty years, bread that came with the dew, a God who carried them like a father carries a child. He tells them to write his words on their doorposts, to open their hands to the poor, to leave a sheaf in the field for the widow, and to choose life. Then he climbs a mountain, sees the land, and is buried in a valley no one can find.\n\nThis book walks through it in thirty-six short poems, in four parts. Each poem sits beside a picture and under a single line of Scripture.\n\nThe poems are not the Bible. They are one reader's response to it. Open the book of Deuteronomy alongside this book, and let the real words have the last word.",
        "parts": [
            {
                "index": 1,
                "title": "Part One · Remember the Road",
                "epigraph": "You shall remember all the way which Yahweh your God has led you these forty years in the wilderness",
                "epigraphRef": "DEUTERONOMY 8:2",
                "startN": 1,
                "endN": 8
            },
            {
                "index": 2,
                "title": "Part Two · Hear, Israel",
                "epigraph": "You shall love Yahweh your God with all your heart, with all your soul, and with all your might.",
                "epigraphRef": "DEUTERONOMY 6:5",
                "startN": 9,
                "endN": 18
            },
            {
                "index": 3,
                "title": "Part Three · An Open Hand",
                "epigraph": "you shall surely open your hand to him",
                "epigraphRef": "DEUTERONOMY 15:8",
                "startN": 19,
                "endN": 26
            },
            {
                "index": 4,
                "title": "Part Four · Choose Life",
                "epigraph": "Therefore choose life, that you may live, you and your descendants",
                "epigraphRef": "DEUTERONOMY 30:19",
                "startN": 27,
                "endN": 36
            }
        ],
        "cover": "assets/choose-life/web/c-004-000.jpg",
        "paintings": []
    }

    for idx, raw_jpg in enumerate(jpegs):
        jpg_name = f"c-004-{idx:03d}.jpg"
        web_out = os.path.join(OUT_DIR, "choose-life/web", jpg_name)
        with open(web_out, "wb") as f:
            f.write(raw_jpg)

        if idx == 0:
            continue

        hero_rel = f"assets/choose-life/web/{jpg_name}"
        if idx in scene_kinds:
            hero_out = os.path.join(OUT_DIR, "choose-life/hero", jpg_name)
            with open(hero_out, "wb") as hf:
                hf.write(raw_jpg)
            hero_rel = f"assets/choose-life/hero/{jpg_name}"

        pal = sample_palette_via_bmp(web_out)
        if idx in scene_kinds:
            pal["kind"] = scene_kinds[idx]

        _, title, ref, part_num, poem = CHOOSE_LIFE_POEMS[idx - 1]
        manifest["paintings"].append({
            "n": idx,
            "file": jpg_name,
            "webSrc": f"assets/choose-life/web/{jpg_name}",
            "heroSrc": hero_rel,
            "title": title,
            "ref": ref,
            "poem": poem,
            "part": part_num,
            "isScene": idx in scene_kinds,
            "sceneKind": scene_kinds.get(idx, None),
            "palette": pal
        })

    with open(os.path.join(OUT_DIR, "data/choose-life-manifest.json"), "w") as out_f:
        json.dump(manifest, out_f, indent=2)
    print("Successfully built choose-life-manifest.json with", len(manifest["paintings"]), "paintings.")

if __name__ == "__main__":
    build_fire_by_night()
    build_choose_life()
