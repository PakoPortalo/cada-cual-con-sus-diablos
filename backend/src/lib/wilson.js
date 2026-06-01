// Wilson score: limite inferior del intervalo de confianza (95%) de la proporcion
// de votos positivos. Ordena premiando consenso real y penalizando la
// incertidumbre de pocos votos (1 de 1 NO gana a 45 de 50). Mismo metodo que
// usa Reddit para "best". Devuelve 0..1.
const Z = 1.96; // 95% de confianza

export function wilsonScore(positivos, negativos) {
  const n = positivos + negativos;
  if (n === 0) return 0;
  const phat = positivos / n;
  const z2 = Z * Z;
  return (
    (phat + z2 / (2 * n) - Z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n)) /
    (1 + z2 / n)
  );
}
