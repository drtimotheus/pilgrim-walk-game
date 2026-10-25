// ============================================================================
// THE PILGRIM WALK — Step-Through Scene Builder (§2 & §6, Komorebi Upgrade)
// Builds the three full-quality prototype scenes of Genesis directly from
// Timothy Holt's paintings with Komorebi atmospheric depth:
//   - Layered parallax silhouettes & carved relief backdrop
//   - Animated reflective water with sun glints & shoreline foam
//   - Thousands of wind-swaying instanced grass & wildflower tufts
//   - Angled 3D volumetric sunbeam / god-ray cones filtering through canopies
//   - Floating river lanterns & glowing golden threshold rings
// ============================================================================

import { createKomorebiWaterMaterial } from './postprocess.js?v=44_2';

export class StepThroughSceneManager {
  constructor(THREE, painterly, propBuilder) {
    this.THREE = THREE;
    this.painterly = painterly;
    this.propBuilder = propBuilder;
    this.activeScene = null;
  }

  buildStepThroughWorld(paintingData, rawTexture, skyDome, districtSlug = 'genesis') {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const n = paintingData.n;
    const pal = paintingData.palette || {};
    const kind = paintingData.sceneKind || paintingData.sceneType || (n === 1 ? 'light' : n === 4 ? 'garden' : 'bow');

    // Derive depth map, 360° outpainted surround texture, ground texture, prop texture & multi-plane cutouts from the painting
    const img = rawTexture.image;
    const derived = this.painterly.deriveSceneMapsFromImage(img, kind);

    // 1. Update Sky Dome to match this painting's sampled sky/horizon/ground/accent colors,
    // lifting dark palettes so the step-through sanctuary feels luminous and colorful
    const liftColor = (hex, minLum = 0.42, warmTint = '#fff2d8') => {
      const c = new THREE.Color(hex || '#7a6a55');
      const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
      if (lum < minLum) {
        c.lerp(new THREE.Color(warmTint), Math.min(0.65, (minLum - lum) * 1.35));
      }
      return c;
    };
    skyDome.material.uniforms.uTopColor.value.copy(liftColor(pal.top || '#4f6278', 0.36, '#6e88a6'));
    skyDome.material.uniforms.uHorizonColor.value.copy(liftColor(pal.horizon || '#b89b78', 0.54, '#f0d4a8'));
    skyDome.material.uniforms.uGroundColor.value.copy(liftColor(pal.ground || '#6e5c46', 0.38, '#a68c6b'));
    skyDome.material.uniforms.uAccentColor.value.copy(liftColor(pal.accent || '#e8c482', 0.68, '#ffe6a8'));
    skyDome.material.uniforms.uStarIntensity.value =
      (kind === 'light' || kind === 'passover' || kind === 'tabernacle') ? 0.55 : 0.0;
    skyDome.material.uniforms.uRainbowIntensity.value = kind === 'bow' ? 0.92 : 0.0;

    // 2. 360° Outpainted Painterly Horizon Cylinder (low enough so the open sky, clouds & rainbow shine overhead!)
    const surroundRadius = 46;
    const surroundHeight = 16;
    const surroundGeo = new THREE.CylinderGeometry(surroundRadius, surroundRadius, surroundHeight, 64, 16, true);
    const pos = surroundGeo.attributes.position;
    const uv = surroundGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      const wave = Math.sin(u * Math.PI * 8) * 1.8 + Math.cos(v * Math.PI * 4) * 1.2;
      const radScale = (surroundRadius - wave * (1.0 - Math.abs(v - 0.5))) / surroundRadius;
      pos.setX(i, pos.getX(i) * radScale);
      pos.setZ(i, pos.getZ(i) * radScale);
    }
    surroundGeo.computeVertexNormals();

    const surroundMat = new THREE.MeshBasicMaterial({
      map: derived.panoTex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.72
    });
    const surroundMesh = new THREE.Mesh(surroundGeo, surroundMat);
    surroundMesh.position.y = surroundHeight * 0.28;
    group.add(surroundMesh);

    // 3. Wrap-Around 210° Curved 3D Sculpted Painting Amphitheater + Multi-Plane Walk-Through Painting Wings
    // So stepping through the frame surrounds the player with the actual vibrant layered artwork of this exact painting!
    const dioramaGroup = this.createLayeredPaintingDiorama(rawTexture, derived, pal);
    group.add(dioramaGroup);

    // 4. Sculpted Painterly Terrain Floor derived from the bottom of the painting
    const terrainGeo = new THREE.PlaneGeometry(92, 92, 72, 72);
    terrainGeo.rotateX(-Math.PI / 2);
    const tPos = terrainGeo.attributes.position;
    const getTerrainHeight = (x, z) => {
      const distFromWalkway = Math.sqrt(x * x + z * z);
      if (kind === 'light') {
        const shoreMask = smoothstep(-4, 6, x + z * 0.35);
        return shoreMask * (0.35 + Math.sin(x * 0.3) * 0.15) - (1.0 - shoreMask) * 0.28;
      } else if (kind === 'garden') {
        const treeHill = Math.exp(-((x - 4.5) * (x - 4.5) + (z + 6.5) * (z + 6.5)) / 38.0) * 0.85;
        return treeHill + Math.sin(x * 0.18) * Math.cos(z * 0.18) * 0.22 * smoothstep(2, 14, distFromWalkway);
      } else {
        const arkRidge = smoothstep(-2, 18, x - z * 0.4) * 2.4;
        const altarSlope = Math.exp(-((x + 3.5) * (x + 3.5) + (z + 5.5) * (z + 5.5)) / 28.0) * 0.55;
        return arkRidge * smoothstep(4, 16, distFromWalkway) + altarSlope;
      }
    };

    for (let i = 0; i < tPos.count; i++) {
      const x = tPos.getX(i);
      const z = tPos.getZ(i);
      tPos.setY(i, getTerrainHeight(x, z));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: derived.groundTex,
      emissiveMap: derived.groundTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.42,
      roughness: kind === 'bow' ? 0.52 : 0.85,
      metalness: 0.04
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // 5. Low-lying Komorebi Mist / Valley Fog Planes drifting softly above the ground/water
    const mistGroup = this.createValleyMistLayers(pal.horizon || '#cfc3ac', pal.accent || '#dbb87b');
    group.add(mistGroup);

    // 6. THE ORIGINAL PAINTING ANCHOR & UNMISSABLE LIT EXIT DOORWAY (§5 & §6)
    const anchorGroup = new THREE.Group();
    anchorGroup.position.set(-2.6, 0, 3.8);
    anchorGroup.rotation.y = Math.PI - 0.25;
    const anchorMonument = this.propBuilder.createPaintingMonument(paintingData, rawTexture, false);
    anchorGroup.add(anchorMonument);
    group.add(anchorGroup);

    const exitDoorway = this.createLitExitDoorway(pal);
    exitDoorway.position.set(2.2, 0, 4.2);
    exitDoorway.rotation.y = Math.PI + 0.15;
    group.add(exitDoorway);

    // 7. Floating Golden Pollen / Light Motes sampled from the painting's accent color
    const motes = this.createAtmosphericMotes(pal.accent || '#ffe4a8', 220);
    group.add(motes);

    // 8. SCENE-SPECIFIC SIGNATURE INTERACTABLE ELEMENTS (§6 Bench Principle)
    let signatureState = {};
    if (kind === 'light') {
      signatureState = this.populateGenesis1LightScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'garden') {
      signatureState = this.populateGenesis4SeventhDayScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'bow') {
      signatureState = this.populateGenesis11RainbowScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'bush') {
      signatureState = this.populateExodus5BurningBushScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'passover') {
      signatureState = this.populateExodus14PassoverScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'redsea') {
      signatureState = this.populateExodus20RedSeaScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'tabernacle') {
      signatureState = this.populateExodus40TabernacleScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'altar_fire') {
      signatureState = this.populateFireByNightAltarScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'menorah') {
      signatureState = this.populateFireByNightMenorahScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'rock_water') {
      signatureState = this.populateFireByNightRockWaterScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'bronze_serpent') {
      signatureState = this.populateFireByNightBronzeSerpentScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'mezuzah') {
      signatureState = this.populateChooseLifeDoorpostScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'sheaf') {
      signatureState = this.populateChooseLifeForgottenSheafScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'two_roads') {
      signatureState = this.populateChooseLifeTwoRoadsScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'nebo') {
      signatureState = this.populateChooseLifeNeboScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'scarlet_line') {
      signatureState = this.populateJoshuaScarletLineScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'jordan_stones') {
      signatureState = this.populateJoshuaJordanStonesScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'jericho_walls') {
      signatureState = this.populateJoshuaJerichoShofarScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'torches_jars') {
      signatureState = this.populateJudgesTorchesJarsScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'ruth_road') {
      signatureState = this.populateRuthRoadScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'ruth_gleaning') {
      signatureState = this.populateRuthGleaningScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'threshing_cloak') {
      signatureState = this.populateRuthThreshingCloakScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'kinsman_sandal') {
      signatureState = this.populateRuthKinsmanSandalScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'samuel_lamp') {
      signatureState = this.populateSamuelLampScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'anointing_horn') {
      signatureState = this.populateSamuelAnointingHornScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'five_smooth_stones') {
      signatureState = this.populateSamuelSmoothStonesScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'kings_table') {
      signatureState = this.populateSamuelKingsTableScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'temple_cloud') {
      signatureState = this.populateKingsTempleCloudScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'carmel_fire') {
      signatureState = this.populateKingsCarmelFireScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'still_small_voice') {
      signatureState = this.populateKingsStillSmallVoiceScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'chariots_of_fire') {
      signatureState = this.populateKingsChariotsOfFireScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'seven_golden_lampstands') {
      signatureState = this.populateRevelation4LampstandsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'behold_i_stand_and_knock') {
      signatureState = this.populateRevelation8KnockingDoorScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'emerald_rainbow_throne') {
      signatureState = this.populateRevelation13LambThroneScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'river_of_life_new_jerusalem') {
      signatureState = this.populateRevelation38TreeOfLifeScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'streams_of_water') {
      signatureState = this.populatePsalms1PlantedScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'moon_and_stars') {
      signatureState = this.populatePsalms8MoonAndStarsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'green_pastures') {
      signatureState = this.populatePsalms23GreenPasturesScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'house_of_the_lord') {
      signatureState = this.populatePsalms27HouseOfTheLordScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'deer_brook') {
      signatureState = this.populatePsalms42DeerBrookScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'be_still_waters') {
      signatureState = this.populatePsalms46BeStillScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'tears_in_bottle') {
      signatureState = this.populatePsalms56TearBottleScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'rock_higher') {
      signatureState = this.populatePsalms61RockHigherScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'sanctuary_lamps') {
      signatureState = this.populatePsalms73SanctuaryScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'sparrow_altar') {
      signatureState = this.populatePsalms84SparrowAltarScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'shadow_of_wings') {
      signatureState = this.populatePsalms91ShadowOfWingsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'east_from_west') {
      signatureState = this.populatePsalms103EastFromWestScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'storm_stilled_haven') {
      signatureState = this.populatePsalms107HavenScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'lamp_to_my_feet') {
      signatureState = this.populatePsalms119LampToMyFeetScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'golden_sheaves') {
      signatureState = this.populatePsalms126GoldenSheavesScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'symphony_of_praise') {
      signatureState = this.populatePsalms150SymphonyOfPraiseScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'daniel_pulse_table') {
      signatureState = this.populateDaniel4PulseTableScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'fiery_furnace') {
      signatureState = this.populateDaniel14FieryFurnaceScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'open_window_jerusalem') {
      signatureState = this.populateDaniel24OpenWindowScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'lions_den_light') {
      signatureState = this.populateDaniel26LionsDenScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'seraph_live_coal') {
      signatureState = this.populateIsaiah6LiveCoalScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'peaceable_kingdom') {
      signatureState = this.populateIsaiah11PeaceableKingdomScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'wings_like_eagles') {
      signatureState = this.populateIsaiah40EagleWingsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'arise_shine_light') {
      signatureState = this.populateIsaiah60AriseShineScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'bethlehem_manger') {
      signatureState = this.populateLuke2BethlehemMangerScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'good_samaritan_inn') {
      signatureState = this.populateLuke10GoodSamaritanScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'prodigal_road_home') {
      signatureState = this.populateLuke15ProdigalRoadScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'emmaus_table_bread') {
      signatureState = this.populateLuke24EmmausTableScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'magi_star_gifts') {
      signatureState = this.populateMatthew2MagiStarScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'sermon_mount_lamp') {
      signatureState = this.populateMatthew5CityOnHillLampScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'walking_on_the_sea') {
      signatureState = this.populateMatthew14WalkingOnSeaScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'rolled_away_stone') {
      signatureState = this.populateMatthew28EmptyTombScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'peace_be_still_boat') {
      signatureState = this.populateMark4GalileeBoatScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'five_thousand_baskets') {
      signatureState = this.populateMark6GreenGrassBasketsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'bartimaeus_cloak') {
      signatureState = this.populateMark10BartimaeusCloakScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'alabaster_jar') {
      signatureState = this.populateMark14AlabasterJarScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'cana_stone_jars') {
      signatureState = this.populateJohn2CanaJarsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'jacob_well_jar') {
      signatureState = this.populateJohn4JacobsWellScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'upper_room_basin') {
      signatureState = this.populateJohn13UpperRoomBasinScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'galilee_charcoal_fire') {
      signatureState = this.populateJohn21CharcoalBreakfastScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'job_ash_heap') {
      signatureState = this.populateJob6AshHeapScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'scent_of_water') {
      signatureState = this.populateJob16ScentOfWaterScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'redeemer_rock') {
      signatureState = this.populateJob19RedeemerRockScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'whirlwind_stars') {
      signatureState = this.populateJob32WhirlwindStarsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'watching_almond_branch') {
      signatureState = this.populateJeremiah3AlmondBranchScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'jeremiah_potter_wheel') {
      signatureState = this.populateJeremiah16PottersWheelScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'exile_letter_scroll') {
      signatureState = this.populateJeremiah24ExileLetterScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'anathoth_deed_jars') {
      signatureState = this.populateJeremiah30AnathothDeedScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'chebar_rainbow_throne') {
      signatureState = this.populateEzekiel3ChebarWheelThroneScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'heart_of_flesh') {
      signatureState = this.populateEzekiel30HeartOfFleshScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'valley_of_dry_bones') {
      signatureState = this.populateEzekiel32DryBonesScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'temple_river_trees') {
      signatureState = this.populateEzekiel38TempleRiverScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'tarshish_storm_ship') {
      signatureState = this.populateJonah3StormShipScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'depths_of_the_sea') {
      signatureState = this.populateJonah8DepthsOfSeaScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'nineveh_sackcloth_throne') {
      signatureState = this.populateJonah16NinevehThroneScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'jonah_booth_vine') {
      signatureState = this.populateJonah22BoothVineScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'pentecost_upper_room') {
      signatureState = this.populateActs5PentecostRoomScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'gate_called_beautiful') {
      signatureState = this.populateActs9BeautifulGateScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'philippi_midnight_chains') {
      signatureState = this.populateActs29PhilippiMidnightScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'malta_four_anchors') {
      signatureState = this.populateActs37MaltaAnchorsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'throne_of_grace') {
      signatureState = this.populateHebrews16ThroneOfGraceScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'anchor_of_the_soul') {
      signatureState = this.populateHebrews19AnchorOfSoulScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'opened_curtain_way') {
      signatureState = this.populateHebrews23OpenedCurtainScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'cloud_of_witnesses_arena') {
      signatureState = this.populateHebrews33CloudOfWitnessesScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'chron_thresholds') {
      signatureState = this.populateChronicles4ThresholdsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'chron_ark_feast') {
      signatureState = this.populateChronicles8ArkFeastScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'chron_one_sound') {
      signatureState = this.populateChronicles18OneSoundScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'chron_eyes_on_you') {
      signatureState = this.populateChronicles24EyesOnYouScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'ezra_altar') {
      signatureState = this.populateEzra4AltarOnItsBaseScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'nehemiah_night_ride') {
      signatureState = this.populateNehemiah23NightRideScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'trowel_and_sword') {
      signatureState = this.populateNehemiah29TrowelAndSwordScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'water_gate_scroll') {
      signatureState = this.populateNehemiah34WaterGateScrollScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'susa_courtyard') {
      signatureState = this.populateEsther4SusaCourtyardScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'esther_fast') {
      signatureState = this.populateEsther16ThreeDayFastScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'golden_scepter') {
      signatureState = this.populateEsther18GoldenScepterScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'sleepless_chronicles') {
      signatureState = this.populateEsther21SleeplessChroniclesScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'wellspring_of_life') {
      signatureState = this.populateProverbs6WellspringScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'apples_of_gold') {
      signatureState = this.populateProverbs14ApplesOfGoldScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'iron_sharpens_iron') {
      signatureState = this.populateProverbs25IronSharpensIronScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'lamp_before_dawn') {
      signatureState = this.populateProverbs38LampBeforeDawnScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'rivers_to_the_sea') {
      signatureState = this.populateEcclesiastes4RiversToSeaScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'sundial_of_seasons') {
      signatureState = this.populateEcclesiastes13SundialSeasonsScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'threefold_cord') {
      signatureState = this.populateEcclesiastes16ThreefoldCordScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'blossoming_almond') {
      signatureState = this.populateEcclesiastes34BlossomingAlmondScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'banner_of_love') {
      signatureState = this.populateSong5BannerOfLoveScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'winter_is_past') {
      signatureState = this.populateSong7WinterIsPastScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'locked_garden_fountain') {
      signatureState = this.populateSong14EnclosedGardenScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'many_waters_flame') {
      signatureState = this.populateSong29ManyWatersFlameScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'solitary_city_lantern') {
      signatureState = this.populateLamentations1SolitaryWellScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'night_watch_water') {
      signatureState = this.populateLamentations10PourOutWaterScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'new_every_morning_dawn') {
      signatureState = this.populateLamentations14NewEveryMorningScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'restored_lyre') {
      signatureState = this.populateLamentations30RestoredLyreScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'valley_of_achor_door') {
      signatureState = this.populateHosea6DoorOfHopeScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'lily_and_olive_dew') {
      signatureState = this.populateHosea16DewLilyScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'restored_harvest_floor') {
      signatureState = this.populateJoel23RestoredHarvestScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'amos_plumb_line') {
      signatureState = this.populateAmos33PlumbLineScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'vine_and_fig_tree') {
      signatureState = this.populateMicah3VineAndFigTreeScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'habakkuk_watchtower') {
      signatureState = this.populateHabakkuk12WatchtowerScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'zechariah_olive_lampstand') {
      signatureState = this.populateZechariah28OliveLampstandScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'book_of_remembrance') {
      signatureState = this.populateMalachi38BookOfRemembranceScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'grace_where_we_stand') {
      signatureState = this.populateRomans9GraceWhereWeStandScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'spirit_of_adoption') {
      signatureState = this.populateRomans19SpiritOfAdoptionScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'nothing_can_separate_rock') {
      signatureState = this.populateRomans25NothingCanSeparateScene(group, derived, pal, getTerrainHeight, skyDome);
    } else if (kind === 'grafted_olive_tree') {
      signatureState = this.populateRomans30GraftedOliveTreeScene(group, derived, pal, getTerrainHeight, skyDome);
    } else {
      signatureState = this.populateBook9To44StepThroughScene(
        kind,
        paintingData,
        group,
        derived,
        pal,
        getTerrainHeight,
        skyDome,
        districtSlug
      );
    }

    // For Book 1-8 & Book 44 custom scenes that don't go through populateBook9To44StepThroughScene,
    // also mount a scene-specific 3D GLB model at the signatureTarget if one exists in assets/models/scenes/<slug>-<n>.glb
    if (
      this.propBuilder &&
      this.propBuilder.tripo &&
      districtSlug &&
      paintingData &&
      paintingData.n &&
      signatureState &&
      signatureState.signatureTarget &&
      ![
        'light', 'garden', 'bow', 'bush', 'passover', 'redsea', 'tabernacle',
        'altar_fire', 'menorah', 'rock_water', 'bronze_serpent',
        'mezuzah', 'sheaf', 'two_roads', 'nebo', 'jordan_stones', 'jericho_walls',
        'ruth_gleaning', 'samuel_lamp', 'five_smooth_stones', 'temple_cloud', 'carmel_fire',
        'seven_golden_lampstands', 'behold_i_stand_and_knock', 'emerald_rainbow_throne', 'river_of_life_new_jerusalem',
        'streams_of_water', 'moon_and_stars', 'green_pastures', 'house_of_the_lord',
        'deer_brook', 'be_still_waters', 'tears_in_bottle', 'rock_higher',
        'sanctuary_lamps', 'sparrow_altar', 'shadow_of_wings', 'east_from_west',
        'storm_stilled_haven', 'lamp_to_my_feet', 'golden_sheaves', 'symphony_of_praise',
        'daniel_pulse_table', 'fiery_furnace', 'open_window_jerusalem', 'lions_den_light',
        'seraph_live_coal', 'peaceable_kingdom', 'wings_like_eagles', 'arise_shine_light',
        'bethlehem_manger', 'good_samaritan_inn', 'prodigal_road_home', 'emmaus_table_bread',
        'magi_star_gifts', 'sermon_mount_lamp', 'walking_on_the_sea', 'rolled_away_stone',
        'peace_be_still_boat', 'five_thousand_baskets', 'bartimaeus_cloak', 'alabaster_jar',
        'cana_stone_jars', 'jacob_well_jar', 'upper_room_basin', 'galilee_charcoal_fire',
        'job_ash_heap', 'scent_of_water', 'redeemer_rock', 'whirlwind_stars',
        'watching_almond_branch', 'jeremiah_potter_wheel', 'exile_letter_scroll', 'anathoth_deed_jars',
        'chebar_rainbow_throne', 'heart_of_flesh', 'valley_of_dry_bones', 'temple_river_trees',
        'tarshish_storm_ship', 'depths_of_the_sea', 'nineveh_sackcloth_throne', 'jonah_booth_vine',
        'pentecost_upper_room', 'gate_called_beautiful', 'philippi_midnight_chains', 'malta_four_anchors',
        'throne_of_grace', 'anchor_of_the_soul', 'opened_curtain_way', 'cloud_of_witnesses_arena',
        'solitary_city_lantern', 'night_watch_water', 'new_every_morning_dawn', 'restored_lyre',
        'valley_of_achor_door', 'lily_and_olive_dew', 'restored_harvest_floor', 'amos_plumb_line',
        'vine_and_fig_tree', 'habakkuk_watchtower', 'zechariah_olive_lampstand', 'book_of_remembrance',
        'grace_where_we_stand', 'spirit_of_adoption', 'nothing_can_separate_rock', 'grafted_olive_tree'
      ].includes(kind)
    ) {
      const customSceneGlbHolder = new THREE.Group();
      customSceneGlbHolder.position.copy(signatureState.signatureTarget);
      group.add(customSceneGlbHolder);
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        customSceneGlbHolder,
        districtSlug,
        paintingData.n,
        { targetHeight: 3.0, yOffset: 0.25 }
      );
    }

