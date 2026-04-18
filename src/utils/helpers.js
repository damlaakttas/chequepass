// src/utils/helpers.js
export const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatRelative = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'şimdi';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} gün önce`;
  return formatDate(ts);
};

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
