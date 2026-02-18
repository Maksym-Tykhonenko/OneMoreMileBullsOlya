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
  Switch,
  Share,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'controlDesk'>;

const ASSET = {
  bg: require('../vault/loader_bg.png'),
  back: require('../vault/back_arrow.png'),
};

const KEY_VIBRATION = 'vault_vibration_enabled_v1';
const KEY_PUSH = 'vault_push_enabled_v1';
const STORAGE_BALANCE = 'vault_balance_v1';
const STORAGE_DAILY = 'vault_daily_diesel_v1';
const STORAGE_REPAIRED = 'vault_car_repaired_v1';
const STORAGE_EMPTY = 'vault_garage_empty_v1';
const STORAGE_REPAIRED_COUNT = 'vault_repaired_count_v1';

type Tab = 'settings' | 'about';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

async function loadBool(key: string, fallback = true): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  return raw === '1' || raw === 'true';
}
async function saveBool(key: string, v: boolean) {
  await AsyncStorage.setItem(key, v ? '1' : '0');
}

export default function ControlDeskScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isTiny = height < 700;
  const isSmall = height < 780;

  const contentW = useMemo(() => clamp(width - (isTiny ? 26 : 36), 300, 560), [width, isTiny]);

  const [tab, setTab] = useState<Tab>('settings');
  const [vibration, setVibration] = useState(true);
  const [push, setPush] = useState(true);
  const enter = useRef(new Animated.Value(0)).current;
  const tabsAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const resetAnim = useRef(new Animated.Value(0)).current;
  const tabLine = useRef(new Animated.Value(0)).current;

  const topPad = Math.max(10, insets.top + 6);
  const bottomPad = Math.max(14, insets.bottom + 10);

  const runEnter = useCallback(() => {
    enter.setValue(0);
    tabsAnim.setValue(0);
    cardAnim.setValue(0);
    resetAnim.setValue(0);

    Animated.parallel([
      Animated.timing(enter, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(tabsAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardAnim, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(resetAnim, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [enter, tabsAnim, cardAnim, resetAnim]);

  const refresh = useCallback(async () => {
    const [vib, p] = await Promise.all([loadBool(KEY_VIBRATION, true), loadBool(KEY_PUSH, true)]);
    setVibration(vib);
    setPush(p);
    runEnter();
  }, [runEnter]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const animateTab = useCallback(
    (next: Tab) => {
      setTab(next);
      Animated.timing(tabLine, {
        toValue: next === 'settings' ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      cardAnim.stopAnimation();
      cardAnim.setValue(0);
      Animated.timing(cardAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    },
    [tabLine, cardAnim],
  );

  const onToggleVibration = useCallback(async (v: boolean) => {
    setVibration(v);
    await saveBool(KEY_VIBRATION, v);
  }, []);

  const onTogglePush = useCallback(async (v: boolean) => {
    setPush(v);
    await saveBool(KEY_PUSH, v);
  }, []);

  const resetProgress = useCallback(() => {
    Alert.alert('Reset progress', 'This will reset your progress and resources. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await Promise.all([
            AsyncStorage.removeItem(STORAGE_BALANCE),
            AsyncStorage.removeItem(STORAGE_DAILY),
            AsyncStorage.removeItem(STORAGE_REPAIRED),
            AsyncStorage.removeItem(STORAGE_EMPTY),
            AsyncStorage.removeItem(STORAGE_REPAIRED_COUNT),
          ]);
          await refresh();
          Alert.alert('Done', 'Progress has been reset.');
        },
      },
    ]);
  }, [refresh]);

  const shareInfo = useCallback(async () => {
    const msg =
      'Bulls& SeasMore One Mile is a small story-driven app about the journey home. You help Baxter fix his car by gathering resources, checking in every day and exploring the junkyard for parts. No accounts, no data collection — everything works locally at a leisurely pace. One story, one goal, and a path to the finale without fuss or rush.';
    try {
      await Share.share(
        Platform.select({
          ios: { message: msg },
          default: { message: msg },
        }) as any,
      );
    } catch {

    }
  }, []);

  const tabBtnH = isTiny ? 50 : 56;
  const bigRowH = isTiny ? 56 : isSmall ? 62 : 66;
  const bigBtnH = isTiny ? 58 : isSmall ? 66 : 72;

  const padX = isTiny ? 12 : 16;
  const gap = isTiny ? 10 : 12;

  const resetLift = 40;
  const headerFade = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const headerUp = enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  const tabsFade = tabsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const tabsUp = tabsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  const contentFade = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const contentUp = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  const resetFade = resetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const resetUp = resetAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  const indicatorX = tabLine.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <ImageBackground source={ASSET.bg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.stage, { paddingTop: topPad, paddingBottom: bottomPad }]}>

          <Animated.View
            style={[
              styles.headerRow,
              {
                width: contentW,
                opacity: headerFade,
                transform: [{ translateY: headerUp }],
              },
            ]}
          >
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
              <Image source={ASSET.back} style={styles.backIcon} resizeMode="contain" />
            </Pressable>

            <View style={[styles.headerTitlePill, { height: isTiny ? 52 : 56 }]}>
              <Text style={[styles.headerTitle, { fontSize: isTiny ? 16 : 18 }]}>SETTINGS</Text>
            </View>

            <View style={{ width: 44 }} />
          </Animated.View>

          <View style={{ height: isTiny ? 10 : 14 }} />
          <Animated.View
            style={{
              width: contentW,
              opacity: tabsFade,
              transform: [{ translateY: tabsUp }],
            }}
          >
            <View style={[styles.tabsRow, { height: tabBtnH }]}>
              <Pressable
                onPress={() => animateTab('settings')}
                style={[styles.tabBtn, tab === 'settings' && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, tab === 'settings' && styles.tabTextActive]}>Settings</Text>
              </Pressable>

              <Pressable onPress={() => animateTab('about')} style={[styles.tabBtn, tab === 'about' && styles.tabBtnActive]}>
                <Text style={[styles.tabText, tab === 'about' && styles.tabTextActive]}>About the app</Text>
              </Pressable>

              <View pointerEvents="none" style={styles.tabIndicatorWrap}>
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    {
                      transform: [
                        {
                          translateX: indicatorX.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, contentW / 2],
                          }),
                        },
                      ],
                      width: contentW / 2,
                    },
                  ]}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={{
              width: contentW,
              marginTop: isTiny ? 10 : 14,
              opacity: contentFade,
              transform: [{ translateY: contentUp }],
              flex: 1,
            }}
          >
            {tab === 'settings' ? (
              <>
            
                <View style={[styles.bigRow, { height: bigRowH, paddingHorizontal: padX }]}>
                  <Text style={[styles.bigRowTitle, { fontSize: isTiny ? 14 : 15 }]}>Vibration</Text>
                  <Switch value={vibration} onValueChange={onToggleVibration} />
                </View>

                <View style={{ height: gap }} />

                <View style={[styles.bigRow, { height: bigRowH, paddingHorizontal: padX }]}>
                  <Text style={[styles.bigRowTitle, { fontSize: isTiny ? 14 : 15 }]}>Push-notification</Text>
                  <Switch value={push} onValueChange={onTogglePush} />
                </View>

                <View style={{ flex: 1 }} />

          
                <Animated.View style={{ opacity: resetFade, transform: [{ translateY: resetUp }] }}>
                  <View style={{ marginBottom: resetLift }}>
                    <Pressable style={[styles.resetBtn, { height: bigBtnH }]} onPress={resetProgress}>
                      <Text style={[styles.resetText, { fontSize: isTiny ? 14 : 15 }]}>Reset progress</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
                <View style={styles.aboutBox}>
                  <Text style={[styles.aboutText, { fontSize: isTiny ? 12 : 13, lineHeight: isTiny ? 16 : 18 }]}>
                    Bulls& SeasMore One Mile is a small story-driven app about the journey home.{'\n'}
                    You help Baxter fix his car by gathering resources, checking in every day and exploring the junkyard
                    for parts. There are no accounts, data collection or unnecessary mechanics — everything works locally
                    and at a leisurely pace. One story, one goal and a path to the finale without fuss or rush.
                  </Text>
                </View>

                <View style={{ height: isTiny ? 12 : 18 }} />

                <Pressable style={[styles.shareBtn, { height: bigBtnH }]} onPress={shareInfo}>
                  <Text style={[styles.shareText, { fontSize: isTiny ? 14 : 15 }]}>Share info</Text>
                </Pressable>
              </ScrollView>
            )}
          </Animated.View>
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

  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 18, 64, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 18, 64, 0.92)',
  },
  tabText: { color: 'rgba(255,255,255,0.82)', fontWeight: '900', letterSpacing: 0.3 },
  tabTextActive: { color: '#fff' },

  tabIndicatorWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'transparent',
  },
  tabIndicator: {
    height: 3,
    backgroundColor: '#1FCB39',
  },

  bigRow: {
    borderRadius: 12,
    backgroundColor: 'rgba(0, 18, 64, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bigRowTitle: { color: '#fff', fontWeight: '900', letterSpacing: 0.3 },

  resetBtn: {
    borderRadius: 6,
    backgroundColor: '#1FCB39',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  resetText: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },

  aboutBox: {
    borderRadius: 12,
    backgroundColor: 'rgba(0, 18, 64, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 14,
  },
  aboutText: { color: 'rgba(255,255,255,0.92)', fontWeight: '800' },

  shareBtn: {
    borderRadius: 6,
    backgroundColor: '#1FCB39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },
});
