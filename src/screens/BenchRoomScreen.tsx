import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Image,
  useWindowDimensions,
  ScrollView,
  Animated,
  Easing,
  Share,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'benchRoom'>;

const STORAGE_BALANCE = 'vault_balance_v1';

type Balance = {
  diesel: number; 
  nut: number;
  bolt: number;
};

const DEFAULT_BALANCE: Balance = { diesel: 0, nut: 0, bolt: 0 };
const COST_POINTS = 10;

const ASSET = {
  bg: require('../vault/loader_bg.png'),
  back: require('../vault/back_arrow.png'),
  points: require('../vault/ognb_3.png'),

  nut: require('../vault/nut.png'),
  bolt: require('../vault/bolt.png'),
  baxter: require('../vault/ognb_1.png'),
};

const JOKES: string[] = [
  'I would have left already, but the bolt decided otherwise.',
  'This is not a breakdown - it is a pause.',
  'The car is alive. It is just thinking.',
  'The nut is there, but not there.',
  'It used to run. I remember.',
  'The engine is silent, but honestly.',
  'If it does not start - it means it is still early.',
  'I am not a mechanic. I am an optimist.',
  'This sound does not mean anything. Probably.',
  'Bolts run out faster than patience.',
  'Hands in oil - it means work is underway.',
  'Almost ready. As always.',
  'Not new, but ours.',
  'A little more - and it will be like before.',
  'The main thing is that it runs. Beauty later.',
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function pickRandom<T>(arr: T[]): T {
  if (!arr.length) throw new Error('Empty array');
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
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

async function saveBalance(next: Balance) {
  await AsyncStorage.setItem(STORAGE_BALANCE, JSON.stringify(next));
}

type ResultKind = 'bolt' | 'nut' | 'joke' | null;

export default function BenchRoomScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isTiny = height < 700;
  const isSmall = height < 780;

  const contentW = useMemo(() => clamp(width - 36, 300, 560), [width]);

  const [balance, setBalance] = useState<Balance>(DEFAULT_BALANCE);

  const [resultOpen, setResultOpen] = useState(false);
  const [resultKind, setResultKind] = useState<ResultKind>(null);
  const [resultJokeText, setResultJokeText] = useState<string>('');

  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.98)).current;

  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const b = await loadBalance();
    setBalance(b);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openResult = useCallback(
    (kind: ResultKind) => {
      setResultKind(kind);
      setResultOpen(true);

      resultOpacity.setValue(0);
      resultScale.setValue(0.98);

      Animated.parallel([
        Animated.timing(resultOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(resultScale, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [resultOpacity, resultScale],
  );

  const closeResult = useCallback(() => {
    Animated.parallel([
      Animated.timing(resultOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(resultScale, { toValue: 0.98, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setResultOpen(false);
      setResultKind(null);
      setResultJokeText('');
    });
  }, [resultOpacity, resultScale]);

  const canExchange = balance.diesel >= COST_POINTS && !busy;

  const doExchange = useCallback(
    async (kind: 'bolt' | 'nut' | 'joke') => {
      if (busy) return;
      setBusy(true);

      try {
        const b = await loadBalance();

        if (b.diesel < COST_POINTS) {
          setBalance(b);
          setBusy(false);
          return;
        }
        const nextBase: Balance = { ...b, diesel: Math.max(0, b.diesel - COST_POINTS) };

        if (kind === 'bolt') {
          const nextB: Balance = { ...nextBase, bolt: nextBase.bolt + 1 };
          await saveBalance(nextB);
          setBalance(nextB);
          openResult('bolt');
          return;
        }

        if (kind === 'nut') {
          const nextB: Balance = { ...nextBase, nut: nextBase.nut + 1 };
          await saveBalance(nextB);
          setBalance(nextB);
          openResult('nut');
          return;
        }
        const joke = pickRandom(JOKES);
        setResultJokeText(joke);

        await saveBalance(nextBase);
        setBalance(nextBase);
        openResult('joke');
      } finally {
        setBusy(false);
      }
    },
    [busy, openResult],
  );

  const shareResult = useCallback(async () => {
    try {
      let msg = 'Successfully exchanged!';
      if (resultKind === 'bolt') msg = 'Successfully exchanged! You received: Bolt (1 piece).';
      if (resultKind === 'nut') msg = 'Successfully exchanged! You received: Nut (1 piece).';
      if (resultKind === 'joke') msg = resultJokeText ? `Baxter joke: "${resultJokeText}"` : 'Baxter joke received!';

      await Share.share(
        Platform.select({
          ios: { message: msg },
          default: { message: msg },
        }) as any,
      );
    } catch {

    }
  }, [resultKind, resultJokeText]);

  const topPad = Math.max(10, insets.top + 6);
  const bottomPad = Math.max(14, insets.bottom + 10);

  return (
    <ImageBackground source={ASSET.bg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.stage, { paddingTop: topPad, paddingBottom: bottomPad }]}>
          <View style={[styles.headerRow, { width: contentW }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
              <Image source={ASSET.back} style={styles.backIcon} resizeMode="contain" />
            </Pressable>

            <View style={styles.headerTitlePill}>
              <Text style={styles.headerTitle}>WORKSHOP</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          <View style={{ height: isTiny ? 10 : 14 }} />

          <View style={[styles.statsRow, { width: contentW }]}>
            <View style={styles.statLeft}>
              <Image source={ASSET.points} style={styles.statIcon} resizeMode="contain" />
              <Text style={styles.statText}>{balance.diesel}/500</Text>
            </View>
          </View>

          <View style={{ height: isTiny ? 10 : 14 }} />

          <ScrollView
            style={{ width: contentW }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Image source={ASSET.bolt} style={styles.partBig} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Bolt (1 piece)</Text>
                  <Text style={styles.cardSub}>To exchange you need:</Text>

                  <View style={styles.costRow}>
                    <Image source={ASSET.points} style={styles.costIcon} resizeMode="contain" />
                    <Text style={styles.costText}>{COST_POINTS}</Text>

                    <View style={{ flex: 1 }} />

                    <Pressable
                      onPress={() => doExchange('bolt')}
                      disabled={!canExchange}
                      style={[styles.exchangeBtn, !canExchange && styles.exchangeBtnDisabled]}
                    >
                      <Text style={styles.exchangeBtnText}>EXCHANGE</Text>
                    </Pressable>
                  </View>

                  {!canExchange && <Text style={styles.hintText}>Not enough points.</Text>}
                </View>
              </View>
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Image source={ASSET.nut} style={styles.partBig} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Nut (1 piece)</Text>
                  <Text style={styles.cardSub}>To exchange you need:</Text>

                  <View style={styles.costRow}>
                    <Image source={ASSET.points} style={styles.costIcon} resizeMode="contain" />
                    <Text style={styles.costText}>{COST_POINTS}</Text>

                    <View style={{ flex: 1 }} />

                    <Pressable
                      onPress={() => doExchange('nut')}
                      disabled={!canExchange}
                      style={[styles.exchangeBtn, !canExchange && styles.exchangeBtnDisabled]}
                    >
                      <Text style={styles.exchangeBtnText}>EXCHANGE</Text>
                    </Pressable>
                  </View>

                  {!canExchange && <Text style={styles.hintText}>Not enough points.</Text>}
                </View>
              </View>
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Image source={ASSET.baxter} style={styles.partBig} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Baxter Joke</Text>
                  <Text style={styles.cardSub}>To exchange you need:</Text>

                  <View style={styles.costRow}>
                    <Image source={ASSET.points} style={styles.costIcon} resizeMode="contain" />
                    <Text style={styles.costText}>{COST_POINTS}</Text>

                    <View style={{ flex: 1 }} />

                    <Pressable
                      onPress={() => doExchange('joke')}
                      disabled={!canExchange}
                      style={[styles.exchangeBtn, !canExchange && styles.exchangeBtnDisabled]}
                    >
                      <Text style={styles.exchangeBtnText}>EXCHANGE</Text>
                    </Pressable>
                  </View>

                  {!canExchange && <Text style={styles.hintText}>Not enough points.</Text>}
                </View>
              </View>
            </View>

            <View style={{ height: isSmall ? 6 : 10 }} />
          </ScrollView>

          <Modal transparent visible={resultOpen} animationType="none" onRequestClose={closeResult} statusBarTranslucent>
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
                <View style={[styles.resultHeader, { height: isTiny ? 72 : 86 }]}>
                  <Text style={[styles.resultHeaderText, { fontSize: isTiny ? 18 : 22 }]}>WORKSHOP</Text>
                </View>

                <View style={{ height: isTiny ? 14 : 18 }} />

                {resultKind === 'bolt' ? (
                  <Image
                    source={ASSET.bolt}
                    style={{ width: isTiny ? 140 : 180, height: isTiny ? 140 : 180 }}
                    resizeMode="contain"
                  />
                ) : resultKind === 'nut' ? (
                  <Image
                    source={ASSET.nut}
                    style={{ width: isTiny ? 140 : 180, height: isTiny ? 140 : 180 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.jokeBox}>
                    <Text style={styles.jokeText} numberOfLines={0}>
                      {resultJokeText || 'Baxter joke received!'}
                    </Text>
                    <Image source={ASSET.baxter} style={styles.jokeBaxter} resizeMode="contain" />
                  </View>
                )}

                <View style={{ height: isTiny ? 10 : 14 }} />

                <Text style={[styles.resultMsg, { fontSize: isTiny ? 14 : 16 }]}>
                  {resultKind === 'joke' ? 'Baxter joke received!' : 'Successfully exchanged!'}
                </Text>

                <View style={{ height: isTiny ? 14 : 18 }} />

                <Pressable style={[styles.resultBtn, { height: isTiny ? 56 : 66 }]} onPress={shareResult}>
                  <Text style={[styles.resultBtnText, { fontSize: isTiny ? 16 : 20 }]}>SHARE</Text>
                </Pressable>

                <View style={{ height: isTiny ? 14 : 18 }} />

                <Pressable style={styles.closeTap} onPress={closeResult}>
                  <Text style={styles.closeText}>CLOSE</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  stage: { flex: 1, alignItems: 'center' },

  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { width: 18, height: 18, tintColor: '#fff' },

  headerTitlePill: {
    flex: 1,
    marginHorizontal: 10,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 18, 64, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '900', letterSpacing: 1.1, fontSize: 18 },

  statsRow: { flexDirection: 'row', justifyContent: 'center' },
  statLeft: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 18, 64, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statIcon: { width: 18, height: 18, marginRight: 10 },
  statText: { color: '#fff', fontWeight: '900', letterSpacing: 0.3 },

  card: {
    borderRadius: 12,
    backgroundColor: 'rgba(0, 18, 64, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },

  partBig: { width: 78, height: 78 },

  cardTitle: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },
  cardSub: { marginTop: 6, color: 'rgba(255,255,255,0.75)', fontWeight: '800' },

  costRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  costIcon: { width: 18, height: 18, marginRight: 10 },
  costText: { color: '#fff', fontWeight: '900', fontSize: 16, minWidth: 30 },

  exchangeBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#1FCB39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exchangeBtnDisabled: { backgroundColor: 'rgba(31,203,57,0.35)' },
  exchangeBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.8 },

  hintText: { marginTop: 8, color: 'rgba(255,255,255,0.65)', fontWeight: '800' },

  resultDim: {
    flex: 1,
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
  resultHeader: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#0B2A78',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultHeaderText: { color: '#fff', fontWeight: '900', letterSpacing: 1.1 },

  resultMsg: { color: '#fff', fontWeight: '900', letterSpacing: 0.3 },

  resultBtn: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: '#1FCB39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 1.0 },

  closeTap: { paddingVertical: 6, paddingHorizontal: 10 },
  closeText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
    textDecorationLine: 'underline',
    letterSpacing: 0.8,
  },

  jokeBox: {
    width: '100%',
    minHeight: 160,
    borderRadius: 10,
    backgroundColor: '#E54A1A',
    padding: 14,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  jokeText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.2,
    fontSize: 16,
    lineHeight: 22,
    paddingRight: 96, 
  },
  jokeBaxter: {
    position: 'absolute',
    right: 6,
    bottom: 0,
    width: 110,
    height: 120,
  },
});