    return {
      group,
      kind,
      paintingData,
      exitPosition: new THREE.Vector3(2.2, 0, 4.2),
      anchorPosition: new THREE.Vector3(-2.6, 0, 3.8),
      motes,
      mistGroup,
      ...signatureState
    };
  }

  // ==========================================================================
  // LAYERED 3D PAINTING DIORAMA (Curved 3D Relief Amphitheater + Walk-Through Wings)
  // Surrounds the pilgrim with multi-plane 3D artwork extracted from the exact painting
  // ==========================================================================
  createLayeredPaintingDiorama(rawTexture, derived, pal) {
    const THREE = this.THREE;
    const dGroup = new THREE.Group();

    // 1. 210° Wrap-Around Curved 3D Sculpted Painting Amphitheater
    // Uses self-illuminated emissiveMap so the exact vivid colors of the painting glow brightly,
    // and keeps height at 10.6m so the sky dome, clouds, and rainbow arch shine clearly above!
    const radius = 15.2;
    const height = 10.6;
    const arcGeo = new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      72,
      32,
      true,
      Math.PI * 0.42,
      Math.PI * 1.16
    );
    const arcUv = arcGeo.attributes.uv;
    for (let i = 0; i < arcUv.count; i++) {
      arcUv.setX(i, 1.0 - arcUv.getX(i));
    }
    const arcMat = new THREE.MeshStandardMaterial({
      map: rawTexture,
      emissiveMap: rawTexture,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.72,
      displacementMap: derived.depthTex,
      displacementScale: -2.2,
      displacementBias: 0.7,
      roughness: 0.68,
      metalness: 0.04,
      side: THREE.DoubleSide
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.position.set(0, height * 0.46 - 0.4, -2.2);
    dGroup.add(arcMesh);

    // 2. Multi-Plane Walk-Through 3D Painting Cutout Wings (Left & Right Foreground & Midground)
    // Self-illuminated with the painting's own colors so every wing is rich, bright, and true to the art
    const makeWing = (tex, w, h, x, y, z, rotY, dispScale = 1.1) => {
      if (!tex) return;
      const geo = new THREE.PlaneGeometry(w, h, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.74,
        displacementMap: derived.depthTex,
        displacementScale: dispScale,
        displacementBias: -dispScale * 0.4,
        roughness: 0.72,
        metalness: 0.03,
        transparent: true,
        alphaTest: 0.03,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      dGroup.add(mesh);
    };

    // Near foreground left & right painting wings (player walks right between them)
    makeWing(derived.leftWingTex, 7.2, 8.6, -5.6, 3.8, -3.0, 0.42, 1.05);
    makeWing(derived.rightWingTex, 7.2, 8.6, 5.6, 3.8, -3.0, -0.42, 1.05);

    // Mid-depth left & right painting wings framing the central sanctuary
    makeWing(derived.midLeftTex, 8.8, 9.6, -6.8, 4.3, -7.8, 0.34, 1.35);
    makeWing(derived.midRightTex, 8.8, 9.6, 6.8, 4.3, -7.8, -0.34, 1.35);

    // Deep-mid framing wings behind the central sculpture
    makeWing(derived.leftWingTex, 9.5, 10.2, -5.2, 4.6, -11.6, 0.20, 1.50);
    makeWing(derived.rightWingTex, 9.5, 10.2, 5.2, 4.6, -11.6, -0.20, 1.50);

    // 3. Sculpted Painting-Textured Foreground Rock Outcrops / Sanctuary Plinth Stones along the sides
    const outcropMat = new THREE.MeshStandardMaterial({
      map: derived.propTex,
      emissiveMap: derived.propTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.48,
      roughness: 0.80,
      metalness: 0.05
    });
    const outcropCoords = [
      { x: -4.4, z: -2.2, sx: 1.5, sy: 0.9, sz: 1.3 },
      { x: 4.5, z: -2.4, sx: 1.6, sy: 0.85, sz: 1.4 },
      { x: -5.8, z: -5.6, sx: 2.1, sy: 1.35, sz: 1.7 },
      { x: 5.9, z: -5.5, sx: 2.0, sy: 1.30, sz: 1.6 },
      { x: -4.8, z: -9.4, sx: 2.4, sy: 1.65, sz: 1.9 },
      { x: 4.9, z: -9.2, sx: 2.3, sy: 1.60, sz: 1.8 }
    ];
    outcropCoords.forEach((oc, idx) => {
      const geo = this.propBuilder.displaceGeometry(
        new THREE.DodecahedronGeometry(1.0, 2),
        0.14,
        2.4 + idx * 0.3
      );
      const mesh = new THREE.Mesh(geo, outcropMat);
      mesh.position.set(oc.x, oc.sy * 0.42, oc.z);
      mesh.scale.set(oc.sx, oc.sy, oc.sz);
      mesh.rotation.y = idx * 1.1;
      dGroup.add(mesh);
    });

    // 4. Warm Sanctuary Hemisphere + Gallery Stage Lights so no step-through scene ever feels dark!
    const sceneHemi = new THREE.HemisphereLight(0xfff4de, pal.ground || 0x8a7356, 1.25);
    dGroup.add(sceneHemi);

    const centerSanctuaryLight = new THREE.PointLight(0xfff2d6, 2.8, 38);
    centerSanctuaryLight.position.set(0, 7.2, -5.0);
    dGroup.add(centerSanctuaryLight);

    const leftWingLight = new THREE.PointLight(pal.accent || 0xffe29c, 2.0, 26);
    leftWingLight.position.set(-4.5, 4.5, -4.5);
    dGroup.add(leftWingLight);

    const rightWingLight = new THREE.PointLight(pal.accent || 0xffe29c, 2.0, 26);
    rightWingLight.position.set(4.5, 4.5, -4.5);
    dGroup.add(rightWingLight);

    return dGroup;
  }

  // Builds a bright, multi-layered 3D Rainbow Arch + Double-Rainbow Halo in the sky
  createVividRainbowSkyArch() {
    const THREE = this.THREE;
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, 1.2, -10.6);

    const bowColors = [
      0xff3b30, // Vivid Crimson Red
      0xff9500, // Luminous Amber Orange
      0xffe629, // Sunlit Covenant Gold
      0x34c759, // Emerald Green
      0x32ade6, // Cerulean Sky Blue
      0x5856d6, // Sapphire Indigo
      0xaf52de  // Royal Violet
    ];
    const bowMeshes = [];

    // Primary bright 7-band rainbow arch inside the amphitheater sky
    bowColors.forEach((hex, idx) => {
      const rInner = 7.4 + (6 - idx) * 0.34;
      const rOuter = rInner + 0.42;
      const arcGeo = new THREE.RingGeometry(rInner, rOuter, 72, 1, 0.08, Math.PI - 0.16);
      const arcMat = new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      bowGroup.add(arc);
      bowMeshes.push(arc);
    });

    // Secondary outer double-rainbow arch high in the clouds
    bowColors.forEach((hex, idx) => {
      const rInner = 11.2 + idx * 0.28;
      const rOuter = rInner + 0.32;
      const arcGeo = new THREE.RingGeometry(rInner, rOuter, 72, 1, 0.10, Math.PI - 0.20);
      const arcMat = new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.position.z = -1.2;
      bowGroup.add(arc);
      bowMeshes.push(arc);
    });

    return { bowGroup, bowMeshes };
  }

  // Creates drifting translucent Komorebi valley mist layers hugging the ground/water
  createValleyMistLayers(hexHorizon, hexAccent) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const mistTex = this.painterly.createGlowSpriteTexture(hexHorizon);

    for (let i = 0; i < 18; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: mistTex,
          color: new THREE.Color(hexHorizon).lerp(new THREE.Color(hexAccent), (i % 3) * 0.25),
          transparent: true,
          opacity: 0.16,
          depthWrite: false
        })
      );
      const ang = (i / 18) * Math.PI * 2;
      const rad = 7 + (i % 4) * 4.5;
      sp.position.set(Math.cos(ang) * rad, 0.85 + (i % 3) * 0.45, Math.sin(ang) * rad - 4.0);
      sp.scale.set(14 + (i % 3) * 5, 3.2, 1);
      group.add(sp);
    }
    return group;
  }

  // Creates the unmissable, warmly lit Exit Portal Archway back to the street (§5b)
  createLitExitDoorway(pal) {
    const THREE = this.THREE;
    const doorGroup = new THREE.Group();

    const archMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f754f',
      accentColor: '#ffe4a0',
      roughness: 0.7,
      emissive: '#3d2c14',
      emissiveIntensity: 0.4
    });

    for (const sx of [-1.1, 1.1]) {
      const postGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(0.32, 3.4, 0.36, 4, 10, 4), 0.025, 3.5);
      const post = new THREE.Mesh(postGeo, archMat);
      post.position.set(sx, 1.7, 0);
      doorGroup.add(post);
    }
    const lintelGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(2.7, 0.34, 0.42, 8, 3, 4), 0.025, 3.5);
    const lintel = new THREE.Mesh(lintelGeo, archMat);
    lintel.position.set(0, 3.5, 0);
    doorGroup.add(lintel);

    const portalGeo = new THREE.PlaneGeometry(2.05, 3.3);
    const portalMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ffe29c') }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * smoothstep(0.0, 0.15, vUv.y);
          float ripple = 0.5 + 0.5 * sin((vUv.y * 10.0 - uTime * 2.0) + sin(vUv.x * 8.0));
          float alpha = (0.32 + 0.20 * ripple) * edge;
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    });
    const portalPlane = new THREE.Mesh(portalGeo, portalMat);
    portalPlane.position.set(0, 1.68, 0);
    doorGroup.add(portalPlane);
    doorGroup.userData.portalMat = portalMat;

    const exitLight = new THREE.PointLight(0xffdfa0, 2.4, 14);
    exitLight.position.set(0, 2.6, 0.6);
    doorGroup.add(exitLight);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#2b2319';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#d9b471';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#f7e9cd';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('← BACK TO THE STREET', 256, 58);
    ctx.fillStyle = '#dbb87b';
    ctx.font = '22px Georgia, serif';
    ctx.fillText('Walk through or press [E] / [Esc]', 256, 96);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 0.58),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    signMesh.position.set(0, 4.05, 0.06);
    doorGroup.add(signMesh);

    return doorGroup;
  }

  // ==========================================================================
  // SCENE 1: Genesis No. 1 — "let there be" (Genesis 1:1–3)
  // ==========================================================================
  populateGenesis1LightScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Dark primordial water plane with animated golden wave reflections & sparkles
    const waterGeo = new THREE.PlaneGeometry(88, 88, 72, 72);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#16191e',
      shallowColor: '#3a342a',
      sunColor: '#f7d388',
      opacity: 0.92
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.04;
    group.add(waterMesh);

    // Floating lights/lanterns on the primordial water surface leading toward the First Light column
    const floatingOrbs = [];
    for (let i = 0; i < 9; i++) {
      const lantern = this.propBuilder.createFloatingRiverLantern('#ffe29c');
      const ang = (i / 9) * Math.PI * 1.4 - 2.2;
      const rad = 4.5 + (i % 3) * 3.8;
      lantern.position.set(-1.2 + Math.cos(ang) * rad, -0.02, -8.5 + Math.sin(ang) * rad);
      group.add(lantern);
      floatingOrbs.push(lantern);
    }

    // 2. Foreground shoreline props matching Timothy's painting No. 1
    const shoreProps = this.propBuilder.createStoneBench(derived.propTex, pal);
    shoreProps.position.set(2.8, -0.22, -2.5);
    shoreProps.rotation.y = -0.5;
    group.add(shoreProps);

    // Shepherd's lean-to tent shelter on the right embankment
    const tentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d684d',
      accentColor: '#c9a978',
      roughness: 0.94,
      side: THREE.DoubleSide
    });
    const tentGeo = this.propBuilder.displaceGeometry(new THREE.ConeGeometry(2.1, 2.3, 4, 6, true), 0.06, 2.5);
    const tent = new THREE.Mesh(tentGeo, tentMat);
    tent.position.set(5.4, 1.15, -4.2);
    tent.rotation.y = 0.6;
    group.add(tent);

    // Shoreline wind-swaying reeds/grass on the right embankment
    const shoreGrass = this.propBuilder.createInstancedMeadowGrass(
      260,
      () => {
        const x = 1.5 + Math.random() * 14.0;
        const z = -12.0 + Math.random() * 16.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(shoreGrass);

    // 3. SIGNATURE ELEMENT: The Column of First Light breaking onto the deep at (-1.2, 0, -8.5)
    const columnPos = new THREE.Vector3(-1.2, 0, -8.5);
    const columnGroup = new THREE.Group();
    columnGroup.position.copy(columnPos);

    const beamGeo = new THREE.CylinderGeometry(1.2, 2.8, 28, 32, 1, true);
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.62 },
        uColor: { value: new THREE.Color('#ffe4a3') }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float vFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
          float shimmer = 0.75 + 0.25 * sin(vUv.y * 18.0 - uTime * 2.2 + cos(vUv.x * 12.0));
          gl_FragColor = vec4(uColor, vFade * shimmer * uIntensity * 0.52);
        }
      `
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 13.5;
    columnGroup.add(beamMesh);

    const innerGeo = new THREE.CylinderGeometry(0.48, 1.2, 28, 24, 1, true);
    const innerMesh = new THREE.Mesh(innerGeo, beamMat);
    innerMesh.position.y = 13.5;
    columnGroup.add(innerMesh);

    // Concentric golden light rings on the water surface
    const ringGeo = new THREE.RingGeometry(0.6, 3.8, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe4a3,
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.08;
    columnGroup.add(ringMesh);

    const dawnLight = new THREE.PointLight(0xffe29c, 2.8, 42);
    dawnLight.position.set(0, 3.5, 0);
    columnGroup.add(dawnLight);

    group.add(columnGroup);

    return {
      signatureTarget: columnPos,
      signatureRadius: 4.2,
      signatureLabel: 'Step into the Column of First Light',
      signatureActivatedText: '“God said, ‘Let there be light,’ and there was light.” — First dawn spreads across the deep.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        beamMat.uniforms.uTime.value = time;

        floatingOrbs.forEach((orb, idx) => {
          orb.position.y = -0.02 + Math.sin(time * 1.8 + idx) * 0.04;
        });

        const inLight = distToSignature < 4.2;
        if (inLight) this._dawnLatched = Math.min(1.0, (this._dawnLatched || 0) + dt * 0.45);
        const curDawn = this._dawnLatched || 0;

        beamMat.uniforms.uIntensity.value = 0.62 + curDawn * 0.78;
        dawnLight.intensity = 2.8 + curDawn * 4.8;
        ringMesh.scale.setScalar(1.0 + curDawn * 0.85 + Math.sin(time * 2.0) * 0.08);

        skyDome.material.uniforms.uTopColor.value.lerpColors(
          new THREE.Color('#23221f'),
          new THREE.Color('#635847'),
          curDawn
        );
        skyDome.material.uniforms.uHorizonColor.value.lerpColors(
          new THREE.Color('#705f48'),
          new THREE.Color('#e6c07e'),
          curDawn
        );
        skyDome.material.uniforms.uStarIntensity.value = 0.35 + curDawn * 0.65;
        return inLight || curDawn > 0.85;
      }
    };
  }

  // ==========================================================================
  // SCENE 2: Genesis No. 4 — "the seventh day" (Genesis 2:1–3)
  // Full Komorebi Golden-Hour Garden:
  //   - Shimmering Komorebi river on the left with floating lanterns & arched stone footbridge
  //   - Grove of olive & oak trees framing the Great Tree of the Seventh Day
  //   - 900+ wind-swaying golden meadow grass & wildflower tufts
  //   - Volumetric Komorebi sunbeam shafts slanting through the branches onto the Stone Bench
  // ==========================================================================
  populateGenesis4SeventhDayScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Shimmering Komorebi river on the left horizon (matching painting No. 4)
    const riverGeo = new THREE.PlaneGeometry(54, 22, 48, 48);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#695c49',
      shallowColor: '#b89a78',
      sunColor: '#ffdfa3',
      opacity: 0.90
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.set(-11, 0.04, -12.5);
    group.add(river);

    // Arched stone footbridge over the river edge & floating river lanterns
    const bridge = this.propBuilder.createStoneFootbridge(pal);
    bridge.position.set(-8.5, 0.0, -9.5);
    bridge.rotation.y = 0.45;
    group.add(bridge);

    const riverLanterns = [];
    for (let i = 0; i < 6; i++) {
      const l = this.propBuilder.createFloatingRiverLantern('#ffe09e');
      l.position.set(-14 + i * 2.6, 0.06, -12.5 + Math.sin(i * 1.5) * 2.2);
      group.add(l);
      riverLanterns.push(l);
    }

    // 2. THE GREAT TREE OF THE SEVENTH DAY on the gentle rise + surrounding olive grove
    const treePos = new THREE.Vector3(3.4, 0.4, -6.8);
    const greatTree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.42);
    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountRelic(greatTree, 'sabbath-olive-tree', { scale: 1.0, yOffset: 0 });
    }
    greatTree.position.copy(treePos);
    group.add(greatTree);

    // Secondary olive trees framing the meadow (giving rich 3D parallax like Komorebi's forest)
    const groveCoords = [
      { x: 10.5, z: -9.5, s: 0.95 },
      { x: -6.8, z: -5.2, s: 0.78 },
      { x: 8.8, z: -2.0, s: 0.82 },
      { x: -3.5, z: -15.5, s: 1.05 },
      { x: 6.5, z: -15.0, s: 0.90 }
    ];
    groveCoords.forEach((g) => {
      const t = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, g.s);
      t.position.set(g.x, getTerrainHeight(g.x, g.z), g.z);
      t.rotation.y = g.x * 0.7;
      group.add(t);
    });

    // 3. THE SIGNATURE ELEMENT: THE STONE BENCH UNDER THE GREAT TREE
    const benchPos = new THREE.Vector3(1.5, 0.35, -5.2);
    const stoneBench = this.propBuilder.createStoneBench(derived.propTex, pal);
    stoneBench.position.copy(benchPos);
    stoneBench.rotation.y = -0.35;
    group.add(stoneBench);

    // 4. Angled 3D Komorebi Sunbeam Shafts pouring through the Great Tree canopy onto the bench
    const sunShafts = [];
    for (let i = 0; i < 5; i++) {
      const shaft = this.propBuilder.createKomorebiSunbeamShaft(
        15,
        0.65,
        2.6,
        '#ffe0a3'
      );
      shaft.position.set(1.2 + (i - 2) * 1.35, 5.8, -5.4 + (i % 2) * 0.9);
      group.add(shaft);
      sunShafts.push(shaft);
    }

    const sabbathLight = new THREE.PointLight(0xffd794, 2.5, 25);
    sabbathLight.position.set(1.5, 3.4, -4.8);
    group.add(sabbathLight);

    // 5. 950 Wind-Swaying Instanced Golden Meadow Grass & Wildflower Tufts
    const meadowGrass = this.propBuilder.createInstancedMeadowGrass(
      950,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 1.8 + Math.pow(Math.random(), 0.75) * 17.5;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 3.5;
        // Leave a small clear footpath right around the bench & exit doorway
        if (Math.hypot(x - 1.5, z + 5.2) < 1.5 || Math.hypot(x, z - 2.2) < 1.8) {
          return { x: x + 3.2, y: getTerrainHeight(x + 3.2, z), z };
        }
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(meadowGrass);

    return {
      signatureTarget: benchPos,
      signatureRadius: 3.4,
      signatureLabel: 'Rest at the Stone Bench under the Great Tree',
      signatureActivatedText: '“God blessed the seventh day, and made it holy.” — You rest beneath the shade of the tree.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        riverMat.uniforms.uTime.value = time;
        if (cameraPos) riverMat.uniforms.uCameraPos.value.copy(cameraPos);

        riverLanterns.forEach((l, idx) => {
          l.position.y = 0.06 + Math.sin(time * 1.6 + idx) * 0.03;
          l.position.x += Math.sin(time * 0.3 + idx) * 0.002;
        });

        const isResting = distToSignature < 3.4;
        if (isResting) this._restLatched = Math.min(1.0, (this._restLatched || 0) + dt * 0.4);
        const restVal = this._restLatched || 0;

        sabbathLight.intensity = 2.5 + restVal * 2.4 + Math.sin(time * 1.5) * 0.2;
        sunShafts.forEach((sh, idx) => {
          sh.material.uniforms.uOpacity.value = (0.20 + restVal * 0.18) * (0.85 + 0.15 * Math.sin(time * 1.1 + idx));
        });
        return isResting || restVal > 0.85;
      }
    };
  }

  // ==========================================================================
  // SCENE 3: Genesis No. 11 — "the bow in the cloud" (Genesis 9:13–15)
  // ==========================================================================
  populateGenesis11RainbowScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Shining wet post-flood Komorebi water channel & reflective puddles in the valley floor
    const floodWaterGeo = new THREE.PlaneGeometry(46, 28, 40, 40);
    floodWaterGeo.rotateX(-Math.PI / 2);
    const floodWaterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#58635e',
      shallowColor: '#9ba398',
      sunColor: '#f5ead4',
      opacity: 0.88
    });
    const floodWater = new THREE.Mesh(floodWaterGeo, floodWaterMat);
    floodWater.position.set(-9.5, 0.04, -10.5);
    group.add(floodWater);

    // 2. Sculpted Timber Ark resting high on the right slope (matching painting No. 11)
    const arkGroup = new THREE.Group();
    const timberMat = this.painterly.createPainterlyMaterial({
      map: derived.propTex,
      baseColor: '#78664e',
      accentColor: '#b59f82',
      roughness: 0.92,
      bumpScale: 0.07
    });
    const hullGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(9.5, 2.6, 2.8, 16, 6, 6), 0.06, 2.0);
    const hull = new THREE.Mesh(hullGeo, timberMat);
    hull.position.y = 1.3;
    arkGroup.add(hull);
    const roofGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(8.6, 0.6, 2.2, 12, 2, 4), 0.04, 2.5);
    const roof = new THREE.Mesh(roofGeo, timberMat);
    roof.position.y = 2.8;
    arkGroup.add(roof);
    arkGroup.position.set(10.5, 2.1, -14.5);
    arkGroup.rotation.y = -0.45;
    arkGroup.rotation.z = 0.04;
    group.add(arkGroup);

    // 3. THE SIGNATURE ELEMENT: NOAH'S STONE ALTAR on the slope at (-2.4, 0.35, -5.8)
    const altarPos = new THREE.Vector3(-2.4, 0.35, -5.8);
    const stoneAltar = this.propBuilder.createStoneAltar(derived.propTex, pal);
    stoneAltar.position.copy(altarPos);
    group.add(stoneAltar);

    // Angled sunbeam shafts breaking through the post-storm clouds onto the Stone Altar
    const altarShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 3.0, '#fff0c4');
    altarShaft.position.set(-2.4, 6.2, -5.8);
    group.add(altarShaft);

    // Fresh green olive saplings & wind-swaying hillside grass after the rain
    const hillsideGrass = this.propBuilder.createInstancedMeadowGrass(
      650,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.2 + Math.random() * 15.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 3.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(hillsideGrass);

    // 4. Great Vivid 3D Painterly Rainbow Arch + Double-Rainbow spanning the sky over the valley & altar
    const { bowGroup, bowMeshes } = this.createVividRainbowSkyArch();
    group.add(bowGroup);

    const altarLight = new THREE.PointLight(0xffe8b0, 2.8, 26);
    altarLight.position.set(-2.4, 2.5, -5.8);
    group.add(altarLight);

    return {
      signatureTarget: altarPos,
      signatureRadius: 3.6,
      signatureLabel: 'Approach the Stone Altar of Remembrance',
      signatureActivatedText: '“I set my rainbow in the cloud… when I see it, I will remember.” — The bow brightens across the sky.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        floodWaterMat.uniforms.uTime.value = time;
        if (cameraPos) floodWaterMat.uniforms.uCameraPos.value.copy(cameraPos);

        const nearAltar = distToSignature < 3.6;
        if (nearAltar) this._bowLatched = Math.min(1.0, (this._bowLatched || 0) + dt * 0.45);
        const bowVal = this._bowLatched || 0;

        skyDome.material.uniforms.uRainbowIntensity.value = 0.85 + bowVal * 0.15;
        bowMeshes.forEach((m, i) => {
          const baseOp = i < 7 ? 0.76 : 0.36;
          m.material.opacity = Math.min(0.98, baseOp + bowVal * 0.22 + Math.sin(time * 1.4 + i * 0.4) * 0.04);
        });
        altarLight.intensity = 2.8 + bowVal * 3.4;
        altarShaft.material.uniforms.uOpacity.value = 0.22 + bowVal * 0.25;
        if (stoneAltar.userData.emberSprite) {
          stoneAltar.userData.emberSprite.scale.setScalar(1.8 + bowVal * 1.4 + Math.sin(time * 3.0) * 0.15);
        }
        return nearAltar || bowVal > 0.85;
      }
    };
  }

  // ==========================================================================
  // EXODUS SCENE 1: Exodus No. 5 — "turn aside" (Exodus 3:1–3, The Burning Bush)
  // ==========================================================================
  populateExodus5BurningBushScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Rocky Mount Horeb boulders and crags framing the slope
    const rockMat = this.painterly.createPainterlyMaterial({
      map: derived.propTex,
      baseColor: pal.ground || '#694e38',
      accentColor: pal.accent || '#f0b865',
      roughness: 0.92,
      bumpScale: 0.07
    });

    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const rad = 6.5 + (i % 4) * 3.2;
      const rGeo = this.propBuilder.displaceGeometry(new THREE.DodecahedronGeometry(1.1 + (i % 3) * 0.65, 1), 0.12, 2.5);
      const rock = new THREE.Mesh(rGeo, rockMat);
      const rx = Math.cos(ang) * rad;
      const rz = Math.sin(ang) * rad - 5.5;
      rock.position.set(rx, getTerrainHeight(rx, rz) + 0.45, rz);
      rock.scale.set(1.3, 0.85 + (i % 3) * 0.35, 1.15);
      group.add(rock);
    }

    // 2. THE SIGNATURE ELEMENT: THE BURNING BUSH on Horeb's slope at (0.0, 0.35, -6.5)
    const bushPos = new THREE.Vector3(0.0, 0.35, -6.5);
    const burningBush = this.propBuilder.createBurningBush(derived.propTex, pal, 1.35);
    burningBush.position.copy(bushPos);
    group.add(burningBush);

    // Volumetric holy light shaft descending onto the Burning Bush
    const holyShaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.75, 3.2, '#ffd478');
    holyShaft.position.set(0.0, 6.8, -6.5);
    group.add(holyShaft);

    const bushLight = new THREE.PointLight(0xffb84d, 3.4, 30);
    bushLight.position.set(0.0, 2.5, -6.0);
    group.add(bushLight);

    return {
      signatureTarget: bushPos,
      signatureRadius: 4.0,
      signatureLabel: 'Turn aside to the Burning Bush on Holy Ground',
      signatureActivatedText: '“Take your sandals off your feet, for the place you stand on is holy ground.” — The bush burns and is not consumed.',
      updateScene: (dt, time, distToSignature) => {
        const nearBush = distToSignature < 4.0;
        if (nearBush) this._bushLatched = Math.min(1.0, (this._bushLatched || 0) + dt * 0.5);
        const val = this._bushLatched || 0;

        bushLight.intensity = 3.4 + val * 3.8 + Math.sin(time * 5.2) * 0.45;
        holyShaft.material.uniforms.uOpacity.value = 0.22 + val * 0.26;
        if (burningBush.userData.fireMat) {
          burningBush.userData.fireMat.uniforms.uIntensity.value = 1.15 + val * 0.65;
        }
        if (burningBush.userData.glowSprite) {
          burningBush.userData.glowSprite.scale.setScalar(5.2 + val * 2.2 + Math.sin(time * 4.0) * 0.25);
        }
        return nearBush || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // EXODUS SCENE 2: Exodus No. 14 — "when I see" (Exodus 12:7–13, Passover Doorway)
  // ==========================================================================
  populateExodus14PassoverScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. THE SIGNATURE ELEMENT: THE MARKED PASSOVER DOORWAY in Goshen at (0.0, 0.0, -6.2)
    const doorPos = new THREE.Vector3(0.0, 0.0, -6.2);
    const passoverDoor = this.propBuilder.createPassoverDoorway(derived.propTex, pal);
    passoverDoor.position.copy(doorPos);
    group.add(passoverDoor);

    // Neighboring Goshen mud-brick dwellings & date palms on left and right
    const wallMat = this.painterly.createPainterlyMaterial({
      map: derived.propTex,
      baseColor: '#4a3a2c',
      accentColor: '#8c6d50',
      roughness: 0.94
    });
    for (const sx of [-7.5, 7.5]) {
      const house = new THREE.Mesh(
        this.propBuilder.displaceGeometry(new THREE.BoxGeometry(4.5, 3.6, 3.8, 6, 6, 6), 0.05, 2.5),
        wallMat
      );
      house.position.set(sx, 1.8, -8.5);
      house.rotation.y = sx > 0 ? -0.35 : 0.35;
      group.add(house);
    }

    const thresholdLight = new THREE.PointLight(0xffcf78, 2.6, 22);
    thresholdLight.position.set(0, 2.4, -4.8);
    group.add(thresholdLight);

    const moonlightShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 2.8, '#e8d9b5');
    moonlightShaft.position.set(0, 6.2, -5.8);
    group.add(moonlightShaft);

    return {
      signatureTarget: doorPos,
      signatureRadius: 3.8,
      signatureLabel: 'Stand beneath the Blood-Marked Lintel & Doorposts',
      signatureActivatedText: '“When I see the blood, I will pass over you.” — Warm lamp-light shelters the household within.',
      updateScene: (dt, time, distToSignature) => {
        const nearDoor = distToSignature < 3.8;
        if (nearDoor) this._passoverLatched = Math.min(1.0, (this._passoverLatched || 0) + dt * 0.5);
        const val = this._passoverLatched || 0;

        thresholdLight.intensity = 2.6 + val * 3.2 + Math.sin(time * 2.8) * 0.2;
        if (passoverDoor.userData.lampSprite) {
          passoverDoor.userData.lampSprite.scale.set(2.8 + val * 1.4, 3.4 + val * 1.4, 1);
        }
        return nearDoor || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // EXODUS SCENE 3: Exodus No. 20 — "a road through" (Exodus 14:21–22, Red Sea Crossing)
  // ==========================================================================
  populateExodus20RedSeaScene(group, derived, pal) {
    const THREE = this.THREE;

    // 1. Towering Parted Walls of Water on the Left and Right of the dry seabed corridor
    const leftWall = this.propBuilder.createPartedSeaWall(44, 12.0, -1, pal);
    leftWall.position.set(-5.8, -0.2, -7.5);
    group.add(leftWall);

    const rightWall = this.propBuilder.createPartedSeaWall(44, 12.0, 1, pal);
    rightWall.position.set(5.8, -0.2, -7.5);
    group.add(rightWall);

    // 2. Reflective wet seabed puddles along the dry path through the sea
    const puddleGeo = new THREE.PlaneGeometry(9.5, 42, 32, 32);
    puddleGeo.rotateX(-Math.PI / 2);
    const puddleMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#264654',
      shallowColor: '#8c7758',
      sunColor: '#ffe29c',
      opacity: 0.55
    });
    const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
    puddleMesh.position.set(0, 0.03, -7.5);
    group.add(puddleMesh);

    // 3. THE SIGNATURE ELEMENT: The Mid-Sea Threshold & Guiding Pillar of Fire at (0.0, 0.0, -8.5)
    const seaRoadPos = new THREE.Vector3(0.0, 0.0, -8.5);
    const dawnShaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.9, 3.6, '#ffe4a0');
    dawnShaft.position.set(0, 7.2, -9.5);
    group.add(dawnShaft);

    const seaLight = new THREE.PointLight(0xffe099, 3.0, 32);
    seaLight.position.set(0, 3.5, -8.5);
    group.add(seaLight);

    // Exposed seabed boulders & coral rocks along the base of the water walls
    const rockMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4c524e',
      accentColor: '#c9b38c',
      roughness: 0.85
    });
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const rock = new THREE.Mesh(
        this.propBuilder.displaceGeometry(new THREE.DodecahedronGeometry(0.45 + (i % 3) * 0.2, 1), 0.05, 3.5),
        rockMat
      );
      rock.position.set(side * (4.2 + (i % 3) * 0.5), 0.2, -16 + i * 2.2);
      rock.scale.set(1.3, 0.65, 1.1);
      group.add(rock);
    }

    return {
      signatureTarget: seaRoadPos,
      signatureRadius: 4.2,
      signatureLabel: 'Walk the Dry Road Between the Walls of the Sea',
      signatureActivatedText: '“The children of Israel went into the midst of the sea on the dry ground; and the waters were a wall to them on their right hand, and on their left.”',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        puddleMat.uniforms.uTime.value = time;
        if (cameraPos) puddleMat.uniforms.uCameraPos.value.copy(cameraPos);

        const inCorridor = distToSignature < 4.2;
        if (inCorridor) this._seaLatched = Math.min(1.0, (this._seaLatched || 0) + dt * 0.45);
        const val = this._seaLatched || 0;

        seaLight.intensity = 3.0 + val * 3.5;
        dawnShaft.material.uniforms.uOpacity.value = 0.24 + val * 0.25;
        return inCorridor || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // EXODUS SCENE 4: Exodus No. 40 — "moving in" (Exodus 40:34–38, Tabernacle & Pillar)
  // ==========================================================================
  populateExodus40TabernacleScene(group, derived, pal) {
    const THREE = this.THREE;

    // 1. THE SIGNATURE ELEMENT: THE TABERNACLE & PILLAR OF CLOUD AND FIRE at (0.0, 0.0, -9.5)
    const tabernaclePos = new THREE.Vector3(0.0, 0.0, -5.2);
    const tabernacle = this.propBuilder.createTabernacleAndPillar(derived.propTex, pal, 1.0);
    tabernacle.position.set(0.0, 0.0, -10.5);
    group.add(tabernacle);

    const gloryLight = new THREE.PointLight(0xffd885, 3.5, 38);
    gloryLight.position.set(0.0, 4.5, -7.5);
    group.add(gloryLight);

    // Floating golden incense/fire lanterns flanking the forecourt approach
    for (const sx of [-2.8, 2.8]) {
      for (let z = -3.5; z >= -7.5; z -= 4.0) {
        const lantern = this.propBuilder.createFloatingRiverLantern('#ffe094');
        lantern.position.set(sx, 0.08, z);
        group.add(lantern);
      }
    }

    return {
      signatureTarget: tabernaclePos,
      signatureRadius: 4.2,
      signatureLabel: 'Approach the Forecourt of the Tabernacle & Pillar of Fire',
      signatureActivatedText: '“Then the cloud covered the Tent of Meeting, and Yahweh’s glory filled the tabernacle.” — The Pillar of Cloud and Fire shines over the camp.',
      updateScene: (dt, time, distToSignature) => {
        const nearTent = distToSignature < 4.2;
        if (nearTent) this._tentLatched = Math.min(1.0, (this._tentLatched || 0) + dt * 0.45);
        const val = this._tentLatched || 0;

        gloryLight.intensity = 3.5 + val * 4.2 + Math.sin(time * 3.2) * 0.35;
        if (tabernacle.userData.pillarMat) {
          tabernacle.userData.pillarMat.uniforms.uIntensity.value = 1.15 + val * 0.65;
        }
        if (tabernacle.userData.glorySprite) {
          tabernacle.userData.glorySprite.scale.setScalar(9.5 + val * 3.5 + Math.sin(time * 2.5) * 0.35);
        }
        return nearTent || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // FIRE BY NIGHT SCENE 1: No. 5 — "it shall not go out" (Leviticus 6:12–13)
  // ==========================================================================
  populateFireByNightAltarScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const altarPos = new THREE.Vector3(0.0, 0.0, -6.2);
    const altar = this.propBuilder.createPerpetualFireAltar(derived.propTex, pal);
    altar.position.copy(altarPos);
    group.add(altar);

    const dawnShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 3.0, '#ffd480');
    dawnShaft.position.set(0, 6.5, -6.2);
    group.add(dawnShaft);

    const fireLight = new THREE.PointLight(0xffb854, 3.2, 26);
    fireLight.position.set(0, 2.6, -6.2);
    group.add(fireLight);

    return {
      signatureTarget: altarPos,
      signatureRadius: 4.0,
      signatureLabel: 'Tend the Morning Wood on the Altar of Perpetual Fire',
      signatureActivatedText: '“The fire on the altar shall be kept burning on it, it shall not go out; and the priest shall burn wood on it every morning.”',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._altarLatched = Math.min(1.0, (this._altarLatched || 0) + dt * 0.5);
        const val = this._altarLatched || 0;
        fireLight.intensity = 3.2 + val * 3.5 + Math.sin(time * 4.5) * 0.35;
        if (altar.userData.fireMat) {
          altar.userData.fireMat.uniforms.uIntensity.value = 1.15 + val * 0.7;
        }
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // FIRE BY NIGHT SCENE 2: No. 21 — "seven lamps" (Numbers 8:2–3)
  // ==========================================================================
  populateFireByNightMenorahScene(group, derived, pal) {
    const THREE = this.THREE;
    const menorahPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const menorah = this.propBuilder.createGoldenMenorah(derived.propTex, pal);
    menorah.position.copy(menorahPos);
    group.add(menorah);

    const lampLight = new THREE.PointLight(0xffe094, 3.0, 24);
    lampLight.position.set(0, 2.8, -5.2);
    group.add(lampLight);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(14, 0.65, 2.8, '#ffe29c');
    shaft.position.set(0, 5.8, -5.8);
    group.add(shaft);

    return {
      signatureTarget: menorahPos,
      signatureRadius: 3.8,
      signatureLabel: 'Stand Before the Seven Lamps Shining Forward',
      signatureActivatedText: '“The seven lamps shall give light in front of the lamp stand.” — A light is not for looking at; it’s for seeing by.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 3.8;
        if (near) this._menorahLatched = Math.min(1.0, (this._menorahLatched || 0) + dt * 0.5);
        const val = this._menorahLatched || 0;
        lampLight.intensity = 3.0 + val * 3.4 + Math.sin(time * 3.2) * 0.2;
        if (menorah.userData.flameSprites) {
          menorah.userData.flameSprites.forEach((sp, idx) => {
            const s = 0.55 + val * 0.32 + Math.sin(time * 5.0 + idx) * 0.05;
            sp.scale.set(s, s * 1.35, 1);
          });
        }
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // FIRE BY NIGHT SCENE 3: No. 32 — "abundantly" (Numbers 20:11)
  // ==========================================================================
  populateFireByNightRockWaterScene(group, derived, pal) {
    const THREE = this.THREE;
    const rockPos = new THREE.Vector3(0.0, 0.0, -7.2);
    const crag = this.propBuilder.createWaterFromRockCrag(derived.propTex, pal);
    crag.position.copy(rockPos);
    group.add(crag);

    // Gushing turquoise desert stream flowing toward the player
    const streamGeo = new THREE.PlaneGeometry(5.5, 22, 32, 32);
    streamGeo.rotateX(-Math.PI / 2);
    const streamMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#1f5a6e',
      shallowColor: '#6cb8c4',
      sunColor: '#fff2cc',
      opacity: 0.88
    });
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.position.set(0, 0.05, -2.5);
    group.add(stream);

    const waterLight = new THREE.PointLight(0xa8e8f0, 2.6, 24);
    waterLight.position.set(0, 2.8, -5.5);
    group.add(waterLight);

    return {
      signatureTarget: new THREE.Vector3(0.0, 0.0, -4.8),
      signatureRadius: 4.0,
      signatureLabel: 'Drink from the Water Pouring Abundantly from the Rock',
      signatureActivatedText: '“Water came out abundantly, and the congregation drank.” — God did not let the people go thirsty.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        streamMat.uniforms.uTime.value = time;
        if (cameraPos) streamMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.0;
        if (near) this._rockWaterLatched = Math.min(1.0, (this._rockWaterLatched || 0) + dt * 0.5);
        return near || (this._rockWaterLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // FIRE BY NIGHT SCENE 4: No. 33 — "look and live" (Numbers 21:8–9)
  // ==========================================================================
  populateFireByNightBronzeSerpentScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const polePos = new THREE.Vector3(0.0, 0.0, -6.5);
    const pole = this.propBuilder.createBronzeSerpentPole(derived.propTex, pal);
    pole.position.copy(polePos);
    group.add(pole);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.75, 3.2, '#ffe298');
    shaft.position.set(0, 6.8, -6.5);
    group.add(shaft);

    const bronzeLight = new THREE.PointLight(0xffd478, 3.0, 28);
    bronzeLight.position.set(0, 4.5, -5.5);
    group.add(bronzeLight);

    return {
      signatureTarget: polePos,
      signatureRadius: 4.2,
      signatureLabel: 'Lift Your Eyes to the Bronze Serpent on the Pole',
      signatureActivatedText: '“When he looked at the serpent of bronze, he lived.” — Turn your eyes, and live.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._serpentLatched = Math.min(1.0, (this._serpentLatched || 0) + dt * 0.5);
        const val = this._serpentLatched || 0;
        bronzeLight.intensity = 3.0 + val * 3.6;
        if (pole.userData.glow) {
          pole.userData.glow.scale.setScalar(3.2 + val * 2.0 + Math.sin(time * 2.5) * 0.2);
        }
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // CHOOSE LIFE SCENE 1: No. 10 — "the doorpost" (Deuteronomy 6:6–9)
  // ==========================================================================
  populateChooseLifeDoorpostScene(group, derived, pal) {
    const THREE = this.THREE;
    const doorPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const doorpost = this.propBuilder.createMezuzahDoorpost(derived.propTex, pal);
    doorpost.position.copy(doorPos);
    group.add(doorpost);

    const oliveTree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 0.92);
    oliveTree.position.set(4.5, 0.0, -7.2);
    group.add(oliveTree);

    const doorLight = new THREE.PointLight(0xffe09c, 2.8, 22);
    doorLight.position.set(0, 2.4, -4.8);
    group.add(doorLight);

    return {
      signatureTarget: doorPos,
      signatureRadius: 3.8,
      signatureLabel: 'Touch the Words Written on the Doorpost',
      signatureActivatedText: '“You shall write them on the door posts of your house and on your gates.” — Faith isn’t a room in the house; it’s the doorway to all of them.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 3.8;
        if (near) this._mezuzahLatched = Math.min(1.0, (this._mezuzahLatched || 0) + dt * 0.5);
        const val = this._mezuzahLatched || 0;
        doorLight.intensity = 2.8 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // CHOOSE LIFE SCENE 2: No. 25 — "the forgotten sheaf" (Deuteronomy 24:19–21)
  // ==========================================================================
  populateChooseLifeForgottenSheafScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const sheafPos = new THREE.Vector3(1.2, 0.0, -5.8);
    const sheaf = this.propBuilder.createForgottenSheafField(derived.propTex, pal);
    sheaf.position.copy(sheafPos);
    group.add(sheaf);

    const oliveTree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.15);
    oliveTree.position.set(-3.8, 0.0, -6.5);
    group.add(oliveTree);

    const wheatField = this.propBuilder.createInstancedMeadowGrass(
      880,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.0 + Math.random() * 15.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight(x, z), z, scale: 0.9 + Math.random() * 0.55 };
      },
      { ground: '#a68546', accent: '#f5d88c', horizon: pal.horizon || '#ccb288' }
    );
    group.add(wheatField);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 3.0, '#ffe49c');
    shaft.position.set(1.2, 6.2, -5.8);
    group.add(shaft);

    return {
      signatureTarget: sheafPos,
      signatureRadius: 3.8,
      signatureLabel: 'Pause Beside the Forgotten Sheaf Left for the Stranger',
      signatureActivatedText: '“It shall be for the foreigner, for the fatherless, and for the widow.” — What you forget is how God remembers them.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 3.8;
        if (near) this._sheafLatched = Math.min(1.0, (this._sheafLatched || 0) + dt * 0.5);
        return near || (this._sheafLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // CHOOSE LIFE SCENE 3: No. 30 — "choose" (Deuteronomy 30:19–20, Two Roads Fork)
  // ==========================================================================
  populateChooseLifeTwoRoadsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const forkPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const fork = this.propBuilder.createTwoRoadsForkAndWitness(derived.propTex, pal);
    fork.position.copy(forkPos);
    group.add(fork);

    // Lush olive trees & golden sunbeams along the right-hand Road of Life
    for (let i = 0; i < 3; i++) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 0.85 + i * 0.1);
      tree.position.set(5.2 + i * 1.8, 0, -6.5 - i * 3.5);
      group.add(tree);
    }

    const lifeShaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.8, 3.2, '#ffe49c');
    lifeShaft.position.set(3.2, 6.5, -8.5);
    group.add(lifeShaft);

    const grass = this.propBuilder.createInstancedMeadowGrass(
      520,
      () => {
        const x = 1.0 + Math.random() * 14.0;
        const z = -16.0 + Math.random() * 16.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(grass);

    return {
      signatureTarget: forkPos,
      signatureRadius: 4.0,
      signatureLabel: 'Stand at the Stone of Witness & Choose the Road of Life',
      signatureActivatedText: '“I have set before you life and death, the blessing and the curse. Therefore choose life, that you may live.”',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._chooseLatched = Math.min(1.0, (this._chooseLatched || 0) + dt * 0.5);
        const val = this._chooseLatched || 0;
        lifeShaft.material.uniforms.uOpacity.value = 0.22 + val * 0.26;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // CHOOSE LIFE SCENE 4: No. 35 — "Nebo" (Deuteronomy 34:1–4, Mount Nebo Overlook)
  // ==========================================================================
  populateChooseLifeNeboScene(group, derived, pal) {
    const THREE = this.THREE;
    const neboPos = new THREE.Vector3(0.0, 0.4, -6.0);

    // Rocky Mount Nebo summit ledge + Moses' staff resting on the cairn
    const cairn = this.propBuilder.createStoneAltar(derived.propTex, pal);
    cairn.position.copy(neboPos);
    group.add(cairn);

    // Winding Jordan River shimmering in the valley below
    const jordanGeo = new THREE.PlaneGeometry(64, 18, 48, 32);
    jordanGeo.rotateX(-Math.PI / 2);
    const jordanMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#3a5d66',
      shallowColor: '#b59d78',
      sunColor: '#ffe4a3',
      opacity: 0.88
    });
    const jordan = new THREE.Mesh(jordanGeo, jordanMat);
    jordan.position.set(0, -0.35, -15.5);
    group.add(jordan);

    const vistaShaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.9, 3.8, '#ffe6a3');
    vistaShaft.position.set(0, 7.2, -10.5);
    group.add(vistaShaft);

    return {
      signatureTarget: neboPos,
      signatureRadius: 4.0,
      signatureLabel: 'Look Out from Mount Nebo Across the Promised Land',
      signatureActivatedText: '“I have caused you to see it with your eyes… Gilead to Dan, Judah to the sea, the palms of Jericho.” — A promise you know will be kept.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        jordanMat.uniforms.uTime.value = time;
        if (cameraPos) jordanMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.0;
        if (near) this._neboLatched = Math.min(1.0, (this._neboLatched || 0) + dt * 0.5);
        return near || (this._neboLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) SCENE 1: No. 3 — "the scarlet line" (Joshua 2:8–21)
  // ==========================================================================
  populateJoshuaScarletLineScene(group, derived, pal) {
    const THREE = this.THREE;
    const wallPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const rahab = this.propBuilder.createRahabScarletWindowWall();
    rahab.group.position.copy(wallPos);
    group.add(rahab.group);

    for (const sx of [-4.2, 4.2]) {
      const palm = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 0.9);
      palm.position.set(sx, 0, -6.5);
      group.add(palm);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 2.8, '#ffcfb0');
    shaft.position.set(0.1, 6.2, -5.5);
    group.add(shaft);

    return {
      signatureTarget: wallPos,
      signatureRadius: 4.0,
      signatureLabel: 'Touch the Scarlet Cord Knotted in the Window',
      signatureActivatedText: '“Then she tied the scarlet line in the window.” — A woman on the wall tying a red thread like a knot in a promise: remember me, remember my house.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._scarletLatched = Math.min(1.0, (this._scarletLatched || 0) + dt * 0.5);
        const val = this._scarletLatched || 0;
        rahab.cordLight.intensity = 1.6 + val * 2.4 + Math.sin(time * 3.0) * 0.2;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) SCENE 2: No. 6 — "what these stones mean" (Joshua 4:1–24)
  // ==========================================================================
  populateJoshuaJordanStonesScene(group, derived, pal) {
    const THREE = this.THREE;
    const cairnPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const cairn = this.propBuilder.createTwelveJordanStones();
    cairn.group.position.copy(cairnPos);
    group.add(cairn.group);

    // Shimmering Jordan river shallows around the 12 stones
    const waterGeo = new THREE.PlaneGeometry(36, 18, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#365459',
      shallowColor: '#8fa69e',
      sunColor: '#ffe4a8',
      opacity: 0.86
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, 0.04, -8.5);
    group.add(water);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.0, '#ffe4a3');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    return {
      signatureTarget: cairnPos,
      signatureRadius: 4.0,
      signatureLabel: 'Place Your Hand on the Twelve Stones from the Jordan Riverbed',
      signatureActivatedText: '“What do these stones mean? … Israel came over this Jordan on dry land.”',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.0;
        if (near) this._jordanStonesLatched = Math.min(1.0, (this._jordanStonesLatched || 0) + dt * 0.5);
        cairn.cairnLight.intensity = 1.8 + (this._jordanStonesLatched || 0) * 2.5;
        return near || (this._jordanStonesLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) SCENE 3: No. 10 — "the wall fell down flat" (Joshua 6:15–20)
  // ==========================================================================
  populateJoshuaJerichoShofarScene(group, derived, pal) {
    const THREE = this.THREE;
    const shofarPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const shofar = this.propBuilder.createJerichoShofarAndFallenStones();
    shofar.group.position.copy(shofarPos);
    group.add(shofar.group);

    const oliveTree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.05);
    oliveTree.position.set(-4.2, 0, -7.2);
    group.add(oliveTree);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.8, 3.2, '#ffe49e');
    shaft.position.set(0, 6.4, -5.6);
    group.add(shaft);

    return {
      signatureTarget: shofarPos,
      signatureRadius: 4.0,
      signatureLabel: 'Sound the Ram’s Horn Shofar Among the Fallen Stones of Jericho',
      signatureActivatedText: '“The people shouted with a great shout, and the wall fell down flat.” — Not pushed. Not climbed. Just told.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._shofarLatched = Math.min(1.0, (this._shofarLatched || 0) + dt * 0.5);
        shofar.hornLight.intensity = 1.8 + (this._shofarLatched || 0) * 2.8;
        return near || (this._shofarLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) SCENE 4: No. 33 — "torches in jars" (Judges 7:16–21)
  // ==========================================================================
  populateJudgesTorchesJarsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const jarPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const gideon = this.propBuilder.createGideonBrokenPitcherAndTorch();
    gideon.group.position.copy(jarPos);
    group.add(gideon.group);

    // Circle of 12 distant blazing torches around the valley rim ("three hundred small lights blazing all at once")
    const rimLights = [];
    const glowTex = this.painterly.createGlowSpriteTexture('#ffae42');
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 1.4 - Math.PI * 1.2;
      const rad = 14.5;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad - 4.0;
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffc466,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending
        })
      );
      sp.position.set(x, getTerrainHeight(x, z) + 1.2, z);
      sp.scale.set(1.4, 1.8, 1);
      group.add(sp);
      rimLights.push(sp);
    }

    return {
      signatureTarget: jarPos,
      signatureRadius: 4.0,
      signatureLabel: 'Stand by the Broken Clay Pitcher & Blazing Torch',
      signatureActivatedText: '“They broke the pitchers, and held the torches in their left hands… Sometimes the light only gets out when the jar breaks.”',
      updateScene: (dt, time, distToSignature, skyDome) => {
        const near = distToSignature < 4.0;
        if (near) this._gideonLatched = Math.min(1.0, (this._gideonLatched || 0) + dt * 0.5);
        const val = this._gideonLatched || 0;
        if (skyDome && skyDome.material.uniforms.uStarIntensity) {
          skyDome.material.uniforms.uStarIntensity.value = 0.65 + val * 0.35;
        }
        gideon.torchLight.intensity = 2.8 + val * 3.2 + Math.sin(time * 6.0) * 0.35;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VI (RUTH) SCENE 1: No. 4 — "where you go" (Ruth 1:14–17)
  // ==========================================================================
  populateRuthRoadScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const roadPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const fork = this.propBuilder.createRuthRoadForkAndMilestone();
    fork.group.position.copy(roadPos);
    group.add(fork.group);

    for (const sx of [-3.8, 4.2]) {
      const olive = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 0.95);
      olive.position.set(sx, 0, -6.8);
      group.add(olive);
    }

    const grass = this.propBuilder.createInstancedMeadowGrass(
      480,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 3.0 + Math.random() * 14.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(grass);

    return {
      signatureTarget: roadPos,
      signatureRadius: 4.0,
      signatureLabel: 'Walk the Bethlehem Road Beside Naomi & Ruth',
      signatureActivatedText: '“Where you go, I will go; and where you stay, I will stay; your people shall be my people, and your God my God.”',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._ruthRoadLatched = Math.min(1.0, (this._ruthRoadLatched || 0) + dt * 0.5);
        fork.roadLight.intensity = 1.8 + (this._ruthRoadLatched || 0) * 2.5;
        return near || (this._ruthRoadLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VI (RUTH) SCENE 2: No. 8 — "the edges" (Ruth 2:2–7)
  // ==========================================================================
  populateRuthGleaningScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const sheafPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const sheaf = this.propBuilder.createForgottenSheafField(derived.propTex, pal);
    sheaf.position.copy(sheafPos);
    group.add(sheaf);

    const barleyField = this.propBuilder.createInstancedMeadowGrass(
      920,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.0 + Math.random() * 15.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight(x, z), z, scale: 0.95 + Math.random() * 0.55 };
      },
      { ground: '#b08f4f', accent: '#f7de94', horizon: pal.horizon || '#d4ba8c' }
    );
    group.add(barleyField);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.2, '#ffe6a3');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    return {
      signatureTarget: sheafPos,
      signatureRadius: 4.0,
      signatureLabel: 'Gather Golden Barley at the Field’s Edge',
      signatureActivatedText: '“Let me glean and gather after the reapers among the sheaves.” — Not ashamed to begin with leftovers; so much grace starts at the edges.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._ruthGleanLatched = Math.min(1.0, (this._ruthGleanLatched || 0) + dt * 0.5);
        return near || (this._ruthGleanLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VI (RUTH) SCENE 3: No. 15 — "the corner of the cloak" (Ruth 3:9)
  // ==========================================================================
  populateRuthThreshingCloakScene(group, derived, pal) {
    const THREE = this.THREE;
    const cloakPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const threshing = this.propBuilder.createThreshingFloorCloak();
    threshing.group.position.copy(cloakPos);
    group.add(threshing.group);

    const moonShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 3.0, '#ffe8b0');
    moonShaft.position.set(0.3, 6.2, -5.6);
    group.add(moonShaft);

    return {
      signatureTarget: cloakPos,
      signatureRadius: 4.0,
      signatureLabel: 'Stand by the Starlit Threshing Floor & Kinsman’s Cloak',
      signatureActivatedText: '“Spread the corner of your garment over your servant; for you are a near kinsman.” — Sometimes God’s wings look like a person willing to be the answer.',
      updateScene: (dt, time, distToSignature, skyDome) => {
        const near = distToSignature < 4.0;
        if (near) this._ruthCloakLatched = Math.min(1.0, (this._ruthCloakLatched || 0) + dt * 0.5);
        const val = this._ruthCloakLatched || 0;
        if (skyDome && skyDome.material.uniforms.uStarIntensity) {
          skyDome.material.uniforms.uStarIntensity.value = 0.75 + val * 0.25;
        }
        threshing.cloakLight.intensity = 1.8 + val * 2.6;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VI (RUTH) SCENE 4: No. 20 — "the sandal" (Ruth 4:6–8)
  // ==========================================================================
  populateRuthKinsmanSandalScene(group, derived, pal) {
    const THREE = this.THREE;
    const sandalPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const gateSandal = this.propBuilder.createBethlehemGateAndSandal();
    gateSandal.group.position.copy(sandalPos);
    group.add(gateSandal.group);

    const olive = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.0);
    olive.position.set(3.8, 0, -6.5);
    group.add(olive);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.0, '#ffe49e');
    shaft.position.set(0, 6.2, -5.3);
    group.add(shaft);

    return {
      signatureTarget: sandalPos,
      signatureRadius: 4.0,
      signatureLabel: 'Witness the Kinsman’s Sandal of Redemption at the Gate',
      signatureActivatedText: '“A man took off his sandal, and gave it to his neighbor.” — One man kept his inheritance safe; the other gave himself away, and his is the name we still say.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._ruthSandalLatched = Math.min(1.0, (this._ruthSandalLatched || 0) + dt * 0.5);
        gateSandal.sandalLight.intensity = 1.8 + (this._ruthSandalLatched || 0) * 2.8;
        return near || (this._ruthSandalLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VII (1–2 SAMUEL) SCENE 1: No. 6 — "speak" (1 Samuel 3:1–10)
  // ==========================================================================
  populateSamuelLampScene(group, derived, pal) {
    const THREE = this.THREE;
    const lampPos = new THREE.Vector3(0.0, 0.0, -5.4);
    const lampRig = this.propBuilder.createSamuelLampAndMat();
    lampRig.group.position.copy(lampPos);
    group.add(lampRig.group);

    // Hannah's little linen robe table nearby in Shiloh sanctuary
    const robeTable = this.propBuilder.createLinenRobeTable();
    robeTable.position.set(2.8, 0, -6.4);
    robeTable.rotation.y = -0.35;
    group.add(robeTable);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.72, 2.8, '#ffda85');
    shaft.position.set(0.2, 6.2, -5.4);
    group.add(shaft);

    return {
      signatureTarget: lampPos,
      signatureRadius: 4.0,
      signatureLabel: 'Kneel Beside the Lamp That Had Not Gone Out',
      signatureActivatedText: '“Speak; for your servant hears.” — The lamp had not yet gone out, and God was not waiting for him to be older, only to be listening.',
      updateScene: (dt, time, distToSignature, skyDome) => {
        const near = distToSignature < 4.0;
        if (near) this._samuelLampLatched = Math.min(1.0, (this._samuelLampLatched || 0) + dt * 0.5);
        const val = this._samuelLampLatched || 0;
        const pulse = 1.0 + Math.sin(time * 5.2) * 0.12;
        lampRig.lampLight.intensity = (2.2 + val * 3.0) * pulse;
        lampRig.flameMesh.scale.set(1.0 + val * 0.3, (1.0 + val * 0.45) * pulse, 1.0 + val * 0.3);
        if (skyDome && skyDome.material.uniforms.uStarIntensity) {
          skyDome.material.uniforms.uStarIntensity.value = 0.65 + val * 0.25;
        }
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VII (1–2 SAMUEL) SCENE 2: No. 15 — "the youngest" (1 Samuel 16:6–13)
  // ==========================================================================
  populateSamuelAnointingHornScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const hornPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const hornRig = this.propBuilder.createAnointingHornPedestal();
    hornRig.group.position.copy(hornPos);
    group.add(hornRig.group);

    // David's harp leaning near an olive tree on the Bethlehem pasture ridge
    const harp = this.propBuilder.createDavidHarp(1.1);
    harp.position.set(-2.4, 0, -5.2);
    harp.rotation.y = 0.4;
    group.add(harp);

    const olive = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.05);
    olive.position.set(3.9, 0, -7.2);
    group.add(olive);

    const pastureGrass = this.propBuilder.createInstancedMeadowGrass(
      800,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.2 + Math.random() * 14.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight ? getTerrainHeight(x, z) : 0, z, scale: 0.85 + Math.random() * 0.45 };
      },
      pal
    );
    group.add(pastureGrass);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.78, 3.1, '#ffe28c');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    return {
      signatureTarget: hornPos,
      signatureRadius: 4.0,
      signatureLabel: 'Lift the Horn of Anointing Oil in the Shepherd’s Field',
      signatureActivatedText: '“Man looks at the outward appearance, but Yahweh looks at the heart.” — The whole feast stood waiting until the youngest came in from the sheep.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._samuelHornLatched = Math.min(1.0, (this._samuelHornLatched || 0) + dt * 0.5);
        const val = this._samuelHornLatched || 0;
        hornRig.hornLight.intensity = 2.1 + val * 2.8;
        hornRig.hornGroup.position.y = 0.84 + Math.sin(time * 2.2) * 0.03 * (1 + val);
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VII (1–2 SAMUEL) SCENE 3: No. 18 — "five smooth stones" (1 Samuel 17:40–50)
  // ==========================================================================
  populateSamuelSmoothStonesScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const brookPos = new THREE.Vector3(0.0, 0.0, -5.5);
    const brookRig = this.propBuilder.createSmoothStonesBrook();
    brookRig.group.position.copy(brookPos);
    group.add(brookRig.group);

    const valleyGrass = this.propBuilder.createInstancedMeadowGrass(
      760,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.8 + Math.random() * 14.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight ? getTerrainHeight(x, z) : 0, z, scale: 0.8 + Math.random() * 0.5 };
      },
      pal
    );
    group.add(valleyGrass);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.8, 3.2, '#ffe89e');
    shaft.position.set(0, 6.2, -5.5);
    group.add(shaft);

    return {
      signatureTarget: brookPos,
      signatureRadius: 4.0,
      signatureLabel: 'Reach into the Brook for the Five Smooth Stones',
      signatureActivatedText: '“Chose for himself five smooth stones out of the brook.” — Stones the water had been shaping for years, like the boy choosing them. One stone was enough.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._samuelStonesLatched = Math.min(1.0, (this._samuelStonesLatched || 0) + dt * 0.5);
        const val = this._samuelStonesLatched || 0;
        brookRig.brookLight.intensity = 2.2 + val * 2.8;
        brookRig.stones.forEach((st, idx) => {
          st.position.y = 0.13 + Math.sin(time * 2.6 + idx * 0.9) * 0.025 * val;
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VII (1–2 SAMUEL) SCENE 4: No. 30 — "at the king's table" (2 Samuel 9:1–13)
  // ==========================================================================
  populateSamuelKingsTableScene(group, derived, pal) {
    const THREE = this.THREE;
    const tablePos = new THREE.Vector3(0.0, 0.0, -5.6);
    const tableRig = this.propBuilder.createKingsTablePlace();
    tableRig.group.position.copy(tablePos);
    group.add(tableRig.group);

    // David's harp standing beside the banquet hall column
    const harp = this.propBuilder.createDavidHarp(1.15);
    harp.position.set(2.4, 0, -5.8);
    harp.rotation.y = -0.45;
    group.add(harp);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.0, '#ffde8a');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    return {
      signatureTarget: tablePos,
      signatureRadius: 4.0,
      signatureLabel: 'Sit at the Place Kept Continually for Jonathan’s Son',
      signatureActivatedText: '“You will eat bread at my table continually.” — A place set every day for a promise made to a friend long after the friend was gone.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._samuelTableLatched = Math.min(1.0, (this._samuelTableLatched || 0) + dt * 0.5);
        const val = this._samuelTableLatched || 0;
        tableRig.tableLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VIII (1 & 2 KINGS) SCENE 1: No. 6 — "the cloud" (1 Kings 8:6–11)
  // ==========================================================================
  populateKingsTempleCloudScene(group, derived, pal) {
    const THREE = this.THREE;
    const templePos = new THREE.Vector3(0.0, 0.0, -5.8);
    const sanctuary = this.propBuilder.createCedarTempleSanctuary();
    sanctuary.group.position.copy(templePos);
    group.add(sanctuary.group);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.9, 3.6, '#ffea9c');
    shaft.position.set(0, 6.4, -5.8);
    group.add(shaft);

    return {
      signatureTarget: templePos,
      signatureRadius: 4.2,
      signatureLabel: 'Stand Before the Cloud of Glory Filling the House',
      signatureActivatedText: '“The cloud filled Yahweh’s house, so that the priests could not stand to minister.” — All that cedar, all that gold, and the best moment was when nobody could do anything at all.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._kingsCloudLatched = Math.min(1.0, (this._kingsCloudLatched || 0) + dt * 0.5);
        const val = this._kingsCloudLatched || 0;
        sanctuary.gloryLight.intensity = 2.8 + val * 3.4;
        sanctuary.cloudSprites.forEach((sp, i) => {
          sp.material.opacity = (0.38 + val * 0.28) * (0.85 + 0.15 * Math.sin(time * 1.6 + i));
          sp.position.y = 1.45 + (i % 3) * 0.55 + Math.sin(time * 0.9 + i) * 0.15;
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VIII (1 & 2 KINGS) SCENE 2: No. 18 — "fire on Carmel" (1 Kings 18:30–39)
  // ==========================================================================
  populateKingsCarmelFireScene(group, derived, pal) {
    const THREE = this.THREE;
    const altarPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const carmel = this.propBuilder.createCarmelAltar();
    carmel.group.position.copy(altarPos);
    group.add(carmel.group);

    const fireShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.65, 2.6, '#ff9c38');
    fireShaft.position.set(0, 6.2, -5.6);
    group.add(fireShaft);

    return {
      signatureTarget: altarPos,
      signatureRadius: 4.2,
      signatureLabel: 'Approach the Twelve-Stone Altar & Water-Filled Trench',
      signatureActivatedText: '“Yahweh, he is God! Yahweh, he is God!” — One short prayer at the evening offering, and the fire fell and licked up even the water.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._kingsCarmelLatched = Math.min(1.0, (this._kingsCarmelLatched || 0) + dt * 0.5);
        const val = this._kingsCarmelLatched || 0;
        const flicker = 1.0 + Math.sin(time * 7.5) * 0.15;
        carmel.fireLight.intensity = (2.8 + val * 3.8) * flicker;
        carmel.fireSprites.forEach((sp, idx) => {
          sp.scale.x = (2.4 - idx * 0.18 + val * 0.6) * flicker;
          sp.position.y = 1.25 + idx * 0.55 + Math.sin(time * 4.5 + idx) * 0.12;
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VIII (1 & 2 KINGS) SCENE 3: No. 21 — "a still small voice" (1 Kings 19:9–13)
  // ==========================================================================
  populateKingsStillSmallVoiceScene(group, derived, pal) {
    const THREE = this.THREE;
    const cavePos = new THREE.Vector3(0.0, 0.0, -5.8);
    const caveRig = this.propBuilder.createHorebCaveArch();
    caveRig.group.position.copy(cavePos);
    group.add(caveRig.group);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.8, 3.2, '#ffefd1');
    shaft.position.set(0, 6.2, -5.4);
    group.add(shaft);

    return {
      signatureTarget: cavePos,
      signatureRadius: 4.2,
      signatureLabel: 'Stand at the Mouth of Horeb’s Cave in the Stillness',
      signatureActivatedText: '“After the fire, there was a still small voice.” — God doesn’t always shout. Sometimes he asks a gentle question, and waits.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._kingsVoiceLatched = Math.min(1.0, (this._kingsVoiceLatched || 0) + dt * 0.5);
        const val = this._kingsVoiceLatched || 0;
        const breathe = 0.9 + 0.1 * Math.sin(time * 1.8);
        caveRig.caveLight.intensity = (2.0 + val * 2.6) * breathe;
        caveRig.whisperHalo.scale.setScalar((3.2 + val * 1.4) * breathe);
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VIII (1 & 2 KINGS) SCENE 4: No. 32 — "more with us" (2 Kings 6:15–17)
  // ==========================================================================
  populateKingsChariotsOfFireScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const chariotPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const fieryRig = this.propBuilder.createChariotOfFireCluster();
    fieryRig.group.position.copy(chariotPos);
    group.add(fieryRig.group);

    const hillGrass = this.propBuilder.createInstancedMeadowGrass(
      780,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.4 + Math.random() * 14.5;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight ? getTerrainHeight(x, z) : 0, z, scale: 0.85 + Math.random() * 0.45 };
      },
      pal
    );
    group.add(hillGrass);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.85, 3.5, '#ffbe59');
    shaft.position.set(0, 6.2, -5.8);
    group.add(shaft);

    return {
      signatureTarget: chariotPos,
      signatureRadius: 4.2,
      signatureLabel: 'Open Your Eyes to the Hills Full of Chariots of Fire',
      signatureActivatedText: '“Don’t be afraid; for those who are with us are more than those who are with them.” — The danger was real; so was everything he couldn’t see.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._kingsChariotsLatched = Math.min(1.0, (this._kingsChariotsLatched || 0) + dt * 0.5);
        const val = this._kingsChariotsLatched || 0;
        fieryRig.chariotLight.intensity = 2.8 + val * 3.6;
        fieryRig.chariots.forEach((ch, idx) => {
          ch.cGroup.position.y += Math.sin(time * 2.5 + idx) * 0.002;
          ch.halo.scale.set((2.8 + val * 1.1), (2.2 + val * 0.9), 1);
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XLIV (ALL THINGS NEW / REVELATION) SCENE 1:
  // No. 4 — "among the lampstands" (Revelation 1:12–20)
  // ==========================================================================
  populateRevelation4LampstandsScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const lampPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const lampRig = this.propBuilder.createSevenGoldenLampstandsCircle(derived.propTex, pal);
    lampRig.group.position.copy(lampPos);
    group.add(lampRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        lampRig.group,
        'all-things-new',
        4,
        { targetHeight: 3.0, yOffset: 0.22 }
      );
    }

    if (skyDome && skyDome.material && skyDome.material.uniforms && skyDome.material.uniforms.uStarIntensity) {
      skyDome.material.uniforms.uStarIntensity.value = 0.72;
    }

    // Patmos coastal olive & cypress trees framing the sanctuary clearing (matching painting #4)
    for (const [tx, tz, ts] of [[-5.6, -7.8, 0.92], [5.4, -7.5, 0.88]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, ts);
      tree.position.set(tx, getTerrainHeight ? getTerrainHeight(tx, tz) : 0, tz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.85, 3.4, '#ffea9f');
    shaft.position.set(0, 6.4, -5.8);
    group.add(shaft);

    return {
      signatureTarget: lampPos,
      signatureRadius: 4.2,
      signatureLabel: 'Walk Among the Seven Golden Lampstands & Unrolled Prophecy Scroll',
      signatureActivatedText: '“The seven lampstands are seven assemblies… your little church is not forgotten. He is walking right there.” (Revelation 1:12–20)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._revLampstandsLatched = Math.min(1.0, (this._revLampstandsLatched || 0) + dt * 0.5);
        const val = this._revLampstandsLatched || 0;
        const pulse = 1.0 + Math.sin(time * 4.2) * 0.10;
        lampRig.lampLight.intensity = (2.9 + val * 3.5) * pulse;
        lampRig.flames.forEach((fl, i) => {
          const fPulse = 1.0 + Math.sin(time * 5.5 + i * 0.9) * 0.14;
          fl.scale.set(1.0 + val * 0.25, (1.0 + val * 0.38) * fPulse, 1.0 + val * 0.25);
        });
        lampRig.halos.forEach((hl, i) => {
          const hPulse = 1.0 + Math.sin(time * 3.8 + i * 0.7) * 0.08;
          hl.scale.setScalar((1.55 + val * 0.55) * hPulse);
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XLIV (ALL THINGS NEW / REVELATION) SCENE 2:
  // No. 8 — "knocking" (Revelation 3:14–20)
  // ==========================================================================
  populateRevelation8KnockingDoorScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const doorPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const doorRig = this.propBuilder.createLaodiceaDoorAndSupperTable(derived.propTex, pal);
    doorRig.group.position.copy(doorPos);
    group.add(doorRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        doorRig.group,
        'all-things-new',
        8,
        { targetHeight: 3.0, yOffset: 0.22 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.78, 3.0, '#ffd884');
    shaft.position.set(0.3, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: doorPos,
      signatureRadius: 4.2,
      signatureLabel: 'Open the Threshold Door & Sit at the Supper Table',
      signatureActivatedText: '“Behold, I stand at the door and knock. If anyone hears my voice and opens the door, then I will come in to him, and will dine with him, and he with me.” (Revelation 3:20)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._revDoorLatched = Math.min(1.0, (this._revDoorLatched || 0) + dt * 0.5);
        const val = this._revDoorLatched || 0;
        // Gently swing the wooden door further open as the pilgrim approaches
        doorRig.doorPivot.rotation.y = 0.14 + val * 0.42;
        doorRig.doorLight.intensity = 2.8 + val * 3.6 + Math.sin(time * 3.2) * 0.22;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XLIV (ALL THINGS NEW / REVELATION) SCENE 3:
  // No. 13 — "the Lion is a Lamb" (Revelation 5:5–6)
  // ==========================================================================
  populateRevelation13LambThroneScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const thronePos = new THREE.Vector3(0.0, 0.0, -5.8);
    const lambRig = this.propBuilder.createLambOnThroneRings(derived.propTex, pal);
    lambRig.group.position.copy(thronePos);
    group.add(lambRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        lambRig.group,
        'all-things-new',
        13,
        { targetHeight: 2.9, yOffset: 0.12 }
      );
    }

    // Sea of Glass crystal water reflection on the left (matching the waterfall & pool in painting #13)
    const glassSeaGeo = new THREE.PlaneGeometry(46, 24, 40, 40);
    glassSeaGeo.rotateX(-Math.PI / 2);
    const glassSeaMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#5c7873',
      shallowColor: '#d9d0b4',
      sunColor: '#fff2c2',
      opacity: 0.86
    });
    const glassSea = new THREE.Mesh(glassSeaGeo, glassSeaMat);
    glassSea.position.set(-8.5, 0.03, -9.8);
    group.add(glassSea);

    // Emerald-and-gold rainbow arch over the Throne (Revelation 4:3 & 5:6)
    if (skyDome && skyDome.material && skyDome.material.uniforms && skyDome.material.uniforms.uRainbowIntensity) {
      skyDome.material.uniforms.uRainbowIntensity.value = 0.92;
    }
    const { bowGroup, bowMeshes } = this.createVividRainbowSkyArch();
    group.add(bowGroup);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.92, 3.8, '#fff0b8');
    shaft.position.set(0, 6.6, -5.8);
    group.add(shaft);

    return {
      signatureTarget: thronePos,
      signatureRadius: 4.2,
      signatureLabel: 'Stand Before the Lamb in the Midst of the Throne & Golden Bowls of Prayer',
      signatureActivatedText: '“Don’t weep… a Lamb standing, as though it had been slain.” — This is the whole secret of the book: the Lion wins by being the Lamb. (Revelation 5:5–6)',
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        glassSeaMat.uniforms.uTime.value = time;
        if (cameraPos) glassSeaMat.uniforms.uCameraPos.value.copy(cameraPos);

        const near = distToSignature < 4.2;
        if (near) this._revLambLatched = Math.min(1.0, (this._revLambLatched || 0) + dt * 0.5);
        const val = this._revLambLatched || 0;

        lambRig.throneLight.intensity = 3.2 + val * 3.8;
        lambRig.rings.forEach((r, idx) => {
          r.scale.setScalar(1.0 + Math.sin(time * 1.8 + idx * 0.6) * 0.03 + val * 0.06);
        });
        bowMeshes.forEach((m, i) => {
          const baseOp = i < 7 ? 0.76 : 0.36;
          m.material.opacity = Math.min(0.98, baseOp + val * 0.20 + Math.sin(time * 1.4 + i * 0.4) * 0.04);
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XLIV (ALL THINGS NEW / REVELATION) SCENE 4:
  // No. 38 — "leaves for healing" (Revelation 22:1–2)
  // Bookends Genesis No. 4 ("the seventh day"):
  //   - Crystal-clear River of Water of Life with floating lanterns & arched stone footbridge
  //   - The Tree of Life with 12 manner of fruits and healing leaves
  //   - THE SIGNATURE BENCH BENEATH THE TREE OF LIFE (answering Genesis's Sabbath Bench)
  //   - The Great Lantern of the Lamb ("its lamp is the Lamb", Rev 21:23)
  // ==========================================================================
  populateRevelation38TreeOfLifeScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Crystal-clear River of Water of Life flowing down the middle of the New Jerusalem street (matching painting #38)
    const riverGeo = new THREE.PlaneGeometry(18, 48, 40, 48);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#36686e',
      shallowColor: '#98c4bc',
      sunColor: '#fff6d6',
      opacity: 0.92
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.set(-2.2, 0.05, -10.5);
    group.add(river);

    // Arched stone bridge in the distance (matching the bridge at the center of painting #38)
    const bridge = this.propBuilder.createStoneFootbridge({
      ground: '#9e9583',
      accent: '#f2e4c2'
    });
    bridge.position.set(-2.2, 0.02, -14.5);
    group.add(bridge);

    // Floating golden lanterns on the River of Life
    const riverLanterns = [];
    for (let i = 0; i < 8; i++) {
      const l = this.propBuilder.createFloatingRiverLantern('#ffeba8');
      l.position.set(-3.8 + (i % 3) * 1.4, 0.08, -4.5 - i * 2.2);
      group.add(l);
      riverLanterns.push(l);
    }

    // 2. The Tree of Life, Stone Bench of Rest, Bowl of Healing Leaves & Great Lantern of the Lamb
    const sanctuaryPos = new THREE.Vector3(0.4, 0.0, -5.4);
    const treeRig = this.propBuilder.createTreeOfLifeAndBenchSanctuary(derived.propTex, pal, false);
    treeRig.group.position.copy(sanctuaryPos);
    group.add(treeRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        treeRig.group,
        'all-things-new',
        38,
        { targetHeight: 3.1, yOffset: 0.22 }
      );
    }

    // Secondary trees on both banks of the river ("on this side of the river and on that was the tree of life", Rev 22:2)
    for (const [tx, tz, ts] of [[-5.6, -6.5, 1.05], [-5.2, -11.5, 0.95], [5.4, -10.8, 1.0]]) {
      const t = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, ts);
      t.position.set(tx, getTerrainHeight ? getTerrainHeight(tx, tz) : 0, tz);
      group.add(t);
    }

    // Volumetric golden sunbeam shafts slanting through the Tree of Life boughs onto the Stone Bench
    const sunShafts = [];
    for (let i = 0; i < 4; i++) {
      const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.72, 2.9, '#fff0b8');
      shaft.position.set(0.2 + (i - 1.5) * 1.3, 6.2, -5.2 + (i % 2) * 0.8);
      group.add(shaft);
      sunShafts.push(shaft);
    }

    return {
      signatureTarget: sanctuaryPos,
      signatureRadius: 4.2,
      signatureLabel: 'Rest on the Stone Bench Beneath the Tree of Life by the River',
      signatureActivatedText: '“The leaves of the tree were for the healing of the nations.” — The Bible ends where it began: a garden, a river, a tree, a bench of rest, and God.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        riverMat.uniforms.uTime.value = time;
        if (cameraPos) riverMat.uniforms.uCameraPos.value.copy(cameraPos);

        riverLanterns.forEach((l, idx) => {
          l.position.y = 0.08 + Math.sin(time * 1.7 + idx) * 0.03;
        });

        const near = distToSignature < 4.2;
        if (near) this._revTreeLatched = Math.min(1.0, (this._revTreeLatched || 0) + dt * 0.45);
        const val = this._revTreeLatched || 0;

        treeRig.sanctuaryLight.intensity = 3.4 + val * 3.8 + Math.sin(time * 1.8) * 0.25;
        treeRig.lHalo.scale.setScalar(3.6 + val * 1.6 + Math.sin(time * 2.4) * 0.2);
        sunShafts.forEach((sh, idx) => {
          sh.material.uniforms.uOpacity.value = (0.22 + val * 0.20) * (0.88 + 0.12 * Math.sin(time * 1.2 + idx));
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XIII (PLANTED BY THE WATER / PSALMS 1–41) SCENE 1:
  // No. 1 — "planted" (Psalm 1:1–3)
  // Signature Symbolic Element of District XIII:
  //   - Clear pebble-lined stream ("streams of water") flowing past a dry-stone bank
  //   - Great fruit-bearing fig tree with exposed roots reaching into the stream
  //   - Woven harvest basket with white linen cloth on the stone wall & riverside stone bench
  //   - Judean village well with wooden tripod frame across the stream (matching painting #1)
  // ==========================================================================
  populatePsalms1PlantedScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Crystal-clear Pebble Stream flowing down the center-left of the scene (matching painting #1)
    const streamGeo = new THREE.PlaneGeometry(14, 46, 36, 48);
    streamGeo.rotateX(-Math.PI / 2);
    const streamMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#2f544a',
      shallowColor: '#8ba893',
      sunColor: '#fff2c9',
      opacity: 0.90
    });
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.position.set(-1.6, 0.04, -10.0);
    group.add(stream);

    // Floating river lanterns drifting along the stream
    const lanterns = [];
    for (let i = 0; i < 6; i++) {
      const l = this.propBuilder.createFloatingRiverLantern('#ffeaa6');
      l.position.set(-2.4 + (i % 3) * 0.9, 0.08, -4.2 - i * 2.6);
      group.add(l);
      lanterns.push(l);
    }

    // 2. The Tree Planted by the Streams of Water, Exposed Roots, Figs, Basket & Well
    const plantedPos = new THREE.Vector3(0.35, 0.0, -5.6);
    const plantedRig = this.propBuilder.createPlantedByWaterTreeEnsemble(derived.propTex, pal, true);
    plantedRig.group.position.copy(plantedPos);
    group.add(plantedRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        plantedRig.group,
        'psalms-1',
        1,
        { targetHeight: 3.0, yOffset: 0.22 }
      );
    }

    // Background olive & cypress trees along the stream valley (matching painting #1)
    for (const [tx, tz, ts] of [[-5.4, -7.8, 0.92], [5.2, -9.6, 0.98], [-4.6, -13.5, 0.88]]) {
      const t = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, ts);
      t.position.set(tx, getTerrainHeight ? getTerrainHeight(tx, tz) : 0, tz);
      group.add(t);
    }

    const sunShafts = [];
    for (let i = 0; i < 3; i++) {
      const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.0, '#fff0bd');
      shaft.position.set(0.4 + (i - 1) * 1.4, 6.2, -5.4 + (i % 2) * 0.8);
      group.add(shaft);
      sunShafts.push(shaft);
    }

    return {
      signatureTarget: plantedPos,
      signatureRadius: 4.2,
      signatureLabel: 'Rest Beneath the Tree Planted by the Streams of Water',
      signatureActivatedText: '“He will be like a tree planted by the streams of water, that produces its fruit in its season, whose leaf also does not wither.” — Stay near the water. (Psalm 1:1–3)',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        streamMat.uniforms.uTime.value = time;
        if (cameraPos) streamMat.uniforms.uCameraPos.value.copy(cameraPos);

        lanterns.forEach((l, idx) => {
          l.position.y = 0.08 + Math.sin(time * 1.6 + idx) * 0.03;
        });

        const near = distToSignature < 4.2;
        if (near) this._psalm1PlantedLatched = Math.min(1.0, (this._psalm1PlantedLatched || 0) + dt * 0.5);
        const val = this._psalm1PlantedLatched || 0;

        plantedRig.streamLight.intensity = 2.8 + val * 3.4 + Math.sin(time * 2.0) * 0.22;
        sunShafts.forEach((sh, idx) => {
          sh.material.uniforms.uOpacity.value = (0.22 + val * 0.18) * (0.88 + 0.12 * Math.sin(time * 1.3 + idx));
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XIII (PLANTED BY THE WATER / PSALMS 1–41) SCENE 2:
  // No. 8 — "the work of your fingers" (Psalm 8:3–4)
  //   - Nocturnal hillside under a luminous Full Moon & Starry Heavens ("the moon and the stars, which you have ordained")
  //   - Ancient olive tree on the left, shepherd's boulder seat, cloak & curved crook
  //   - Peaceful flock of 7 woolly sheep resting in the hillside grass (matching painting #8)
  // ==========================================================================
  populatePsalms8MoonAndStarsScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;

    if (skyDome && skyDome.material && skyDome.material.uniforms && skyDome.material.uniforms.uStarIntensity) {
      skyDome.material.uniforms.uStarIntensity.value = 0.94;
    }

    const hillsidePos = new THREE.Vector3(0.0, 0.0, -5.6);
    const shepherdRig = this.propBuilder.createPsalm8ShepherdHillsideEnsemble(derived.propTex, pal, true);
    shepherdRig.group.position.copy(hillsidePos);
    group.add(shepherdRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        shepherdRig.group,
        'psalms-1',
        8,
        { targetHeight: 2.9, yOffset: 0.22 }
      );
    }

    // Ancient gnarled olive tree on the left framing the moonlit sky (matching painting #8 left side)
    const leftOlive = this.propBuilder.createGreatPainterlyTree(
      derived.propTex,
      { ground: '#3e3930', horizon: '#4c5742', accent: '#b8c4a6' },
      1.32
    );
    leftOlive.position.set(-3.4, getTerrainHeight ? getTerrainHeight(-3.4, -5.8) : 0, -5.8);
    group.add(leftOlive);

    // Moonbeam shaft slanting down onto the shepherd's hillside
    const moonShaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.82, 3.4, '#dce8ff');
    moonShaft.position.set(-0.6, 6.4, -5.6);
    group.add(moonShaft);

    return {
      signatureTarget: hillsidePos,
      signatureRadius: 4.2,
      signatureLabel: 'Sit by the Shepherd’s Crook & Flock Under the Moon and Stars',
      signatureActivatedText: '“When I consider your heavens, the work of your fingers, the moon and the stars, which you have ordained; what is man, that you think of him?” (Psalm 8:3–4)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._psalm8StarsLatched = Math.min(1.0, (this._psalm8StarsLatched || 0) + dt * 0.5);
        const val = this._psalm8StarsLatched || 0;

        shepherdRig.moonLight.intensity = 2.8 + val * 3.6 + Math.sin(time * 2.2) * 0.2;
        if (shepherdRig.moonHalo) {
          shepherdRig.moonHalo.scale.setScalar(4.4 + val * 1.4 + Math.sin(time * 1.8) * 0.25);
        }
        shepherdRig.starSprites.forEach((st, idx) => {
          const baseS = idx === 0 ? 1.35 : 0.78;
          st.scale.setScalar((baseS + val * 0.35) * (0.88 + 0.16 * Math.sin(time * 3.4 + idx * 1.1)));
        });
        shepherdRig.sheepFlock.forEach((sh, idx) => {
          sh.position.y = 0.08 + Math.sin(time * 1.5 + idx * 0.8) * 0.012;
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XIII (PLANTED BY THE WATER / PSALMS 1–41) SCENE 3:
  // No. 22 — "through the valley" (Psalm 23:1–6)
  //   - Shadowed canyon walls opening toward sunlit green pastures & still waters
  //   - Left rocky ledge with striped shepherd's cloak, wooden rod & curved staff,
  //     clay anointing oil jug, overflowing cup, and table before the pilgrim (matching painting #22)
  // ==========================================================================
  populatePsalms23GreenPasturesScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // Still waters brook winding beside the valley path ("He leads me beside still waters", Psalm 23:2)
    const brookGeo = new THREE.PlaneGeometry(10, 42, 28, 40);
    brookGeo.rotateX(-Math.PI / 2);
    const brookMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#365249',
      shallowColor: '#8ea894',
      sunColor: '#ffe8ad',
      opacity: 0.88
    });
    const brook = new THREE.Mesh(brookGeo, brookMat);
    brook.position.set(3.8, 0.03, -10.5);
    group.add(brook);

    const valleyPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const valleyRig = this.propBuilder.createPsalm23ValleyRodAndTable(derived.propTex, pal);
    valleyRig.group.position.copy(valleyPos);
    group.add(valleyRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        valleyRig.group,
        'psalms-1',
        22,
        { targetHeight: 2.9, yOffset: 0.22 }
      );
    }

    // Canyon crags on left and right framing the sunlit vista ahead (matching painting #22)
    for (const [cx, cz, cs] of [[-5.6, -7.2, 0.95], [5.8, -8.4, 0.90]]) {
      const crag = this.propBuilder.createWildernessCampAndCrag(pal, cx < 0 ? 1 : 2);
      crag.scale.setScalar(cs);
      crag.position.set(cx, getTerrainHeight ? getTerrainHeight(cx, cz) : 0, cz);
      group.add(crag);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.88, 3.6, '#ffea9f');
    shaft.position.set(0.2, 6.5, -6.2);
    group.add(shaft);

    return {
      signatureTarget: valleyPos,
      signatureRadius: 4.2,
      signatureLabel: 'Pause Beside the Shepherd’s Rod, Staff & Prepared Table in the Valley',
      signatureActivatedText: '“Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me… My cup runs over.” (Psalm 23:4–5)',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        brookMat.uniforms.uTime.value = time;
        if (cameraPos) brookMat.uniforms.uCameraPos.value.copy(cameraPos);

        const near = distToSignature < 4.2;
        if (near) this._psalm23ValleyLatched = Math.min(1.0, (this._psalm23ValleyLatched || 0) + dt * 0.5);
        const val = this._psalm23ValleyLatched || 0;

        valleyRig.valleyLight.intensity = 3.0 + val * 3.8 + Math.sin(time * 2.0) * 0.22;
        shaft.material.uniforms.uOpacity.value = (0.24 + val * 0.22) * (0.9 + 0.1 * Math.sin(time * 1.4));
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XIII (PLANTED BY THE WATER / PSALMS 1–41) SCENE 4:
  // No. 26 — "one thing" (Psalm 27:4)
  //   - Open stone doorway of the House of the Lord with water jar & olive branch on the step
  //   - Heavy timber door swinging gently open to reveal the three-chain hanging bronze sanctuary lamp,
  //     rolled reed prayer mat, and golden-draped inner table (matching painting #26)
  // ==========================================================================
  populatePsalms27HouseOfTheLordScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const housePos = new THREE.Vector3(0.0, 0.0, -5.6);
    const houseRig = this.propBuilder.createPsalm27OpenHouseThreshold(derived.propTex, pal);
    houseRig.group.position.copy(housePos);
    group.add(houseRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        houseRig.group,
        'psalms-1',
        26,
        { targetHeight: 3.0, yOffset: 0.22 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.80, 3.2, '#ffe291');
    shaft.position.set(0.0, 6.2, -5.4);
    group.add(shaft);

    return {
      signatureTarget: housePos,
      signatureRadius: 4.2,
      signatureLabel: 'Step Across the Open Threshold of the House of the Lord',
      signatureActivatedText: '“One thing I have asked of Yahweh, that I will seek after: that I may dwell in the house of Yahweh all the days of my life, to behold Yahweh’s beauty, and to inquire in his temple.” (Psalm 27:4)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._psalm27HouseLatched = Math.min(1.0, (this._psalm27HouseLatched || 0) + dt * 0.5);
        const val = this._psalm27HouseLatched || 0;

        houseRig.doorPivot.rotation.y = 1.05 + val * 0.28;
        houseRig.hangingLamp.rotation.z = Math.sin(time * 1.4) * 0.03;
        houseRig.sanctuaryLight.intensity = 3.2 + val * 3.6 + Math.sin(time * 3.0) * 0.22;
        houseRig.lampHalo.scale.setScalar(2.4 + val * 0.85 + Math.sin(time * 2.6) * 0.15);
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XIV (AS THE DEER / PSALMS 42–72) SCENE 1:
  // No. 1 — "preach to yourself" (Psalm 42:1–5)
  //   - Signature Deer/Doe bending its neck to drink from the rocky water brook beneath olive boughs
  //   - Right-bank boulder ledge with plaid pilgrim cloak, open scroll, woven baskets, walking staff & stone porch
  //     (matching painting #1)
  // ==========================================================================
  populatePsalms42DeerBrookScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const brookGeo = new THREE.PlaneGeometry(14, 42, 32, 42);
    brookGeo.rotateX(-Math.PI / 2);
    const brookMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#2d4d48',
      shallowColor: '#8db2a2',
      sunColor: '#fff2c4',
      opacity: 0.90
    });
    const brook = new THREE.Mesh(brookGeo, brookMat);
    brook.position.set(-0.2, 0.04, -10.0);
    group.add(brook);

    const deerPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const deerRig = this.propBuilder.createPsalm42DeerBrookEnsemble(derived.propTex, pal, true);
    deerRig.group.position.copy(deerPos);
    group.add(deerRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        deerRig.group,
        'psalms-2',
        1,
        { targetHeight: 2.9, yOffset: 0.22 }
      );
    }

    // Olive & forest trees on the left bank shading the deer (matching painting #1 left)
    for (const [tx, tz, ts] of [[-4.2, -5.8, 1.05], [-5.4, -9.2, 0.92], [4.8, -8.8, 0.88]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, ts);
      tree.position.set(tx, getTerrainHeight ? getTerrainHeight(tx, tz) : 0, tz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.84, 3.4, '#ffebad');
    shaft.position.set(-0.8, 6.4, -5.8);
    group.add(shaft);

    return {
      signatureTarget: deerPos,
      signatureRadius: 4.2,
      signatureLabel: 'Kneel Beside the Deer at the Water Brook & Open Scroll',
      signatureActivatedText: '“As the deer pants for the water brooks, so my soul pants after you, God… Why are you in despair, my soul? Why are you disturbed within me? Hope in God! For I shall still praise him.” (Psalm 42:1–5)',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        brookMat.uniforms.uTime.value = time;
        if (cameraPos) brookMat.uniforms.uCameraPos.value.copy(cameraPos);

        const near = distToSignature < 4.2;
        if (near) this._psalm42DeerLatched = Math.min(1.0, (this._psalm42DeerLatched || 0) + dt * 0.5);
        const val = this._psalm42DeerLatched || 0;

        deerRig.neckPivot.rotation.z = -1.08 + val * 0.24 + Math.sin(time * 1.4) * 0.04;
        deerRig.brookLight.intensity = 2.9 + val * 3.5 + Math.sin(time * 2.2) * 0.22;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XIV (AS THE DEER / PSALMS 42–72) SCENE 2:
  // No. 5 — "be still" (Psalm 46:1–11)
  //   - Mirror-still mountain lake reflecting distant peaks
  //   - Broken wooden bow, shattered/laid-down iron-headed spear & discarded warrior's cloak on the shore
  //   - Signature Deer standing quietly at the water's edge (matching painting #5)
  // ==========================================================================
  populatePsalms46BeStillScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const lakeGeo = new THREE.PlaneGeometry(56, 36, 48, 48);
    lakeGeo.rotateX(-Math.PI / 2);
    const lakeMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#2b3e4f',
      shallowColor: '#8aa1ad',
      sunColor: '#f5ebd6',
      opacity: 0.92
    });
    const lake = new THREE.Mesh(lakeGeo, lakeMat);
    lake.position.set(0.0, 0.05, -13.5);
    group.add(lake);

    const shorePos = new THREE.Vector3(0.0, 0.0, -5.4);
    const shoreRig = this.propBuilder.createPsalm46BeStillShorelineEnsemble(derived.propTex, pal);
    shoreRig.group.position.copy(shorePos);
    group.add(shoreRig.group);

    // District XIV Signature Symbolic Element: quiet deer resting on the left bank of the still waters
    const quietDeer = this.propBuilder.createPsalm42DeerBrookEnsemble(derived.propTex, pal, false);
    if (quietDeer.brookLight) quietDeer.group.remove(quietDeer.brookLight);
    if (quietDeer.rightBank) quietDeer.group.remove(quietDeer.rightBank);
    quietDeer.neckPivot.rotation.z = -0.32;
    quietDeer.group.position.set(-2.4, 0.04, -6.8);
    quietDeer.group.rotation.y = 0.35;
    group.add(quietDeer.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        shoreRig.group,
        'psalms-2',
        5,
        { targetHeight: 2.8, yOffset: 0.22 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.85, 3.6, '#f5ebd6');
    shaft.position.set(0.0, 6.5, -5.8);
    group.add(shaft);

    return {
      signatureTarget: shorePos,
      signatureRadius: 4.2,
      signatureLabel: 'Stand Still Beside the Broken Bow & Laid-Down Spear on the Shore',
      signatureActivatedText: '“He makes wars cease to the end of the earth. He breaks the bow, and shatters the spear… Be still, and know that I am God.” (Psalm 46:9–10)',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        lakeMat.uniforms.uTime.value = time * 0.45;
        if (cameraPos) lakeMat.uniforms.uCameraPos.value.copy(cameraPos);

        const near = distToSignature < 4.2;
        if (near) this._psalm46StillLatched = Math.min(1.0, (this._psalm46StillLatched || 0) + dt * 0.5);
        const val = this._psalm46StillLatched || 0;

        shoreRig.stillLight.intensity = 2.8 + val * 3.4 + Math.sin(time * 1.8) * 0.18;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XIV (AS THE DEER / PSALMS 42–72) SCENE 3:
  // No. 15 — "your bottle" (Psalm 56:3–8)
  //   - Sunlit plastered stone window sill with the slender terracotta tear-bottle (lachrymatory)
  //     and a glistening teardrop at its rim
  //   - Fringed cloth, rolled Book of Remembrance scroll & olive branch framing the window (matching painting #15)
  // ==========================================================================
  populatePsalms56TearBottleScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const bottlePos = new THREE.Vector3(0.0, 0.0, -5.5);
    const bottleRig = this.propBuilder.createPsalm56TearBottleWindowEnsemble(derived.propTex, pal);
    bottleRig.group.position.copy(bottlePos);
    group.add(bottleRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        bottleRig.group,
        'psalms-2',
        15,
        { targetHeight: 2.8, yOffset: 0.22 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.78, 3.2, '#ffebba');
    shaft.position.set(-0.15, 6.2, -5.4);
    group.add(shaft);

    return {
      signatureTarget: bottlePos,
      signatureRadius: 4.2,
      signatureLabel: 'Pause at the Sunlit Window Beside the Tear-Bottle & Book of Remembrance',
      signatureActivatedText: '“You number my wanderings. You put my tears into your container. Aren’t they in your book? … What time I am afraid, I will put my trust in you.” (Psalm 56:3–8)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._psalm56BottleLatched = Math.min(1.0, (this._psalm56BottleLatched || 0) + dt * 0.5);
        const val = this._psalm56BottleLatched || 0;

        bottleRig.windowLight.intensity = 3.1 + val * 3.5 + Math.sin(time * 2.4) * 0.22;
        bottleRig.teardrop.position.y = 0.97 + Math.sin(time * 2.0) * 0.012;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XIV (AS THE DEER / PSALMS 42–72) SCENE 4:
  // No. 20 — "higher than I" (Psalm 61:1–3)
  //   - Towering sunlit flat-topped cliff/mesa ("the rock that is higher than I") with winding footpath
  //     climbing to olive trees on the summit
  //   - Foreground terraced courtyard with circular winnowing grain sieve ring, woven mats & clay jars (matching painting #20)
  // ==========================================================================
  populatePsalms61RockHigherScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const rockPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const rockRig = this.propBuilder.createPsalm61RockHigherEnsemble(derived.propTex, pal);
    rockRig.group.position.copy(rockPos);
    group.add(rockRig.group);

    // Signature Deer looking up toward the high rock on the left terrace
    const deer = this.propBuilder.createPsalm42DeerBrookEnsemble(derived.propTex, pal, false);
    if (deer.brookLight) deer.group.remove(deer.brookLight);
    if (deer.rightBank) deer.group.remove(deer.rightBank);
    deer.neckPivot.rotation.z = -0.18;
    deer.group.position.set(-2.6, 0.04, -5.2);
    deer.group.rotation.y = 0.55;
    group.add(deer.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        rockRig.group,
        'psalms-2',
        20,
        { targetHeight: 3.1, yOffset: 0.24 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.88, 3.8, '#ffe7a3');
    shaft.position.set(0.35, 6.8, -6.2);
    group.add(shaft);

    return {
      signatureTarget: rockPos,
      signatureRadius: 4.2,
      signatureLabel: 'Look Up the Winding Path to the Rock Higher Than I',
      signatureActivatedText: '“From the end of the earth, I will call to you when my heart is overwhelmed. Lead me to the rock that is higher than I. For you have been a refuge for me, a strong tower from the enemy.” (Psalm 61:2–3)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._psalm61RockLatched = Math.min(1.0, (this._psalm61RockLatched || 0) + dt * 0.5);
        const val = this._psalm61RockLatched || 0;

        rockRig.rockLight.intensity = 3.2 + val * 3.8 + Math.sin(time * 2.0) * 0.24;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XV (A DAY IN YOUR COURTS / PSALMS 73–106) SCENE 1:
  // No. 1 — "until I walked in" (Psalm 73:13–26)
  //   - Monumental Jerusalem limestone sanctuary portal with tall golden door leaf
  //     standing open to reveal the glowing 7-branched Golden Menorah inside
  //   - Carved wooden temple cart on the left & forecourt table on the right (matching painting #1)
  // ==========================================================================
  populatePsalms73SanctuaryScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const sanctuaryPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const sanctuaryRig = this.propBuilder.createPsalm73SanctuaryPortalEnsemble(derived.propTex, pal, true);
    sanctuaryRig.group.position.copy(sanctuaryPos);
    group.add(sanctuaryRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        sanctuaryRig.group,
        'psalms-3',
        1,
        { targetHeight: 3.1, yOffset: 0.24 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.85, 3.6, '#ffe599');
    shaft.position.set(0.65, 6.4, -5.8);
    group.add(shaft);

    return {
      signatureTarget: sanctuaryPos,
      signatureRadius: 4.2,
      signatureLabel: 'Step Into the Sanctuary Threshold Beside the Golden Lampstand',
      signatureActivatedText: '“When I tried to understand this, it was too painful for me; until I entered God’s sanctuary, and considered their latter end… God is the strength of my heart and my portion forever.” (Psalm 73:16–17, 26)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._psalm73SanctuaryLatched = Math.min(1.0, (this._psalm73SanctuaryLatched || 0) + dt * 0.5);
        const val = this._psalm73SanctuaryLatched || 0;

        sanctuaryRig.doorPivot.rotation.y = 1.12 + val * 0.25;
        sanctuaryRig.sanctuaryLight.intensity = 3.4 + val * 3.8 + Math.sin(time * 2.4) * 0.22;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XV (A DAY IN YOUR COURTS / PSALMS 73–106) SCENE 2:
  // No. 12 — "the sparrow's nest" (Psalm 84:1–6)
  //   - Carved limestone altar ledge with burning clay oil lamp, two rolled scrolls on fringed linen, & clay vessels
  //   - Weathered temple stone wall with recessed niche holding the woven twig Sparrow's Nest & olive branch (matching painting #12)
  // ==========================================================================
  populatePsalms84SparrowAltarScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const altarPos = new THREE.Vector3(0.0, 0.0, -5.5);
    const altarRig = this.propBuilder.createPsalm84SparrowNestAltarEnsemble(derived.propTex, pal);
    altarRig.group.position.copy(altarPos);
    group.add(altarRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        altarRig.group,
        'psalms-3',
        12,
        { targetHeight: 2.9, yOffset: 0.22 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.80, 3.2, '#ffe8a8');
    shaft.position.set(0.0, 6.2, -5.5);
    group.add(shaft);

    return {
      signatureTarget: altarPos,
      signatureRadius: 4.2,
      signatureLabel: 'Pause Beside the Sparrow’s Nest Tucked in the Stones Near the Altar',
      signatureActivatedText: '“Yes, the sparrow has found a home, and the swallow a nest for herself, where she may have her young, near your altars, Yahweh of Armies, my King, and my God… For a day in your courts is better than a thousand.” (Psalm 84:3, 10)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._psalm84SparrowLatched = Math.min(1.0, (this._psalm84SparrowLatched || 0) + dt * 0.5);
        const val = this._psalm84SparrowLatched || 0;

        altarRig.altarLight.intensity = 3.0 + val * 3.6 + Math.sin(time * 3.0) * 0.22;
        altarRig.flameMesh.scale.setScalar(1.0 + val * 0.25 + Math.sin(time * 5.0) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XV (A DAY IN YOUR COURTS / PSALMS 73–106) SCENE 3:
  // No. 19 — "under his feathers" (Psalm 91:1–15)
  //   - Rocky sanctuary crag overlooking the walled city & terraced hills
  //   - Overarching gold-tipped mother-bird wing curving protectively over three chicks in a nest
  //   - Foreground draped cloth & rolled scroll of Psalm 91 (matching painting #19)
  // ==========================================================================
  populatePsalms91ShadowOfWingsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const wingPos = new THREE.Vector3(0.0, 0.0, -5.5);
    const wingRig = this.propBuilder.createPsalm91ShadowOfWingsEnsemble(derived.propTex, pal);
    wingRig.group.position.copy(wingPos);
    group.add(wingRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        wingRig.group,
        'psalms-3',
        19,
        { targetHeight: 2.9, yOffset: 0.22 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.86, 3.6, '#ffea9f');
    shaft.position.set(0.0, 6.4, -5.6);
    group.add(shaft);

    return {
      signatureTarget: wingPos,
      signatureRadius: 4.2,
      signatureLabel: 'Rest Under the Shadow of the Gold-Edged Wing & Nest',
      signatureActivatedText: '“He who dwells in the secret place of the Most High will rest in the shadow of the Almighty… He will cover you with his feathers. Under his wings you will take refuge.” (Psalm 91:1, 4)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._psalm91WingLatched = Math.min(1.0, (this._psalm91WingLatched || 0) + dt * 0.5);
        const val = this._psalm91WingLatched || 0;

        wingRig.wingCanopy.rotation.x = Math.sin(time * 1.2) * 0.025 - val * 0.06;
        wingRig.wingLight.intensity = 3.2 + val * 3.6 + Math.sin(time * 2.2) * 0.20;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT XV (A DAY IN YOUR COURTS / PSALMS 73–106) SCENE 4:
  // No. 31 — "east from west" (Psalm 103:1–14)
  //   - Left stone parapet wall under an olive tree with clay jars, bowl, and striped prayer shawl
  //   - Right stone terrace platform with golden grain carpet, winnowing basket, and wooden shade arbor
  //   - Sunlit horizon stretching from east to west (matching painting #31)
  // ==========================================================================
  populatePsalms103EastFromWestScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    const terracePos = new THREE.Vector3(0.0, 0.0, -5.6);
    const terraceRig = this.propBuilder.createPsalm103EastFromWestTerraceEnsemble(derived.propTex, pal);
    terraceRig.group.position.copy(terracePos);
    group.add(terraceRig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        terraceRig.group,
        'psalms-3',
        31,
        { targetHeight: 2.9, yOffset: 0.22 }
      );
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.88, 3.8, '#ffe285');
    shaft.position.set(0.0, 6.6, -6.2);
    group.add(shaft);

    return {
      signatureTarget: terracePos,
      signatureRadius: 4.2,
      signatureLabel: 'Stand on the Sunlit Terrace Looking from the East to the West',
      signatureActivatedText: '“Praise Yahweh, my soul, and don’t forget all his benefits… As far as the east is from the west, so far has he removed our transgressions from us… For he knows how we are made. He remembers that we are dust.” (Psalm 103:2, 12, 14)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._psalm103EastWestLatched = Math.min(1.0, (this._psalm103EastWestLatched || 0) + dt * 0.5);
        const val = this._psalm103EastWestLatched || 0;

        terraceRig.horizonLight.intensity = 3.4 + val * 3.8 + Math.sin(time * 1.8) * 0.22;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICTS IX–XLIV (BOOKS #9 TO #44) — 144 WALKABLE 3D STEP-THROUGH SCENES
  // ==========================================================================
  populateBook9To44StepThroughScene(
    kind,
    paintingData,
    group,
    derived,
    pal,
    getTerrainHeight,
    skyDome,
    districtSlug = 'genesis'
  ) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0.0, 0.0, -5.6);

    // 1. Build the bespoke 3D Symbolic Focal Prop Assembly at the heart of the clearing
    const focalRig = this.propBuilder.createFocalPropForScene(kind, derived.propTex, pal);
    focalRig.group.position.copy(focalPos);
    group.add(focalRig.group);

    // Mount 3D GLB Sculpture generated from this exact painting (if present in assets/models/scenes/<slug>-<n>.glb)
    if (this.propBuilder && this.propBuilder.tripo && paintingData && paintingData.n) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        focalRig.group,
        districtSlug,
        paintingData.n,
        { targetHeight: 3.1, yOffset: 0.28 }
      );
    }

    // 2. Water / River / Brook / Sea / Well / Fountain Scenes: Add shimmering Komorebi water & floating lanterns
    const isWaterScene =
      (derived.waterRatio && derived.waterRatio > 0.22) ||
      [
        'streams_of_water', 'scent_of_water', 'deer_brook', 'be_still_waters',
        'storm_stilled_haven', 'wellspring_of_life', 'rivers_to_the_sea',
        'locked_garden_fountain', 'many_waters_flame', 'night_watch_water',
        'temple_river_trees', 'tarshish_storm_ship', 'depths_of_the_sea',
        'walking_on_the_sea', 'peace_be_still_boat', 'jacob_well_jar',
        'galilee_charcoal_fire', 'malta_four_anchors', 'fresh_spring_well',
        'cast_your_cares_shore', 'river_of_life_new_jerusalem'
      ].includes(kind);

    let waterMat = null;
    const riverLanterns = [];
    if (isWaterScene) {
      const waterGeo = new THREE.PlaneGeometry(54, 28, 48, 48);
      waterGeo.rotateX(-Math.PI / 2);
      waterMat = createKomorebiWaterMaterial(THREE, {
        deepColor: pal.ground || '#364d54',
        shallowColor: pal.horizon || '#7a948e',
        sunColor: pal.accent || '#ffe29c',
        opacity: 0.90
      });
      const waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.position.set(-7.5, 0.05, -10.5);
      group.add(waterMesh);

      for (let i = 0; i < 6; i++) {
        const l = this.propBuilder.createFloatingRiverLantern(pal.accent || '#ffe29c');
        l.position.set(-10.5 + i * 2.8, 0.08, -10.0 + Math.sin(i * 1.4) * 2.4);
        group.add(l);
        riverLanterns.push(l);
      }
    }

    // 3. Night / Starlight / Lamp / Watchtower / Upper Room Scenes: Starry sky & nocturnal glow
    const isNightScene = [
      'nehemiah_night_ride', 'sleepless_chronicles', 'whirlwind_stars',
      'moon_and_stars', 'lamp_to_my_feet', 'lamp_before_dawn',
      'solitary_city_lantern', 'night_watch_water', 'fiery_furnace',
      'lions_den_light', 'habakkuk_watchtower', 'bethlehem_manger',
      'magi_star_gifts', 'upper_room_basin', 'pentecost_upper_room',
      'philippi_midnight_chains', 'peace_on_guard_lantern', 'tentmaker_loom_lamp',
      'morning_star_lamp', 'seven_golden_lampstands'
    ].includes(kind);

    if (skyDome && skyDome.material && skyDome.material.uniforms) {
      if (isNightScene && skyDome.material.uniforms.uStarIntensity) {
        skyDome.material.uniforms.uStarIntensity.value = 0.78;
      }
      if ((kind === 'chebar_rainbow_throne' || kind === 'emerald_rainbow_throne') && skyDome.material.uniforms.uRainbowIntensity) {
        skyDome.material.uniforms.uRainbowIntensity.value = 0.90;
        const { bowGroup } = this.createVividRainbowSkyArch();
        group.add(bowGroup);
      }
    }

    // 4. Painting-Matched 3D Surrounding Architecture / Rocks / Trees (NO generic moving grass on non-garden scenes!)
    const isGardenOrTreeScene = [
      'streams_of_water', 'scent_of_water', 'cedar_of_lebanon', 'apple_tree_shade',
      'locked_garden_fountain', 'fig_blossom', 'shoot_of_jesse', 'temple_river_trees',
      'cedar_top_twig', 'almond_branch', 'plumb_line_olive_trees', 'mustard_seed_tree',
      'true_vine_branches', 'garden_empty_tomb', 'wild_olive_graft', 'sower_good_soil',
      'patient_farmer_rain', 'river_of_life_new_jerusalem'
    ].includes(kind);

    const isSanctuaryOrHallScene = [
      'solomon_prayer_scroll', 'eyes_upon_you_banner', 'temple_foundations',
      'kings_scepter_scroll', 'banquet_banner', 'wisdom_seven_pillars',
      'throne_seraphim_coal', 'baruch_scroll', 'Open_scroll_daniel',
      'upper_room_basin', 'pentecost_upper_room', 'Emmaus_breaking_bread',
      'royal_priesthood_cornerstone', 'holiest_curtain_anchor',
      'seven_golden_lampstands', 'emerald_rainbow_throne', 'open_door_philadelphia'
    ].includes(kind);

    if (isGardenOrTreeScene) {
      const grovePositions = [
        { x: -4.6, z: -7.0, s: 0.94 },
        { x: 4.6, z: -6.8, s: 1.00 }
      ];
      grovePositions.forEach((gp) => {
        const t = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, gp.s);
        t.position.set(gp.x, getTerrainHeight ? getTerrainHeight(gp.x, gp.z) : 0, gp.z);
        t.rotation.y = gp.x * 0.6;
        group.add(t);
      });
    } else if (isSanctuaryOrHallScene) {
      // Sculpted Sanctuary Columns textured from the painting's palette & brushwork
      const colMat = new THREE.MeshStandardMaterial({
        map: derived.propTex,
        emissiveMap: derived.propTex,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.48,
        roughness: 0.68,
        metalness: 0.05
      });
      const colCoords = [
        { x: -3.8, z: -3.8, h: 4.8 },
        { x: 3.8, z: -3.8, h: 4.8 },
        { x: -4.4, z: -8.2, h: 5.6 },
        { x: 4.4, z: -8.2, h: 5.6 }
      ];
      colCoords.forEach((cc) => {
        const cGeo = this.propBuilder.displaceGeometry(
          new THREE.CylinderGeometry(0.34, 0.42, cc.h, 16, 12),
          0.025,
          3.0
        );
        const col = new THREE.Mesh(cGeo, colMat);
        const by = getTerrainHeight ? getTerrainHeight(cc.x, cc.z) : 0;
        col.position.set(cc.x, by + cc.h * 0.5, cc.z);
        group.add(col);

        const capGeo = new THREE.BoxGeometry(0.98, 0.28, 0.98);
        const cap = new THREE.Mesh(capGeo, colMat);
        cap.position.set(cc.x, by + cc.h + 0.1, cc.z);
        group.add(cap);
      });
    } else {
      // Sculpted Painting-Textured Monoliths & Cairns flanking the sanctuary path
      const monoMat = new THREE.MeshStandardMaterial({
        map: derived.propTex,
        emissiveMap: derived.propTex,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.48,
        roughness: 0.80,
        metalness: 0.05
      });
      const monoCoords = [
        { x: -4.2, z: -4.6, sx: 1.1, sy: 2.3, sz: 1.0 },
        { x: 4.2, z: -4.6, sx: 1.1, sy: 2.2, sz: 1.0 },
        { x: -5.4, z: -8.6, sx: 1.5, sy: 3.1, sz: 1.3 },
        { x: 5.4, z: -8.6, sx: 1.5, sy: 3.0, sz: 1.3 }
      ];
      monoCoords.forEach((mc, idx) => {
        const mGeo = this.propBuilder.displaceGeometry(
          new THREE.DodecahedronGeometry(1.0, 2),
          0.12,
          2.6 + idx * 0.4
        );
        const mono = new THREE.Mesh(mGeo, monoMat);
        const by = getTerrainHeight ? getTerrainHeight(mc.x, mc.z) : 0;
        mono.position.set(mc.x, by + mc.sy * 0.42, mc.z);
        mono.scale.set(mc.sx, mc.sy, mc.sz);
        mono.rotation.y = idx * 0.9;
        group.add(mono);
      });
    }

    // 5. Angled 3D Komorebi Volumetric Sunbeam / Starlight Shafts onto the Focal Centerpiece
    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.82, 3.3, pal.accent || '#ffe49e');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    // 6. Signature Prompt & Poetic Activation Insight derived from Timothy Holt's poem & Scripture
    const pTitle = paintingData && paintingData.title ? paintingData.title : 'the Sacred Threshold';
    const pRef = paintingData && paintingData.ref ? paintingData.ref : '';
    const pEpi = paintingData && paintingData.epigraph ? paintingData.epigraph : '';
    const firstStanza = paintingData && paintingData.poem
      ? paintingData.poem.split('\n\n').slice(-1)[0].replace(/\n/g, ' ')
      : '';

    const signatureLabel = `Approach “${pTitle}” (${pRef})`;
    const signatureActivatedText = `${pEpi} (${pRef}) — ${firstStanza}`;

    const latchKey = `_latch_${kind}`;
    return {
      signatureTarget: focalPos,
      signatureRadius: 4.2,
      signatureLabel,
      signatureActivatedText,
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        if (waterMat) {
          waterMat.uniforms.uTime.value = time;
          if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        }
        riverLanterns.forEach((l, idx) => {
          l.position.y = 0.08 + Math.sin(time * 1.7 + idx) * 0.03;
        });

        const near = distToSignature < 4.2;
        if (near) {
          this[latchKey] = Math.min(1.0, (this[latchKey] || 0) + dt * 0.5);
        }
        const val = this[latchKey] || 0;
        const pulse = 1.0 + Math.sin(time * 2.6) * 0.08;

        focalRig.focalLight.intensity = (2.4 + val * 3.0) * pulse;
        focalRig.focalHalo.scale.setScalar((2.8 + val * 1.1) * pulse);
        focalRig.animatedParts.forEach((mesh, idx) => {
          mesh.rotation.y += dt * (0.25 + idx * 0.1) * (0.4 + val * 0.8);
        });

        return near || val > 0.85;
      }
    };
  }

  createAtmosphericMotes(hexColor, count = 200) {
    const THREE = this.THREE;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = 0.4 + Math.random() * 8.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36 - 4;
      phases[i] = Math.random() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const spriteTex = this.painterly.createGlowSpriteTexture(hexColor);
    const mat = new THREE.PointsMaterial({
      map: spriteTex,
      size: 0.34,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    points.userData.updateMotes = (time) => {
      const pAttr = geo.attributes.position;
      for (let i = 0; i < count; i++) {
        const ph = phases[i];
        pAttr.setY(i, pAttr.getY(i) + Math.sin(time * 0.8 + ph) * 0.003);
        pAttr.setX(i, pAttr.getX(i) + Math.cos(time * 0.5 + ph) * 0.002);
      }
      pAttr.needsUpdate = true;
    };
    return points;
  }

  // =========================================================================
  // DISTRICT XVI (EVERYTHING THAT HAS BREATH — PSALMS 107–150) STEP-THROUGH SCENES
  // =========================================================================

  // Scene 1: Painting #1 "say so" (Psalm 107:23–30) — Desired Haven Ship & Harbor Terrace
  populatePsalms107HavenScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);

    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: pal.waterDeep || '#1b3e4f',
      shallowColor: pal.waterShallow || '#468499',
      sunColor: pal.accent || '#ffe298',
      opacity: 0.92
    });
    const bayGeo = new THREE.PlaneGeometry(36, 22, 36, 28);
    bayGeo.rotateX(-Math.PI / 2);
    const bayMesh = new THREE.Mesh(bayGeo, waterMat);
    bayMesh.position.set(0, 0.04, -10.2);
    group.add(bayMesh);

    const havenEnsemble = this.propBuilder.createPsalm107HavenShipTerraceEnsemble(derived.propTex, pal, true);
    havenEnsemble.position.copy(focalPos);
    group.add(havenEnsemble);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        havenEnsemble,
        'psalms-4',
        1,
        { targetHeight: 3.0, yOffset: 0.22 }
      );
    }

    for (const [tx, tz, sc] of [[-4.2, -3.8, 1.05], [4.4, -4.2, 0.98]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.foliageTex, pal, sc);
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.85, 3.4, pal.accent || '#ffe298');
    shaft.position.set(0, 6.2, -5.8);
    group.add(shaft);

    const havenLight = new THREE.PointLight(0xffdc88, 2.2, 16);
    havenLight.position.set(0, 3.2, -5.4);
    group.add(havenLight);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand on the Harbor Terrace & Watch the Ship Glide into the Desired Haven',
      signatureActivatedText:
        '“He makes the storm a calm, so that its waves are still. Then they are glad because it is calm, so he brings them to their desired haven. Let them praise Yahweh for his loving kindness!” (Psalm 107:29–31)',
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time * 0.45;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.5;
        if (near) {
          this._ps107Latch = Math.min(1.0, (this._ps107Latch || 0) + dt * 0.6);
        }
        const val = this._ps107Latch || 0;
        havenLight.intensity = (2.2 + val * 2.4) * (1.0 + Math.sin(time * 2.2) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  // Scene 2: Painting #13 "come find me" (Psalm 119:105–176) — Terracotta Lamp to My Feet & Lost Sheep
  populatePsalms119LampToMyFeetScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -4.8);

    const lampEnsemble = this.propBuilder.createPsalm119LampAndLostSheepEnsemble(derived.propTex, pal);
    lampEnsemble.group.position.copy(focalPos);
    group.add(lampEnsemble.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        lampEnsemble.group,
        'psalms-4',
        13,
        { targetHeight: 2.8, yOffset: 0.22 }
      );
    }

    for (const [rx, rz, sc] of [[-4.2, -5.2, 0.92], [4.4, -5.6, 0.96]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.foliageTex, pal, sc);
      tree.position.set(rx, getTerrainHeight(rx, rz), rz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(15, 0.72, 2.8, '#ffbe48');
    shaft.position.set(0.55, 5.6, -4.3);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.4,
      signatureLabel: 'Kneel Beside the Terracotta Lamp & the Lost Sheep on the Path',
      signatureActivatedText:
        '“Your word is a lamp to my feet, and a light for my path… I have gone astray like a lost sheep. Seek your servant, for I don’t forget your commandments.” (Psalm 119:105, 176)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.4;
        if (near) {
          this._ps119Latch = Math.min(1.0, (this._ps119Latch || 0) + dt * 0.65);
        }
        const val = this._ps119Latch || 0;
        const flicker = 1.0 + Math.sin(time * 5.2) * 0.10;
        if (lampEnsemble.lampLight) {
          lampEnsemble.lampLight.intensity = (1.5 + val * 2.5) * flicker;
        }
        if (lampEnsemble.flame) {
          lampEnsemble.flame.scale.set(1.0, (1.0 + val * 0.25) * flicker, 1.0);
        }
        return near || val > 0.85;
      }
    };
  }

  // Scene 3: Painting #20 "sow in tears" (Psalm 126:1–6) — Furrowed Seed Earth & Six Bound Golden Wheat Sheaves
  populatePsalms126GoldenSheavesScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.0);

    const sheavesEnsemble = this.propBuilder.createPsalm126SowInTearsSheavesEnsemble(derived.propTex, pal);
    sheavesEnsemble.position.copy(focalPos);
    group.add(sheavesEnsemble);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        sheavesEnsemble,
        'psalms-4',
        20,
        { targetHeight: 2.9, yOffset: 0.22 }
      );
    }

    for (const [tx, tz, sc] of [[-4.4, -4.4, 0.98], [4.6, -4.6, 1.04]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.foliageTex, pal, sc);
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.88, 3.5, '#ffe082');
    shaft.position.set(1.1, 6.2, -5.2);
    group.add(shaft);

    const harvestLight = new THREE.PointLight(0xffd464, 2.3, 16);
    harvestLight.position.set(1.1, 2.8, -5.0);
    group.add(harvestLight);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Step Between the Weeping Furrows & the Bound Golden Sheaves',
      signatureActivatedText:
        '“Those who sow in tears will reap in joy. He who goes out weeping, carrying seed for sowing, will certainly come again with joy, carrying his sheaves.” (Psalm 126:5–6)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) {
          this._ps126Latch = Math.min(1.0, (this._ps126Latch || 0) + dt * 0.6);
        }
        const val = this._ps126Latch || 0;
        harvestLight.intensity = (2.3 + val * 2.5) * (1.0 + Math.sin(time * 2.4) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  // Scene 4: Painting #44 "if you're breathing" (Psalm 150:1–6) — The Symphony of Praise (Harp, Timbrel, Trumpet & Cymbals)
  populatePsalms150SymphonyOfPraiseScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.0);

    const praiseEnsemble = this.propBuilder.createPsalm150EverythingThatHasBreathEnsemble(derived.propTex, pal, false);
    praiseEnsemble.group.position.copy(focalPos);
    group.add(praiseEnsemble.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        praiseEnsemble.group,
        'psalms-4',
        44,
        { targetHeight: 2.9, yOffset: 0.22 }
      );
    }

    for (const [tx, tz, sc] of [[-4.4, -4.6, 1.02], [4.5, -4.8, 1.02]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.foliageTex, pal, sc);
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.8, '#ffe698');
    shaft.position.set(0, 6.4, -5.0);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Join the Symphony of Harp, Timbrel, Trumpet & Cymbals with Everything That Has Breath',
      signatureActivatedText:
        '“Praise him with the sounding of the trumpet! Praise him with harp and lyre! Praise him with tambourine and dancing!… Let everything that has breath praise Yah! Praise Yah!” (Psalm 150:3–4, 6)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) {
          this._ps150Latch = Math.min(1.0, (this._ps150Latch || 0) + dt * 0.65);
        }
        const val = this._ps150Latch || 0;
        const pulse = 1.0 + Math.sin(time * 3.0) * 0.10;
        if (praiseEnsemble.praiseLight) {
          praiseEnsemble.praiseLight.intensity = (1.8 + val * 2.8) * pulse;
        }
        if (praiseEnsemble.timbrelGroup) {
          praiseEnsemble.timbrelGroup.rotation.z = -0.35 + Math.sin(time * 3.6) * (0.04 + val * 0.08);
        }
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXIV (GREATLY BELOVED — DANIEL) STEP-THROUGH SCENES
  // =========================================================================

  // Scene 1: Painting #4 "ten days" (Daniel 1:12–15) — Table of Pulse/Vegetables, Water Pitcher & Scroll
  populateDaniel4PulseTableScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.0);

    const pulseEnsemble = this.propBuilder.createDaniel1PulseTableEnsemble(derived.propTex, pal);
    pulseEnsemble.group.position.copy(focalPos);
    group.add(pulseEnsemble.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        pulseEnsemble.group,
        'greatly-beloved',
        4,
        { targetHeight: 2.8, yOffset: 0.22 }
      );
    }

    for (const [wx, wz, ry] of [[-5.2, -5.8, 0.35], [5.2, -5.8, -0.35]]) {
      const wall = this.propBuilder.createBabylonFortressWallSegment(pal, true);
      wall.scale.setScalar(0.68);
      wall.position.set(wx, getTerrainHeight(wx, wz), wz);
      wall.rotation.y = ry;
      group.add(wall);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.84, 3.3, '#ffe298');
    shaft.position.set(0, 6.2, -5.0);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beside the Ten-Day Table of Pulse, Herbs & Water in Babylon',
      signatureActivatedText:
        '“Please test your servants for ten days; and let them give us vegetables to eat, and water to drink… At the end of ten days, their faces appeared fairer, and they were fatter in flesh, than all the youths who ate of the king’s delicacies.” (Daniel 1:12, 15)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) {
          this._dan4Latch = Math.min(1.0, (this._dan4Latch || 0) + dt * 0.65);
        }
        const val = this._dan4Latch || 0;
        if (pulseEnsemble.pulseLight) {
          pulseEnsemble.pulseLight.intensity = (1.5 + val * 2.4) * (1.0 + Math.sin(time * 2.4) * 0.08);
        }
        return near || val > 0.85;
      }
    };
  }

  // Scene 2: Painting #14 "a fourth in the fire" (Daniel 3:24–25) — The Fiery Furnace & Four Unbound Figures
  populateDaniel14FieryFurnaceScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.8);

    const furnace = this.propBuilder.createBabylonFieryFurnaceLandmark(pal);
    furnace.traverse((c) => {
      c.userData.keepWithGlb = true;
    });
    furnace.position.copy(focalPos);
    group.add(furnace);

    for (const [wx, wz, ry] of [[-5.6, -6.4, 0.38], [5.6, -6.4, -0.38]]) {
      const wall = this.propBuilder.createBabylonFortressWallSegment(pal, true);
      wall.scale.setScalar(0.72);
      wall.position.set(wx, getTerrainHeight(wx, wz), wz);
      wall.rotation.y = ry;
      group.add(wall);
    }

    const furnaceLight = new THREE.PointLight(0xff9e2c, 3.2, 20);
    furnaceLight.position.set(0, 2.4, -4.6);
    group.add(furnaceLight);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.90, 3.6, '#ffbe48');
    shaft.position.set(0, 6.4, -5.8);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.8,
      signatureLabel: 'Look Into the Blazing Furnace Where Four Walk Unbound in the Fire',
      signatureActivatedText:
        '“He answered, ‘Look! I see four men loose, walking in the middle of the fire, and they are unharmed; and the aspect of the fourth is like a son of the gods!’” (Daniel 3:25)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.8;
        if (near) {
          this._dan14Latch = Math.min(1.0, (this._dan14Latch || 0) + dt * 0.65);
        }
        const val = this._dan14Latch || 0;
        const flicker = 1.0 + Math.sin(time * 5.8) * 0.12;
        furnaceLight.intensity = (3.2 + val * 2.8) * flicker;
        return near || val > 0.85;
      }
    };
  }

  // Scene 3: Painting #24 "windows open toward Jerusalem" (Daniel 6:10) — Open Latticework Window & Prayer Mat
  populateDaniel24OpenWindowScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -4.8);

    const windowEnsemble = this.propBuilder.createDaniel6OpenWindowJerusalemEnsemble(derived.propTex, pal, false);
    windowEnsemble.group.position.copy(focalPos);
    group.add(windowEnsemble.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        windowEnsemble.group,
        'greatly-beloved',
        24,
        { targetHeight: 2.8, yOffset: 0.22 }
      );
    }

    for (const [wx, wz, ry] of [[-5.2, -5.6, 0.32], [5.2, -5.6, -0.32]]) {
      const wall = this.propBuilder.createBabylonFortressWallSegment(pal, true);
      wall.scale.setScalar(0.66);
      wall.position.set(wx, getTerrainHeight(wx, wz), wz);
      wall.rotation.y = ry;
      group.add(wall);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#ffe088');
    shaft.position.set(0, 6.2, -4.8);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Kneel on the Woven Prayer Mat Before the Windows Open Toward Jerusalem',
      signatureActivatedText:
        '“When Daniel knew that the writing was signed, he went into his house (now his windows were open in his chamber toward Jerusalem) and he kneeled on his knees three times a day, and prayed, and gave thanks before his God, as he did before.” (Daniel 6:10)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) {
          this._dan24Latch = Math.min(1.0, (this._dan24Latch || 0) + dt * 0.65);
        }
        const val = this._dan24Latch || 0;
        if (windowEnsemble.windowLight) {
          windowEnsemble.windowLight.intensity = (1.8 + val * 2.6) * (1.0 + Math.sin(time * 2.4) * 0.08);
        }
        return near || val > 0.85;
      }
    };
  }

  // Scene 4: Painting #26 "the lions' den" (Daniel 6:21–23) — Resting Lions & Morning Light Shaft in the Den
  populateDaniel26LionsDenScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);

    const lionsDen = this.propBuilder.createDanielLionsDenLandmark(pal);
    lionsDen.traverse((c) => {
      c.userData.keepWithGlb = true;
    });
    lionsDen.position.copy(focalPos);
    group.add(lionsDen);

    const denLight = new THREE.PointLight(0xffe294, 2.8, 18);
    denLight.position.set(0, 3.2, -5.0);
    group.add(denLight);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.90, 3.6, '#ffea9c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand in the Morning Light Shaft Among the Peaceful Lions of the Den',
      signatureActivatedText:
        '“My God has sent his angel, and has shut the lions’ mouths, and they have not hurt me… So Daniel was taken up out of the den, and no kind of harm was found on him, because he had trusted in his God.” (Daniel 6:22–23)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) {
          this._dan26Latch = Math.min(1.0, (this._dan26Latch || 0) + dt * 0.65);
        }
        const val = this._dan26Latch || 0;
        denLight.intensity = (2.8 + val * 2.8) * (1.0 + Math.sin(time * 2.2) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XX (ARISE, SHINE — ISAIAH) STEP-THROUGH SCENES
  // =========================================================================

  populateIsaiah6LiveCoalScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createIsaiah6LiveCoalAltarEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'arise-shine', 3, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffbe58');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Before the Altar Tongs & the Glowing Live Coal',
      signatureActivatedText:
        '“Then one of the seraphim flew to me, having a live coal in his hand, which he had taken with the tongs from off the altar. He touched my mouth with it, and said, ‘Behold, this has touched your lips; and your iniquity is taken away, and your sin forgiven.’” (Isaiah 6:6–7)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._isa6Latch = Math.min(1.0, (this._isa6Latch || 0) + dt * 0.65);
        const val = this._isa6Latch || 0;
        rig.emberLight.intensity = (2.6 + val * 3.0) * (1.0 + Math.sin(time * 4.5) * 0.12);
        return near || val > 0.85;
      }
    };
  }

  populateIsaiah11PeaceableKingdomScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createIsaiah11WolfAndLambMeadowEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'arise-shine', 9, { targetHeight: 2.9, yOffset: 0.22 });
    }

    for (const [tx, tz, sc] of [[-4.5, -5.8, 1.04], [4.6, -5.6, 0.98]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, sc);
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.85, 3.4, '#ffe69c');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Pause by the Shoot of Jesse Where the Wolf & the Lamb Rest Together',
      signatureActivatedText:
        '“A shoot will come out of the stock of Jesse, and a branch out of his roots will bear fruit… The wolf will live with the lamb, and the leopard will lie down with the young goat.” (Isaiah 11:1, 6)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._isa11Latch = Math.min(1.0, (this._isa11Latch || 0) + dt * 0.6);
        const val = this._isa11Latch || 0;
        rig.meadowLight.intensity = (2.2 + val * 2.6) * (1.0 + Math.sin(time * 2.0) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateIsaiah40EagleWingsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const rig = this.propBuilder.createIsaiah40EagleWingsCragEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'arise-shine', 19, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe294');
    shaft.position.set(0, 6.4, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Wait Upon the Lord at the High Summit Aerie',
      signatureActivatedText:
        '“But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.” (Isaiah 40:31)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._isa40Latch = Math.min(1.0, (this._isa40Latch || 0) + dt * 0.6);
        const val = this._isa40Latch || 0;
        rig.eagleLight.intensity = (2.4 + val * 2.8) * (1.0 + Math.sin(time * 2.2) * 0.08);
        rig.wingsGroup.position.y = 1.65 + Math.sin(time * 1.8) * 0.05;
        return near || val > 0.85;
      }
    };
  }

  populateIsaiah60AriseShineScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const rig = this.propBuilder.createIsaiah60AriseShineGateEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'arise-shine', 35, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.95, 3.8, '#ffe288');
    shaft.position.set(0, 6.6, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Step Into the Dawn Light Breaking Over the Gate of Zion',
      signatureActivatedText:
        '“Arise, shine; for your light has come, and Yahweh’s glory has risen on you! For, behold, darkness will cover the earth, and thick darkness the peoples; but Yahweh will arise on you, and his glory shall be seen on you.” (Isaiah 60:1–2)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._isa60Latch = Math.min(1.0, (this._isa60Latch || 0) + dt * 0.65);
        const val = this._isa60Latch || 0;
        rig.shineLight.intensity = (2.5 + val * 3.2) * (1.0 + Math.sin(time * 2.5) * 0.1);
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXVIII (GOOD NEWS OF GREAT JOY — LUKE) STEP-THROUGH SCENES
  // =========================================================================

  populateLuke2BethlehemMangerScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    if (skyDome?.material?.uniforms?.uStarIntensity) {
      skyDome.material.uniforms.uStarIntensity.value = 0.82;
    }

    const rig = this.propBuilder.createLuke2BethlehemMangerEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'good-news-of-great-joy', 5, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.88, 3.4, '#ffea9e');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Kneel Beside the Bethlehem Manger & Swaddling Cloths',
      signatureActivatedText:
        '“She brought forth her firstborn son, and she wrapped him in bands of cloth, and laid him in a feeding trough, because there was no room for them in the inn… ‘Behold, I bring you good news of great joy which will be to all the people.’” (Luke 2:7, 10)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._lk2Latch = Math.min(1.0, (this._lk2Latch || 0) + dt * 0.65);
        const val = this._lk2Latch || 0;
        rig.mangerLight.intensity = (2.6 + val * 2.8) * (1.0 + Math.sin(time * 2.6) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateLuke10GoodSamaritanScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createLuke10GoodSamaritanInnEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'good-news-of-great-joy', 19, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.84, 3.2, '#ffe08c');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Pause at the Roadside Inn Beside the Flasks of Oil & Wine',
      signatureActivatedText:
        '“But a certain Samaritan, as he traveled, came where he was. When he saw him, he was moved with compassion, came to him, and bound up his wounds, pouring on oil and wine.” (Luke 10:33–34)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._lk10Latch = Math.min(1.0, (this._lk10Latch || 0) + dt * 0.6);
        const val = this._lk10Latch || 0;
        rig.innLight.intensity = (2.4 + val * 2.6) * (1.0 + Math.sin(time * 2.4) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateLuke15ProdigalRoadScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createLuke15ProdigalWelcomeEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'good-news-of-great-joy', 27, { targetHeight: 2.9, yOffset: 0.22 });
    }

    for (const [tx, tz, sc] of [[-4.6, -5.8, 1.02], [4.6, -5.8, 0.98]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, sc);
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe698');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Walk the Open Road Home Where the Best Robe & Ring Wait',
      signatureActivatedText:
        '“But while he was still far off, his father saw him, and was moved with compassion, and ran, and fell on his neck, and kissed him… ‘Quickly bring out the best robe, and put it on him; and put a ring on his hand, and sandals on his feet!’” (Luke 15:20, 22)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._lk15Latch = Math.min(1.0, (this._lk15Latch || 0) + dt * 0.65);
        const val = this._lk15Latch || 0;
        rig.welcomeLight.intensity = (2.5 + val * 2.8) * (1.0 + Math.sin(time * 2.2) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateLuke24EmmausTableScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.0);
    const rig = this.propBuilder.createLuke24EmmausTableEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'good-news-of-great-joy', 40, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.86, 3.3, '#ffdc84');
    shaft.position.set(0, 6.2, -5.0);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Sit at the Evening Table Where the Bread Was Broken',
      signatureActivatedText:
        '“When he had sat down at the table with them, he took the bread and gave thanks. Breaking it, he gave it to them. Their eyes were opened, and they recognized him… ‘Wasn’t our heart burning within us, while he spoke to us on the way?’” (Luke 24:30–32)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._lk24Latch = Math.min(1.0, (this._lk24Latch || 0) + dt * 0.65);
        const val = this._lk24Latch || 0;
        rig.emmausLight.intensity = (2.5 + val * 2.8) * (1.0 + Math.sin(time * 2.8) * 0.09);
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXIX (I AM WITH YOU ALWAYS — MATTHEW) STEP-THROUGH SCENES
  // =========================================================================

  populateMatthew2MagiStarScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    if (skyDome?.material?.uniforms?.uStarIntensity) {
      skyDome.material.uniforms.uStarIntensity.value = 0.88;
    }

    const rig = this.propBuilder.createMatthew2MagiStarGiftsEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'i-am-with-you-always', 4, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#fff0a8');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beneath the Bethlehem Star & Open Coffers of Gold, Frankincense & Myrrh',
      signatureActivatedText:
        '“When they saw the star, they rejoiced with exceedingly great joy. They came into the house and saw the young child with Mary, his mother, and they fell down and worshiped him. Opening their treasures, they offered to him gifts: gold, frankincense, and myrrh.” (Matthew 2:10–11)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._mt2Latch = Math.min(1.0, (this._mt2Latch || 0) + dt * 0.65);
        const val = this._mt2Latch || 0;
        rig.starLight.intensity = (2.8 + val * 3.0) * (1.0 + Math.sin(time * 3.0) * 0.1);
        return near || val > 0.85;
      }
    };
  }

  populateMatthew5CityOnHillLampScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.0);
    const rig = this.propBuilder.createMatthew5LampOnStandEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'i-am-with-you-always', 13, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.86, 3.4, '#ffe28c');
    shaft.position.set(0, 6.2, -5.0);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Approach the Lamp on Its Stand Shining to All in the House',
      signatureActivatedText:
        '“You are the light of the world. A city located on a hill can’t be hidden. Neither do you light a lamp, and put it under a measuring basket, but on a stand; and it shines to all who are in the house.” (Matthew 5:14–15)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._mt5Latch = Math.min(1.0, (this._mt5Latch || 0) + dt * 0.65);
        const val = this._mt5Latch || 0;
        rig.lampStandLight.intensity = (2.6 + val * 2.8) * (1.0 + Math.sin(time * 4.2) * 0.1);
        return near || val > 0.85;
      }
    };
  }

  populateMatthew14WalkingOnSeaScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#152e42',
      shallowColor: '#3e6e85',
      sunColor: '#ffe69c',
      opacity: 0.92
    });
    const seaGeo = new THREE.PlaneGeometry(52, 34, 48, 40);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(seaGeo, waterMat);
    seaMesh.position.set(0, 0.05, -8.5);
    group.add(seaMesh);

    const boatRig = this.propBuilder.createStormBoatAndCushion(derived.propTex, pal, false);
    boatRig.group.position.set(-2.2, 0.08, -6.2);
    boatRig.group.rotation.y = 0.32;
    group.add(boatRig.group);

    const holder = new THREE.Group();
    holder.position.copy(focalPos);
    group.add(holder);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(holder, 'i-am-with-you-always', 26, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const seaLight = new THREE.PointLight(0xffe69c, 2.8, 20);
    seaLight.position.set(0, 2.8, -5.4);
    group.add(seaLight);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe69c');
    shaft.position.set(0, 6.4, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Step Out Onto the Shining Path Across the Waves',
      signatureActivatedText:
        '“He said, ‘Come!’ Peter stepped down from the boat, and walked on the water to come to Jesus… Immediately Jesus stretched out his hand, took hold of him, and said to him, ‘You of little faith, why did you doubt?’” (Matthew 14:29, 31)',
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time * 0.85;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.6;
        if (near) this._mt14Latch = Math.min(1.0, (this._mt14Latch || 0) + dt * 0.65);
        const val = this._mt14Latch || 0;
        seaLight.intensity = (2.8 + val * 3.0) * (1.0 + Math.sin(time * 2.4) * 0.1);
        return near || val > 0.85;
      }
    };
  }

  populateMatthew28EmptyTombScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const rig = this.propBuilder.createMatthew28EmptyTombEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'i-am-with-you-always', 39, { targetHeight: 3.0, yOffset: 0.22 });
    }

    for (const [tx, tz, sc] of [[-4.8, -5.8, 1.05], [4.8, -5.8, 0.96]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, sc);
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      group.add(tree);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#ffea9c');
    shaft.position.set(0, 6.4, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand Before the Rolled-Away Stone & Sunlit Empty Tomb',
      signatureActivatedText:
        '“The angel answered the women, ‘Don’t be afraid, for I know that you seek Jesus, who has been crucified. He is not here, for he has risen, just like he said. Come, see the place where the Lord lay.’” (Matthew 28:5–6)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._mt28Latch = Math.min(1.0, (this._mt28Latch || 0) + dt * 0.65);
        const val = this._mt28Latch || 0;
        rig.tombLight.intensity = (2.6 + val * 3.0) * (1.0 + Math.sin(time * 2.2) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXX (PEACE, BE STILL — MARK) STEP-THROUGH SCENES
  // =========================================================================

  populateMark4GalileeBoatScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#1b3d4f',
      shallowColor: '#5c8c9e',
      sunColor: '#ffea9e',
      opacity: 0.92
    });
    const seaGeo = new THREE.PlaneGeometry(52, 32, 48, 36);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(seaGeo, waterMat);
    seaMesh.position.set(0, 0.05, -8.8);
    group.add(seaMesh);

    const boatRig = this.propBuilder.createStormBoatAndCushion(derived.propTex, pal, false);
    boatRig.group.position.copy(focalPos);
    group.add(boatRig.group);

    const boatHolder = boatRig.group;

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(boatHolder, 'peace-be-still', 11, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const boatLight = new THREE.PointLight(0xffea9e, 2.7, 18);
    boatLight.position.set(0, 2.6, -5.4);
    group.add(boatLight);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffea9e');
    shaft.position.set(0, 6.4, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Rest by the Stern Cushion as the Wind Ceases & Great Calm Falls',
      signatureActivatedText:
        '“He Himself was in the stern, asleep on the cushion… He awoke, and rebuked the wind, and said to the sea, ‘Peace! Be still!’ The wind ceased, and there was a great calm.” (Mark 4:38–39)',
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time * 0.4;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.5;
        if (near) this._mk4Latch = Math.min(1.0, (this._mk4Latch || 0) + dt * 0.65);
        const val = this._mk4Latch || 0;
        boatLight.intensity = (2.7 + val * 2.8) * (1.0 + Math.sin(time * 2.0) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateMark6GreenGrassBasketsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createMark6GreenGrassBasketsEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'peace-be-still', 18, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const meadowGrass = this.propBuilder.createInstancedMeadowGrass(
      680,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.2 + Math.random() * 14.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      { ground: '#4e6e3e', accent: '#c9d97a', horizon: '#8ca868' }
    );
    group.add(meadowGrass);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.86, 3.4, '#ffe696');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Sit on the Green Grass Among the Twelve Full Baskets',
      signatureActivatedText:
        '“He commanded them that everyone should sit down in groups on the green grass… They all ate, and were filled. They took up twelve baskets full of broken pieces and also of the fish.” (Mark 6:39, 42–43)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._mk6Latch = Math.min(1.0, (this._mk6Latch || 0) + dt * 0.6);
        const val = this._mk6Latch || 0;
        rig.basketsLight.intensity = (2.4 + val * 2.6) * (1.0 + Math.sin(time * 2.2) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateMark10BartimaeusCloakScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createMark10BartimaeusCloakEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'peace-be-still', 27, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.88, 3.4, '#ffe294');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beside the Cast-Off Cloak on the Jericho Road',
      signatureActivatedText:
        '“Jesus stood still, and said, ‘Call him.’ They called the blind man, saying to him, ‘Cheer up! Get up. He is calling you!’ He, casting away his cloak, sprang up, and came to Jesus.” (Mark 10:49–50)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._mk10Latch = Math.min(1.0, (this._mk10Latch || 0) + dt * 0.6);
        const val = this._mk10Latch || 0;
        rig.cloakLight.intensity = (2.4 + val * 2.7) * (1.0 + Math.sin(time * 2.4) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateMark14AlabasterJarScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.0);
    const rig = this.propBuilder.createMark14AlabasterJarEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'peace-be-still', 30, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.86, 3.3, '#ffe088');
    shaft.position.set(0, 6.2, -5.0);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Breathe the Fragrance of the Broken Alabaster Jar of Spikenard',
      signatureActivatedText:
        '“A woman came having an alabaster jar of ointment of pure nard—very costly. She broke the jar, and poured it over his head… ‘She has done what she could… Wherever the Good News may be preached throughout the whole world, that which this woman has done will also be spoken of for a memorial of her.’” (Mark 14:3, 8–9)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._mk14Latch = Math.min(1.0, (this._mk14Latch || 0) + dt * 0.65);
        const val = this._mk14Latch || 0;
        rig.nardLight.intensity = (2.5 + val * 2.8) * (1.0 + Math.sin(time * 2.6) * 0.09);
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXXI (COME AND SEE — JOHN) STEP-THROUGH SCENES
  // =========================================================================

  populateJohn2CanaJarsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJohn2CanaStoneJarsEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'come-and-see', 6, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.86, 3.4, '#ffe294');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beside the Six Stone Waterpots Filled to the Brim at Cana',
      signatureActivatedText:
        '“Jesus said to them, ‘Fill the water pots with water.’ And they filled them up to the brim… ‘Every man serves the good wine first… but you have kept the good wine until now!’” (John 2:7, 10)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jn2Latch = Math.min(1.0, (this._jn2Latch || 0) + dt * 0.65);
        const val = this._jn2Latch || 0;
        rig.canaLight.intensity = (2.5 + val * 2.8) * (1.0 + Math.sin(time * 2.4) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateJohn4JacobsWellScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJohn4JacobsWellJarEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'come-and-see', 9, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.88, 3.4, '#ffe69c');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Rest by Jacob’s Well Beside the Water Jar Left Behind',
      signatureActivatedText:
        '“Whoever drinks of the water that I will give him will never thirst again; but the water that I will give him will become in him a well of water springing up to eternal life… So the woman left her water pot, and went away into the city.” (John 4:14, 28)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jn4Latch = Math.min(1.0, (this._jn4Latch || 0) + dt * 0.65);
        const val = this._jn4Latch || 0;
        rig.wellLight.intensity = (2.5 + val * 2.8) * (1.0 + Math.sin(time * 2.2) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateJohn13UpperRoomBasinScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.0);
    const rig = this.propBuilder.createJohn13UpperRoomBasinEnsemble(derived.propTex, pal);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'come-and-see', 25, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.84, 3.2, '#ffdc88');
    shaft.position.set(0, 6.2, -5.0);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Kneel Beside the Foot-Washing Basin, Linen Towel & Circle of Sandals',
      signatureActivatedText:
        '“He got up from supper, and laid aside his outer garments. He took a towel, and wrapped a towel around his waist. Then he poured water into the basin, and began to wash the disciples’ feet, and to wipe them with the towel that was wrapped around him.” (John 13:4–5)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jn13Latch = Math.min(1.0, (this._jn13Latch || 0) + dt * 0.65);
        const val = this._jn13Latch || 0;
        rig.basinLight.intensity = (2.5 + val * 2.8) * (1.0 + Math.sin(time * 2.6) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateJohn21CharcoalBreakfastScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#244b5c',
      shallowColor: '#6ca3b0',
      sunColor: '#ffe8a3',
      opacity: 0.90
    });
    const seaGeo = new THREE.PlaneGeometry(52, 26, 44, 32);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(seaGeo, waterMat);
    seaMesh.position.set(0, 0.04, -10.5);
    group.add(seaMesh);

    const rig = this.propBuilder.createJohn21CharcoalBreakfastEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'come-and-see', 39, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe28e');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Warm Your Hands at the Charcoal Fire on the Galilee Beach',
      signatureActivatedText:
        '“So when they got out on the land, they saw a fire of coals there, with fish laid on it, and bread… Jesus said to them, ‘Come and eat breakfast!’” (John 21:9, 12)',
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time * 0.45;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.5;
        if (near) this._jn21Latch = Math.min(1.0, (this._jn21Latch || 0) + dt * 0.65);
        const val = this._jn21Latch || 0;
        rig.charcoalLight.intensity = (2.6 + val * 3.0) * (1.0 + Math.sin(time * 4.8) * 0.12);
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XII (OUT OF THE WHIRLWIND — JOB) STEP-THROUGH SCENES
  // =========================================================================

  populateJob6AshHeapScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJob2AshHeapPotsherdEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'out-of-the-whirlwind', 6, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffcf86');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Sit in Silence Beside the Ash Heap & Three Stones',
      signatureActivatedText:
        '“So they sat down with him on the ground seven days and seven nights, and none spoke a word to him, for they saw that his grief was very great.” (Job 2:13)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._job6Latch = Math.min(1.0, (this._job6Latch || 0) + dt * 0.65);
        const val = this._job6Latch || 0;
        rig.ashLight.intensity = (2.3 + val * 2.6) * (1.0 + Math.sin(time * 3.2) * 0.1);
        return near || val > 0.85;
      }
    };
  }

  populateJob16ScentOfWaterScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJob14ScentOfWaterStumpEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'out-of-the-whirlwind', 16, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#d9f598');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Approach the Hewn Stump Budding at the Scent of Water',
      signatureActivatedText:
        '“For there is hope for a tree, if it is cut down, that it will sprout again… Yet through the scent of water it will bud, and sprout boughs like a plant.” (Job 14:7, 9)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._job16Latch = Math.min(1.0, (this._job16Latch || 0) + dt * 0.65);
        const val = this._job16Latch || 0;
        rig.shootGroup.scale.setScalar(1.0 + val * 0.25);
        rig.sproutLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateJob19RedeemerRockScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const rig = this.propBuilder.createJob19RedeemerRockInscriptionEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'out-of-the-whirlwind', 19, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#ffe494');
    shaft.position.set(0, 6.4, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Trace the Words Graven with Iron & Lead in the Rock Forever',
      signatureActivatedText:
        '“Oh that my words were now written!… That with an iron pen and lead they were engraved in the rock forever! But as for me, I know that my Redeemer lives.” (Job 19:23–25)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._job19Latch = Math.min(1.0, (this._job19Latch || 0) + dt * 0.65);
        const val = this._job19Latch || 0;
        rig.rockLight.intensity = (2.5 + val * 3.0) * (1.0 + Math.sin(time * 2.4) * 0.08);
        return near || val > 0.85;
      }
    };
  }

  populateJob32WhirlwindStarsScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    if (skyDome && skyDome.material && skyDome.material.uniforms && skyDome.material.uniforms.uStarIntensity) {
      skyDome.material.uniforms.uStarIntensity.value = 0.85;
    }

    const rig = this.propBuilder.createJob38WhirlwindAndStarsEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'out-of-the-whirlwind', 32, { targetHeight: 3.1, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.95, 3.8, '#ffea9e');
    shaft.position.set(0, 6.6, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand Before the Whirlwind Under the Pleiades & Orion',
      signatureActivatedText:
        '“Then Yahweh answered Job out of the whirlwind… ‘Can you bind the cluster of the Pleiades, or loosen the cords of Orion?’” (Job 38:1, 31)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._job32Latch = Math.min(1.0, (this._job32Latch || 0) + dt * 0.65);
        const val = this._job32Latch || 0;
        rig.vortexGroup.rotation.y = time * (1.2 + val * 0.8);
        rig.starLight.intensity = 2.7 + val * 3.2;
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXI (A FUTURE AND A HOPE — JEREMIAH) STEP-THROUGH SCENES
  // =========================================================================

  populateJeremiah3AlmondBranchScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJeremiah1AlmondBranchEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'a-future-and-a-hope', 3, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe6ee');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Look Upon the Early-Waking Almond Branch in Blossom',
      signatureActivatedText:
        '“‘Jeremiah, what do you see?’ I said, ‘I see a branch of an almond tree.’ Then Yahweh said to me, ‘You have seen well; for I watch over my word to perform it.’” (Jeremiah 1:11–12)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jer3Latch = Math.min(1.0, (this._jer3Latch || 0) + dt * 0.65);
        const val = this._jer3Latch || 0;
        rig.almondLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateJeremiah16PottersWheelScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJeremiah18PottersWheelEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'a-future-and-a-hope', 16, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffdf96');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Watch the Clay Vessel Reshaped Upon the Potter’s Wheel',
      signatureActivatedText:
        '“When the vessel that he made of the clay was marred in the hand of the potter, he made it again another vessel, as seemed good to the potter to make it.” (Jeremiah 18:4)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jer16Latch = Math.min(1.0, (this._jer16Latch || 0) + dt * 0.65);
        const val = this._jer16Latch || 0;
        rig.wheelGroup.rotation.y = time * (1.8 + val * 1.4);
        rig.potterLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateJeremiah24ExileLetterScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJeremiah29ExileLetterScrollEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'a-future-and-a-hope', 24, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe49e');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Read the Open Letter Sent to the Exiles in Babylon',
      signatureActivatedText:
        '“‘For I know the thoughts that I think toward you,’ says Yahweh, ‘thoughts of peace, and not of evil, to give you hope and a future.’” (Jeremiah 29:11)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jer24Latch = Math.min(1.0, (this._jer24Latch || 0) + dt * 0.65);
        const val = this._jer24Latch || 0;
        rig.scrollLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateJeremiah30AnathothDeedScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJeremiah32AnathothDeedJarsEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'a-future-and-a-hope', 30, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe299');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Before the Earthenware Jar Holding the Anathoth Deeds',
      signatureActivatedText:
        '“‘Take these deeds, this purchase deed which is sealed, and this deed which is open, and put them in an earthen vessel, that they may continue many days.’ For thus says Yahweh of Armies: ‘Houses and fields and vineyards shall again be bought in this land.’” (Jeremiah 32:14–15)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jer30Latch = Math.min(1.0, (this._jer30Latch || 0) + dt * 0.65);
        const val = this._jer30Latch || 0;
        rig.deedLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXIII (CAN THESE BONES LIVE — EZEKIEL) STEP-THROUGH SCENES
  // =========================================================================

  populateEzekiel3ChebarWheelThroneScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    if (skyDome && skyDome.material && skyDome.material.uniforms && skyDome.material.uniforms.uRainbowIntensity) {
      skyDome.material.uniforms.uRainbowIntensity.value = 0.75;
    }

    const rig = this.propBuilder.createEzekiel1ChebarWheelThroneEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'can-these-bones-live', 3, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.95, 3.8, '#ffea9e');
    shaft.position.set(0, 6.5, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand Before the Interlocked Beryl Wheels & Rainbow Glory',
      signatureActivatedText:
        '“Their work was like a wheel within a wheel… As the appearance of the bow that is in the cloud in the day of rain, so was the appearance of the brightness all around.” (Ezekiel 1:16, 28)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._ez3Latch = Math.min(1.0, (this._ez3Latch || 0) + dt * 0.65);
        const val = this._ez3Latch || 0;
        rig.wheelsGroup.rotation.y = time * (0.95 + val * 0.8);
        rig.wheelsGroup.rotation.x = Math.sin(time * 0.7) * 0.25;
        rig.wheelLight.intensity = 2.7 + val * 3.2;
        return near || val > 0.85;
      }
    };
  }

  populateEzekiel30HeartOfFleshScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEzekiel36HeartOfFleshAltarEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'can-these-bones-live', 30, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffd2c8');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Witness the Stone Parting Around a New Heart of Flesh',
      signatureActivatedText:
        '“I will also give you a new heart, and I will put a new spirit within you. I will take away the stony heart out of your flesh, and I will give you a heart of flesh.” (Ezekiel 36:26)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._ez30Latch = Math.min(1.0, (this._ez30Latch || 0) + dt * 0.65);
        const val = this._ez30Latch || 0;
        const pulse = 1.0 + Math.sin(time * 3.4) * 0.08;
        rig.heartCore.scale.set(pulse, 1.18 * pulse, 0.82 * pulse);
        rig.heartLight.intensity = 2.5 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateEzekiel32DryBonesScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const rig = this.propBuilder.createEzekiel37ValleyOfDryBonesEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'can-these-bones-live', 32, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#ffebb0');
    shaft.position.set(0, 6.4, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Prophesy to the Breath in the Valley of Dry Bones',
      signatureActivatedText:
        '“‘Come from the four winds, breath, and breathe on these slain, that they may live!’ So I prophesied as he commanded me, and the breath came into them, and they lived, and stood up on their feet.” (Ezekiel 37:9–10)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._ez32Latch = Math.min(1.0, (this._ez32Latch || 0) + dt * 0.65);
        const val = this._ez32Latch || 0;
        rig.ribsGroup.position.y = val * 0.25;
        rig.breathLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateEzekiel38TempleRiverScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#1b5a73',
      shallowColor: '#56b8cc',
      sunColor: '#ffea9c',
      opacity: 0.92
    });
    const riverGeo = new THREE.PlaneGeometry(14, 34, 24, 36);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMesh = new THREE.Mesh(riverGeo, waterMat);
    riverMesh.position.set(0, 0.05, -7.2);
    group.add(riverMesh);

    const rig = this.propBuilder.createEzekiel47TempleRiverTreesEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'can-these-bones-live', 38, { targetHeight: 2.9, yOffset: 0.22 });
    }

    for (const [tx, tz, sc] of [[-4.2, -5.5, 1.05], [4.2, -5.5, 1.02]]) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, sc);
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      group.add(tree);
    }

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Walk Beside the Temple River & Trees Bearing Leaves for Healing',
      signatureActivatedText:
        '“Everything will live wherever the river comes… Their fruit will be for food, and their leaf for healing.” (Ezekiel 47:9, 12)',
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time * 0.55;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.5;
        if (near) this._ez38Latch = Math.min(1.0, (this._ez38Latch || 0) + dt * 0.65);
        const val = this._ez38Latch || 0;
        rig.riverLight.intensity = 2.5 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXVI (OUT OF THE DEEP — JONAH) STEP-THROUGH SCENES
  // =========================================================================

  populateJonah3StormShipScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#162f42',
      shallowColor: '#3d6e85',
      sunColor: '#ffe094',
      opacity: 0.92
    });
    const seaGeo = new THREE.PlaneGeometry(52, 32, 48, 36);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(seaGeo, waterMat);
    seaMesh.position.set(0, 0.05, -8.5);
    group.add(seaMesh);

    const rig = this.propBuilder.createJonah1TarshishStormShipEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'out-of-the-deep', 3, { targetHeight: 2.9, yOffset: 0.22 });
    }

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand by the Storm-Tossed Tarshish Ship & Hold Lantern',
      signatureActivatedText:
        '“But Yahweh sent out a great wind on the sea, and there was a mighty tempest on the sea, so that the ship was likely to break up… But Jonah had gone down into the innermost parts of the ship, and he was fast asleep.” (Jonah 1:4–5)',
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time * 0.85;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        rig.group.rotation.z = Math.sin(time * 1.8) * 0.08;
        const near = distToSignature < 4.5;
        if (near) this._jn3Latch = Math.min(1.0, (this._jn3Latch || 0) + dt * 0.65);
        return near || (this._jn3Latch || 0) > 0.85;
      }
    };
  }

  populateJonah8DepthsOfSeaScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.4);
    const rig = this.propBuilder.createJonah2GreatFishDepthsEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'out-of-the-deep', 8, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.9, 3.8, '#8ae6ff');
    shaft.position.set(0, 6.5, -5.4);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Look Upward from the Roots of the Mountains Toward the Temple Light',
      signatureActivatedText:
        '“I went down to the bottoms of the mountains… Yet you have brought up my life from the pit, Yahweh my God. When my soul fainted within me, I remembered Yahweh.” (Jonah 2:6–7)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jn8Latch = Math.min(1.0, (this._jn8Latch || 0) + dt * 0.65);
        const val = this._jn8Latch || 0;
        rig.deepLight.intensity = 2.5 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateJonah16NinevehThroneScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJonah3NinevehEmptyThroneEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'out-of-the-deep', 16, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe09c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Approach the Empty Throne of Nineveh & Crown in the Ashes',
      signatureActivatedText:
        '“The news reached the king of Nineveh, and he arose from his throne, and took off his royal robe, covered himself with sackcloth, and sat in ashes.” (Jonah 3:6)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jn16Latch = Math.min(1.0, (this._jn16Latch || 0) + dt * 0.65);
        const val = this._jn16Latch || 0;
        rig.throneLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateJonah22BoothVineScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJonah4EastHillBoothVineEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'out-of-the-deep', 22, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe69c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Rest Under the Shade of the Appointed Vine on the East Hill',
      signatureActivatedText:
        '“Yahweh God prepared a vine, and made it come up over Jonah, that it might be a shade over his head, to deliver him from his discomfort.” (Jonah 4:6)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._jn22Latch = Math.min(1.0, (this._jn22Latch || 0) + dt * 0.65);
        const val = this._jn22Latch || 0;
        rig.vineLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XXXII (TO THE ENDS OF THE EARTH — ACTS) STEP-THROUGH SCENES
  // =========================================================================

  populateActs5PentecostRoomScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createActs2PentecostUpperRoomEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'to-the-ends-of-the-earth', 5, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#ffb85c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand in the Upper Room Beneath the Tongues Like Fire',
      signatureActivatedText:
        '“Suddenly there came from the sky a sound like the rushing of a mighty wind, and it filled all the house where they were sitting. Tongues like fire appeared and were distributed to them, and one sat on each of them.” (Acts 2:2–3)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._acts5Latch = Math.min(1.0, (this._acts5Latch || 0) + dt * 0.65);
        const val = this._acts5Latch || 0;
        rig.flamesGroup.rotation.y = time * 0.45;
        rig.pentecostLight.intensity = (2.8 + val * 3.0) * (1.0 + Math.sin(time * 4.2) * 0.1);
        return near || val > 0.85;
      }
    };
  }

  populateActs9BeautifulGateScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createActs3GateCalledBeautifulEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'to-the-ends-of-the-earth', 9, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffe296');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Approach the Gate Called Beautiful & the Left-Behind Mat',
      signatureActivatedText:
        '“But Peter said, ‘Silver and gold have I none, but what I have, that I give you. In the name of Jesus Christ of Nazareth, get up and walk!’… And leaping up, he stood, and began to walk.” (Acts 3:6, 8)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._acts9Latch = Math.min(1.0, (this._acts9Latch || 0) + dt * 0.65);
        const val = this._acts9Latch || 0;
        rig.gateLight.intensity = 2.5 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateActs29PhilippiMidnightScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createActs16PhilippiMidnightPrisonEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'to-the-ends-of-the-earth', 29, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.6, '#ffcf78');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Among the Unfastened Chains at Midnight in Philippi',
      signatureActivatedText:
        '“But about midnight Paul and Silas were praying and singing hymns to God, and the prisoners were listening to them. Suddenly there was a great earthquake… and immediately all the doors were opened, and everyone’s bonds were loosened.” (Acts 16:25–26)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._acts29Latch = Math.min(1.0, (this._acts29Latch || 0) + dt * 0.65);
        const val = this._acts29Latch || 0;
        rig.prisonLight.intensity = 2.5 + val * 2.9;
        return near || val > 0.85;
      }
    };
  }

  populateActs37MaltaAnchorsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#1a3a4c',
      shallowColor: '#4c7e94',
      sunColor: '#ffe09c',
      opacity: 0.91
    });
    const seaGeo = new THREE.PlaneGeometry(52, 28, 44, 32);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(seaGeo, waterMat);
    seaMesh.position.set(0, 0.04, -9.5);
    group.add(seaMesh);

    const rig = this.propBuilder.createActs27MaltaFourAnchorsEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'to-the-ends-of-the-earth', 37, { targetHeight: 2.9, yOffset: 0.22 });
    }

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand by the Four Stern Anchors & Wish for the Dawn',
      signatureActivatedText:
        '“Fearing that we would run aground on rocky ground, they let go four anchors from the stern, and wished for the daylight.” (Acts 27:29)',
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time * 0.6;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.5;
        if (near) this._acts37Latch = Math.min(1.0, (this._acts37Latch || 0) + dt * 0.65);
        const val = this._acts37Latch || 0;
        rig.anchorLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  // =========================================================================
  // DISTRICT XL (ANCHOR OF THE SOUL — HEBREWS) STEP-THROUGH SCENES
  // =========================================================================

  populateHebrews16ThroneOfGraceScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createHebrews4ThroneOfGraceEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'anchor-of-the-soul', 16, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#ffea9c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Draw Near with Boldness to the Throne of Grace',
      signatureActivatedText:
        '“Let’s therefore draw near with boldness to the throne of grace, that we may receive mercy and may find grace for help in time of need.” (Hebrews 4:16)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._heb16Latch = Math.min(1.0, (this._heb16Latch || 0) + dt * 0.65);
        const val = this._heb16Latch || 0;
        rig.graceLight.intensity = 2.7 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateHebrews19AnchorOfSoulScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createHebrews6AnchorOfTheSoulEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'anchor-of-the-soul', 19, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#ffe69c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Lay Hold of the Hope Set Before Us — The Anchor of the Soul',
      signatureActivatedText:
        '“This hope we have as an anchor of the soul, a hope both sure and steadfast and entering into that which is within the veil.” (Hebrews 6:19)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._heb19Latch = Math.min(1.0, (this._heb19Latch || 0) + dt * 0.65);
        const val = this._heb19Latch || 0;
        rig.soulLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateHebrews23OpenedCurtainScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createHebrews10OpenedCurtainWayEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'anchor-of-the-soul', 23, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.6, '#ffea9c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Step Through the New and Living Way Opened Through the Veil',
      signatureActivatedText:
        '“Having therefore, brothers, boldness to enter into the holy place by the blood of Jesus, by the way which he dedicated for us, a new and living way, through the veil…” (Hebrews 10:19–20)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._heb23Latch = Math.min(1.0, (this._heb23Latch || 0) + dt * 0.65);
        const val = this._heb23Latch || 0;
        rig.veilLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateHebrews33CloudOfWitnessesScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createHebrews12CloudOfWitnessesArenaEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'anchor-of-the-soul', 33, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.95, 3.8, '#ffea9e');
    shaft.position.set(0, 6.5, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand Within the Amphitheater of the Great Cloud of Witnesses',
      signatureActivatedText:
        '“Therefore let’s also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let’s run with endurance the race that is set before us.” (Hebrews 12:1)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._heb33Latch = Math.min(1.0, (this._heb33Latch || 0) + dt * 0.65);
        const val = this._heb33Latch || 0;
        rig.witnessesGroup.rotation.y = time * 0.28;
        rig.arenaLight.intensity = 2.7 + val * 3.2;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // BATCH 3 DEEPENED STEP-THROUGH SCENES (BOOKS IX, X, XI, XVII, XVIII, XIX)
  // ==========================================================================

  // --- District IX: 1 & 2 Chronicles (our-eyes-are-on-you) ---
  populateChronicles4ThresholdsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createChronicles9ThresholdKeepersEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'our-eyes-are-on-you', 4, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffe296');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand at the Temple Threshold Gate & Morning Key',
      signatureActivatedText:
        '“They lodged around God’s house, because the duty of opening it every morning was theirs.” (1 Chronicles 9:27)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._chron4Latch = Math.min(1.0, (this._chron4Latch || 0) + dt * 0.65);
        const val = this._chron4Latch || 0;
        rig.keyGroup.rotation.y = Math.sin(time * 1.4) * 0.35 + val * 0.6;
        rig.thresholdLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateChronicles8ArkFeastScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createChronicles16ArkTentFeastEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'our-eyes-are-on-you', 8, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffdf91');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Approach the Tent Table of Bread & Raisin Cakes',
      signatureActivatedText:
        '“He dealt to everyone of Israel, both man and woman, to everyone a loaf of bread, a portion of meat, and a cake of raisins.” (1 Chronicles 16:3)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._chron8Latch = Math.min(1.0, (this._chron8Latch || 0) + dt * 0.65);
        const val = this._chron8Latch || 0;
        rig.feastGroup.rotation.y = time * 0.32;
        rig.feastLight.intensity = 2.3 + val * 2.7;
        return near || val > 0.85;
      }
    };
  }

  populateChronicles18OneSoundScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createChronicles5OneSoundTrumpetsEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'our-eyes-are-on-you', 18, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.96, 3.8, '#ffea9c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand Within the 120 Silver Trumpets & Cloud of Glory',
      signatureActivatedText:
        '“When the trumpeters and singers were as one, to make one sound to be heard in praising and thanking Yahweh… the house was filled with a cloud.” (2 Chronicles 5:13)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._chron18Latch = Math.min(1.0, (this._chron18Latch || 0) + dt * 0.65);
        const val = this._chron18Latch || 0;
        rig.gloryCloud.position.y = Math.sin(time * 1.5) * 0.08;
        rig.gloryLight.intensity = 2.7 + val * 3.1;
        return near || val > 0.85;
      }
    };
  }

  populateChronicles24EyesOnYouScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createChronicles20EyesOnYouCourtyardEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'our-eyes-are-on-you', 24, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.94, 3.6, '#ffe699');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand in Jehoshaphat’s Courtyard & Lift Your Eyes',
      signatureActivatedText:
        '“For we have no might against this great company that comes against us; neither know we what to do, but our eyes are on you.” (2 Chronicles 20:12)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._chron24Latch = Math.min(1.0, (this._chron24Latch || 0) + dt * 0.65);
        const val = this._chron24Latch || 0;
        rig.beaconOrb.rotation.y = time * 0.85;
        rig.eyesLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  // --- District X: Ezra & Nehemiah (rise-up-and-build) ---
  populateEzra4AltarOnItsBaseScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEzra3AltarOnItsBaseEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'rise-up-and-build', 4, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffd269');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Approach the Rebuilt Stone Altar Set on Its Base',
      signatureActivatedText:
        '“They set the altar on its base; for fear was on them because of the peoples of the surrounding lands, and they offered burnt offerings on it to Yahweh, even burnt offerings morning and evening.” (Ezra 3:3)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._ezra4Latch = Math.min(1.0, (this._ezra4Latch || 0) + dt * 0.65);
        const val = this._ezra4Latch || 0;
        rig.flame.scale.y = 1.0 + Math.sin(time * 5.2) * 0.14 + val * 0.25;
        rig.altarLight.intensity = 2.5 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateNehemiah23NightRideScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    if (skyDome && skyDome.material && skyDome.material.uniforms) {
      skyDome.material.uniforms.uStarIntensity.value = 0.85;
    }
    const rig = this.propBuilder.createNehemiah2NightRideWallEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'rise-up-and-build', 23, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.88, 3.2, '#ffea9c');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Inspect the Moonlit Wall Stones by Lantern Light',
      signatureActivatedText:
        '“I arose in the night, I and a few men with me; neither told I any man what my God put into my heart to do for Jerusalem…” (Nehemiah 2:12)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._neh23Latch = Math.min(1.0, (this._neh23Latch || 0) + dt * 0.65);
        const val = this._neh23Latch || 0;
        rig.lanternOrb.position.y = 1.62 + Math.sin(time * 2.1) * 0.06;
        rig.nightLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateNehemiah29TrowelAndSwordScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createNehemiah4TrowelAndSwordWallEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'rise-up-and-build', 29, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffdf94');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beside the Builder’s Trowel & Sword on the Wall',
      signatureActivatedText:
        '“Everyone with one of his hands wrought in the work, and with the other held his weapon; and the builders, everyone had his sword strapped to his side, and so built.” (Nehemiah 4:17–18)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._neh29Latch = Math.min(1.0, (this._neh29Latch || 0) + dt * 0.65);
        const val = this._neh29Latch || 0;
        rig.wallLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateNehemiah34WaterGateScrollScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createNehemiah8WaterGateScrollEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'rise-up-and-build', 34, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.95, 3.6, '#ffe69c');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand Before the Wooden Platform & Open Scroll at the Water Gate',
      signatureActivatedText:
        '“Ezra opened the book in the sight of all the people… and when he opened it, all the people stood up… ‘Don’t be grieved, for the joy of Yahweh is your strength.’” (Nehemiah 8:5, 10)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._neh34Latch = Math.min(1.0, (this._neh34Latch || 0) + dt * 0.65);
        const val = this._neh34Latch || 0;
        rig.scrollLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  // --- District XI: Esther (for-such-a-time-as-this) ---
  populateEsther4SusaCourtyardScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEsther2SusaMosaicCourtyardEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'for-such-a-time-as-this', 4, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffe194');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Walk the Susa Mosaic Courtyard of Mordecai’s Watch',
      signatureActivatedText:
        '“Mordecai walked every day in front of the court of the women’s house, to find out how Esther was doing, and what would become of her.” (Esther 2:11)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._est4Latch = Math.min(1.0, (this._est4Latch || 0) + dt * 0.65);
        const val = this._est4Latch || 0;
        rig.courtLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateEsther16ThreeDayFastScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEsther4ThreeDayFastEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'for-such-a-time-as-this', 16, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffd67d');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Keep Vigil Beside the Folded Royal Robe & Lamp',
      signatureActivatedText:
        '“Go, gather together all the Jews who are present in Shushan, and fast for me… and so I will go in to the king, which is against the law; and if I perish, I perish.” (Esther 4:16)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._est16Latch = Math.min(1.0, (this._est16Latch || 0) + dt * 0.65);
        const val = this._est16Latch || 0;
        rig.vigilFlame.scale.setScalar(1.0 + Math.sin(time * 4.2) * 0.1 + val * 0.2);
        rig.fastLight.intensity = 2.3 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateEsther18GoldenScepterScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEsther5GoldenScepterThroneEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'for-such-a-time-as-this', 18, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.95, 3.6, '#ffea96');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Approach & Touch the Tip of the Extended Golden Scepter',
      signatureActivatedText:
        '“When the king saw Esther the queen standing in the court, she obtained favor in his sight; and the king held out to Esther the golden scepter that was in his hand. So Esther came near, and touched the top of the scepter.” (Esther 5:2)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._est18Latch = Math.min(1.0, (this._est18Latch || 0) + dt * 0.65);
        const val = this._est18Latch || 0;
        rig.scepterLight.intensity = 2.7 + val * 3.1;
        return near || val > 0.85;
      }
    };
  }

  populateEsther21SleeplessChroniclesScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    if (skyDome && skyDome.material && skyDome.material.uniforms) {
      skyDome.material.uniforms.uStarIntensity.value = 0.82;
    }
    const rig = this.propBuilder.createEsther6SleeplessChroniclesEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'for-such-a-time-as-this', 21, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffe08c');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beside the Open Book of Records on the Sleepless Night',
      signatureActivatedText:
        '“On that night, the king couldn’t sleep. He commanded the book of records of the chronicles to be brought, and they were read before the king.” (Esther 6:1)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._est21Latch = Math.min(1.0, (this._est21Latch || 0) + dt * 0.65);
        const val = this._est21Latch || 0;
        rig.lampLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  // --- District XVII: Proverbs (the-beginning-of-wisdom) ---
  populateProverbs6WellspringScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createProverbs4WellspringOfLifeEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'the-beginning-of-wisdom', 6, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.5, '#a6f0ff');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Pause Beside the Guarded Wellspring of Life',
      signatureActivatedText:
        '“Keep your heart with all diligence, for out of it is the wellspring of life.” (Proverbs 4:23)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._prov6Latch = Math.min(1.0, (this._prov6Latch || 0) + dt * 0.65);
        const val = this._prov6Latch || 0;
        rig.springDome.scale.y = 0.45 + Math.sin(time * 2.6) * 0.05 + val * 0.08;
        rig.springLight.intensity = 2.5 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateProverbs14ApplesOfGoldScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createProverbs25ApplesOfGoldEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'the-beginning-of-wisdom', 14, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.5, '#ffe48f');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Admire the Apples of Gold in Settings of Silver',
      signatureActivatedText:
        '“A word fitly spoken is like apples of gold in settings of silver.” (Proverbs 25:11)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._prov14Latch = Math.min(1.0, (this._prov14Latch || 0) + dt * 0.65);
        const val = this._prov14Latch || 0;
        rig.applesGroup.rotation.y = time * 0.42;
        rig.applesLight.intensity = 2.5 + val * 2.9;
        return near || val > 0.85;
      }
    };
  }

  populateProverbs25IronSharpensIronScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createProverbs27IronSharpensIronEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'the-beginning-of-wisdom', 25, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffc966');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beside the Forge Where Iron Sharpens Iron',
      signatureActivatedText:
        '“Iron sharpens iron; so a man sharpens his friend’s countenance.” (Proverbs 27:17)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._prov25Latch = Math.min(1.0, (this._prov25Latch || 0) + dt * 0.65);
        const val = this._prov25Latch || 0;
        rig.forgeLight.intensity = 2.4 + val * 2.9;
        return near || val > 0.85;
      }
    };
  }

  populateProverbs38LampBeforeDawnScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createProverbs31LampBeforeDawnEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'the-beginning-of-wisdom', 38, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.94, 3.6, '#ffe28a');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand by Wisdom’s Loom & the Lamp That Does Not Go Out by Night',
      signatureActivatedText:
        '“She rises also while it is yet night, and gives food to her household… Her lamp doesn’t go out by night.” (Proverbs 31:15, 18)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._prov38Latch = Math.min(1.0, (this._prov38Latch || 0) + dt * 0.65);
        const val = this._prov38Latch || 0;
        rig.dawnFlame.scale.setScalar(1.0 + Math.sin(time * 4.5) * 0.1 + val * 0.2);
        rig.dawnLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  // --- District XVIII: Ecclesiastes (eternity-in-their-hearts) ---
  populateEcclesiastes4RiversToSeaScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEcclesiastes1RiversToTheSeaEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'eternity-in-their-hearts', 4, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#9ce8ff');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Watch the Rivers Returning in Their Courses to the Sea',
      signatureActivatedText:
        '“All the rivers run into the sea, yet the sea is not full. To the place where the rivers flow, there they flow again.” (Ecclesiastes 1:7)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._ecc4Latch = Math.min(1.0, (this._ecc4Latch || 0) + dt * 0.65);
        const val = this._ecc4Latch || 0;
        rig.seaWheel.rotation.z = time * 0.5;
        rig.seaLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateEcclesiastes13SundialSeasonsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEcclesiastes3SundialOfSeasonsEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'eternity-in-their-hearts', 13, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.94, 3.6, '#ffea96');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Before the Sundial of Seasons & Ring of Eternity',
      signatureActivatedText:
        '“He has made everything beautiful in its time. He has also set eternity in their hearts…” (Ecclesiastes 3:11)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._ecc13Latch = Math.min(1.0, (this._ecc13Latch || 0) + dt * 0.65);
        const val = this._ecc13Latch || 0;
        rig.eternityRings.rotation.y = time * 0.45;
        rig.eternityRings.rotation.x = Math.sin(time * 0.6) * 0.25;
        rig.sundialLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateEcclesiastes16ThreefoldCordScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEcclesiastes4ThreefoldCordEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'eternity-in-their-hearts', 16, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffe28f');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Behold the Threefold Braided Golden Cord',
      signatureActivatedText:
        '“Two are better than one… Aelliance of three strands is not quickly broken.” (Ecclesiastes 4:9, 12)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._ecc16Latch = Math.min(1.0, (this._ecc16Latch || 0) + dt * 0.65);
        const val = this._ecc16Latch || 0;
        rig.cordGroup.rotation.y = time * 0.38;
        rig.cordLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateEcclesiastes34BlossomingAlmondScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createEcclesiastes12BlossomingAlmondEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'eternity-in-their-hearts', 34, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.94, 3.6, '#fff0c9');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Pause Beneath the White-Blossoming Almond Tree',
      signatureActivatedText:
        '“Remember also your Creator in the days of your youth… when the almond tree blossoms…” (Ecclesiastes 12:1, 5)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._ecc34Latch = Math.min(1.0, (this._ecc34Latch || 0) + dt * 0.65);
        const val = this._ecc34Latch || 0;
        rig.almondLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  // --- District XIX: Song of Songs (many-waters) ---
  populateSong5BannerOfLoveScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createSong2BannerOfLoveEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'many-waters', 5, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffd699');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beneath the Canopy of the Banqueting House',
      signatureActivatedText:
        '“He brought me to the banquet hall. His banner over me is love.” (Song of Songs 2:4)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._song5Latch = Math.min(1.0, (this._song5Latch || 0) + dt * 0.65);
        const val = this._song5Latch || 0;
        rig.bannerLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateSong7WinterIsPastScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createSong2WinterIsPastLatticeEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'many-waters', 7, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.5, '#ffe6b3');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Look Through the Blossoming Lattice Window Into Spring',
      signatureActivatedText:
        '“For, behold, the winter is past. The rain is over and gone. The flowers appear on the earth; the time of the singing has come…” (Song of Songs 2:11–12)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._song7Latch = Math.min(1.0, (this._song7Latch || 0) + dt * 0.65);
        const val = this._song7Latch || 0;
        rig.springLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateSong14EnclosedGardenScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createSong4EnclosedGardenFountainEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'many-waters', 14, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.5, '#b8f4ff');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Pause by the Enclosed Garden Fountain of Living Waters',
      signatureActivatedText:
        '“A locked up garden is my sister, my bride; a locked up spring, a sealed fountain… a fountain of gardens, a well of living waters, and flowing streams from Lebanon.” (Song of Songs 4:12, 15)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._song14Latch = Math.min(1.0, (this._song14Latch || 0) + dt * 0.65);
        const val = this._song14Latch || 0;
        rig.waterCrown.scale.y = 1.0 + Math.sin(time * 3.2) * 0.12 + val * 0.18;
        rig.fountainLight.intensity = 2.5 + val * 2.9;
        return near || val > 0.85;
      }
    };
  }

  populateSong29ManyWatersFlameScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createSong8ManyWatersSealFlameEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'many-waters', 29, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.95, 3.8, '#ffc966');
    shaft.position.set(0, 6.5, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand Before the Signet Seal & Unquenchable Flame of Love',
      signatureActivatedText:
        '“Set me as a seal on your heart, as a seal on your arm; for love is strong as death… Many waters can’t quench love, neither can floods drown it.” (Song of Songs 8:6–7)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._song29Latch = Math.min(1.0, (this._song29Latch || 0) + dt * 0.65);
        const val = this._song29Latch || 0;
        rig.signetRing.rotation.y = time * 0.45;
        rig.sealFlame.scale.y = 1.0 + Math.sin(time * 5.0) * 0.14 + val * 0.22;
        rig.sealLight.intensity = 2.7 + val * 3.2;
        return near || val > 0.85;
      }
    };
  }

  // --- District XXII: Lamentations (new-every-morning) ---
  populateLamentations1SolitaryWellScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createLamentations1SolitaryCityWellEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'new-every-morning', 1, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.88, 3.4, '#ffd27d');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Pause Beside the Solitary Well, Coiled Rope & Low-Burning Lantern',
      signatureActivatedText:
        '“How the city sits solitary, that was full of people! She has become as a widow, who was great among the nations!” (Lamentations 1:1)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._lam1Latch = Math.min(1.0, (this._lam1Latch || 0) + dt * 0.65);
        const val = this._lam1Latch || 0;
        rig.lanternFlame.scale.setScalar(1.0 + Math.sin(time * 3.8) * 0.1 + val * 0.2);
        rig.wellLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  populateLamentations10PourOutWaterScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    if (skyDome && skyDome.material && skyDome.material.uniforms) {
      skyDome.material.uniforms.uStarIntensity.value = 0.84;
    }
    const rig = this.propBuilder.createLamentations2PourOutWaterJarEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'new-every-morning', 10, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#b8f2ff');
    shaft.position.set(0, 6.2, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Kneel Beside the Overturned Jar Pouring Out Water in the Night Watch',
      signatureActivatedText:
        '“Arise, cry out in the night, at the beginning of the watches! Pour out your heart like water before the face of the Lord!” (Lamentations 2:19)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._lam10Latch = Math.min(1.0, (this._lam10Latch || 0) + dt * 0.65);
        const val = this._lam10Latch || 0;
        rig.watchLight.intensity = 2.5 + val * 2.9;
        return near || val > 0.85;
      }
    };
  }

  populateLamentations14NewEveryMorningScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createLamentations3NewEveryMorningDawnEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'new-every-morning', 14, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.96, 3.8, '#ffe48c');
    shaft.position.set(0, 6.5, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Watch Morning Light Rise Fresh Over the Dew-Wet Stones',
      signatureActivatedText:
        '“It is because of Yahweh’s loving kindnesses that we are not consumed, because his compassion doesn’t fail. They are new every morning. Great is your faithfulness.” (Lamentations 3:22–23)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._lam14Latch = Math.min(1.0, (this._lam14Latch || 0) + dt * 0.65);
        const val = this._lam14Latch || 0;
        rig.dawnSunGroup.position.y = 1.48 + Math.sin(time * 1.4) * 0.06 + val * 0.18;
        rig.mercyLight.intensity = 2.8 + val * 3.2;
        return near || val > 0.85;
      }
    };
  }

  populateLamentations30RestoredLyreScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createLamentations5RestoredLyreDawnWallEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'new-every-morning', 30, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.95, 3.6, '#ffe696');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Beside the Restored Lyre Against the Morning-Lit Wall',
      signatureActivatedText:
        '“Turn us to yourself, Yahweh, and we will be turned. Renew our days as of old.” (Lamentations 5:21)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._lam30Latch = Math.min(1.0, (this._lam30Latch || 0) + dt * 0.65);
        const val = this._lam30Latch || 0;
        rig.renewLight.intensity = 2.7 + val * 3.1;
        return near || val > 0.85;
      }
    };
  }

  // --- District XXV: Hosea, Joel, Amos & Obadiah (a-door-of-hope) ---
  populateHosea6DoorOfHopeScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createHosea2ValleyOfAchorDoorEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'a-door-of-hope', 6, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.96, 3.8, '#ffe69c');
    shaft.position.set(0, 6.5, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Step Toward the Cleft Door of Hope in the Valley of Achor & Sunlit Vine',
      signatureActivatedText:
        '“I will give her vineyards from there, and the valley of Achor for a door of hope; and she will respond there, as in the days of her youth.” (Hosea 2:15)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._hosea6Latch = Math.min(1.0, (this._hosea6Latch || 0) + dt * 0.65);
        const val = this._hosea6Latch || 0;
        rig.doorPortalGroup.scale.y = 1.0 + Math.sin(time * 2.2) * 0.06 + val * 0.14;
        rig.doorLight.intensity = 2.8 + val * 3.2;
        return near || val > 0.85;
      }
    };
  }

  populateHosea16DewLilyScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createHosea14DewLilyAndOliveEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'a-door-of-hope', 16, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.5, '#fff4cc');
    shaft.position.set(0, 6.3, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Pause Beside the Dew-Covered Lily & Deep-Rooted Olive Shade',
      signatureActivatedText:
        '“I will be like the dew to Israel. He will blossom like the lily, and send down his roots like Lebanon… From me is your fruit found.” (Hosea 14:5, 8)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._hosea16Latch = Math.min(1.0, (this._hosea16Latch || 0) + dt * 0.65);
        const val = this._hosea16Latch || 0;
        rig.lilyGroup.rotation.z = Math.sin(time * 1.4) * 0.04;
        rig.dewLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateJoel23RestoredHarvestScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createJoel2RestoredHarvestBasketEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'a-door-of-hope', 23, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.94, 3.6, '#ffe396');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Stand Before the Restored Harvest Basket of Figs, Grapes, Grain & Oil',
      signatureActivatedText:
        '“I will restore to you the years that the swarming locust has eaten… You will have plenty to eat, and be satisfied, and will praise the name of Yahweh, your God.” (Joel 2:25–26)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._joel23Latch = Math.min(1.0, (this._joel23Latch || 0) + dt * 0.65);
        const val = this._joel23Latch || 0;
        rig.harvestLight.intensity = 2.7 + val * 3.1;
        return near || val > 0.85;
      }
    };
  }

  populateAmos33PlumbLineScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createAmos7PlumbLineWallEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'a-door-of-hope', 33, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.9, 3.4, '#ffebb3');
    shaft.position.set(0, 6.3, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Behold the Plumb Line Held Still Beside the Stone Wall',
      signatureActivatedText:
        '“Behold, the Lord stood on a wall made by a plumb line, with a plumb line in his hand… ‘Behold, I will set a plumb line in the middle of my people Israel.’” (Amos 7:7–8)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._amos33Latch = Math.min(1.0, (this._amos33Latch || 0) + dt * 0.65);
        const val = this._amos33Latch || 0;
        rig.plumbGroup.rotation.z = Math.sin(time * 1.8) * (0.045 * (1.0 - val * 0.85));
        rig.plumbLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  // --- District XXVII: Micah to Malachi (the-day-of-small-things) ---
  populateMicah3VineAndFigTreeScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createMicah4FigTreeStoolAndPitcherEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'the-day-of-small-things', 3, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.96, 3.8, '#ffeab3');
    shaft.position.set(0, 6.5, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Rest Beside the Wooden Stool & Water Pitcher Under the Fig Tree',
      signatureActivatedText:
        '“Everyone will sit under his own vine and under his own fig tree; and no one will make them afraid; for the mouth of Yahweh of Armies has spoken.” (Micah 4:4)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._micah3Latch = Math.min(1.0, (this._micah3Latch || 0) + dt * 0.65);
        const val = this._micah3Latch || 0;
        rig.treeGroup.rotation.z = Math.sin(time * 1.1) * 0.015;
        rig.shadeLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateHabakkuk12WatchtowerScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createHabakkuk2WatchtowerParapetEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'the-day-of-small-things', 12, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.94, 3.6, '#ffdfa0');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Take Your Stand on the Stone Watchtower Parapet & Inscribed Tablets',
      signatureActivatedText:
        '“I will stand at my watch, and set myself on the ramparts… Write the vision, and make it plain on tablets… Though it takes time, wait for it; because it will surely come.” (Habakkuk 2:1–3)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._hab12Latch = Math.min(1.0, (this._hab12Latch || 0) + dt * 0.65);
        const val = this._hab12Latch || 0;
        rig.bannerGroup.rotation.y = Math.sin(time * 2.1) * 0.08;
        rig.watchLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateZechariah28OliveLampstandScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createZechariah4SevenLampsAndOliveTreesEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'the-day-of-small-things', 28, { targetHeight: 3.1, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.98, 3.8, '#ffe680');
    shaft.position.set(0, 6.5, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Behold the Golden Seven-Branched Lampstand Fed by Two Olive Trees',
      signatureActivatedText:
        '“I have seen, and behold, a lamp stand all of gold, with its bowl on the top of it, and its seven lamps on it… ‘Not by might, nor by power, but by my Spirit,’ says Yahweh of Armies.” (Zechariah 4:2, 6)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._zech28Latch = Math.min(1.0, (this._zech28Latch || 0) + dt * 0.65);
        const val = this._zech28Latch || 0;
        rig.flamesGroup.scale.y = 1.0 + Math.sin(time * 3.8) * 0.08 + val * 0.16;
        rig.menorahLight.intensity = 3.0 + val * 3.5;
        return near || val > 0.85;
      }
    };
  }

  populateMalachi38BookOfRemembranceScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createMalachi3BookOfRemembranceEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'the-day-of-small-things', 38, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.5, '#ffe49e');
    shaft.position.set(0, 6.3, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Read the Open Scroll of Remembrance Beside the Two Fellowship Cups & Oil Lamp',
      signatureActivatedText:
        '“Then those who feared Yahweh spoke one with another; and Yahweh listened, and heard, and a book of memory was written before him, for those who feared Yahweh, and who honored his name.” (Malachi 3:16)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._mal38Latch = Math.min(1.0, (this._mal38Latch || 0) + dt * 0.65);
        const val = this._mal38Latch || 0;
        rig.memoryLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  // --- District XXXIII: Romans (nothing-can-separate) ---
  populateRomans9GraceWhereWeStandScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createRomans5OpenDoorOfGraceCourtyardEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'nothing-can-separate', 9, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.96, 3.8, '#ffe8a3');
    shaft.position.set(0, 6.5, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Step Through the Open Door of Grace Into the Sunlit Courtyard',
      signatureActivatedText:
        '“Being therefore justified by faith, we have peace with God through our Lord Jesus Christ; through whom we also have our access by faith into this grace in which we stand.” (Romans 5:1–2)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._rom9Latch = Math.min(1.0, (this._rom9Latch || 0) + dt * 0.65);
        const val = this._rom9Latch || 0;
        rig.graceLight.intensity = 2.7 + val * 3.2;
        return near || val > 0.85;
      }
    };
  }

  populateRomans19SpiritOfAdoptionScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createRomans8AbbaThresholdSandalsEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'nothing-can-separate', 19, { targetHeight: 2.9, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.92, 3.5, '#ffeac2');
    shaft.position.set(0, 6.3, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Pause Beside the Child’s & Father’s Sandals on the Home Threshold',
      signatureActivatedText:
        '“For you didn’t receive the spirit of bondage again to fear, but you received the Spirit of adoption, by whom we cry, ‘Abba! Father!’” (Romans 8:15)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._rom19Latch = Math.min(1.0, (this._rom19Latch || 0) + dt * 0.65);
        const val = this._rom19Latch || 0;
        rig.adoptionLight.intensity = 2.6 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  populateRomans25NothingCanSeparateScene(group, derived, pal, getTerrainHeight, skyDome) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    if (skyDome && skyDome.material && skyDome.material.uniforms) {
      skyDome.material.uniforms.uStarIntensity.value = 0.88;
    }
    const rig = this.propBuilder.createRomans8NothingCanSeparateParapetEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'nothing-can-separate', 25, { targetHeight: 3.0, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.96, 3.8, '#ffe08c');
    shaft.position.set(0, 6.5, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.6,
      signatureLabel: 'Stand by the Starlit Parapet Table & Unrolled Letter of Unfailing Love',
      signatureActivatedText:
        '“Nor height, nor depth, nor any other created thing will be able to separate us from God’s love which is in Christ Jesus our Lord.” (Romans 8:39)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.6;
        if (near) this._rom25Latch = Math.min(1.0, (this._rom25Latch || 0) + dt * 0.65);
        const val = this._rom25Latch || 0;
        rig.loveLight.intensity = 2.9 + val * 3.4;
        return near || val > 0.85;
      }
    };
  }

  populateRomans30GraftedOliveTreeScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0, 0, -5.2);
    const rig = this.propBuilder.createRomans11GraftedOliveTreeEnsemble(derived.propTex, pal, false);
    rig.group.position.copy(focalPos);
    group.add(rig.group);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(rig.group, 'nothing-can-separate', 30, { targetHeight: 3.1, yOffset: 0.22 });
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.94, 3.6, '#ffebb5');
    shaft.position.set(0, 6.4, -5.2);
    group.add(shaft);

    return {
      signatureTarget: focalPos,
      signatureRadius: 4.5,
      signatureLabel: 'Touch the Wild Olive Shoot Bound Into the Deep-Rooted Olive Trunk',
      signatureActivatedText:
        '“If you, being a wild olive, were grafted in among them, and became partaker with them of the root and of the richness of the olive tree, don’t boast over the branches… it is not you who support the root, but the root supports you.” (Romans 11:17–18)',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.5;
        if (near) this._rom30Latch = Math.min(1.0, (this._rom30Latch || 0) + dt * 0.65);
        const val = this._rom30Latch || 0;
        rig.graftGroup.rotation.z = Math.sin(time * 1.4) * 0.025;
        rig.graftLight.intensity = 2.7 + val * 3.1;
        return near || val > 0.85;
      }
    };
  }
}

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}
