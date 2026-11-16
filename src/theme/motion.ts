export const motionTokens = {
  durPress: 100,
  durHover: 150,
  durSpatial: 300,
  springOvershoot: {
    tension: 65,
    friction: 7,
  },
  springSheet: {
    tension: 70,
    friction: 8,
  },
  cubicEaseOut: (t: number) => 1 - Math.pow(1 - t, 3),
};

export const formatIndianNumber = (num: number): string => {
  if (isNaN(num)) return '0';
  const isNegative = num < 0;
  const abs = Math.abs(num);
  let str = '';
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    str = `₹${cr.toFixed(cr % 1 === 0 ? 0 : 2)}Cr`;
  } else if (abs >= 100000) {
    const lk = abs / 100000;
    str = `₹${lk.toFixed(lk % 1 === 0 ? 0 : 2)}L`;
  } else if (abs >= 1000) {
    const k = abs / 1000;
    str = `₹${k.toFixed(k % 1 === 0 ? 0 : 1)}k`;
  } else {
    str = `₹${abs.toLocaleString('en-IN')}`;
  }
  return isNegative ? `-${str}` : str;
};

