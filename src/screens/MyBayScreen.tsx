import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Image,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'myBay'>;

const STORAGE_BALANCE = 'vault_balance_v1';
const STORAGE_REPAIRED = 'vault_car_repaired_v1';
const STORAGE_EMPTY = 'vault_garage_empty_v1';
const STORAGE_REPAIRED_COUNT = 'vault_repaired_count_v1';

type Balance = {
  diesel: number; 
  nut: number;
  bolt: number;
};

const DEFAULT_BALANCE: Balance = { diesel: 0, nut: 0, bolt: 0 };

const NEED_NUT = 50;
const NEED_BOLT = 70;

const ASSET = {
  brokenBg: require('../vault/garage_broken.png'),
  repairedBg: require('../vault/garage_repaired.png'),
  emptyBg: require('../vault/garage_empty.png'),

  back: require('../vault/back_arrow.png'),
  oil: require('../vault/ognb_3.png'),
  nut: require('../vault/nut.png'),
  bolt: require('../vault/bolt.png'),
  baxter: require('../vault/ognb_1.png'),
  car: require('../vault/ic_car.png'),
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
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

async function loadBool(key: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  return raw === '1' || raw === 'true';
}
async function saveBool(key: string, v: boolean) {
  await AsyncStorage.setItem(key, v ? '1' : '0');
}

async function loadCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_REPAIRED_COUNT);
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
async function saveCount(n: number) {
  await AsyncStorage.setItem(STORAGE_REPAIRED_COUNT, String(Math.max(0, Math.floor(n))));
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : clamp(value / max, 0, 1);
  return (
    <View style={styles.progOuter}>
      <View style={[styles.progInner, { width: `${pct * 100}%` }]} />
    </View>
  );
}

