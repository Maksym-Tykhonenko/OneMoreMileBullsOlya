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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'introSteps'>;

type Step = { image: any; text: string; button: string };

const STEPS: Step[] = [
  {
    image: require('../vault/ognb_1.png'),
    text: "Hi, I'm Baxter.\nMy car broke down.\nI can’t get to the yacht and back home.",
    button: 'CONTINUE',
  },
  {
    image: require('../vault/ognb_2.png'),
    text: 'I need parts.\nDiesel, nuts and bolts.\nI can’t do it myself — now without you.',
    button: 'OKAY',
  },
  {
    image: require('../vault/ognb_3.png'),
    text: 'Come in every day.\nI give diesel for activity.\nDarts can be exchanged for parts.',
    button: 'NICE',
  },
  {
    image: require('../vault/ognb_4.png'),
    text: "Let’s fix the car — let’s go on.\nWithout unnecessary noise.\nOne goal. Bulls& SeasMore One Mile.",
    button: 'START',
  },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function IntroStepsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmall = height < 740;

  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  const appear = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  useEffect(() => {
    appear.setValue(0);
    Animated.spring(appear, {
      toValue: 1,
      useNativeDriver: true,
      damping: 16,
      stiffness: 140,
      mass: 0.9,
    }).start();
  }, [index, appear]);

  const imageHeight = useMemo(() => {
    const base = height * 0.34;
    return clamp(base, isSmall ? 200 : 240, 380);
  }, [height, isSmall]);

  const imageWidth = useMemo(() => clamp(width * 0.82, 260, 520), [width]);

  const cardWidth = useMemo(() => clamp(width - 44, 280, 560), [width]);

  const bottomPad = Math.max(18, insets.bottom + 18);
  const imageDrop = 40;

  const onNext = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.98, duration: 70, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    if (index < STEPS.length - 1) setIndex(prev => prev + 1);
    else navigation.replace('harborHub');
  };

  const fade = appear.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const up = appear.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const scaleIn = appear.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });

  const floatTranslate = floatY.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <ImageBackground source={require('../vault/loader_bg.png')} resizeMode="cover" style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.stage, { paddingBottom: bottomPad }]}>
          <View style={[styles.topArea, { paddingTop: isSmall ? 6 : 14 }]}>
            <Animated.View
              style={[
                styles.imageWrap,
                {
                  opacity: fade,
                  transform: [{ translateY: up }, { scale: scaleIn }],
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [{ translateY: floatTranslate }],
                }}
              >
                <Image
                  source={step.image}
                  resizeMode="contain"
                  style={{
                    width: imageWidth,
                    height: imageHeight,
                    marginTop: imageDrop,
                  }}
                />
              </Animated.View>
            </Animated.View>
          </View>

          <View style={styles.bottomArea} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.card,
                {
                  width: cardWidth,
                  opacity: fade,
                  transform: [{ translateY: up }, { scale: scaleIn }],
                },
              ]}
            >
      
              <View style={styles.progressWrap}>
                {STEPS.map((_, i) => {
                  const active = i === index;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.progressBar,
                        active ? styles.progressActive : styles.progressInactive,
                      ]}
                    />
                  );
                })}
              </View>

              <Text style={[styles.text, isSmall && styles.textSmall]} numberOfLines={5}>
                {step.text}
              </Text>

              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <Pressable
                  onPress={onNext}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <Text style={styles.buttonText}>{step.button}</Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
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

  topArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 10,
  },

  card: {
    backgroundColor: 'rgba(0, 18, 64, 0.86)',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  progressWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },

  progressBar: {
    height: 4,
    borderRadius: 3,
    marginHorizontal: 6,
    width: 44,
  },

  progressActive: { backgroundColor: 'rgba(255,255,255,0.95)' },
  progressInactive: { backgroundColor: 'rgba(255,255,255,0.25)' },

  text: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 6,
  },

  textSmall: {
    fontSize: 16,
    lineHeight: 22,
  },

  button: {
    backgroundColor: '#FF5A1F',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.8,
    fontSize: 18,
  },
});
