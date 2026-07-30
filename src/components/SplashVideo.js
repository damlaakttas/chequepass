// src/components/SplashVideo.js
//
// Açılış videosu. Uygulama açılınca bir kez oynatılır, bitince onFinish çağrılır.
// Video yüklenemezse / oynatılamazsa güvenlik zaman aşımıyla yine devam edilir.

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '../theme/theme';

const MAX_MS = 6000; // video takılırsa en geç bu sürede geç

const SplashVideo = ({ onFinish }) => {
  const finishedRef = useRef(false);
  const [ , setStarted] = useState(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish && onFinish();
  };

  useEffect(() => {
    const t = setTimeout(finish, MAX_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Video
        source={require('../../assets/splash-video.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        isMuted
        onReadyForDisplay={() => setStarted(true)}
        onError={finish}
        onPlaybackStatusUpdate={(status) => {
          if (status?.didJustFinish) finish();
          if (status?.error) finish();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    zIndex: 999,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SplashVideo;
