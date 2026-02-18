import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AtlasStackParamList } from '../atlas/mapTypes';

type Props = NativeStackScreenProps<AtlasStackParamList, 'trailSearch'>;

export default function TrailSearchScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Trail Search</Text>
      <Text style={styles.sub}>SEARCH screen placeholder.</Text>

      <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0B0F18' },
  title: { fontSize: 24, fontWeight: '900', color: '#fff' },
  sub: { marginTop: 8, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  btn: { marginTop: 18, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  btnText: { color: '#fff', fontWeight: '800' },
});
