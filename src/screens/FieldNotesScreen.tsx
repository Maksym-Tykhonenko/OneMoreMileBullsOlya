import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Animated,
  Easing,
  Share,
  useWindowDimensions,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'fieldNotes'>;

const ASSET = {
  bg: require('../vault/loader_bg.png'),
  bull: require('../vault/ognb_1.png'),
};

const TIPS: string[] = [
  "Not everything is there the first time.",
  'Check the junk carefully.',
  "Sometimes it's better to take your time.",
  "Some things look empty, but they're not.",
  "Come back every day - it's easier that way.",
  'Not every tap gives a result.',
  'Old things are often useful.',
  "Look where you've already looked.",
  'Today there may be more than yesterday.',
  "If you don't find anything - that's okay.",
  "Junk doesn't like fuss.",
  'A few precise actions are better than many random ones.',
  'Parts appear where you least expect them.',
  'Not everything is worth your attention, but something is for sure.',
  "There's always something to check tomorrow.",
];

function pickRandomTip(prev: string | null) {
  if (TIPS.length <= 1) return TIPS[0] ?? '';
  let next = TIPS[Math.floor(Math.random() * TIPS.length)];
  if (prev) {
    let guard = 0;
    while (next === prev && guard < 10) {
      next = TIPS[Math.floor(Math.random() * TIPS.length)];
      guard += 1;
    }
  }
  return next;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function FieldNotesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmall = height < 740;
  const isTiny = height < 690;

  const frameW = useMemo(() => clamp(width - 44, 300, 560), [width]);

  const [tip, setTip] = useState<string>(() => pickRandomTip(null));
  const lastTipRef = useRef<string | null>(null);

  const screenIn = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const bullIn = useRef(new Animated.Value(0)).current;
  const btnPop = useRef(new Animated.Value(1)).current;

  const animateAllIn = () => {
    screenIn.setValue(0);
    cardIn.setValue(0);
    bullIn.setValue(0);

    Animated.parallel([
      Animated.timing(screenIn, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardIn, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bullIn, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.back(1.08)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const setNewTip = () => {
    const next = pickRandomTip(lastTipRef.current);
    lastTipRef.current = next;
    setTip(next);

    cardIn.setValue(0);
    bullIn.setValue(0);
    Animated.parallel([
      Animated.timing(cardIn, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bullIn, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.back(1.03)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [])
  );

  useEffect(() => {
    lastTipRef.current = tip;
    animateAllIn();
  }, []);

 
  useFocusEffect(
    React.useCallback(() => {
      const next = pickRandomTip(lastTipRef.current);
      lastTipRef.current = next;
      setTip(next);
      animateAllIn();
      return undefined;
    }, [])
  );

  const onShare = async () => {
    try {
      await Share.share({ message: `TIP:\n${tip}` });
    } catch {}
  };

  const pop = (fn: () => void) => {
    btnPop.setValue(1);
    Animated.sequence([
      Animated.timing(btnPop, { toValue: 0.985, duration: 70, useNativeDriver: true }),
      Animated.timing(btnPop, {
        toValue: 1,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    fn();
  };

  const onCloseToHome = () => {

    navigation.replace('harborHub');
  };

  const topPad = Math.max(10, insets.top + (isSmall ? 8 : 10));
  const bottomPad = Math.max(18, insets.bottom + 18);

  const cardH = isTiny ? 220 : isSmall ? 250 : 280;
  const bullSize = isTiny ? 108 : isSmall ? 118 : 132;
  const rightReserve = bullSize * 0.78;

  const screenOpacity = screenIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const screenUp = screenIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  const cardOpacity = cardIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cardUp = cardIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  const bullScale = bullIn.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const bullUp = bullIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <ImageBackground source={ASSET.bg} resizeMode="cover" style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.stage,
            {
              paddingTop: topPad,
              paddingBottom: bottomPad,
              opacity: screenOpacity,
              transform: [{ translateY: screenUp }],
            },
          ]}
        >
          <View style={[styles.outerFrame, { width: frameW }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { fontSize: isSmall ? 16 : 18 }]}>TIPS</Text>
            </View>

            <Animated.View
              style={[
                styles.tipCard,
                {
                  height: cardH,
                  opacity: cardOpacity,
                  transform: [{ translateY: cardUp }],
                },
              ]}
            >
              <View style={{ paddingRight: rightReserve }}>
                <Text
                  style={[
                    styles.tipText,
                    isSmall && { fontSize: 20, lineHeight: 26 },
                    isTiny && { fontSize: 18, lineHeight: 24 },
                  ]}
                  numberOfLines={4}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {tip}
                </Text>
              </View>

              <Animated.Image
                source={ASSET.bull}
                resizeMode="contain"
                style={[
                  styles.bullCorner,
                  {
                    width: bullSize,
                    height: bullSize,
                    opacity: 0.98,
                    transform: [{ translateY: bullUp }, { scale: bullScale }],
                  },
                ]}
              />
            </Animated.View>

            <View style={{ height: isTiny ? 12 : 14 }} />

            <Animated.View style={{ transform: [{ scale: btnPop }], width: '100%' }}>
              <Pressable style={[styles.bigBtn, styles.btnGreen]} onPress={() => pop(setNewTip)}>
                <Text style={[styles.bigBtnText, isSmall && { fontSize: 16 }]}>NEW TIP</Text>
              </Pressable>
            </Animated.View>

            <View style={{ height: 12 }} />

            <Animated.View style={{ transform: [{ scale: btnPop }], width: '100%' }}>
              <Pressable style={[styles.bigBtn, styles.btnGreen]} onPress={() => pop(onShare)}>
                <Text style={[styles.bigBtnText, isSmall && { fontSize: 16 }]}>SHARE</Text>
              </Pressable>
            </Animated.View>
            <Pressable onPress={onCloseToHome} style={styles.bottomCloseTap}>
              <Text style={styles.bottomCloseText}>CLOSE</Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  stage: { flex: 1, alignItems: 'center' },

  outerFrame: {
    borderWidth: 2,
    borderColor: 'rgba(90, 190, 255, 0.55)',
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  headerRow: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  tipCard: {
    width: '100%',
    backgroundColor: '#D64A1D',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    overflow: 'hidden',
  },

  tipText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 22,
    lineHeight: 28,
  },

  bullCorner: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },

  bigBtn: {
    width: '100%',
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGreen: { backgroundColor: '#1FCB39' },

  bigBtnText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1.0,
    fontSize: 18,
  },

  bottomCloseTap: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bottomCloseText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 16,
    textDecorationLine: 'underline',
    letterSpacing: 0.6,
  },
});
