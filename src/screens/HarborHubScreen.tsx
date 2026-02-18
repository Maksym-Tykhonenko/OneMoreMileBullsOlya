import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'harborHub'>;

const STORAGE_BALANCE = 'vault_balance_v1';
const STORAGE_DAILY = 'vault_daily_diesel_v1';

type Balance = {
  diesel: number; 
  nut: number;
  bolt: number; 
};

const DEFAULT_BALANCE: Balance = { diesel: 0, nut: 0, bolt: 0 };

const ASSET = {
  bg: require('../vault/loader_bg.png'),
  bull: require('../vault/ognb_1.png'),
  diesel: require('../vault/ognb_3.png'),
  nut: require('../vault/nut.png'),
  bolt: require('../vault/bolt.png'),
  icSearch: require('../vault/ic_search.png'),
  icGarage: require('../vault/ic_garage.png'),
  icWorkshop: require('../vault/ic_workshop.png'),
  icSettings: require('../vault/ic_settings.png'),
  icTips: require('../vault/ic_tips.png'),
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HubBtn = 'tips' | 'start' | 'garage' | 'workshop' | 'settings' | 'dailyGood' | 'dailyClose' | null;

function todayKeyLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

async function ensureDailyDiesel(): Promise<{ balance: Balance; grantedToday: boolean }> {
  const dayKey = todayKeyLocal();
  const [rawDaily, bal] = await Promise.all([AsyncStorage.getItem(STORAGE_DAILY), loadBalance()]);

  if (rawDaily === dayKey) return { balance: bal, grantedToday: false };

  const next: Balance = { ...bal, diesel: bal.diesel + 20 };
  await Promise.all([saveBalance(next), AsyncStorage.setItem(STORAGE_DAILY, dayKey)]);
  return { balance: next, grantedToday: true };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : clamp(value / max, 0, 1);
  return (
    <View style={styles.progOuter}>
      <View style={[styles.progInner, { width: `${pct * 100}%` }]} />
    </View>
  );
}

export default function HarborHubScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isTiny = height < 700;
  const isSmall = height < 780;

  const [balance, setBalance] = useState<Balance>(DEFAULT_BALANCE);
  const [showDaily, setShowDaily] = useState(false);

  const enter = useRef(new Animated.Value(0)).current;

  const dailyOpacity = useRef(new Animated.Value(0)).current;
  const dailyScale = useRef(new Animated.Value(0.98)).current;

  const btn1 = useRef(new Animated.Value(0)).current;
  const btn2 = useRef(new Animated.Value(0)).current;
  const btn3 = useRef(new Animated.Value(0)).current;
  const btn4 = useRef(new Animated.Value(0)).current;

  const [activeBtn, setActiveBtn] = useState<HubBtn>(null);
  const activeAnim = useRef(new Animated.Value(0)).current;

  const contentW = useMemo(() => clamp(width - 44, 300, 560), [width]);
  const bottomPad = Math.max(16, insets.bottom + 16);
  const contentDrop = 20;

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const flashActive = useCallback(
    (key: HubBtn) => {
      setActiveBtn(key);
      activeAnim.stopAnimation();
      activeAnim.setValue(0);

      Animated.sequence([
        Animated.timing(activeAnim, {
          toValue: 1,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(activeAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        requestAnimationFrame(() => {
          if (isMounted.current) setActiveBtn(null);
        });
      });
    },
    [activeAnim],
  );

  const activeGlowStyle = (key: HubBtn) => {
    if (activeBtn !== key) return null;

    const scale = activeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.992],
    });

    const glowOpacity = activeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 0.35],
    });

    return {
      borderWidth: 2,
      borderColor: 'rgba(31,203,57,0.95)',
      shadowColor: '#1FCB39',
      shadowOpacity: 0.55,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 10,
      transform: [{ scale }],
      opacity: glowOpacity,
    } as const;
  };

  const refreshBalance = useCallback(async () => {
    const b = await loadBalance();
    setBalance(b);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshBalance();
    }, [refreshBalance]),
  );

  useEffect(() => {
    (async () => {
      const res = await ensureDailyDiesel();
      setBalance(res.balance);

      enter.setValue(0);
      btn1.setValue(0);
      btn2.setValue(0);
      btn3.setValue(0);
      btn4.setValue(0);

      Animated.timing(enter, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      Animated.stagger(90, [
        Animated.timing(btn1, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(btn2, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(btn3, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(btn4, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();

      if (res.grantedToday) {
        setShowDaily(true);
        dailyOpacity.setValue(0);
        dailyScale.setValue(0.98);
        Animated.parallel([
          Animated.timing(dailyOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
          Animated.timing(dailyScale, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }
    })();

  }, []);

  const onCloseDaily = () => {
    flashActive('dailyClose');
    Animated.parallel([
      Animated.timing(dailyOpacity, { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(dailyScale, { toValue: 0.98, duration: 170, useNativeDriver: true }),
    ]).start(() => setShowDaily(false));
  };

  const onDailyGood = () => {
    flashActive('dailyGood');
    Animated.parallel([
      Animated.timing(dailyOpacity, { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(dailyScale, { toValue: 0.98, duration: 170, useNativeDriver: true }),
    ]).start(() => setShowDaily(false));
  };

  const onTips = () => {
    flashActive('tips');
    navigation.navigate('fieldNotes');
  };

  const onStartSearch = () => {
    flashActive('start');
    navigation.navigate('questStart');
  };

  const onGarage = () => {
    flashActive('garage');
    navigation.navigate('myBay');
  };

  const onWorkshop = () => {
    flashActive('workshop');
    navigation.navigate('benchRoom');
  };

  const onSettings = () => {
    flashActive('settings');
    navigation.navigate('controlDesk');
  };

  const fade = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const up = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const scaleIn = enter.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1] });

  const mkBtnAnim = (v: Animated.Value) => ({
    opacity: v,
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
    ],
  });

  return (
    <ImageBackground source={ASSET.bg} resizeMode="cover" style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.stage, { paddingBottom: bottomPad }]}>
          <Animated.View
            style={{
              width: '100%',
              alignItems: 'center',
              opacity: fade,
              transform: [{ translateY: up }, { scale: scaleIn }],
              marginTop: contentDrop,
            }}
          >
            <View style={[styles.topBullWrap, { width: contentW, marginTop: isTiny ? 6 : isSmall ? 10 : 14 }]}>
              <Image source={ASSET.bull} resizeMode="contain" style={{ width: '100%', height: isTiny ? 92 : 112 }} />

              <AnimatedPressable style={[styles.tipsBtn, activeGlowStyle('tips')]} onPress={onTips}>
                <Image source={ASSET.icTips} style={styles.tipsIcon} />
                <Text style={styles.tipsText}>TIPS</Text>
              </AnimatedPressable>
            </View>

            <View style={[styles.statsCard, { width: contentW, marginTop: isTiny ? 8 : 10 }]}>
              <View style={styles.statRowTop}>
                <Image source={ASSET.diesel} style={styles.statIconOil} />
                <Text style={styles.statTopText}>{balance.diesel}/500</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ProgressBar value={balance.diesel} max={500} />
                </View>
              </View>

              <View style={[styles.statRowBottom, { marginTop: isTiny ? 8 : 10 }]}>
                <View style={styles.statMini}>
                  <Image source={ASSET.nut} style={styles.miniIcon} />
                  <Text style={styles.miniText}>{balance.nut}/50</Text>
                </View>

                <View style={styles.statMini}>
                  <Image source={ASSET.bolt} style={styles.miniIcon} />
                  <Text style={styles.miniText}>{balance.bolt}/70</Text>
                </View>
              </View>
            </View>

            <View style={{ height: isTiny ? 8 : 14 }} />

            <Animated.View style={[mkBtnAnim(btn1), { width: contentW }]}>
              <AnimatedPressable style={[styles.bigBtn, styles.bigBtnGreen, activeGlowStyle('start')]} onPress={onStartSearch}>
                <Image source={ASSET.icSearch} style={styles.bigIcon} />
                <Text style={styles.bigBtnText}>START SEARCH</Text>
              </AnimatedPressable>
            </Animated.View>

            <Animated.View style={[mkBtnAnim(btn2), { width: contentW }]}>
              <AnimatedPressable style={[styles.bigBtn, styles.bigBtnOrange, activeGlowStyle('garage')]} onPress={onGarage}>
                <Image source={ASSET.icGarage} style={styles.bigIcon} />
                <Text style={styles.bigBtnText}>MY GARAGE</Text>
              </AnimatedPressable>
            </Animated.View>

            <Animated.View style={[mkBtnAnim(btn3), { width: contentW }]}>
              <AnimatedPressable style={[styles.bigBtn, styles.bigBtnOrange, activeGlowStyle('workshop')]} onPress={onWorkshop}>
                <Image source={ASSET.icWorkshop} style={styles.bigIcon} />
                <Text style={styles.bigBtnText}>WORKSHOP</Text>
              </AnimatedPressable>
            </Animated.View>

            <Animated.View style={[mkBtnAnim(btn4), { width: contentW }]}>
              <AnimatedPressable style={[styles.bigBtn, styles.bigBtnOrange, activeGlowStyle('settings')]} onPress={onSettings}>
                <Image source={ASSET.icSettings} style={styles.bigIcon} />
                <Text style={styles.bigBtnText}>SETTINGS</Text>
              </AnimatedPressable>
            </Animated.View>
          </Animated.View>

          {showDaily && (
            <View style={styles.overlayDim}>
              <Animated.View
                style={[
                  styles.dailyCard,
                  {
                    width: contentW,
                    opacity: dailyOpacity,
                    transform: [{ scale: dailyScale }],
                  },
                ]}
              >
                <View style={styles.dailyTopFrame}>
                  <Image source={ASSET.bull} resizeMode="contain" style={styles.dailyBull} />
                </View>

                <Text style={styles.dailyTitle}>DAY-1</Text>

                <View style={styles.dailyRewardRow}>
                  <Image source={ASSET.diesel} style={styles.dailyOil} />
                  <Text style={styles.dailyRewardText}>20 DIESEL</Text>
                </View>

                <AnimatedPressable style={[styles.dailyBtn, activeGlowStyle('dailyGood')]} onPress={onDailyGood}>
                  <Text style={styles.dailyBtnText}>GOOD</Text>
                </AnimatedPressable>

                <AnimatedPressable onPress={onCloseDaily} style={[styles.dailyCloseTap, activeGlowStyle('dailyClose')]}>
                  <Text style={styles.dailyCloseText}>CLOSE</Text>
                </AnimatedPressable>
              </Animated.View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  stage: { flex: 1, alignItems: 'center' },

  topBullWrap: { alignItems: 'center', justifyContent: 'center' },

  tipsBtn: {
    position: 'absolute',
    right: 0,
    top: 34,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1FCB39',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsIcon: { width: 18, height: 18, tintColor: '#fff', marginRight: 10, resizeMode: 'contain' },
  tipsText: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },

  statsCard: {
    borderRadius: 12,
    backgroundColor: 'rgba(0, 18, 64, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 12,
  },

  statRowTop: { flexDirection: 'row', alignItems: 'center' },
  statIconOil: { width: 22, height: 22, resizeMode: 'contain', marginRight: 8 },
  statTopText: { color: '#fff', fontWeight: '900', width: 70, textAlign: 'left' },

  progOuter: {
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  progInner: { height: '100%', backgroundColor: '#1FCB39' },

  statRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  statMini: {
    flex: 1,
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  miniIcon: { width: 18, height: 18, resizeMode: 'contain', marginRight: 10 },
  miniText: { color: '#1A1A1A', fontWeight: '900' },

  bigBtn: {
    height: 64,
    borderRadius: 6,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigBtnGreen: { backgroundColor: '#1FCB39' },
  bigBtnOrange: { backgroundColor: '#E54A1A' },

  bigIcon: { width: 18, height: 18, tintColor: '#fff', marginRight: 12, resizeMode: 'contain' },
  bigBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.7 },

  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  dailyCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(0, 18, 64, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 18,
    alignItems: 'center',
  },

  dailyTopFrame: {
    width: '100%',
    height: 180,
    borderWidth: 2,
    borderColor: 'rgba(70, 170, 255, 0.8)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dailyBull: { width: '86%', height: '86%' },

  dailyTitle: { color: '#fff', fontWeight: '900', marginBottom: 10, letterSpacing: 0.8 },

  dailyRewardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dailyOil: { width: 30, height: 30, resizeMode: 'contain', marginRight: 10 },
  dailyRewardText: { color: '#fff', fontWeight: '900', fontSize: 22, letterSpacing: 0.8 },

  dailyBtn: {
    width: '100%',
    height: 56,
    borderRadius: 6,
    backgroundColor: '#1FCB39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.7 },

  dailyCloseTap: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'center' },
  dailyCloseText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textDecorationLine: 'underline' },
});
