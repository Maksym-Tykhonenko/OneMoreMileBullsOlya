import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  Share,
  Platform,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'questStart'>;

const STORAGE_BALANCE = 'vault_balance_v1';

type Balance = {
  diesel: number;
  nut: number;
  bolt: number;
};

const DEFAULT_BALANCE: Balance = { diesel: 0, nut: 0, bolt: 0 };

const ASSET = {
  loaderBg: require('../vault/loader_bg.png'),
  junkBg: require('../vault/junk_bg.png'),
  dart: require('../vault/dart.png'),

  homeIcon: require('../vault/ic_home.png'),
  infoIcon: require('../vault/ic_info.png'),
};

const ROUNDS_TOTAL = 10;
const ROUND_SECONDS = 30;
const ITEMS_PER_ROUND = 10;
const REWARD_PER_ITEM = 10;

type Phase = 'loading' | 'game' | 'result';

type Item = {
  id: string;
  x: number;
  y: number;
  size: number;
  found: boolean;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function loadBalance(): Promise<Balance> {
  const raw = await AsyncStorage.getItem(STORAGE_BALANCE);
  if (!raw) return DEFAULT_BALANCE;
  try {
    const parsed = JSON.parse(raw) as Partial<Balance>;
    return {
      diesel: Number(parsed.diesel ?? 0),
      nut: Number(parsed.nut ?? 0),
      bolt: Number(parsed.bolt ?? 0),
    };
  } catch {
    return DEFAULT_BALANCE;
  }
}

async function saveBalance(b: Balance) {
  await AsyncStorage.setItem(STORAGE_BALANCE, JSON.stringify(b));
}

export default function QuestStartScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isTiny = height < 700;
  const isSmall = height < 780;

  const [phase, setPhase] = useState<Phase>('loading');

  const [round, setRound] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_SECONDS);

  const [items, setItems] = useState<Item[]>([]);
  const [dieselEarnedThisRun, setDieselEarnedThisRun] = useState<number>(0);

  const [resultKind, setResultKind] = useState<'win' | 'lose' | 'finalWin'>('win');

  const [showInfo, setShowInfo] = useState(false);
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const infoScale = useRef(new Animated.Value(0.98)).current;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.98)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const foundCount = useMemo(() => items.filter(i => i.found).length, [items]);
  const contentW = useMemo(() => clamp(width - 36, 300, 560), [width]);

  const hudH = isTiny ? 42 : 48;
  const hudFont = isTiny ? 12 : 13;
  const hudIcon = isTiny ? 18 : 22;

  const bottomBtnSize = isTiny ? 40 : 44;
  const bottomBtnIcon = isTiny ? 20 : 22;

  const itemMin = isTiny ? 22 : 28;
  const itemMax = isTiny ? 54 : 70;

  const loaderHTML = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body{
    margin:0;
    background:transparent;
    display:flex;
    align-items:center;
    justify-content:center;
    height:100vh;
    overflow:hidden;
  }
  .boxes {
    --size: 32px;
    --duration: 800ms;
    height: calc(var(--size) * 2);
    width: calc(var(--size) * 3);
    position: relative;
    transform-style: preserve-3d;
    transform-origin: 50% 50%;
    transform: rotateX(60deg) rotateZ(45deg) rotateY(0deg) translateZ(0px);
  }
  .boxes .box {
    width: var(--size);
    height: var(--size);
    top: 0;
    left: 0;
    position: absolute;
    transform-style: preserve-3d;
  }
  .boxes .box:nth-child(1) { transform: translate(100%, 0); animation: box1 var(--duration) linear infinite; }
  .boxes .box:nth-child(2) { transform: translate(0, 100%); animation: box2 var(--duration) linear infinite; }
  .boxes .box:nth-child(3) { transform: translate(100%, 100%); animation: box3 var(--duration) linear infinite; }
  .boxes .box:nth-child(4) { transform: translate(200%, 0); animation: box4 var(--duration) linear infinite; }
  .boxes .box > div {
    --background: #5C8DF6;
    --top: auto;
    --right: auto;
    --bottom: auto;
    --left: auto;
    --translateZ: calc(var(--size) / 2);
    --rotateY: 0deg;
    --rotateX: 0deg;
    position: absolute;
    width: 100%;
    height: 100%;
    background: var(--background);
    top: var(--top);
    right: var(--right);
    bottom: var(--bottom);
    left: var(--left);
    transform: rotateY(var(--rotateY)) rotateX(var(--rotateX)) translateZ(var(--translateZ));
  }
  .boxes .box > div:nth-child(1) { --top: 0; --left: 0; }
  .boxes .box > div:nth-child(2) { --background: #145af2; --right: 0; --rotateY: 90deg; }
  .boxes .box > div:nth-child(3) { --background: #447cf5; --rotateX: -90deg; }
  .boxes .box > div:nth-child(4) { --background: #DBE3F4; --top: 0; --left: 0; --translateZ: calc(var(--size) * 3 * -1); }
  @keyframes box1 { 0%, 50% { transform: translate(100%, 0); } 100% { transform: translate(200%, 0); } }
  @keyframes box2 { 0% { transform: translate(0, 100%); } 50% { transform: translate(0, 0); } 100% { transform: translate(100%, 0); } }
  @keyframes box3 { 0%, 50% { transform: translate(100%, 100%); } 100% { transform: translate(0, 100%); } }
  @keyframes box4 { 0% { transform: translate(200%, 0); } 50% { transform: translate(200%, 100%); } 100% { transform: translate(100%, 100%); } }
</style>
</head>
<body>
  <div class="boxes" aria-label="loading">
    <div class="box"><div></div><div></div><div></div><div></div></div>
    <div class="box"><div></div><div></div><div></div><div></div></div>
    <div class="box"><div></div><div></div><div></div><div></div></div>
    <div class="box"><div></div><div></div><div></div><div></div></div>
  </div>
</body>
</html>
`;
  }, []);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startTimer = () => {
    stopTimer();
    setTimeLeft(ROUND_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          openResult('lose');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const playFadeIn = () => {
    fadeIn.setValue(0);
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const openResult = (kind: 'win' | 'lose' | 'finalWin') => {
    setResultKind(kind);
    setPhase('result');

    resultOpacity.setValue(0);
    resultScale.setValue(0.98);

    Animated.parallel([
      Animated.timing(resultOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(resultScale, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const genItemsForRound = () => {
    const topSafe = insets.top + (isTiny ? 76 : 90);
    const bottomSafe = insets.bottom + (isTiny ? 74 : 90);

    const minX = 10;
    const maxX = width - 10;
    const minY = topSafe;
    const maxY = height - bottomSafe;

    const next: Item[] = Array.from({ length: ITEMS_PER_ROUND }).map(() => {
      const size = Math.round(itemMin + Math.random() * (itemMax - itemMin));
      const x = clamp(Math.random() * (maxX - minX - size) + minX, minX, maxX - size);
      const y = clamp(Math.random() * (maxY - minY - size) + minY, minY, maxY - size);
      return { id: uid(), x, y, size, found: false };
    });

    setItems(next);
  };

  const addDiesel = async (amount: number) => {
    setDieselEarnedThisRun(prev => prev + amount);

    const bal = await loadBalance();
    const next: Balance = { ...bal, diesel: Number(bal.diesel) + amount };
    await saveBalance(next);
  };

  const onCollect = async (id: string) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, found: true } : it)));
    await addDiesel(REWARD_PER_ITEM);
  };

  const onHome = () => {
    stopTimer();
    navigation.navigate('harborHub');
  };

  const openInfo = () => {
    setShowInfo(true);
    infoOpacity.setValue(0);
    infoScale.setValue(0.98);

    Animated.parallel([
      Animated.timing(infoOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(infoScale, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const closeInfo = () => {
    Animated.parallel([
      Animated.timing(infoOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(infoScale, { toValue: 0.98, duration: 160, useNativeDriver: true }),
    ]).start(() => setShowInfo(false));
  };

  const onShareInfoModal = async () => {
    try {
      const msg =
        `The darts you find are stored in your garage.\n` +
        `They can be exchanged for nuts, bolts, or Baxter service jokes.\n` +
        `The darts don't wear out on their own — only when you decide to exchange them.`;

      await Share.share(
        Platform.select({
          ios: { message: msg },
          default: { message: msg },
        }) as any,
      );
    } catch {
    }
  };

  const onNextRound = () => {
    setPhase('game');
    setRound(prev => prev + 1);
    genItemsForRound();
    startTimer();
    playFadeIn();
  };

  const onRetryRound = () => {
    setPhase('game');
    genItemsForRound();
    startTimer();
    playFadeIn();
  };

  const onShareResult = async () => {
    try {
      const msg =
        resultKind === 'finalWin'
          ? `Congratulations! You completed all ${ROUNDS_TOTAL} rounds.\nCollected: ${ITEMS_PER_ROUND}/${ITEMS_PER_ROUND}\nDiesel earned: ${dieselEarnedThisRun}`
          : `Round ${round}/${ROUNDS_TOTAL}\nCollected: ${foundCount}/${ITEMS_PER_ROUND}\nDiesel earned: ${dieselEarnedThisRun}`;

      await Share.share(
        Platform.select({
          ios: { message: msg },
          default: { message: msg },
        }) as any,
      );
    } catch {
    }
  };

  useEffect(() => {
    loaderTimerRef.current = setTimeout(() => {
      setPhase('game');
      genItemsForRound();
      startTimer();
      playFadeIn();
    }, 3000);

    return () => {
      if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
      stopTimer();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'game') return;
    if (foundCount >= ITEMS_PER_ROUND) {
      stopTimer();
      if (round >= ROUNDS_TOTAL) openResult('finalWin');
      else openResult('win');
    }
  }, [foundCount, phase]);

  if (phase === 'loading') {
    return (
      <ImageBackground source={ASSET.loaderBg} style={styles.full} resizeMode="cover">
        <SafeAreaView style={styles.full}>
          <View style={styles.loaderCenter}>
            <WebView
              originWhitelist={['*']}
              source={{ html: loaderHTML }}
              style={styles.loaderWeb}
              scrollEnabled={false}
              bounces={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  const ResultOverlay = () => {
    const title =
      resultKind === 'finalWin'
        ? 'CONGRATULATIONS'
        : resultKind === 'win'
          ? 'ROUND COMPLETE'
          : 'TIME IS UP';

    const sub =
      resultKind === 'finalWin'
        ? `${ROUNDS_TOTAL}/${ROUNDS_TOTAL}`
        : `${foundCount}/${ITEMS_PER_ROUND}`;

    return (
      <View style={styles.resultDim}>
        <Animated.View
          style={[
            styles.resultCard,
            {
              width: contentW,
              opacity: resultOpacity,
              transform: [{ scale: resultScale }],
            },
          ]}
        >
          <Text style={[styles.resultTitle, { fontSize: isTiny ? 18 : 22 }]}>{title}</Text>

          <View style={{ height: isTiny ? 10 : 14 }} />

          <Image source={ASSET.dart} style={[styles.resultDart, { width: isTiny ? 100 : 120, height: isTiny ? 72 : 90 }]} resizeMode="contain" />

          <View style={{ height: isTiny ? 10 : 14 }} />

          <Text style={[styles.resultScore, { fontSize: isTiny ? 24 : 28 }]}>{sub}</Text>

          <View style={{ height: isTiny ? 8 : 10 }} />

          <Text style={[styles.resultMeta, { fontSize: isTiny ? 12 : 13 }]}>
            Round {round}/{ROUNDS_TOTAL} • Diesel +{dieselEarnedThisRun}
          </Text>

          <View style={{ height: isTiny ? 14 : 18 }} />

          <Pressable style={[styles.resultBtn, styles.resultBtnShare, { height: isTiny ? 52 : 56 }]} onPress={onShareResult}>
            <Text style={[styles.resultBtnText, { fontSize: isTiny ? 14 : 15 }]}>SHARE</Text>
          </Pressable>

          <View style={{ height: 10 }} />

          {resultKind === 'lose' ? (
            <Pressable style={[styles.resultBtn, styles.resultBtnPrimary, { height: isTiny ? 52 : 56 }]} onPress={onRetryRound}>
              <Text style={[styles.resultBtnText, { fontSize: isTiny ? 14 : 15 }]}>TRY AGAIN</Text>
            </Pressable>
          ) : resultKind === 'finalWin' ? (
            <Pressable style={[styles.resultBtn, styles.resultBtnPrimary, { height: isTiny ? 52 : 56 }]} onPress={onHome}>
              <Text style={[styles.resultBtnText, { fontSize: isTiny ? 14 : 15 }]}>HOME</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.resultBtn, styles.resultBtnPrimary, { height: isTiny ? 52 : 56 }]} onPress={onNextRound}>
              <Text style={[styles.resultBtnText, { fontSize: isTiny ? 14 : 15 }]}>NEXT ROUND</Text>
            </Pressable>
          )}

          <View style={{ height: isTiny ? 10 : 12 }} />

          <Pressable style={styles.resultHomeSmall} onPress={onHome}>
            <Text style={[styles.resultHomeSmallText, { fontSize: isTiny ? 12 : 13 }]}>HOME</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  return (
    <ImageBackground source={ASSET.junkBg} style={styles.full} resizeMode="cover">
      <SafeAreaView style={styles.full} edges={['top', 'bottom']}>
        <Animated.View style={[styles.gameRoot, { opacity: fadeIn }]}>
          <View style={[styles.hudTopWrap, { width: contentW, marginTop: isTiny ? 6 : 10 }]}>
            <View style={[styles.hudBar, { height: hudH, paddingHorizontal: isTiny ? 10 : 14 }]}>
              <Text style={[styles.hudText, { fontSize: hudFont }]}>Collect darts:</Text>
              <Image source={ASSET.dart} style={[styles.hudDartIcon, { width: hudIcon, height: hudIcon }]} resizeMode="contain" />
              <Text style={[styles.hudTextStrong, { fontSize: hudFont }]}>
                {foundCount}/{ITEMS_PER_ROUND}
              </Text>
            </View>

            <View style={styles.hudRight}>
              <View style={[styles.hudChip, { height: hudH, minWidth: isTiny ? 54 : 60 }]}>
                <Text style={[styles.hudChipText, { fontSize: hudFont }]}>{String(timeLeft).padStart(2, '0')}s</Text>
              </View>

              <View style={{ width: 10 }} />

              <View style={[styles.hudChip, { height: hudH, minWidth: isTiny ? 54 : 60 }]}>
                <Text style={[styles.hudChipText, { fontSize: hudFont }]}>
                  {round}/{ROUNDS_TOTAL}
                </Text>
              </View>
            </View>
          </View>

          {phase === 'game' &&
            items.map(it => {
              if (it.found) return null;
              return (
                <Pressable
                  key={it.id}
                  onPress={() => onCollect(it.id)}
                  style={[
                    styles.itemTap,
                    {
                      left: it.x,
                      top: it.y,
                      width: it.size,
                      height: it.size,
                    },
                  ]}
                >
                  <Image source={ASSET.dart} style={styles.itemImg} resizeMode="contain" />
                </Pressable>
              );
            })}

          <View
            style={[
              styles.bottomBtns,
              {
                paddingBottom: Math.max(isTiny ? 10 : 14, insets.bottom + (isTiny ? 6 : 10)),
                zIndex: 50,
                elevation: 50,
              },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              style={[
                styles.squareBtn,
                styles.squareBtnHome,
                { width: bottomBtnSize, height: bottomBtnSize, borderRadius: isTiny ? 6 : 6 },
              ]}
              onPress={onHome}
            >
              <Image source={ASSET.homeIcon} style={[styles.squareIcon, { width: bottomBtnIcon, height: bottomBtnIcon }]} resizeMode="contain" />
            </Pressable>

            <View style={{ width: 12 }} />

            <Pressable
              style={[
                styles.squareBtn,
                styles.squareBtnInfo,
                { width: bottomBtnSize, height: bottomBtnSize, borderRadius: isTiny ? 6 : 6 },
              ]}
              onPress={openInfo}
            >
              <Image source={ASSET.infoIcon} style={[styles.squareIcon, { width: bottomBtnIcon, height: bottomBtnIcon }]} resizeMode="contain" />
            </Pressable>
          </View>

          {phase === 'result' && <ResultOverlay />}

          <Modal transparent visible={showInfo} animationType="none" onRequestClose={closeInfo} statusBarTranslucent>
            <View style={styles.infoDim}>
              <Animated.View
                style={[
                  styles.infoCard,
                  {
                    width: contentW,
                    opacity: infoOpacity,
                    transform: [{ scale: infoScale }],
                  },
                ]}
              >
                <View style={[styles.infoHeader, { height: isTiny ? 72 : 86 }]}>
                  <Text style={[styles.infoHeaderText, { fontSize: isTiny ? 18 : 22 }]}>INFORMATION</Text>
                </View>

                <View style={{ height: isTiny ? 12 : 18 }} />

                <Image
                  source={ASSET.dart}
                  style={{ width: isTiny ? 180 : 210, height: isTiny ? 110 : 130 }}
                  resizeMode="contain"
                />

                <View style={{ height: isTiny ? 12 : 18 }} />

                <View style={[styles.infoTextBox, { paddingHorizontal: isTiny ? 12 : 14, paddingVertical: isTiny ? 10 : 12 }]}>
                  <Text style={[styles.infoText, { fontSize: isTiny ? 12 : 14, lineHeight: isTiny ? 18 : 22 }]}>
                    The darts you find are stored in your garage.{'\n'}
                    They can be exchanged for nuts, bolts, or Baxter service jokes. The darts don't wear out on their own — only
                    when you decide to exchange them.
                  </Text>
                </View>

                <View style={{ height: isTiny ? 16 : 22 }} />

                <Pressable style={[styles.infoShareBtn, { height: isTiny ? 56 : 66 }]} onPress={onShareInfoModal}>
                  <Text style={[styles.infoShareBtnText, { fontSize: isTiny ? 16 : 20 }]}>SHARE</Text>
                </Pressable>

                <View style={{ height: isTiny ? 14 : 18 }} />

                <Pressable style={styles.infoCloseTap} onPress={closeInfo}>
                  <Text style={[styles.infoCloseText, { fontSize: isTiny ? 12 : 13 }]}>CLOSE</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Modal>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },

  loaderCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderWeb: { width: 190, height: 190, backgroundColor: 'transparent' },

  gameRoot: { flex: 1 },

  hudTopWrap: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  hudBar: {
    borderRadius: 8,
    backgroundColor: 'rgba(0, 18, 64, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  hudText: { color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
  hudTextStrong: { color: '#fff', fontWeight: '900', marginLeft: 6, letterSpacing: 0.3 },
  hudDartIcon: { marginLeft: 10, marginRight: 2 },

  hudRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  hudChip: {
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudChipText: { color: '#fff', fontWeight: '900' },

  itemTap: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  itemImg: { width: '100%', height: '100%' },

  bottomBtns: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  squareBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  squareBtnHome: { backgroundColor: '#E54A1A' },
  squareBtnInfo: { backgroundColor: '#1FCB39' },
  squareIcon: { tintColor: '#fff' },

  resultDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  resultCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(0, 18, 64, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 18,
    alignItems: 'center',
  },
  resultTitle: { color: '#fff', fontWeight: '900', letterSpacing: 1.0 },
  resultDart: {},
  resultScore: { color: '#fff', fontWeight: '900', letterSpacing: 0.8 },
  resultMeta: { color: 'rgba(255,255,255,0.78)', fontWeight: '800', textAlign: 'center' },
  resultBtn: { width: '100%', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  resultBtnShare: { backgroundColor: '#1FCB39' },
  resultBtnPrimary: { backgroundColor: '#E54A1A' },
  resultBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.8 },
  resultHomeSmall: { paddingVertical: 6, paddingHorizontal: 10 },
  resultHomeSmallText: { color: 'rgba(255,255,255,0.78)', fontWeight: '900', textDecorationLine: 'underline' },

  infoDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  infoCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(0, 18, 64, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 18,
    alignItems: 'center',
  },
  infoHeader: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#0B2A78',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoHeaderText: { color: '#fff', fontWeight: '900', letterSpacing: 1.1 },
  infoTextBox: {
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(75, 190, 255, 0.95)',
    borderRadius: 10,
  },
  infoText: { color: '#fff', fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
  infoShareBtn: { width: '100%', borderRadius: 4, backgroundColor: '#1FCB39', alignItems: 'center', justifyContent: 'center' },
  infoShareBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 1.0 },
  infoCloseTap: { paddingVertical: 6, paddingHorizontal: 10 },
  infoCloseText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900', textDecorationLine: 'underline', letterSpacing: 0.8 },
});
