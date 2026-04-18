// src/components/AnimalAvatar.js
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, G } from 'react-native-svg';
import { COLORS } from '../theme/theme';

const PALETTES = {
  fox: { body: '#f4a26b', accent: '#fff', dark: '#3d2817' },
  panda: { body: '#ffffff', accent: '#2d2d2d', dark: '#111' },
  koala: { body: '#b8c5d1', accent: '#f0e9e9', dark: '#3d3d3d' },
  bunny: { body: '#fde2e4', accent: '#ffffff', dark: '#4a2c3a' },
  cat: { body: '#d4a574', accent: '#fff', dark: '#2a1810' },
  owl: { body: '#c4a77d', accent: '#fff8dc', dark: '#2d1f0f' },
};

const AnimalAvatar = ({ type = 'fox', size = 64 }) => {
  const p = PALETTES[type] || PALETTES.fox;
  const s = size;

  const renderFox = () => (
    <G>
      <Path d="M20 30 L35 15 L50 30 Z" fill={p.body} />
      <Path d="M80 30 L65 15 L50 30 Z" fill={p.body} />
      <Path d="M25 32 L40 20 L45 32 Z" fill={p.dark} opacity="0.3" />
      <Path d="M75 32 L60 20 L55 32 Z" fill={p.dark} opacity="0.3" />
      <Circle cx="50" cy="55" r="32" fill={p.body} />
      <Ellipse cx="50" cy="65" rx="22" ry="18" fill={p.accent} />
      <Circle cx="40" cy="52" r="3.5" fill={p.dark} />
      <Circle cx="60" cy="52" r="3.5" fill={p.dark} />
      <Path d="M47 65 Q50 68 53 65" stroke={p.dark} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Ellipse cx="50" cy="62" rx="3" ry="2" fill={p.dark} />
    </G>
  );

  const renderPanda = () => (
    <G>
      <Circle cx="30" cy="28" r="10" fill={p.accent} />
      <Circle cx="70" cy="28" r="10" fill={p.accent} />
      <Circle cx="50" cy="55" r="32" fill={p.body} />
      <Ellipse cx="40" cy="52" rx="6" ry="8" fill={p.accent} />
      <Ellipse cx="60" cy="52" rx="6" ry="8" fill={p.accent} />
      <Circle cx="40" cy="53" r="2.5" fill={p.dark} />
      <Circle cx="60" cy="53" r="2.5" fill={p.dark} />
      <Ellipse cx="50" cy="62" rx="3" ry="2.2" fill={p.dark} />
      <Path d="M47 66 Q50 69 53 66" stroke={p.dark} strokeWidth="2" fill="none" strokeLinecap="round" />
    </G>
  );

  const renderKoala = () => (
    <G>
      <Circle cx="25" cy="35" r="12" fill={p.body} />
      <Circle cx="75" cy="35" r="12" fill={p.body} />
      <Circle cx="25" cy="35" r="7" fill={p.accent} />
      <Circle cx="75" cy="35" r="7" fill={p.accent} />
      <Circle cx="50" cy="55" r="30" fill={p.body} />
      <Circle cx="42" cy="52" r="2.8" fill={p.dark} />
      <Circle cx="58" cy="52" r="2.8" fill={p.dark} />
      <Ellipse cx="50" cy="62" rx="5" ry="3.5" fill={p.dark} />
      <Path d="M46 68 Q50 71 54 68" stroke={p.dark} strokeWidth="2" fill="none" strokeLinecap="round" />
    </G>
  );

  const renderBunny = () => (
    <G>
      <Ellipse cx="38" cy="22" rx="7" ry="18" fill={p.body} />
      <Ellipse cx="62" cy="22" rx="7" ry="18" fill={p.body} />
      <Ellipse cx="38" cy="24" rx="3" ry="12" fill="#f8b4bc" />
      <Ellipse cx="62" cy="24" rx="3" ry="12" fill="#f8b4bc" />
      <Circle cx="50" cy="58" r="30" fill={p.body} />
      <Circle cx="42" cy="55" r="2.8" fill={p.dark} />
      <Circle cx="58" cy="55" r="2.8" fill={p.dark} />
      <Path d="M48 63 L50 66 L52 63" stroke={p.dark} strokeWidth="1.5" fill="#f8b4bc" />
      <Path d="M47 68 Q50 70 53 68" stroke={p.dark} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </G>
  );

  const renderCat = () => (
    <G>
      <Path d="M22 32 L32 12 L42 32 Z" fill={p.body} />
      <Path d="M78 32 L68 12 L58 32 Z" fill={p.body} />
      <Path d="M26 30 L32 18 L38 30 Z" fill="#f5c5a0" />
      <Path d="M74 30 L68 18 L62 30 Z" fill="#f5c5a0" />
      <Circle cx="50" cy="55" r="32" fill={p.body} />
      <Path d="M40 52 L38 49 M40 52 L36 53 M40 52 L38 55" stroke={p.dark} strokeWidth="1" />
      <Path d="M60 52 L62 49 M60 52 L64 53 M60 52 L62 55" stroke={p.dark} strokeWidth="1" />
      <Circle cx="42" cy="52" r="2.5" fill={p.dark} />
      <Circle cx="58" cy="52" r="2.5" fill={p.dark} />
      <Path d="M48 62 L50 65 L52 62" stroke={p.dark} strokeWidth="1.5" fill="#ff9aa2" />
    </G>
  );

  const renderOwl = () => (
    <G>
      <Circle cx="50" cy="55" r="32" fill={p.body} />
      <Path d="M30 35 Q40 25 50 35 Q60 25 70 35 L70 40 L30 40 Z" fill={p.dark} opacity="0.2" />
      <Circle cx="40" cy="50" r="10" fill={p.accent} />
      <Circle cx="60" cy="50" r="10" fill={p.accent} />
      <Circle cx="40" cy="50" r="5" fill={p.dark} />
      <Circle cx="60" cy="50" r="5" fill={p.dark} />
      <Circle cx="41" cy="48" r="1.5" fill="#fff" />
      <Circle cx="61" cy="48" r="1.5" fill="#fff" />
      <Path d="M48 60 L50 66 L52 60 Z" fill="#d97706" />
    </G>
  );

  const map = {
    fox: renderFox,
    panda: renderPanda,
    koala: renderKoala,
    bunny: renderBunny,
    cat: renderCat,
    owl: renderOwl,
  };

  const render = map[type] || renderFox;

  return (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        backgroundColor: COLORS.primary + '40',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Svg width={s * 0.9} height={s * 0.9} viewBox="0 0 100 100">
        {render()}
      </Svg>
    </View>
  );
};

export default AnimalAvatar;