export default function MyBayScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isTiny = height < 700;
  const isSmall = height < 780;

  const contentW = useMemo(() => clamp(width - (isTiny ? 28 : 36), 300, 560), [width, isTiny]);

  const [balance, setBalance] = useState<Balance>(DEFAULT_BALANCE);

  const [repaired, setRepaired] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [repairedCount, setRepairedCount] = useState(0);

  const msgOpacity = useRef(new Animated.Value(0)).current;
  const msgScale = useRef(new Animated.Value(0.985)).current;

  const showMessageAnim = useCallback(() => {
    msgOpacity.setValue(0);
    msgScale.setValue(0.985);
    Animated.parallel([
      Animated.timing(msgOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(msgScale, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [msgOpacity, msgScale]);

  const hideMessageAnim = useCallback((done?: () => void) => {
    Animated.parallel([
      Animated.timing(msgOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(msgScale, { toValue: 0.985, duration: 140, useNativeDriver: true }),
    ]).start(() => done?.());
  }, [msgOpacity, msgScale]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const [b, cnt] = await Promise.all([loadBalance(), loadCount()]);
        if (!alive) return;

        setBalance(b);
        setRepairedCount(cnt);
        await Promise.all([saveBool(STORAGE_REPAIRED, false), saveBool(STORAGE_EMPTY, false)]);
        if (!alive) return;

        setRepaired(false);
        setEmpty(false);
        msgOpacity.setValue(0);
        msgScale.setValue(0.985);
      })();

      return () => {
        alive = false;
      };
    }, [msgOpacity, msgScale]),
  );

  const topPad = Math.max(10, insets.top + 6);
  const bottomPad = Math.max(14, insets.bottom + 10);

  const readyToRepair = balance.nut >= NEED_NUT && balance.bolt >= NEED_BOLT;

  const bgSource = empty ? ASSET.emptyBg : repaired ? ASSET.repairedBg : ASSET.brokenBg;

  const onPressRepair = async () => {

    const b = await loadBalance();
    if (b.nut < NEED_NUT || b.bolt < NEED_BOLT) {
      setBalance(b);
      return;
    }
    const nextBalance: Balance = {
      ...b,
      nut: Math.max(0, b.nut - NEED_NUT),
      bolt: Math.max(0, b.bolt - NEED_BOLT),
    };

    await saveBalance(nextBalance);
    setBalance(nextBalance);
    const current = await loadCount();
    const nextCount = current + 1;
    await saveCount(nextCount);
    setRepairedCount(nextCount);
    await Promise.all([saveBool(STORAGE_REPAIRED, true), saveBool(STORAGE_EMPTY, false)]);
    setEmpty(false);
    setRepaired(true);
    showMessageAnim();
  };

  const onReturnHome = async () => {
    await saveBool(STORAGE_EMPTY, true);
    setEmpty(true);
    hideMessageAnim();
  };

  const topGap = isTiny ? 10 : 14;
  const statsPad = isTiny ? 10 : 12;
  const statsTopTextW = isTiny ? 78 : 90;

  const badgeH = isTiny ? 34 : 38;
  const badgeIcon = isTiny ? 16 : 18;
  const badgeFont = isTiny ? 12 : 13;

  const messageH = isTiny ? 150 : isSmall ? 168 : 180;
  const msgLineH = isTiny ? 16 : 18;
  const msgFont = isTiny ? 12 : 13;

  const btnH = isTiny ? 56 : 64;

  return (
    <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.stage, { paddingTop: topPad, paddingBottom: bottomPad }]}>
          <View style={[styles.headerRow, { width: contentW }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
              <Image source={ASSET.back} style={styles.backIcon} resizeMode="contain" />
            </Pressable>

            <View style={[styles.headerTitlePill, { height: isTiny ? 52 : 56 }]}>
              <Text style={[styles.headerTitle, { fontSize: isTiny ? 16 : 18 }]}>MY GARAGE</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          <View style={{ height: topGap }} />

          <View style={[styles.repairedBadge, { width: contentW, height: badgeH }]}>
            <Image source={ASSET.car} style={{ width: badgeIcon, height: badgeIcon }} resizeMode="contain" />
            <Text style={[styles.repairedBadgeNumber, { fontSize: badgeFont }]}>{repairedCount}</Text>
            <Text style={[styles.repairedBadgeLabel, { fontSize: badgeFont }]}>repaired</Text>
          </View>

          <View style={{ height: isTiny ? 8 : 10 }} />

          <View style={[styles.statsCard, { width: contentW, padding: statsPad }]}>
            <View style={styles.statRowTop}>
              <Image source={ASSET.oil} style={styles.statIconOil} />
              <Text style={[styles.statTopText, { width: statsTopTextW }]}>{balance.diesel}/500</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ProgressBar value={balance.diesel} max={500} />
              </View>
            </View>

            <View style={[styles.statRowBottom, { marginTop: isTiny ? 8 : 10 }]}>
              <View style={[styles.statMini, { height: isTiny ? 44 : 46 }]}>
                <Image source={ASSET.nut} style={styles.miniIcon} />
                <Text style={styles.miniText}>
                  {Math.min(balance.nut, NEED_NUT)}/{NEED_NUT}
                </Text>
              </View>

              <View style={[styles.statMini, { height: isTiny ? 44 : 46 }]}>
                <Image source={ASSET.bolt} style={styles.miniIcon} />
                <Text style={styles.miniText}>
                  {Math.min(balance.bolt, NEED_BOLT)}/{NEED_BOLT}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1, width: contentW, justifyContent: 'flex-end', paddingBottom: isTiny ? 8 : 14 }}>
            {repaired && !empty ? (
              <>
                <Animated.View
                  style={[
                    styles.messageCard,
                    {
                      height: messageH,
                      opacity: msgOpacity,
                      transform: [{ scale: msgScale }],
                      marginBottom: isTiny ? 12 : 18,
                      padding: isTiny ? 12 : 14,
                    },
                  ]}
                >
                  <Text style={[styles.msgTitle, { fontSize: isTiny ? 13 : 14 }]}>Message:</Text>
                  <Text style={[styles.msgBody, { lineHeight: msgLineH, fontSize: msgFont }]}>
                    The car is running again.{'\n'}
                    The yacht is waiting, the road is open.{'\n'}
                    I&apos;ll handle the rest myself.{'\n'}
                    Thanks for helping me get through{'\n'}
                    One More Mile.
                  </Text>

                  <Image
                    source={ASSET.baxter}
                    style={[styles.msgBaxter, { width: isTiny ? 104 : 120, height: isTiny ? 112 : 130 }]}
                    resizeMode="contain"
                  />
                </Animated.View>

                <Pressable style={[styles.bigBtn, styles.bigBtnGreen, { height: btnH }]} onPress={onReturnHome}>
                  <Text style={styles.bigBtnText}>RETURN HOME</Text>
                </Pressable>
              </>
            ) : empty ? (
              <View style={{ height: isTiny ? 16 : 22 }} />
            ) : readyToRepair ? (
              <Pressable style={[styles.bigBtn, styles.bigBtnOrange, { height: btnH }]} onPress={onPressRepair}>
                <Text style={styles.bigBtnText}>REPAIR</Text>
              </Pressable>
            ) : (
              <View style={[styles.hintToast, { height: btnH }]}>
                <View style={styles.hintDot}>
                  <Text style={styles.hintDotText}>i</Text>
                </View>
                <Text style={[styles.hintToastText, { fontSize: isTiny ? 12 : 13 }]}>
                  Not enough spare parts to go home yet!
                </Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  stage: { flex: 1, alignItems: 'center' },

  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
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
    borderRadius: 12,
    backgroundColor: 'rgba(0, 18, 64, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '900', letterSpacing: 1.1 },

  repairedBadge: {
    borderRadius: 10,
    backgroundColor: 'rgba(0, 18, 64, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  repairedBadgeNumber: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },
  repairedBadgeLabel: { color: 'rgba(255,255,255,0.82)', fontWeight: '900', letterSpacing: 0.2 },

  statsCard: {
    borderRadius: 12,
    backgroundColor: 'rgba(0, 18, 64, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  statRowTop: { flexDirection: 'row', alignItems: 'center' },
  statIconOil: { width: 22, height: 22, resizeMode: 'contain', marginRight: 8 },
  statTopText: { color: '#fff', fontWeight: '900', textAlign: 'left' },

  progOuter: {
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  progInner: { height: '100%', backgroundColor: '#1FCB39' },

  statRowBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },

  statMini: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  miniIcon: { width: 18, height: 18, resizeMode: 'contain', marginRight: 10 },
  miniText: { color: '#1A1A1A', fontWeight: '900' },

  bigBtn: { borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  bigBtnGreen: { backgroundColor: '#1FCB39' },
  bigBtnOrange: { backgroundColor: '#E54A1A' },
  bigBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.7 },

  hintToast: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  hintDot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#1FCB39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintDotText: { color: '#fff', fontWeight: '900' },
  hintToastText: { color: '#1A1A1A', fontWeight: '900' },

  messageCard: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 18, 64, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  msgTitle: { color: '#fff', fontWeight: '900', marginBottom: 6 },
  msgBody: { color: 'rgba(255,255,255,0.88)', fontWeight: '800' },
  msgBaxter: { position: 'absolute', right: 8, bottom: 0 },
});
