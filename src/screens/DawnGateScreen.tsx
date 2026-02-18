
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, Animated, Easing } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'dawnGate'>;

function IsoBoxesLoader() {
  const SIZE = 32;
  const DURATION = 800;

  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(a, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [a]);

  const tx = (v0: number, v1: number, v2: number) =>
    a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [v0, v1, v2] });

  const b1x = tx(SIZE, SIZE, SIZE * 2);
  const b1y = 0;

  const b2x = tx(0, 0, SIZE);
  const b2y = tx(SIZE, 0, 0);

  const b3x = tx(SIZE, SIZE, 0);
  const b3y = SIZE;

  const b4x = tx(SIZE * 2, SIZE * 2, SIZE);
  const b4y = tx(0, SIZE, SIZE);

  const Cube = ({ x, y }: { x: Animated.AnimatedInterpolation<string | number> | number; y: Animated.AnimatedInterpolation<string | number> | number }) => {
    return (
      <Animated.View
        style={[
          styles.cubeWrap,
          {
            width: SIZE,
            height: SIZE,
            transform: [{ translateX: x as any }, { translateY: y as any }],
          },
        ]}
      >
        <View style={[styles.faceFront, { width: SIZE, height: SIZE }]} />

        <View
          style={[
            styles.faceTop,
            {
              width: SIZE,
              height: SIZE,
              transform: [{ translateY: -SIZE * 0.42 }, { skewX: '-45deg' }, { scaleY: 0.5 }],
            },
          ]}
        />

        <View
          style={[
            styles.faceRight,
            {
              width: SIZE,
              height: SIZE,
              transform: [{ translateX: SIZE * 0.42 }, { skewY: '-45deg' }, { scaleX: 0.5 }],
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.shadow,
            {
              width: SIZE,
              height: SIZE,
              transform: [{ translateY: SIZE * 0.55 }, { skewX: '-45deg' }, { scaleY: 0.35 }],
            },
          ]}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.loaderCenter}>
  
      <View style={[styles.gridBox, { width: SIZE * 3, height: SIZE * 2 }]}>

        <View
          style={{
            flex: 1,
            transform: [{ rotateZ: '45deg' }, { scaleY: 0.9 }],
          }}
        >
          <Cube x={b1x} y={b1y} />
          <Cube x={b2x} y={b2y} />
          <Cube x={b3x} y={b3y} />
          <Cube x={b4x} y={b4y} />
        </View>
      </View>
    </View>
  );
}

export default function DawnGateScreen({ navigation }: Props) {
  

  return (
    <ImageBackground
      source={require('../vault/loader_bg.png')}
      resizeMode="cover"
      style={styles.bg}
    >
      <View style={styles.overlay}>
        <IsoBoxesLoader />

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  title: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },

  sub: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
  },

  loaderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  gridBox: {
    position: 'relative',
  },

  cubeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  faceFront: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#5C8DF6',
    borderRadius: 4,
  },

  faceTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#447cf5',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    opacity: 0.98,
  },

  faceRight: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#145af2',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    opacity: 0.98,
  },

  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 6,
  },
});
