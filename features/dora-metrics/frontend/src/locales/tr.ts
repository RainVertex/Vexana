import type { DoraMetricsResources } from "./en";

export const tr: DoraMetricsResources = {
  page: {
    title: "DORA Metrikleri",
    description: "Dağıtım sıklığı, teslim süresi, MTTR, değişiklik hata oranı.",
  },
  snapshot: {
    deploysPerDay: "Dağıtım/gün",
    lead: "Teslim",
    mttr: "MTTR",
    cfr: "DHO",
  },
  status: {
    loading: "Yükleniyor…",
    noSnapshots: "Henüz anlık görüntü yok.",
  },
  errors: {
    loadFailed: "Metrikler yüklenemedi",
  },
};
